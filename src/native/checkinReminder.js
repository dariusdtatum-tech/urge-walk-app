// The optional daily check-in reminder (local, repeats daily). `N` is expo-notifications.
import { CHECKIN_REMINDER_CONTENT } from '../lib/checkin.js'

import { CHECKIN_REMINDER_ID } from '../lib/checkinIds.js'

export { CHECKIN_REMINDER_ID }

export async function syncCheckinReminder(N, reminder) {
  try {
    await N.cancelScheduledNotificationAsync(CHECKIN_REMINDER_ID)
    if (!reminder) return false
    let perm = await N.getPermissionsAsync()
    if (!perm.granted && perm.canAskAgain !== false) perm = await N.requestPermissionsAsync()
    if (!perm.granted) return false
    await N.scheduleNotificationAsync({
      identifier: CHECKIN_REMINDER_ID,
      content: { ...CHECKIN_REMINDER_CONTENT, data: { kind: 'checkin' } },
      trigger: { type: 'daily', hour: reminder.hour, minute: reminder.minute },
    })
    return true
  } catch {
    return false
  }
}

// Calls cb() when the check-in reminder is tapped (including a cold start). Returns unsubscribe.
export function listenCheckin(N, cb) {
  const seen = new Set()
  const handle = (r) => {
    if (r?.notification?.request?.content?.data?.kind !== 'checkin') return
    const key = `${r.notification.request.identifier}:${r.notification.date}`
    if (seen.has(key)) return
    seen.add(key)
    cb()
  }
  N.getLastNotificationResponseAsync?.().then((r) => { if (r) handle(r) }).catch(() => {})
  const sub = N.addNotificationResponseReceivedListener(handle)
  return () => sub?.remove?.()
}
