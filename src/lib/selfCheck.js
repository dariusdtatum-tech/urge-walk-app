// Launch self-check (idea 6): quiet, on-device, no alerts. Runs at launch and when the app comes back.
// - storage opens and a write survives a read back
// - the daily check-in reminder (if on) is really scheduled; reschedule it silently if not
// - if notifications are off in Settings while a reminder is on, You shows one calm row
// The backup reminder already has its own gentle Home nudge, so it isn't repeated here.
import { CHECKIN_REMINDER_ID } from './checkinIds.js'

export const PROBE_KEY = 'urgewalk.v1.probe'

export function probeStorage(storage, now = Date.now()) {
  try {
    const v = String(now)
    storage.setItem(PROBE_KEY, v)
    return storage.getItem(PROBE_KEY) === v
  } catch {
    return false
  }
}

// status: { permission: 'granted' | 'denied' | 'undetermined' | null, scheduled: string[] | null } (null = unknown, e.g. web)
export function planSelfCheck({ reminder, status, storageOk }) {
  const issues = []
  let reschedule = false
  if (!storageOk) issues.push({ id: 'storage', title: 'Saving isn’t working right now', sub: 'What’s already saved is safe. Try closing and reopening Urge Walk.' })
  if (reminder && status?.permission && status.permission !== 'granted') {
    issues.push({ id: 'notifications', title: 'Reminders are off in Settings', sub: 'Your check-in reminder can’t show until notifications are on.', action: 'Turn on' })
  } else if (reminder && Array.isArray(status?.scheduled) && !status.scheduled.includes(CHECKIN_REMINDER_ID)) {
    reschedule = true
  }
  return { reschedule, issues }
}
