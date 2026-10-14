// Small "moment" flags kept on this phone, so the app can stay quiet when someone is struggling
// and give clear closure after a save.
import { readObject, writeObject } from './storage.js'

export const STRESS_KEY = 'urgewalk.v1.lastStressAt' // { at } ride it out / walk / breathe / reset
export const SAVED_KEY = 'urgewalk.v1.lastSaved' // { at, id } the last ride-it-out save
export const BANNER_KEY = 'urgewalk.v1.undoBannerDismissed' // { list: [reset.at, ...] } dismissed undo banners
const BANNER_KEEP = 20
export const CALM_AFTER_MS = 30 * 60 * 1000
export const HIGHLIGHT_MS = 12 * 1000

// A stressful moment just happened (Ride it out opened, a walk/breath started, a reset).
export function markStress(now = Date.now(), storage = globalThis.localStorage) {
  writeObject(STRESS_KEY, { at: now }, storage)
}
// Calm visit: nothing stressful in the last 30 minutes. Reminders (like backup) wait for this.
export function isCalm(now = Date.now(), storage = globalThis.localStorage) {
  const at = readObject(STRESS_KEY, storage)?.at
  return !(typeof at === 'number' && now - at >= 0 && now - at < CALM_AFTER_MS)
}

// After a save: Home briefly highlights the "urges ridden out" number.
export function markSaved(id, now = Date.now(), storage = globalThis.localStorage) {
  writeObject(SAVED_KEY, { at: now, id }, storage)
}
export function recentlySaved(now = Date.now(), storage = globalThis.localStorage) {
  const at = readObject(SAVED_KEY, storage)?.at
  return typeof at === 'number' && now - at >= 0 && now - at < HIGHLIGHT_MS
}

// The Home undo banner for a reset can be dismissed; it stays dismissed for that reset only.
// One entry per reset (each tracker has its own), so dismissing one banner never hides another.
// Older versions stored a single { at }; that is read as a one-item list.
function dismissedList(storage) {
  const v = readObject(BANNER_KEY, storage)
  if (Array.isArray(v?.list)) return v.list.filter((x) => typeof x === 'string')
  if (typeof v?.at === 'string') return [v.at]
  return []
}
export function bannerDismissed(resetAt, storage = globalThis.localStorage) {
  return dismissedList(storage).includes(resetAt)
}
export function dismissBanner(resetAt, storage = globalThis.localStorage) {
  const list = dismissedList(storage).filter((x) => x !== resetAt)
  list.push(resetAt)
  writeObject(BANNER_KEY, { list: list.slice(-BANNER_KEEP) }, storage)
}
