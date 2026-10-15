// Tracker switcher style: 'sheet' (default, a bottom sheet) or 'drawer' (the left slide-over).
// urgewalk.v1.switcherPrefs  { style }   Set in You → Appearance and lock.
import { readObject, writeObject } from './storage.js'

export const SWITCHER_PREFS_KEY = 'urgewalk.v1.switcherPrefs'
export const SWITCHER_STYLES = ['drawer', 'sheet']
export const DEFAULT_SWITCHER = 'sheet'
export const loadSwitcher = (storage) => {
  const s = readObject(SWITCHER_PREFS_KEY, storage)?.style
  return SWITCHER_STYLES.includes(s) ? s : DEFAULT_SWITCHER
}
export const saveSwitcher = (style, storage) => writeObject(SWITCHER_PREFS_KEY, { style: SWITCHER_STYLES.includes(style) ? style : DEFAULT_SWITCHER }, storage)
