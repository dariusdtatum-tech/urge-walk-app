// Appearance: follow the phone (System) or force Light / Dark. Same key and values as the PWA's
// theme.js. Kept on this phone only (not part of the backup file, like the PWA).
export const THEME_KEY = 'urgewalk.v1.theme'
export const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function loadTheme(storage = globalThis.localStorage) {
  try {
    const v = storage?.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function saveTheme(theme, storage = globalThis.localStorage) {
  const t = theme === 'light' || theme === 'dark' ? theme : 'system'
  try {
    if (t === 'system') storage.removeItem(THEME_KEY)
    else storage.setItem(THEME_KEY, t)
  } catch {
    // storage full or blocked: still applies for this session
  }
  return t
}
