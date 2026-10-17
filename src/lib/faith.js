// Legacy Faith content setting (read-only now). Its only feature was the Daily verse, which became the
// Verse choice of the daily line (lib/dailyLine.js); anyone who had it on is migrated to 'verse'.
// urgewalk.v1.optionalContent  { faith }   saved on this phone only. Onboarding never asks about it.
// Earlier builds stored the verse choice in urgewalk.v1.versePrefs { enabled }; that choice is carried over.
import { readObject, writeObject } from './storage.js'

export const OPTIONAL_CONTENT_KEY = 'urgewalk.v1.optionalContent'
const LEGACY_VERSE_KEY = 'urgewalk.v1.versePrefs'

export function loadFaithOn(storage) {
  const v = readObject(OPTIONAL_CONTENT_KEY, storage)
  if (v && typeof v.faith === 'boolean') return v.faith
  return readObject(LEGACY_VERSE_KEY, storage)?.enabled === true
}
export function saveFaithOn(on, storage) {
  const cur = readObject(OPTIONAL_CONTENT_KEY, storage) || {}
  writeObject(OPTIONAL_CONTENT_KEY, { ...cur, faith: Boolean(on) }, storage)
  return Boolean(on)
}
