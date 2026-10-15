// Optional app lock: off by default. When on, Urge Walk asks for Face ID (or the phone's passcode)
// at cold start and whenever it comes back from the background. 988 stays reachable while locked.
// urgewalk.v1.appLock  { enabled }
import { readObject, writeObject } from './storage.js'

export const APP_LOCK_KEY = 'urgewalk.v1.appLock'
export const loadAppLock = (storage) => readObject(APP_LOCK_KEY, storage)?.enabled === true
export const saveAppLock = (on, storage) => writeObject(APP_LOCK_KEY, { enabled: Boolean(on) }, storage)

// What the app shows for a given lock state and AppState.
// cover: content hidden (locked, or the app is inactive/backgrounded so the app switcher snapshot is blank)
export function lockView({ enabled, locked, appState }) {
  if (!enabled) return { cover: false, unlockable: false }
  if (locked) return { cover: true, unlockable: appState === 'active' }
  return { cover: appState !== 'active', unlockable: false }
}

export const LOCK_ERRORS = {
  unavailable: 'Set up Face ID or a passcode on this phone first.',
  failed: 'That didn’t unlock. You can try again.',
}
