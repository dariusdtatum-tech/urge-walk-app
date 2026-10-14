// Saves data in this device's localStorage. Nothing ever leaves the phone.
// Each list is stored as { version: 1, <field>: [...] } under a versioned key.
import { isValidISODate, todayISO } from './cleanTime.js'

export const HABITS_KEY = 'urgewalk.v1.habits'
export const MAX_NAME_LENGTH = 60

// Make an id without relying on crypto.randomUUID (missing on some older iPhones).
export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Copy unreadable data to a backup key instead of throwing it away.
function backupCorrupt(key, raw, storage) {
  try {
    storage.setItem(`${key}.corrupt-${Date.now()}`, raw)
  } catch {
    // ignore: backup is best-effort
  }
}

// Generic reader. Returns { items, recovered } where `recovered` is true if
// saved data was damaged (unreadable, or some entries had to be dropped).
export function readList(key, field, sanitize, storage = globalThis.localStorage) {
  let raw
  try {
    raw = storage.getItem(key)
  } catch {
    return { items: [], recovered: false } // storage blocked (e.g. strict privacy mode)
  }
  if (raw == null) return { items: [], recovered: false }

  try {
    const data = JSON.parse(raw)
    const list = Array.isArray(data) ? data : data && data[field]
    if (!Array.isArray(list)) throw new Error('unexpected shape')
    const items = sanitize(list)
    return { items, recovered: items.length !== list.length }
  } catch {
    backupCorrupt(key, raw, storage)
    return { items: [], recovered: true }
  }
}

export function writeList(key, field, items, storage = globalThis.localStorage) {
  try {
    storage.setItem(key, JSON.stringify({ version: 1, [field]: items }))
    return true
  } catch {
    return false
  }
}

// Read a single JSON object (or null). Broken data is backed up and treated as missing.
export function readObject(key, storage = globalThis.localStorage) {
  let raw
  try {
    raw = storage.getItem(key)
  } catch {
    return null
  }
  if (raw == null) return null
  try {
    return JSON.parse(raw)
  } catch {
    backupCorrupt(key, raw, storage)
    return null
  }
}

export function writeObject(key, value, storage = globalThis.localStorage) {
  try {
    if (value == null) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

// ---------- Habits (clean-time tracker) ----------

// Keep only well-formed habits; quietly drop anything broken.
export const MAX_RESETS = 500

export function sanitizeResets(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((r) => r && typeof r === 'object' && isValidISODate(r.prevStartDate) && isValidISODate(r.startDate) && !Number.isNaN(Date.parse(r.at)))
    .map((r) => ({
      at: new Date(r.at).toISOString(),
      prevStartDate: r.prevStartDate,
      prevStartedAt: typeof r.prevStartedAt === 'string' && !Number.isNaN(Date.parse(r.prevStartedAt)) ? new Date(r.prevStartedAt).toISOString() : null,
      startDate: r.startDate,
    }))
    .slice(-MAX_RESETS)
}

// startedAt is only kept if it falls on startDate (local), otherwise it's dropped.
export function cleanStartedAt(startedAt, startDate) {
  if (typeof startedAt !== 'string' || Number.isNaN(Date.parse(startedAt))) return null
  return todayISO(new Date(startedAt)) === startDate ? new Date(startedAt).toISOString() : null
}

export function sanitizeHabits(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((h) => h && typeof h === 'object')
    .filter((h) => typeof h.name === 'string' && h.name.trim() !== '')
    .filter((h) => isValidISODate(h.startDate))
    .map((h) => ({
      id: typeof h.id === 'string' && h.id ? h.id : makeId(),
      name: h.name.trim().slice(0, MAX_NAME_LENGTH),
      startDate: h.startDate,
      // Optional (added with Never zero): when the count started, and past resets for Undo / the 30-day strip.
      ...(cleanStartedAt(h.startedAt, h.startDate) ? { startedAt: cleanStartedAt(h.startedAt, h.startDate) } : {}),
      ...(Array.isArray(h.resets) && sanitizeResets(h.resets).length ? { resets: sanitizeResets(h.resets) } : {}),
    }))
}

export function loadHabits(storage = globalThis.localStorage) {
  const { items, recovered } = readList(HABITS_KEY, 'habits', sanitizeHabits, storage)
  return { habits: items, recovered }
}

export function saveHabits(habits, storage = globalThis.localStorage) {
  return writeList(HABITS_KEY, 'habits', habits, storage)
}
