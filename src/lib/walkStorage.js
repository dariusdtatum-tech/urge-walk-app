// Walk data on this device:
// - urgewalk.v1.walks       finished walks (read by the Log tab)
// - urgewalk.v1.activeWalk  the walk in progress, so reopening the app resumes it
// - urgewalk.v1.walkPrefs   last choice (5 / 10 / 15 / custom / open) and last custom length
import { makeId, readList, readObject, writeList, writeObject } from './storage.js'
import { DEFAULT_CUSTOM_MINUTES, DEFAULT_MINUTES, WALK_OPTIONS, clampCustomMinutes } from './walkTimer.js'

export const WALKS_KEY = 'urgewalk.v1.walks'
export const ACTIVE_WALK_KEY = 'urgewalk.v1.activeWalk'
export const WALK_PREFS_KEY = 'urgewalk.v1.walkPrefs'
export const RESULTS = ['yes', 'kinda', 'no']
// What kind of urge record: a walk, a minute of breathing, or an urge just logged as ridden out.
// Records saved before kinds existed have no `kind` and are all walks.
export const KINDS = ['walk', 'breathe', 'logged']
export const BREATHE_SECONDS = 60
export const MAX_NOTE_LENGTH = 280

const isNum = (n) => typeof n === 'number' && Number.isFinite(n)
const isTime = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s))

// ---------- Saved walks ----------

export function sanitizeWalks(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((w) => w && typeof w === 'object')
    .filter((w) => isTime(w.startedAt) && isTime(w.endedAt))
    // Timed walks have a positive plannedMinutes; open walks have null (or mode 'open').
    .filter((w) => (isNum(w.plannedMinutes) && w.plannedMinutes > 0) || w.plannedMinutes == null)
    .filter((w) => isNum(w.actualSeconds) && w.actualSeconds >= 0)
    .map((w) => {
      // Older records have no `mode`; they were all timed walks.
      const kind = KINDS.includes(w.kind) ? w.kind : 'walk'
      const open = kind === 'logged' || w.mode === 'open' || w.plannedMinutes == null
      return {
        id: typeof w.id === 'string' && w.id ? w.id : makeId(),
        kind,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
        mode: open ? 'open' : 'timed',
        plannedMinutes: open ? null : w.plannedMinutes,
        actualSeconds: kind === 'logged' ? 0 : Math.round(w.actualSeconds),
        endedEarly: open ? false : Boolean(w.endedEarly),
        result: RESULTS.includes(w.result) ? w.result : null,
        note: typeof w.note === 'string' ? w.note.slice(0, MAX_NOTE_LENGTH) : '',
      }
    })
}

// A finished minute of breathing (`startedAt` / `endedAt` in ms).
export function buildBreatheRecord({ id = makeId(), startedAt, endedAt, result = null, note = '' }) {
  const actualSeconds = Math.max(0, Math.min(BREATHE_SECONDS, Math.round((endedAt - startedAt) / 1000)))
  return {
    id,
    kind: 'breathe',
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    mode: 'timed',
    plannedMinutes: BREATHE_SECONDS / 60,
    actualSeconds,
    endedEarly: actualSeconds < BREATHE_SECONDS,
    result: RESULTS.includes(result) ? result : null,
    note: String(note ?? '').trim().slice(0, MAX_NOTE_LENGTH),
  }
}

// "Just log it": an urge ridden out without a walk or breathing, at `at` (ms). It passed, so result is 'yes'.
export function buildLoggedRecord({ id = makeId(), at, note = '', result = 'yes' }) {
  const iso = new Date(at).toISOString()
  return {
    id, kind: 'logged', startedAt: iso, endedAt: iso, mode: 'open', plannedMinutes: null,
    actualSeconds: 0, endedEarly: false, result: ['yes', 'kinda', 'no'].includes(result) ? result : 'yes', note: String(note ?? '').trim().slice(0, MAX_NOTE_LENGTH),
  }
}

// Returns { walks, recovered }. Oldest first.
export function loadWalks(storage = globalThis.localStorage) {
  const { items, recovered } = readList(WALKS_KEY, 'walks', sanitizeWalks, storage)
  return { walks: items, recovered }
}

// Replace the whole list (used by the Log tab after an edit or delete).
export function saveWalks(walks, storage = globalThis.localStorage) {
  return writeList(WALKS_KEY, 'walks', walks, storage)
}

// Add one finished walk. Returns true if it was saved.
export function appendWalk(record, storage = globalThis.localStorage) {
  const { walks } = loadWalks(storage)
  return writeList(WALKS_KEY, 'walks', [...walks, record], storage)
}

// Remove one record by id (Undo right after a save). Returns true if something was removed.
export function removeWalk(id, storage = globalThis.localStorage) {
  const { walks } = loadWalks(storage)
  const next = walks.filter((w) => w.id !== id)
  return next.length !== walks.length && writeList(WALKS_KEY, 'walks', next, storage)
}

// ---------- Walk in progress ----------

function validActiveWalk(w) {
  return (
    w && typeof w === 'object' &&
    typeof w.id === 'string' &&
    (w.plannedMinutes === null || (isNum(w.plannedMinutes) && w.plannedMinutes > 0)) &&
    isNum(w.startedAt) &&
    (w.pausedAt === null || isNum(w.pausedAt)) &&
    isNum(w.pausedMs) && w.pausedMs >= 0 &&
    (w.endedAt === null || isNum(w.endedAt)) &&
    isNum(w.messageOffset)
  )
}

export function loadActiveWalk(storage = globalThis.localStorage) {
  const w = readObject(ACTIVE_WALK_KEY, storage)
  if (!validActiveWalk(w)) {
    if (w != null) writeObject(ACTIVE_WALK_KEY, null, storage) // drop unusable data
    return null
  }
  return { ...w, endedEarly: Boolean(w.endedEarly) }
}

export function saveActiveWalk(walk, storage = globalThis.localStorage) {
  return writeObject(ACTIVE_WALK_KEY, walk ? { version: 1, ...walk } : null, storage)
}

// ---------- Preferences ----------
// choice: 5 | 10 | 15 | 'custom' | 'open'; customMinutes: last custom length (1-120)

export const WALK_CHOICES = [...WALK_OPTIONS, 'custom', 'open']

export function loadWalkPrefs(storage = globalThis.localStorage) {
  const prefs = readObject(WALK_PREFS_KEY, storage) || {}
  // Older versions only saved { minutes }.
  let choice = WALK_CHOICES.includes(prefs.choice) ? prefs.choice : null
  if (choice == null) choice = WALK_OPTIONS.includes(prefs.minutes) ? prefs.minutes : DEFAULT_MINUTES
  const customMinutes = prefs.customMinutes == null ? DEFAULT_CUSTOM_MINUTES : clampCustomMinutes(prefs.customMinutes)
  return { choice, customMinutes }
}

export function saveWalkPrefs({ choice, customMinutes }, storage = globalThis.localStorage) {
  return writeObject(WALK_PREFS_KEY, { version: 1, choice, customMinutes: clampCustomMinutes(customMinutes) }, storage)
}

// What to pass to startWalk(): minutes for a timed walk, or null for an open walk.
export function plannedMinutesFor({ choice, customMinutes }) {
  if (choice === 'open') return null
  if (choice === 'custom') return clampCustomMinutes(customMinutes)
  return choice
}

// "20 min" / "Open" for the Walk tile and the You tab.
export function lengthLabel({ choice, customMinutes }) {
  if (choice === 'open') return 'Open walk'
  return `${choice === 'custom' ? customMinutes : choice} min`
}
