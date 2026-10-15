// Your reasons: a few private reasons kept on this phone (a photo, a short voice note, or words).
// urgewalk.v1.reasons  { version: 1, reasons: [{ id, kind, text, uri, durationMs, at }], next, lock }
// One reason fades in at the top of Walk and Breathe after Ride it out, a different one each time.
// Photos and voice notes are copied into the app's own folder; only words go into a backup.
// Never shown in notifications or on the Lock Screen. Face ID lock is optional.
import { makeId, readObject, writeObject } from './storage.js'

export const REASONS_KEY = 'urgewalk.v1.reasons'
export const MAX_REASONS = 12
export const MAX_REASON_TEXT = 200
export const MAX_VOICE_MS = 60_000
export const REASON_KINDS = ['text', 'photo', 'voice']

const cleanText = (s) => (typeof s === 'string' ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_REASON_TEXT) : '')
const cleanUri = (s) => (typeof s === 'string' && s.length > 0 && s.length < 2048 ? s : null)

export function sanitizeReason(r) {
  if (!r || typeof r !== 'object' || !REASON_KINDS.includes(r.kind)) return null
  const text = cleanText(r.text)
  const uri = cleanUri(r.uri)
  if (r.kind === 'text' && !text) return null
  if (r.kind !== 'text' && !uri) return null
  const out = { id: typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : makeId(), kind: r.kind, text, at: typeof r.at === 'string' ? r.at : new Date(0).toISOString() }
  if (uri) out.uri = uri
  if (r.kind === 'voice') out.durationMs = Math.max(0, Math.min(MAX_VOICE_MS, Math.round(Number(r.durationMs) || 0)))
  return out
}

export function sanitizeReasonsData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const seen = new Set()
  const reasons = []
  for (const r of Array.isArray(raw.reasons) ? raw.reasons : []) {
    const clean = sanitizeReason(r)
    if (!clean || seen.has(clean.id) || reasons.length >= MAX_REASONS) continue
    seen.add(clean.id); reasons.push(clean)
  }
  const next = Number.isInteger(raw.next) && raw.next >= 0 ? raw.next : 0
  return { version: 1, reasons, next, lock: raw.lock === true }
}

export const loadReasonsData = (storage) => sanitizeReasonsData(readObject(REASONS_KEY, storage)) ?? { version: 1, reasons: [], next: 0, lock: false }
export const saveReasonsData = (data, storage) => writeObject(REASONS_KEY, sanitizeReasonsData(data), storage)
export const loadReasons = (storage) => loadReasonsData(storage).reasons
// Your why everywhere (Home line, Your why sheet, You status): the saved reasons plus the "why"
// sentence from setup, so a why written during onboarding never sits next to "No reasons yet".
// The setup why is read-only here (edit it in You → Your why → Your answers) and isn't duplicated.
export const SETUP_WHY_ID = 'setup-why'
export function whyReasons(storage, profile) {
  const saved = loadReasons(storage)
  const why = cleanText(profile?.why || '')
  if (!why || saved.some((r) => r.text.toLowerCase() === why.toLowerCase())) return saved
  return [{ id: SETUP_WHY_ID, kind: 'text', text: why, at: profile?.onboardedAt || new Date(0).toISOString(), setup: true }, ...saved]
}

// Returns { ok, error, reason }.
export function addReason(storage, reason, now = new Date()) {
  const data = loadReasonsData(storage)
  if (data.reasons.length >= MAX_REASONS) return { ok: false, error: `Up to ${MAX_REASONS} reasons.` }
  const clean = sanitizeReason({ ...reason, id: makeId(), at: now.toISOString() })
  if (!clean) return { ok: false, error: reason?.kind === 'text' ? 'Write a few words first.' : 'That didn’t save. Try again.' }
  saveReasonsData({ ...data, reasons: [...data.reasons, clean] }, storage)
  return { ok: true, reason: clean }
}

// Returns the removed reason (so its file can be deleted) or null.
export function removeReason(storage, id) {
  const data = loadReasonsData(storage)
  const gone = data.reasons.find((r) => r.id === id) ?? null
  if (gone) saveReasonsData({ ...data, reasons: data.reasons.filter((r) => r.id !== id) }, storage)
  return gone
}

export const setReasonsLock = (storage, lock) => saveReasonsData({ ...loadReasonsData(storage), lock: Boolean(lock) }, storage)

// The reason to show now; moves the pointer so the next Ride it out shows the next one.
export function takeNextReason(storage) {
  const data = loadReasonsData(storage)
  if (data.reasons.length === 0) return null
  const i = data.next % data.reasons.length
  saveReasonsData({ ...data, next: (i + 1) % data.reasons.length }, storage)
  return data.reasons[i]
}

// What a backup carries: words only. Photos and voice notes stay on this phone.
export function reasonsForBackup(raw) {
  const data = sanitizeReasonsData(raw)
  if (!data) return null
  const reasons = data.reasons.filter((r) => r.kind === 'text')
  return reasons.length || data.lock ? { ...data, reasons, next: 0 } : null
}

export const mediaUris = (storage) => loadReasons(storage).filter((r) => r.uri).map((r) => r.uri)
export const formatVoiceLength = (ms) => { const s = Math.max(1, Math.round((ms || 0) / 1000)); return `0:${String(Math.min(s, 59)).padStart(2, '0')}`.replace(/^0:(\d\d)$/, s >= 60 ? '1:00' : '0:$1') }
