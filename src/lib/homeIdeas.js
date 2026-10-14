// Pure helpers for the Home ideas: clean time (ring page 2), Never zero (lifetime total,
// 30-day strip, kind resets with undo), the daily line and the Time back estimate.
import { cleanDayCount, daysBetween, parseISODate, todayISO } from './cleanTime.js'
import { addDaysISO, earnedList, milestoneName, milestoneShort, ringSegment } from './milestones.js'
import { IMPROVE } from './profile.js'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

// ---------- Tracker shape additions (both optional, older data has neither) ----------
// habit.startedAt: ISO time the count started, when known (a reset "today" records the moment).
//   Without it the count starts at local midnight of startDate.
// habit.resets: [{ at: ISO, prevStartDate, prevStartedAt | null, startDate }] newest last.
//   Each is one "new count"; the previous start is kept so Undo can put it back exactly,
//   and so the 30-day strip knows which day was the slip.
export { MAX_RESETS, cleanStartedAt, sanitizeResets } from './storage.js'
import { sanitizeResets } from './storage.js'

const localMidnight = (iso) => { const p = parseISODate(iso); return new Date(p.y, p.m - 1, p.d).getTime() }
export const startMs = (habit) => (habit.startedAt ? Date.parse(habit.startedAt) : localMidnight(habit.startDate))

// ---------- Clean time (page 2) ----------
// Days and hours only, no seconds. "165 days, 9 hours".
// days: the shared calendar-day count (same number as the ring). hours: hours so far today,
// counted from local midnight, or from the start moment if the count started today.
export function cleanTime(habit, now = Date.now()) {
  const d = new Date(now)
  const today = todayISO(d)
  const days = cleanDayCount(habit.startDate, today)
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const from = Math.max(midnight, startMs(habit))
  return { days, hours: Math.max(0, Math.floor((now - from) / HOUR_MS)) }
}
export const cleanTimeLabel = ({ days, hours }) =>
  `${days} ${days === 1 ? 'day' : 'days'}, ${hours} ${hours === 1 ? 'hour' : 'hours'} clean`

// ms until the next minute boundary (so the once-a-minute update lines up with the clock).
export const msToNextMinute = (now = Date.now()) => 60_000 - (now % 60_000)

// "Mon, Apr 27" (+ " · 11:40 PM" when the start moment is known)
export function sinceLabel(habit) {
  const p = parseISODate(habit.startDate)
  const date = new Date(p.y, p.m - 1, p.d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (!habit.startedAt) return date
  return `${date} · ${new Date(habit.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}
const dayDate = (iso) => { const p = parseISODate(iso); return new Date(p.y, p.m - 1, p.d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }

// Last and next milestone cards, with exact dates.
// last: the milestone this count last reached (date = start + days); before the first one of this
// count, the most recent one earned earlier (kept after a reset); null if none yet.
export function milestoneCards(habit, milestones, today = todayISO()) {
  const days = cleanDayCount(habit.startDate, today)
  const seg = ringSegment(days)
  const reachedNow = seg.isToday ? seg.next : seg.prev
  let last = null
  if (reachedNow > 0) {
    last = { milestone: reachedNow, name: milestoneName(reachedNow), short: milestoneShort(reachedNow), date: addDaysISO(habit.startDate, reachedNow) }
  } else {
    const earned = earnedList(milestones, habit.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    if (earned) last = { milestone: earned.milestone, name: milestoneName(earned.milestone), short: milestoneShort(earned.milestone), date: earned.date, earlier: true }
  }
  if (last) last.dateLabel = dayDate(last.date)
  const target = seg.isToday ? ringSegment(days + 1).next : seg.next
  const nextDate = addDaysISO(habit.startDate, target)
  const inDays = daysBetween(today, nextDate)
  const prev = seg.isToday ? seg.next : seg.prev
  return {
    last,
    next: {
      milestone: target, name: milestoneName(target), short: milestoneShort(target), date: nextDate,
      inDays, dateLabel: `${dayDate(nextDate)} · ${inDays} ${inDays === 1 ? 'day' : 'days'}`,
      progress: (days - prev) / (target - prev),
    },
  }
}

// ---------- Never zero ----------
// Lifetime: every urge ridden out (walks, breaths, logs). Not tied to any tracker, so it never resets.
export const lifetimeRidden = (walks) => walks.length

// The last 30 days (oldest first, today last): { date, clean }.
// A day is clean when the tracker's count covered it: on/after its first start, not a slip day
// (the day before a new count started), and not in a gap between a slip and a new count's start.
// No red and no X: the UI only draws filled (clean) or hollow (not) dots.
export function cleanRuns(habit) {
  const resets = sanitizeResets(habit.resets)
  // Runs are [start, end] inclusive; each reset ends the previous run the day before the new start.
  const runs = []
  let start = resets.length ? resets[0].prevStartDate : habit.startDate
  for (const r of resets) {
    const end = addDaysISO(r.startDate, -1)
    // the day before the new start is the slip day: not clean
    if (addDaysISO(end, -1) >= start) runs.push([start, addDaysISO(end, -1)])
    start = r.startDate
  }
  runs.push([start, null])
  return runs
}

export function last30(habit, today = todayISO(), n = 30) {
  const runs = cleanRuns(habit)
  const out = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = addDaysISO(today, -i)
    const clean = runs.some(([s, e]) => date >= s && (e == null || date <= e))
    out.push({ date, clean })
  }
  return out
}
export const cleanCount = (days) => days.filter((d) => d.clean).length

// Start a new count. Nothing else changes: walks, journal, milestones and the lifetime count stay.
export function resetTracker(habit, startDate, now = Date.now()) {
  const today = todayISO(new Date(now))
  const sd = startDate > today ? today : startDate
  return {
    ...habit,
    startDate: sd,
    startedAt: sd === today ? new Date(now).toISOString() : null,
    resets: [...sanitizeResets(habit.resets), {
      at: new Date(now).toISOString(), prevStartDate: habit.startDate, prevStartedAt: habit.startedAt ?? null, startDate: sd,
    }],
  }
}

// Undo the most recent reset: the previous start date (and time) come back exactly.
export function undoReset(habit) {
  const resets = sanitizeResets(habit.resets)
  const last = resets.at(-1)
  if (!last) return habit
  const out = { ...habit, startDate: last.prevStartDate, resets: resets.slice(0, -1) }
  if (out.resets.length === 0) delete out.resets
  if (last.prevStartedAt) out.startedAt = last.prevStartedAt
  else delete out.startedAt
  return out
}

// The last reset stays undoable for 24 hours (it lives in the tracker's saved resets, so it
// survives closing the app), not just during the toast. Not offered once the start date was
// edited by hand after the reset. Returns { at, until } (ms) or null.
export const UNDO_WINDOW_MS = 24 * HOUR_MS
export function undoableReset(habit, now = Date.now()) {
  const last = sanitizeResets(habit?.resets).at(-1)
  if (!last || last.startDate !== habit.startDate) return null
  const at = Date.parse(last.at)
  if (!Number.isFinite(at) || now < at || now - at >= UNDO_WINDOW_MS) return null
  return { at, until: at + UNDO_WINDOW_MS }
}

// ---------- Daily line ----------
// About 40 short lines in our voice: no famous quotes, no exclamation marks.
export const DAILY_LINES = [
  'Urges are waves. You don’t have to stop them to get through them.',
  'One walk is enough for today.',
  'You’re allowed to go slowly.',
  'The urge is loud. It isn’t in charge.',
  'Every urge you ride out makes the next one smaller.',
  'Today only asks for today.',
  'A short walk can change the whole evening.',
  'You’ve done hard things before. This is one more.',
  'Feel it, name it, let it pass.',
  'Nothing has to be decided in the next ten minutes.',
  'Be as kind to yourself as you would be to a friend.',
  'Small steps still go somewhere.',
  'You are more than a craving.',
  'The tide goes out every time.',
  'Rest counts as progress.',
  'Your future self is quietly grateful.',
  'An urge is a feeling, not an order.',
  'Breathe out longer than you breathe in.',
  'You can start again at any hour.',
  'Calm comes back. It always does.',
  'Notice the urge. Then notice your feet on the ground.',
  'This moment will pass. You’ll still be here.',
  'You don’t need a perfect day, just an honest one.',
  'Fresh air is a good place to think.',
  'Let today be ordinary and clean.',
  'You’re learning what helps. That’s the work.',
  'Strength is often very quiet.',
  'A slip is a moment, not the story.',
  'Water, a walk, a breath. Start there.',
  'You’re building something that lasts.',
  'Give the urge twenty minutes. It usually gives up first.',
  'It’s okay to ask for help.',
  'The hard part is shorter than it feels.',
  'Each clean day is yours to keep.',
  'You can sit with this. It won’t last.',
  'Look up. The sky is still there.',
  'Choosing yourself is never selfish.',
  'Steady is better than fast.',
  'You’re doing better than you think.',
  'Tonight’s peace is made this afternoon.',
]

// One line per "more of" pick, in the same voice.
export const MORE_OF_LINES = {
  calm: ['Calm is something you’re building, one walk at a time.', 'A calmer mind starts with one slow breath.', 'Quiet is coming back to you, a little more each day.'],
  sleep: ['Better sleep is being earned today.', 'Every clean evening is a better night.', 'Rest comes easier when there’s nothing to hide from.'],
  proud: ['You’re giving yourself something to be proud of.', 'Pride grows from small, kept promises.', 'Today is another reason to be proud.'],
  relationships: ['The people you love get more of you each clean day.', 'Showing up for yourself is showing up for them.', 'Closer to the people who matter, one day at a time.'],
  control: ['You’re taking back control, one choice at a time.', 'Control isn’t loud. It’s the next good choice.', 'Today you decide, not the urge.'],
  money: ['What you don’t spend today stays yours.', 'Money saved is freedom saved.', 'Your wallet is getting a break today.'],
  health: ['Your body notices every clean day.', 'Health is built in ordinary days like this one.', 'Every walk is a gift to your body.'],
  interests: ['There’s room now for something new.', 'Curiosity is a good place to put your energy.', 'Try one small new thing today.'],
}

// Local day number (days since 1970-01-01 in the phone's calendar). Same all day.
export const dayNumber = (today = todayISO()) => Math.round(localMidnight(today) / DAY_MS)

// Rotation: our line, then a line from one "more of" pick, then the user's why.
// Sources that are empty are left out of the rotation. Same answer all day; changes at midnight.
// Our lines and pick lines step forward one per appearance, so nothing repeats within 7 days
// (the why is one sentence, so it does come back every few days).
export function dailyLine(profile, today = todayISO()) {
  const picks = (profile?.improve || []).filter((id) => MORE_OF_LINES[id])
  const why = (profile?.why || '').trim()
  const sources = ['ours', ...(picks.length ? ['more'] : []), ...(why ? ['why'] : [])]
  const n = dayNumber(today)
  const source = sources[((n % sources.length) + sources.length) % sources.length]
  const round = Math.floor(n / sources.length)
  if (source === 'more') {
    const pick = picks[round % picks.length]
    const lines = MORE_OF_LINES[pick]
    const text = lines[Math.floor(round / picks.length) % lines.length]
    return { text, source, caption: 'Today · from your “more of”', pick: IMPROVE.find((o) => o.id === pick)?.label }
  }
  if (source === 'why') return { text: why, source, caption: 'Today · your why' }
  return { text: DAILY_LINES[round % DAILY_LINES.length], source, caption: 'Today' }
}

// ---------- Time back (estimate) ----------
// weeks since start × days per week × times per day × hours per time. Hidden (null) when
// days per week or times per day were skipped, or 0. Money only when $ per time is set.
export const DEFAULT_HOURS_PER_TIME = 1
const roundAbout = (x) => (x < 10 ? Math.round(x) : Math.round(x / 10) * 10)

export function timeBack(profile, habit, today = todayISO()) {
  const dpw = profile?.before?.daysPerWeek
  const tpd = profile?.before?.timesPerDay
  if (!habit || dpw == null || tpd == null || dpw === 0) return null
  const hoursPer = profile.timeBack?.hoursPerTime ?? DEFAULT_HOURS_PER_TIME
  const weeks = Math.max(0, daysBetween(habit.startDate, today)) / 7
  const times = weeks * dpw * tpd
  const money = profile.timeBack?.moneyPerTime
  return {
    hours: roundAbout(times * hoursPer),
    times: Math.round(times),
    money: money ? roundAbout(times * money) : null,
    daysPerWeek: dpw, timesPerDay: tpd, hoursPerTime: hoursPer, moneyPerTime: money ?? null,
  }
}
