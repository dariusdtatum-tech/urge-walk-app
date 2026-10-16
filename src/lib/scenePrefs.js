// Scene and sound settings (You → Appearance and lock). This phone only, not in the backup.
// urgewalk.v1.scenePrefs  { still, sound, soundId, timer }
//   still:   true = scenes never move (also automatic when the phone's Reduce Motion is on)
//   sound:   false by default; true plays the scene's sound during Ride it out and from Home's play button
//   soundId: 'paired' (the hero's own sound) or one sound id from SOUNDS
//   timer:   10 | 20 | 30 minutes, or 'walk' (the walk's length)
import { readObject, writeObject } from './storage.js'

export const SCENE_PREFS_KEY = 'urgewalk.v1.scenePrefs'
export const SCENE_LOOP = { periodMs: 8000, driftPx: 3 } // slow: 6–10 s loops, under 4 px
export const TIMERS = [10, 20, 30, 'walk']
export const SOUND_IDS = ['tide', 'shore', 'wind', 'rain']
export const DEFAULT_SCENE_PREFS = { still: false, sound: false, soundId: 'paired', timer: 20 }

export function loadScenePrefs(storage) {
  const p = readObject(SCENE_PREFS_KEY, storage) ?? {}
  return {
    still: p.still === true,
    sound: p.sound === true,
    soundId: SOUND_IDS.includes(p.soundId) ? p.soundId : 'paired',
    timer: TIMERS.includes(p.timer) ? p.timer : DEFAULT_SCENE_PREFS.timer,
  }
}
export function saveScenePrefs(patch, storage) {
  const next = { ...loadScenePrefs(storage), ...patch }
  writeObject(SCENE_PREFS_KEY, next, storage)
  return loadScenePrefs(storage)
}
