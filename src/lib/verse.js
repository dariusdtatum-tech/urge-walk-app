// Daily verse (opt-in, You tab only). One short public-domain verse a day on endurance and freedom.
// Local list, rotated by day of year: offline, deterministic, the same all day.
// Gated by the Faith content switch (lib/faith.js), off by default.
// Never shown on Home, Ride it out, the Lock Screen, notifications or in onboarding.
import VERSES from '../content/verses.json'
import { loadFaithOn, saveFaithOn } from './faith.js'

export const VERSE_PREFS_KEY = 'urgewalk.v1.versePrefs'
export const VERSE_TRANSLATIONS = ['KJV', 'WEB']
export const MAX_VERSE_CHARS = 160 // about 4 lines at 18/24 on a 390pt-wide phone
export { VERSES }

// The verse follows the one Faith content switch.
export const loadVerseEnabled = (storage) => loadFaithOn(storage)
export const saveVerseEnabled = (on, storage) => saveFaithOn(on, storage)

// 1-366, local time.
export function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1)
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((today - start) / 86_400_000) + 1
}
export const verseFor = (date = new Date(), list = VERSES) => list[(dayOfYear(date) - 1) % list.length]
export const refLine = (v) => `${v.ref} · ${v.tr}`
export const verseLabel = (v) => `${v.text.replace(/^[(\s]+|[\s,;:.)]+$/g, '')}, ${v.ref}`
