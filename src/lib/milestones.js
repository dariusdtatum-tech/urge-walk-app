// Clean-day milestones: the ladder, the Home ring segment and label, and the earned history.
//
// Ladder: 7, 30, 60, 90, 180 (6 months), 365 (1 year), then every 365 days (2 years, 3 years…).
//
// Stored on this device under urgewalk.v1.milestones:
// { version: 1, trackers: { [habitId]: { earned: { '180': 'YYYY-MM-DD', … }, seen: [7, 30, …] } } }
// - earned: milestones reached, with the date reached (start date + milestone days). Kept forever,
//   even if the tracker is reset later (history, not recomputed from the current streak).
// - seen:   milestones whose "That's yours." sheet was already shown, so it's never shown twice.
import { daysBetween, parseISODate, todayISO } from './cleanTime.js'
import { readObject, writeObject } from './storage.js'

export const MILESTONES_KEY = 'urgewalk.v1.milestones'
const FIRST = [7, 30, 60, 90, 180, 365]
const YEAR = 365
const MAX_DAYS = 365 * 200 // sanity limit for stored values

// The i-th milestone (0-based): 7, 30, 60, 90, 180, 365, 730, 1095, …
export function milestoneAt(i) {
  return i < FIRST.length ? FIRST[i] : YEAR * (i - FIRST.length + 2)
}

export function isMilestone(n) {
  return Number.isInteger(n) && n > 0 && (FIRST.includes(n) || (n > YEAR && n % YEAR === 0))
}

// Every milestone up to and including `days`.
export function milestonesUpTo(days) {
  const out = []
  for (let i = 0; milestoneAt(i) <= days; i += 1) out.push(milestoneAt(i))
  return out
}

// The first milestone that is >= days (on a milestone day, that's today's milestone).
export function nextMilestone(days) {
  let i = 0
  while (milestoneAt(i) < days) i += 1
  return milestoneAt(i)
}

export function previousMilestone(m) {
  let i = 0
  let prev = 0
  while (milestoneAt(i) < m) { prev = milestoneAt(i); i += 1 }
  return prev
}

// The ring shows only the current segment: (days − prev) / (next − prev).
// On a milestone day the ring is full; the next day it starts the next segment.
export function ringSegment(days) {
  const d = Math.max(0, Math.floor(days) || 0)
  const next = nextMilestone(d)
  const prev = previousMilestone(next)
  return { prev, next, progress: (d - prev) / (next - prev), remaining: next - d, isToday: d === next }
}

// "7 days", "6 months", "1 year", "2 years"
export function milestoneName(m) {
  if (m === 180) return '6 months'
  if (m >= YEAR && m % YEAR === 0) { const y = m / YEAR; return y === 1 ? '1 year' : `${y} years` }
  return `${m} days`
}

// Badge text: "7d", "6mo", "1y", "2y"
export function milestoneShort(m) {
  if (m === 180) return '6mo'
  if (m >= YEAR && m % YEAR === 0) return `${m / YEAR}y`
  return `${m}d`
}

// Label under the ring, split so the first part can be bold:
// { lead: '15 days', rest: ' to 6 months' } / { lead: '1 day', rest: ' to 6 months' } / { lead: '6 months', rest: ' today' }
export function ringLabel(days) {
  const s = ringSegment(days)
  if (s.isToday) return { lead: milestoneName(s.next), rest: ' today' }
  return { lead: s.remaining === 1 ? '1 day' : `${s.remaining} days`, rest: ` to ${milestoneName(s.next)}` }
}

// 'YYYY-MM-DD' + n calendar days (leap years handled by the calendar).
export function addDaysISO(iso, n) {
  const p = parseISODate(iso)
  if (!p) return null
  return todayISO(new Date(p.y, p.m - 1, p.d + n))
}

const daysClean = (habit, today) => {
  const d = daysBetween(habit.startDate, today)
  return Number.isFinite(d) && d > 0 ? d : 0
}

// ---------- Stored history ----------

const empty = () => ({ version: 1, trackers: {} })

// Keep only well-formed records; quietly drop anything broken. Never throws.
export function sanitizeMilestones(raw) {
  const out = empty()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  const trackers = raw.trackers
  if (!trackers || typeof trackers !== 'object' || Array.isArray(trackers)) return out
  for (const [id, rec] of Object.entries(trackers)) {
    if (!id || !rec || typeof rec !== 'object' || Array.isArray(rec)) continue
    const earned = {}
    if (rec.earned && typeof rec.earned === 'object' && !Array.isArray(rec.earned)) {
      for (const [k, date] of Object.entries(rec.earned)) {
        const m = Number(k)
        if (isMilestone(m) && m <= MAX_DAYS && parseISODate(date)) earned[m] = date
      }
    }
    const seen = Array.isArray(rec.seen)
      ? [...new Set(rec.seen.filter((m) => isMilestone(m) && m <= MAX_DAYS))].sort((a, b) => a - b)
      : []
    out.trackers[id] = { earned, seen }
  }
  return out
}

export function loadMilestones(storage = globalThis.localStorage) {
  return sanitizeMilestones(readObject(MILESTONES_KEY, storage))
}

export function saveMilestones(data, storage = globalThis.localStorage) {
  return writeObject(MILESTONES_KEY, { version: 1, trackers: data.trackers }, storage)
}

const copy = (data) => ({
  version: 1,
  trackers: Object.fromEntries(Object.entries(data.trackers).map(([id, r]) => [id, { earned: { ...r.earned }, seen: [...r.seen] }])),
})

// Silently mark milestones the tracker has already passed (strictly before today) as earned and seen.
// Used the first time a tracker is seen (after this update, after adding a tracker, or after an import
// without milestone history) and after its start date is edited — so there's never a barrage of sheets.
export function backfillTracker(data, habit, today = todayISO()) {
  const next = copy(data)
  const rec = next.trackers[habit.id] || { earned: {}, seen: [] }
  const days = daysClean(habit, today)
  for (const m of milestonesUpTo(days - 1)) {
    if (!rec.earned[m]) rec.earned[m] = addDaysISO(habit.startDate, m)
    if (!rec.seen.includes(m)) rec.seen.push(m)
  }
  rec.seen.sort((a, b) => a - b)
  next.trackers[habit.id] = rec
  return next
}

export function removeTracker(data, id) {
  const next = copy(data)
  delete next.trackers[id]
  return next
}

// Bring the history up to date for every tracker (on open, and when the date rolls over at midnight).
// Returns { data, changed, celebrate: [{ habitId, milestone }] }.
// - A tracker with no record yet is backfilled silently.
// - Any milestone reached (days >= m) is earned with date start + m (an earlier earned date is kept).
// - Reached milestones not yet seen are celebrated: one sheet per tracker (the highest), and all are
//   marked seen right away, so a reload never shows the sheet again.
export function syncMilestones(data, habits, today = todayISO()) {
  let next = copy(data)
  const celebrate = []
  for (const habit of habits) {
    if (!next.trackers[habit.id]) next = backfillTracker(next, habit, today)
    const rec = next.trackers[habit.id]
    const pending = []
    for (const m of milestonesUpTo(daysClean(habit, today))) {
      if (!rec.earned[m]) rec.earned[m] = addDaysISO(habit.startDate, m)
      if (!rec.seen.includes(m)) { rec.seen.push(m); pending.push(m) }
    }
    rec.seen.sort((a, b) => a - b)
    if (pending.length > 0) celebrate.push({ habitId: habit.id, milestone: Math.max(...pending) })
  }
  const changed = JSON.stringify(next.trackers) !== JSON.stringify(data.trackers)
  return { data: next, changed, celebrate }
}

// Earned milestones of a tracker, oldest first: [{ milestone, date }]
export function earnedList(data, habitId) {
  const rec = data.trackers[habitId]
  if (!rec) return []
  return Object.entries(rec.earned).map(([m, date]) => ({ milestone: Number(m), date })).sort((a, b) => a.milestone - b.milestone)
}

// The first milestone this tracker has not earned yet (shown as the dashed "next" badge).
export function nextUnearned(data, habitId) {
  const rec = data.trackers[habitId]
  let i = 0
  while (rec && rec.earned[milestoneAt(i)]) i += 1
  return milestoneAt(i)
}

// Rows for the Milestones list: every milestone up to at least 1 year (and one past the furthest earned
// or upcoming). [{ milestone, name, date | null, inDays | null }]
export function milestoneRows(data, habit, today = todayISO()) {
  const days = habit ? daysClean(habit, today) : 0
  const earned = habit ? (data.trackers[habit.id]?.earned || {}) : {}
  const furthest = Math.max(YEAR, nextUnearned(data, habit?.id), nextMilestone(days + 1), ...Object.keys(earned).map(Number))
  const rows = []
  for (let i = 0; milestoneAt(i) <= furthest; i += 1) {
    const m = milestoneAt(i)
    rows.push({ milestone: m, name: milestoneName(m), date: earned[m] || null, inDays: earned[m] || m <= days ? null : m - days })
  }
  return rows
}
