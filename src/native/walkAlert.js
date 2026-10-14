// A local notification when a timed walk's time is up, so a locked phone in a pocket still alerts.
// One alert at a time: (re)scheduled on start / resume / +5 min, cancelled on pause / finish / cancel.
// Open walks (no end time) never get one. `N` is expo-notifications (injected for tests).
import { isEnded, isOpen, isPaused, remainingMs } from '../lib/walkTimer.js'

export const WALK_ALERT_ID = 'urgewalk-walk-end'
export const WALK_ALERT_CONTENT = { title: 'Walk done', body: 'Time’s up. Open Urge Walk to check in.', sound: true }

export function alertSecondsFor(walk, now) {
  if (!walk || isOpen(walk) || isPaused(walk) || isEnded(walk)) return null
  const s = Math.ceil(remainingMs(walk, now) / 1000)
  return s >= 1 ? s : null
}

export async function syncWalkAlert(N, walk, now = Date.now()) {
  try {
    await N.cancelScheduledNotificationAsync(WALK_ALERT_ID)
    const seconds = alertSecondsFor(walk, now)
    if (seconds == null) return null
    let perm = await N.getPermissionsAsync()
    if (!perm.granted && perm.canAskAgain !== false) perm = await N.requestPermissionsAsync()
    if (!perm.granted) return null // the on-screen timer still works without it
    await N.scheduleNotificationAsync({
      identifier: WALK_ALERT_ID,
      content: WALK_ALERT_CONTENT,
      trigger: { type: 'timeInterval', seconds, repeats: false },
    })
    return seconds
  } catch {
    return null // alerts are a nice extra, never required
  }
}
