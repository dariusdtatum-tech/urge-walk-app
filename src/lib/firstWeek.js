// First-week shoreline path (idea 1). For the first 7 days after setup, Home shows one quiet card:
// seven dots along a shoreline and one small optional step a day. Missed days just stay open:
// no red marks, no streaks. After day 7 (or when every step is done or skipped) a calm
// "Your setup is complete" note shows once, then the card is gone for good.
// Six steps over seven days (day 7 is a rest day). Reasons are added only in You → Your why → Your
// reasons, so there's no reason step; old stored IDs (e.g. 'reason' in skipped) are simply ignored.
// urgewalk.v1.firstWeek  { shown, skipped: [id…], seenMap, completeDismissed }
import { daysBetween, todayISO } from './cleanTime.js'
import { readObject, writeObject } from './storage.js'

export const FIRST_WEEK_KEY = 'urgewalk.v1.firstWeek'
export const FIRST_WEEK_STEPS = [
  { id: 'start', title: 'Set your start date', sub: 'So your counter can start counting.' },
  { id: 'breathe', title: 'Try Breathe once', sub: 'One quiet minute.' },
  { id: 'contact', title: 'Add a trusted contact', sub: 'Someone to text when it’s hard.' },
  { id: 'walk', title: 'Take a 5-minute walk', sub: 'Short counts.' },
  { id: 'checkin', title: 'Do a check-in', sub: 'About 30 seconds.' },
  { id: 'map', title: 'Look at your Urge Map', sub: 'Your urges by time of day.' },
]

export function loadFirstWeek(storage) {
  const s = readObject(FIRST_WEEK_KEY, storage) || {}
  return { shown: s.shown === true, skipped: Array.isArray(s.skipped) ? s.skipped.filter((x) => typeof x === 'string') : [], seenMap: s.seenMap === true, completeDismissed: s.completeDismissed === true }
}
export const saveFirstWeek = (changes, storage) => writeObject(FIRST_WEEK_KEY, { ...loadFirstWeek(storage), ...changes }, storage)
export const skipStep = (id, storage) => saveFirstWeek({ skipped: [...new Set([...loadFirstWeek(storage).skipped, id])] }, storage)

// What's done, from the data the app already keeps.
export function doneSteps({ habits = [], contacts = [], walks = [], checkins = {}, fw }) {
  const kinds = new Set(walks.map((w) => w.kind ?? 'walk'))
  return {
    start: habits.length > 0,
    breathe: kinds.has('breathe'),
    contact: contacts.length > 0,
    walk: kinds.has('walk'),
    checkin: Object.keys(checkins.days ?? {}).length > 0,
    map: fw.seenMap,
  }
}

// mode: 'path' (the card), 'complete' (the one calm note) or null (nothing).
export function firstWeekView({ onboardedAt, now, done, fw }) {
  if (!onboardedAt) return { mode: null }
  const day = daysBetween(todayISO(new Date(onboardedAt)), todayISO(new Date(now)))
  if (day < 0) return { mode: null }
  const status = (s, i) => (done[s.id] ? 'done' : fw.skipped.includes(s.id) ? 'skipped' : i <= day ? 'open' : 'later')
  const dots = FIRST_WEEK_STEPS.map((s, i) => ({ id: s.id, status: status(s, i) }))
  const allSettled = dots.every((d) => d.status === 'done' || d.status === 'skipped')
  if (day >= 7 || allSettled) {
    // Only people who had the path get the note (existing users never see either).
    return fw.shown && !fw.completeDismissed ? { mode: 'complete', day } : { mode: null }
  }
  const step = FIRST_WEEK_STEPS.find((s, i) => dots[i].status === 'open') ?? null
  return { mode: 'path', day, dots, step, doneCount: dots.filter((d) => d.status === 'done').length }
}
