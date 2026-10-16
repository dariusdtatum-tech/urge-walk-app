// Home hero style: 'ring' (the default, always) or one of the optional styles 'tide', 'stones', 'trail'.
// urgewalk.v1.heroPrefs  { style }   Set in You → Appearance and lock → Home hero. This phone only.
import { readObject, writeObject } from './storage.js'

export const HERO_PREFS_KEY = 'urgewalk.v1.heroPrefs'
export const DEFAULT_HERO = 'ring'
export const HERO_STYLES = [
  { id: 'ring', label: 'Ring' },
  { id: 'tide', label: 'Tide' },
  { id: 'stones', label: 'Stones' },
  { id: 'trail', label: 'Trail' },
]
const IDS = HERO_STYLES.map((h) => h.id)
export const isHeroStyle = (s) => IDS.includes(s)
export const loadHeroStyle = (storage) => {
  const s = readObject(HERO_PREFS_KEY, storage)?.style
  return isHeroStyle(s) ? s : DEFAULT_HERO
}
export const saveHeroStyle = (style, storage) => {
  const s = isHeroStyle(style) ? style : DEFAULT_HERO
  writeObject(HERO_PREFS_KEY, { style: s }, storage)
  return s
}
