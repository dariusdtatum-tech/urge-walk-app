// Backup file: export everything to one JSON file, and restore it later.
//
// File format (format 1):
// {
//   app: 'urge-walk', format: 1, exportedAt: ISO time,
//   data: { habits: [...], walks: [...], journal: [...], walkPrefs: { choice, customMinutes },
//           milestones: { trackers: { [habitId]: { earned, seen } } },     <- optional (added later)
//           profile: { onboarding answers } }                              <- optional (added later)
// }
// Older backups without `milestones` still import: the milestones already passed are then marked
// earned quietly on the next open (no celebration sheets).
// Older backups without `profile` still import: existing trackers mean onboarding is skipped.
// A walk in progress and an unfinished journal draft are not included (they're temporary).
import { CHECKINS_KEY, loadCheckins, sanitizeCheckins, saveCheckins } from './checkin.js'
import { todayISO } from './cleanTime.js'
import { CONTACTS_KEY, loadContactsData, sanitizeContactsData, saveContactsData } from './contacts.js'
import { MONEY_GOAL_KEY, loadGoal, sanitizeGoal, saveGoal } from './money.js'
import { MILESTONES_KEY, loadMilestones, sanitizeMilestones, saveMilestones } from './milestones.js'
import { DRAFT_KEY, JOURNAL_KEY, loadJournal, sanitizeEntries, saveJournal } from './journal.js'
import { REASONS_KEY, loadReasonsData, reasonsForBackup, saveReasonsData, sanitizeReasonsData } from './reasons.js'
import { PROFILE_KEY, loadProfile, sanitizeProfile, saveProfile } from './profile.js'
import { HABITS_KEY, loadHabits, readObject, sanitizeHabits, saveHabits, writeObject } from './storage.js'
import {
  ACTIVE_WALK_KEY, WALKS_KEY, WALK_CHOICES, WALK_PREFS_KEY, loadWalkPrefs, loadWalks, sanitizeWalks,
  saveWalkPrefs, saveWalks,
} from './walkStorage.js'
import { DEFAULT_CUSTOM_MINUTES, DEFAULT_MINUTES, clampCustomMinutes } from './walkTimer.js'

export const APP_NAME = 'urge-walk'
export const BACKUP_FORMAT = 1
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB is far more than years of use
export const MAX_ITEMS = { habits: 500, walks: 100000, journal: 50000 }
export const BACKUP_META_KEY = 'urgewalk.v1.backupMeta' // { lastBackupAt, nudgeDismissedAt }
export const UNDO_KEY = 'urgewalk.v1.importUndo' // safety copy taken right before an import
export const NUDGE_AFTER_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

// Optional sections added after format 1 shipped. Each is written only when it has something in it,
// so older files (and files from the PWA) round-trip unchanged, and older files without it import fine.
// { name: key in data, key: storage key, load, sanitize (raw -> clean | null), save, empty(clean) }
export const OPTIONAL_SECTIONS = [
  { name: 'checkins', key: CHECKINS_KEY, load: loadCheckins, sanitize: (r) => (r && typeof r === 'object' && !Array.isArray(r) ? sanitizeCheckins(r) : null), save: saveCheckins, empty: (v) => Object.keys(v.days).length === 0 },
  // Trusted contacts are in the backup so a new phone gets them back (they never leave the phone otherwise).
  { name: 'moneyGoal', key: MONEY_GOAL_KEY, load: loadGoal, sanitize: sanitizeGoal, save: saveGoal, empty: () => false },
  { name: 'contacts', key: CONTACTS_KEY, load: (s) => (readObject(CONTACTS_KEY, s) ? loadContactsData(s) : null), sanitize: sanitizeContactsData, save: saveContactsData, empty: (v) => v.contacts.length === 0 },
]

// Every key an import replaces (and the safety copy saves).
const DATA_KEYS = [REASONS_KEY, HABITS_KEY, WALKS_KEY, JOURNAL_KEY, WALK_PREFS_KEY, MILESTONES_KEY, PROFILE_KEY, ACTIVE_WALK_KEY, DRAFT_KEY, ...OPTIONAL_SECTIONS.map((x) => x.key)]

// ---------- Export ----------

function optionalData(storage) {
  const out = {}
  for (const x of OPTIONAL_SECTIONS) {
    const v = x.load(storage)
    if (v && !x.empty(v)) out[x.name] = v
  }
  return out
}

export function buildBackup(storage = globalThis.localStorage, now = Date.now()) {
  return {
    app: APP_NAME,
    format: BACKUP_FORMAT,
    exportedAt: new Date(now).toISOString(),
    data: {
      habits: loadHabits(storage).habits,
      walks: loadWalks(storage).walks,
      journal: loadJournal(storage).entries,
      walkPrefs: loadWalkPrefs(storage),
      milestones: { trackers: loadMilestones(storage).trackers },
      ...(loadProfile(storage) ? { profile: loadProfile(storage) } : {}),
      ...optionalData(storage),
      // Your reasons: words only (photos and voice notes stay on this phone).
      ...(reasonsForBackup(readObject(REASONS_KEY, storage)) ? { reasons: reasonsForBackup(readObject(REASONS_KEY, storage)) } : {}),
    },
  }
}

export function backupFilename(now = Date.now()) {
  return `urge-walk-backup-${todayISO(new Date(now))}.json`
}

export function hasAnyData(storage = globalThis.localStorage) {
  return loadHabits(storage).habits.length > 0 ||
    loadWalks(storage).walks.length > 0 ||
    loadJournal(storage).entries.length > 0
}

// ---------- Validate a file before importing ----------

const fail = (error) => ({ ok: false, error })
const NOT_A_BACKUP = 'This file isn’t an Urge Walk backup.'

function cleanPrefs(p) {
  if (p == null) return { choice: DEFAULT_MINUTES, customMinutes: DEFAULT_CUSTOM_MINUTES }
  if (typeof p !== 'object' || Array.isArray(p)) return null
  return {
    choice: WALK_CHOICES.includes(p.choice) ? p.choice : DEFAULT_MINUTES,
    customMinutes: p.customMinutes == null ? DEFAULT_CUSTOM_MINUTES : clampCustomMinutes(p.customMinutes),
  }
}

// Accepts the file's text. Returns { ok: true, backup, summary } or { ok: false, error }.
// Never throws. Damaged individual items are skipped (and counted) rather than failing everything.
export function validateBackup(text) {
  if (typeof text !== 'string' || text.trim() === '') return fail('This file is empty.')
  if (text.length > MAX_FILE_BYTES) return fail('This file is too large to be an Urge Walk backup.')

  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return fail(`${NOT_A_BACKUP} (It isn’t a readable backup file.)`)
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.app !== APP_NAME) return fail(NOT_A_BACKUP)
  if (!Number.isInteger(raw.format) || raw.format < 1) return fail(`${NOT_A_BACKUP} (Unknown format.)`)
  if (raw.format > BACKUP_FORMAT) {
    return fail('This backup was made by a newer version of Urge Walk. Update the app and try again.')
  }
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) {
    return fail(`${NOT_A_BACKUP} (Missing export date.)`)
  }
  const d = raw.data
  if (!d || typeof d !== 'object' || Array.isArray(d)) return fail(`${NOT_A_BACKUP} (No data found.)`)

  const lists = { habits: sanitizeHabits, walks: sanitizeWalks, journal: sanitizeEntries }
  const data = {}
  let skipped = 0
  for (const [name, sanitize] of Object.entries(lists)) {
    const list = d[name] ?? []
    if (!Array.isArray(list)) return fail(`${NOT_A_BACKUP} (“${name}” is damaged.)`)
    if (list.length > MAX_ITEMS[name]) return fail(`This backup has too many ${name} to be real.`)
    data[name] = sanitize(list)
    skipped += list.length - data[name].length
  }
  const walkPrefs = cleanPrefs(d.walkPrefs)
  if (!walkPrefs) return fail(`${NOT_A_BACKUP} (Settings are damaged.)`)
  data.walkPrefs = walkPrefs

  // Milestone history is optional (older backups don't have it). Damaged entries are dropped,
  // and only trackers that are in this backup are kept.
  if (d.milestones != null) {
    if (typeof d.milestones !== 'object' || Array.isArray(d.milestones)) return fail(`${NOT_A_BACKUP} (Milestones are damaged.)`)
    const clean = sanitizeMilestones(d.milestones)
    const ids = new Set(data.habits.map((h) => h.id))
    data.milestones = { trackers: Object.fromEntries(Object.entries(clean.trackers).filter(([id]) => ids.has(id))) }
  }

  // Onboarding answers are optional too. Unknown values are dropped; a profile that isn't an object fails.
  if (d.profile != null) {
    const profile = sanitizeProfile(d.profile)
    if (!profile) return fail(`${NOT_A_BACKUP} (Profile is damaged.)`)
    data.profile = profile
  }

  for (const x of OPTIONAL_SECTIONS) {
    if (d[x.name] == null) continue
    const clean = x.sanitize(d[x.name])
    if (!clean) return fail(`${NOT_A_BACKUP} (“${x.name}” is damaged.)`)
    data[x.name] = clean
  }

  // Written reasons are optional. Only words are taken from a file; anything else is dropped.
  if (d.reasons != null) {
    const clean = reasonsForBackup(d.reasons)
    if (clean) data.reasons = clean
  }

  const backup = { app: APP_NAME, format: raw.format, exportedAt: raw.exportedAt, data }
  const summary = {
    habits: data.habits.length,
    walks: data.walks.filter((w) => w.kind === 'walk').length,
    breathes: data.walks.filter((w) => w.kind === 'breathe').length,
    logged: data.walks.filter((w) => w.kind === 'logged').length,
    journal: data.journal.length,
    exportedAt: raw.exportedAt,
    skipped,
  }
  return { ok: true, backup, summary }
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// "2 habits, 14 walks, 6 journal entries" (breathing minutes and logged urges only when there are some)
export function summaryText(s) {
  return [plural(s.habits, 'habit', 'habits'), plural(s.walks, 'walk', 'walks'),
    s.breathes ? plural(s.breathes, 'breathing minute', 'breathing minutes') : null,
    s.logged ? plural(s.logged, 'logged urge', 'logged urges') : null,
    plural(s.journal, 'journal entry', 'journal entries')].filter(Boolean).join(', ')
}

// ---------- Import (replace) with a safety copy + undo ----------

function snapshot(storage) {
  const values = {}
  for (const key of DATA_KEYS) {
    try {
      values[key] = storage.getItem(key) // null if missing
    } catch {
      values[key] = null
    }
  }
  return values
}

// Replace everything on this phone with the backup. A safety copy of the current data is
// kept first so the import can be undone (until the next import replaces the safety copy).
export function applyBackup(backup, storage = globalThis.localStorage, now = Date.now()) {
  const undo = { version: 1, savedAt: new Date(now).toISOString(), values: snapshot(storage) }
  if (!writeObject(UNDO_KEY, undo, storage)) return false // couldn't save the safety copy: don't touch anything
  const { habits, walks, journal, walkPrefs } = backup.data
  const ok = saveHabits(habits, storage) && saveWalks(walks, storage) && saveJournal(journal, storage) &&
    saveWalkPrefs(walkPrefs, storage) &&
    // No milestone history in the file: clear it, so passed milestones are backfilled quietly on next open.
    (backup.data.milestones ? saveMilestones(backup.data.milestones, storage) : writeObject(MILESTONES_KEY, null, storage)) &&
    // No profile in the file (older backup): clear it; the trackers then mean onboarding is skipped.
    (backup.data.profile ? saveProfile(backup.data.profile, storage) : writeObject(PROFILE_KEY, null, storage)) &&
    // Optional sections missing from the file are cleared, like the rest of the data.
    OPTIONAL_SECTIONS.every((x) => (backup.data[x.name] ? x.save(backup.data[x.name], storage) : writeObject(x.key, null, storage)))
  // Reasons: written reasons come from the file; photos and voice notes already on this phone stay.
  if (ok) mergeImportedReasons(backup.data.reasons, storage)
  // The backup's data replaces any walk in progress or unfinished draft.
  writeObject(ACTIVE_WALK_KEY, null, storage)
  writeObject(DRAFT_KEY, null, storage)
  if (!ok) undoImport(storage) // storage full or blocked: put everything back
  return ok
}

function mergeImportedReasons(raw, storage) {
  const local = loadReasonsData(storage)
  const file = sanitizeReasonsData(raw)
  const media = local.reasons.filter((r) => r.kind !== 'text')
  const words = (file?.reasons ?? []).filter((r) => r.kind === 'text' && !media.some((m) => m.id === r.id))
  if (!media.length && !words.length && !file?.lock) return writeObject(REASONS_KEY, null, storage)
  return saveReasonsData({ version: 1, reasons: [...media, ...words], next: 0, lock: file ? file.lock : local.lock }, storage)
}

// { savedAt } if an import can be undone, otherwise null.
export function getUndoInfo(storage = globalThis.localStorage) {
  const u = readObject(UNDO_KEY, storage)
  if (!u || typeof u !== 'object' || !u.values || typeof u.values !== 'object') return null
  return { savedAt: u.savedAt }
}

// Put back exactly what was on the phone before the last import.
export function undoImport(storage = globalThis.localStorage) {
  const u = readObject(UNDO_KEY, storage)
  if (!u || !u.values || typeof u.values !== 'object') return false
  try {
    for (const key of DATA_KEYS) {
      const value = u.values[key]
      if (typeof value === 'string') storage.setItem(key, value)
      else storage.removeItem(key)
    }
    storage.removeItem(UNDO_KEY)
    return true
  } catch {
    return false
  }
}

// ---------- "Last backup" + gentle reminder ----------

export function loadBackupMeta(storage = globalThis.localStorage) {
  const m = readObject(BACKUP_META_KEY, storage) || {}
  const t = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null)
  return { lastBackupAt: t(m.lastBackupAt), nudgeDismissedAt: t(m.nudgeDismissedAt) }
}

function saveBackupMeta(changes, storage) {
  return writeObject(BACKUP_META_KEY, { version: 1, ...loadBackupMeta(storage), ...changes }, storage)
}

export function recordBackup(now = Date.now(), storage = globalThis.localStorage) {
  return saveBackupMeta({ lastBackupAt: new Date(now).toISOString() }, storage)
}

export function dismissNudge(now = Date.now(), storage = globalThis.localStorage) {
  return saveBackupMeta({ nudgeDismissedAt: new Date(now).toISOString() }, storage)
}

// Show the reminder when there's data and no backup in the last 7 days.
// Dismissing it hides it for 7 days.
export function shouldNudge(meta, hasData, now = Date.now()) {
  if (!hasData) return false
  const daysSince = (iso) => (iso ? (now - Date.parse(iso)) / DAY_MS : Infinity)
  if (daysSince(meta.lastBackupAt) < NUDGE_AFTER_DAYS) return false
  if (daysSince(meta.nudgeDismissedAt) < NUDGE_AFTER_DAYS) return false
  return true
}

// "Last backup today", "yesterday", "N days ago", or "No backup yet" (for You).
export function lastBackupLabel(meta, now = Date.now()) {
  const at = meta?.lastBackupAt ? Date.parse(meta.lastBackupAt) : NaN
  if (!Number.isFinite(at)) return 'No backup yet'
  const start = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
  const days = Math.round((start(now) - start(at)) / DAY_MS)
  if (days <= 0) return 'Last backup today'
  if (days === 1) return 'Last backup yesterday'
  return `Last backup ${days} days ago`
}

// "Reset app": removes everything Urge Walk keeps on this phone (all urgewalk.* keys).
// The screen only calls this after a backup file was saved. Returns how many keys were removed.
export function clearAllData(storage = globalThis.localStorage) {
  const keys = []
  for (let i = 0; i < storage.length; i++) keys.push(storage.key(i))
  const ours = keys.filter((k) => typeof k === 'string' && k.startsWith('urgewalk.'))
  for (const k of ours) storage.removeItem(k)
  return ours.length
}

// ---------- Sharing / downloading the file (browser only) ----------

// Returns 'shared', 'downloaded', or 'cancelled'. Throws only on real failures.
export async function shareOrDownload(text, filename) {
  const blob = new Blob([text], { type: 'application/json' })
  let file = null
  try {
    file = new File([blob], filename, { type: 'application/json' })
  } catch {
    file = null
  }
  // iPhone: the share sheet lets you "Save to Files" (including iCloud Drive).
  if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Urge Walk backup' })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
      // Some browsers refuse; fall through to a normal download.
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}
