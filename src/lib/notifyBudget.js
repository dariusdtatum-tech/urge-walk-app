// One calm notification budget (idea 5). Only notifications the app decides to send count:
// the "How did it go?" follow-up. Your own reminders (the daily check-in you set, a walk timer
// you started) never count and are never blocked.
// - at most BUDGET.perDay counted notifications a day (default 1)
// - none in quiet hours, 10 PM to 8 AM (by the phone's clock)
// urgewalk.v1.notifyLog   { sent: [ms…] }  fire times of counted notifications (last 14 days)
// urgewalk.v1.notifyPrefs { walkAlert }    the walk timer's "time's up" alert (on unless turned off)
import { FOLLOWUP_CONTENT, FOLLOWUP_DELAY_S } from './followUp.js'
import { CHECKIN_REMINDER_CONTENT, reminderLabel } from './checkin.js'
import { readObject, writeObject } from './storage.js'

export const NOTIFY_LOG_KEY = 'urgewalk.v1.notifyLog'
export const NOTIFY_PREFS_KEY = 'urgewalk.v1.notifyPrefs'
export const BUDGET = { perDay: 1, quietStart: 22, quietEnd: 8 }
const DAY = 86400000

export const inQuietHours = (ms) => { const h = new Date(ms).getHours(); return h >= BUDGET.quietStart || h < BUDGET.quietEnd }
const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
const loadSent = (storage) => { const s = readObject(NOTIFY_LOG_KEY, storage)?.sent; return Array.isArray(s) ? s.filter(Number.isFinite) : [] }

// Would a counted notification firing at `fireAt` fit the budget?
export function fitsBudget(fireAt, storage) {
  if (inQuietHours(fireAt)) return false
  return loadSent(storage).filter((t) => dayKey(t) === dayKey(fireAt)).length < BUDGET.perDay
}
export function recordSent(fireAt, storage) {
  const sent = [...loadSent(storage).filter((t) => t > fireAt - 14 * DAY), fireAt]
  return writeObject(NOTIFY_LOG_KEY, { sent }, storage)
}
// Forget a counted notification that was cancelled before it fired (so it doesn't use up the day).
export function unrecordSent(fireAt, storage) {
  return writeObject(NOTIFY_LOG_KEY, { sent: loadSent(storage).filter((t) => t !== fireAt) }, storage)
}
export const followUpFireAt = (now) => now + FOLLOWUP_DELAY_S * 1000

export const loadNotifyPrefs = (storage) => ({ walkAlert: readObject(NOTIFY_PREFS_KEY, storage)?.walkAlert !== false })
export const saveNotifyPrefs = (changes, storage) => writeObject(NOTIFY_PREFS_KEY, { ...loadNotifyPrefs(storage), ...changes }, storage)

// What this week's notifications will say, each with its switch state. Plain words, never guilt.
export function weekPreview({ reminder, followUpOn, walkAlertOn }) {
  return [
    { id: 'checkin', on: !!reminder, counts: false, when: reminder ? `Every day at ${reminderLabel(reminder)}` : 'Off', title: CHECKIN_REMINDER_CONTENT.title, body: CHECKIN_REMINDER_CONTENT.body },
    { id: 'followUp', on: followUpOn, counts: true, when: followUpOn ? 'About 30 minutes after an urge, at most once a day, never 10 PM–8 AM' : 'Off', title: FOLLOWUP_CONTENT.title, body: FOLLOWUP_CONTENT.body },
    { id: 'walkAlert', on: walkAlertOn, counts: false, when: walkAlertOn ? 'When a timed walk you started is done' : 'Off', title: 'Walk done', body: 'Time’s up. Open Urge Walk to check in.' },
  ]
}
