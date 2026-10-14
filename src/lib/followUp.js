// "How did it go?": one quiet local notification about 30 minutes after an urge, at most one per urge.
// urgewalk.v1.followUpPrefs  { enabled }                 (off for new installs; switch in You)
// urgewalk.v1.followUp       { asked: [urgeId…], pending: { urgeId, at } | null }
// The urge id is the saved record's id (walk, breathe or log), so the answer lands on that entry.
import { readObject, writeObject } from './storage.js'
import { WALKS_KEY, loadWalks } from './walkStorage.js'
import { writeList } from './storage.js'

export const FOLLOWUP_PREFS_KEY = 'urgewalk.v1.followUpPrefs'
export const FOLLOWUP_STATE_KEY = 'urgewalk.v1.followUp'
export const FOLLOWUP_DELAY_S = 30 * 60
export const FOLLOWUP_ANSWERS = ['passed', 'tough', 'skip']
export const FOLLOWUP_LABELS = { passed: 'It passed', tough: 'Still tough', skip: 'Skip' }
export const FOLLOWUP_CONTENT = { title: 'Checking in', body: 'How’s it going? Tap to answer, or skip.' }
const MAX_ASKED = 200

export const loadFollowUpEnabled = (storage) => readObject(FOLLOWUP_PREFS_KEY, storage)?.enabled === true
// Run once at app start, before setup can create data. Off for new installs; people who already
// had data before this setting existed had it on, so they keep it on. Never changes a saved choice.
export function settleFollowUpDefault(storage, hadData) {
  if (readObject(FOLLOWUP_PREFS_KEY, storage)) return
  writeObject(FOLLOWUP_PREFS_KEY, { enabled: Boolean(hadData) }, storage)
}
export const saveFollowUpEnabled = (enabled, storage) => writeObject(FOLLOWUP_PREFS_KEY, { enabled: Boolean(enabled) }, storage)

function loadState(storage) {
  const s = readObject(FOLLOWUP_STATE_KEY, storage)
  const asked = Array.isArray(s?.asked) ? s.asked.filter((x) => typeof x === 'string') : []
  const p = s?.pending
  const pending = p && typeof p.urgeId === 'string' && Number.isFinite(p.at) ? { urgeId: p.urgeId, at: p.at } : null
  return { asked, pending }
}
export const pendingFollowUp = (storage) => loadState(storage).pending

// True if a follow-up should be scheduled for this urge now (and records it). Max one per urge.
export function claimFollowUp(urgeId, storage, now = Date.now()) {
  if (!urgeId || !loadFollowUpEnabled(storage)) return false
  const s = loadState(storage)
  if (s.asked.includes(urgeId)) return false
  writeObject(FOLLOWUP_STATE_KEY, { asked: [...s.asked, urgeId].slice(-MAX_ASKED), pending: { urgeId, at: now } }, storage)
  return true
}

// Save the answer on that entry (if it still exists) and clear the pending follow-up.
// Returns the answer saved, or null if it wasn't valid.
export function answerFollowUp(urgeId, answer, storage) {
  if (!FOLLOWUP_ANSWERS.includes(answer)) return null
  const s = loadState(storage)
  writeObject(FOLLOWUP_STATE_KEY, { asked: s.asked, pending: s.pending?.urgeId === urgeId ? null : s.pending }, storage)
  const { walks } = loadWalks(storage)
  if (walks.some((w) => w.id === urgeId)) {
    writeList(WALKS_KEY, 'walks', walks.map((w) => (w.id === urgeId ? { ...w, followUp: answer } : w)), storage)
  }
  return answer
}

// Turning it off clears anything pending.
export function clearPendingFollowUp(storage) {
  const s = loadState(storage)
  writeObject(FOLLOWUP_STATE_KEY, { asked: s.asked, pending: null }, storage)
}
