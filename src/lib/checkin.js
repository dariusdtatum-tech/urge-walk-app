// Daily check-in: Steady / Shaky / Rough, an optional one word, an optional 3-second hold to commit.
// urgewalk.v1.checkins      { version: 1, days: { 'YYYY-MM-DD': { mood, word?, committed?, at } } }
// urgewalk.v1.checkinPrefs  { reminder: { hour, minute } | null }   (a daily local notification, off by default)
// A missed day is simply absent. Nothing counts streaks or marks gaps.
import { readObject, writeObject } from './storage.js'

export const CHECKINS_KEY = 'urgewalk.v1.checkins'
export const CHECKIN_PREFS_KEY = 'urgewalk.v1.checkinPrefs'
export const MOODS = [
  { id: 'steady', label: 'Steady' },
  { id: 'shaky', label: 'Shaky' },
  { id: 'rough', label: 'Rough' },
]
export const MOOD_IDS = MOODS.map((m) => m.id)
export const COMMIT_HOLD_MS = 3000 // any hold in the app is at least 3 seconds
export const MAX_WORD = 24
const MAX_DAYS = 3660
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

// One word: the first word typed, trimmed and capped.
export function cleanWord(s) {
  if (typeof s !== 'string') return ''
  return (s.trim().split(/\s+/)[0] || '').slice(0, MAX_WORD)
}

export function sanitizeCheckins(raw) {
  const days = {}
  const src = raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object' ? raw.days : {}
  for (const [day, v] of Object.entries(src).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, MAX_DAYS)) {
    if (!DAY_RE.test(day) || !v || !MOOD_IDS.includes(v.mood)) continue
    const word = cleanWord(v.word)
    days[day] = { mood: v.mood, ...(word ? { word } : {}), ...(v.committed === true ? { committed: true } : {}), at: Number.isFinite(v.at) ? v.at : 0 }
  }
  return { version: 1, days }
}

export const loadCheckins = (storage) => sanitizeCheckins(readObject(CHECKINS_KEY, storage))
export const saveCheckins = (data, storage) => writeObject(CHECKINS_KEY, sanitizeCheckins(data), storage)
export const checkinFor = (storage, day) => loadCheckins(storage).days[day] ?? null

export function saveCheckIn(day, { mood, word = '', committed = false }, storage, now = Date.now()) {
  if (!DAY_RE.test(day) || !MOOD_IDS.includes(mood)) return false
  const data = loadCheckins(storage)
  data.days[day] = { mood, ...(cleanWord(word) ? { word: cleanWord(word) } : {}), ...(committed ? { committed: true } : {}), at: now }
  return saveCheckins(data, storage)
}

// ---------- Reminder ----------
export function loadReminder(storage) {
  const r = readObject(CHECKIN_PREFS_KEY, storage)?.reminder
  return r && Number.isInteger(r.hour) && r.hour >= 0 && r.hour < 24 && Number.isInteger(r.minute) && r.minute >= 0 && r.minute < 60 ? { hour: r.hour, minute: r.minute } : null
}
export const saveReminder = (reminder, storage) => writeObject(CHECKIN_PREFS_KEY, { reminder: reminder ? { hour: reminder.hour, minute: reminder.minute } : null }, storage)
export const DEFAULT_REMINDER = { hour: 8, minute: 30 }
export function reminderLabel(r) {
  if (!r) return 'Off'
  const h = r.hour % 12 || 12
  return `${h}:${String(r.minute).padStart(2, '0')} ${r.hour < 12 ? 'AM' : 'PM'}`
}
// Step the reminder time by 15 minutes (wraps around the day).
export function stepReminder(r, dir) {
  const total = (((r.hour * 60 + r.minute + dir * 15) % 1440) + 1440) % 1440
  return { hour: Math.floor(total / 60), minute: total % 60 }
}
export const CHECKIN_REMINDER_CONTENT = { title: 'Morning check-in', body: 'Thirty seconds: how are you today?' }
