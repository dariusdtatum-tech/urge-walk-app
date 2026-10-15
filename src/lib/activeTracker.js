// The one tracker shown on Home (chosen in the drawer or "Show on Home"). One stored setting.
// urgewalk.v1.activeTracker  { id }
import { readObject, writeObject } from './storage.js'

export const ACTIVE_TRACKER_KEY = 'urgewalk.v1.activeTracker'
export const loadActiveTrackerId = (storage) => { const id = readObject(ACTIVE_TRACKER_KEY, storage)?.id; return typeof id === 'string' ? id : null }
export const saveActiveTrackerId = (id, storage) => writeObject(ACTIVE_TRACKER_KEY, { id }, storage)
