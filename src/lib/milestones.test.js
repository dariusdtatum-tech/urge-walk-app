import { describe, expect, it } from 'vitest'
import {
  MILESTONES_KEY, addDaysISO, backfillTracker, earnedList, isMilestone, loadMilestones, milestoneAt, milestoneName,
  milestoneRows, milestoneShort, milestonesUpTo, nextMilestone, nextUnearned, removeTracker, ringLabel, ringSegment,
  sanitizeMilestones, saveMilestones, syncMilestones,
} from './milestones.js'

const empty = () => ({ version: 1, trackers: {} })
const habit = (startDate, id = 'h1') => ({ id, name: 'Test', startDate })
function memoryStorage() {
  const data = {}
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] } }
}

describe('ladder', () => {
  it('7, 30, 60, 90, 180, 365, then yearly', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(milestoneAt)).toEqual([7, 30, 60, 90, 180, 365, 730, 1095, 1460])
    expect(milestonesUpTo(400)).toEqual([7, 30, 60, 90, 180, 365])
    expect(milestonesUpTo(6)).toEqual([])
    expect(isMilestone(730)).toBe(true)
    expect(isMilestone(500)).toBe(false)
    expect(isMilestone(0)).toBe(false)
  })
  it('names and badges', () => {
    expect([7, 30, 90, 180, 365, 730, 3650].map(milestoneName)).toEqual(['7 days', '30 days', '90 days', '6 months', '1 year', '2 years', '10 years'])
    expect([7, 60, 180, 365, 1095].map(milestoneShort)).toEqual(['7d', '60d', '6mo', '1y', '3y'])
  })
})

describe('ring segment', () => {
  it('165 days -> 90..180, 83%', () => {
    const s = ringSegment(165)
    expect([s.prev, s.next, s.remaining, s.isToday]).toEqual([90, 180, 15, false])
    expect(s.progress).toBeCloseTo(0.833, 3)
  })
  it('day 0 is empty toward 7; day 3 is 3/7', () => {
    expect(ringSegment(0)).toMatchObject({ prev: 0, next: 7, progress: 0 })
    expect(ringSegment(3).progress).toBeCloseTo(3 / 7)
  })
  it('full on the milestone day, next segment the day after', () => {
    expect(ringSegment(180)).toMatchObject({ prev: 90, next: 180, progress: 1, isToday: true })
    expect(ringSegment(181)).toMatchObject({ prev: 180, next: 365, remaining: 184 })
    expect(ringSegment(181).progress).toBeCloseTo(1 / 185)
  })
  it('yearly after 1 year', () => {
    expect(ringSegment(366)).toMatchObject({ prev: 365, next: 730 })
    expect(ringSegment(800)).toMatchObject({ prev: 730, next: 1095 })
    expect(ringSegment(800).progress).toBeCloseTo(70 / 365)
    expect(nextMilestone(1095)).toBe(1095)
  })
})

describe('ring label', () => {
  const text = (d) => { const l = ringLabel(d); return l.lead + l.rest }
  it('counts down, singular on the final day, "today" on the day', () => {
    expect(text(165)).toBe('15 days to 6 months')
    expect(text(179)).toBe('1 day to 6 months')
    expect(text(180)).toBe('6 months today')
    expect(text(181)).toBe('184 days to 1 year')
    expect(text(0)).toBe('7 days to 7 days')
    expect(text(6)).toBe('1 day to 7 days')
    expect(text(365)).toBe('1 year today')
    expect(text(729)).toBe('1 day to 2 years')
    expect(text(730)).toBe('2 years today')
  })
})

describe('dates', () => {
  it('earned date = start + milestone days, across leap years', () => {
    expect(addDaysISO('2026-05-01', 180)).toBe('2026-10-28')
    expect(addDaysISO('2027-03-01', 365)).toBe('2028-02-29') // 2028 is a leap year
    expect(addDaysISO('2024-02-29', 365)).toBe('2025-02-28')
    expect(addDaysISO('2026-12-30', 7)).toBe('2027-01-06')
    expect(addDaysISO('nope', 7)).toBeNull()
  })
  it('a 1-year milestone across a leap day lands 365 days later, not on the anniversary', () => {
    const { data } = syncMilestones(empty(), [habit('2027-03-01')], '2028-02-29')
    expect(data.trackers.h1.earned[365]).toBe('2028-02-29')
  })
})

describe('first load: silent backfill', () => {
  it('marks passed milestones earned + seen with start + days, and shows no sheet', () => {
    const r = syncMilestones(empty(), [habit('2026-05-01')], '2026-10-13') // 165 days
    expect(r.celebrate).toEqual([])
    expect(r.changed).toBe(true)
    expect(earnedList(r.data, 'h1')).toEqual([
      { milestone: 7, date: '2026-05-08' }, { milestone: 30, date: '2026-05-31' },
      { milestone: 60, date: '2026-06-30' }, { milestone: 90, date: '2026-07-30' },
    ])
    expect(r.data.trackers.h1.seen).toEqual([7, 30, 60, 90])
    expect(nextUnearned(r.data, 'h1')).toBe(180)
  })
  it('a milestone reached exactly today is still celebrated on first load', () => {
    const r = syncMilestones(empty(), [habit('2026-05-01')], '2026-10-28') // 180 days
    expect(r.celebrate).toEqual([{ habitId: 'h1', milestone: 180 }])
  })
  it('backfill covers every tracker, years of history too', () => {
    const r = syncMilestones(empty(), [habit('2026-05-01', 'a'), habit('2020-01-01', 'b')], '2026-10-13')
    expect(r.celebrate).toEqual([])
    expect(earnedList(r.data, 'b').map((e) => e.milestone)).toEqual([7, 30, 60, 90, 180, 365, 730, 1095, 1460, 1825, 2190])
  })
})

describe('reaching a milestone', () => {
  const start = habit('2026-05-01')
  const day165 = syncMilestones(empty(), [start], '2026-10-13').data
  it('nothing new on an ordinary day', () => {
    const r = syncMilestones(day165, [start], '2026-10-14')
    expect(r.changed).toBe(false)
    expect(r.celebrate).toEqual([])
  })
  it('celebrates on the day (open or midnight rollover), once', () => {
    const r = syncMilestones(day165, [start], '2026-10-28')
    expect(r.celebrate).toEqual([{ habitId: 'h1', milestone: 180 }])
    expect(r.data.trackers.h1.earned[180]).toBe('2026-10-28')
    expect(r.data.trackers.h1.seen).toContain(180)
    const again = syncMilestones(r.data, [start], '2026-10-28') // reload
    expect(again.celebrate).toEqual([])
    expect(again.changed).toBe(false)
  })
  it('if the app was not opened that day, it shows on the next open (earned date is still the day)', () => {
    const r = syncMilestones(day165, [start], '2026-10-31')
    expect(r.celebrate).toEqual([{ habitId: 'h1', milestone: 180 }])
    expect(r.data.trackers.h1.earned[180]).toBe('2026-10-28')
  })
  it('several missed: one sheet (the highest), all earned', () => {
    const h = habit('2026-08-01')
    const d = syncMilestones(empty(), [h], '2026-08-05').data
    const r = syncMilestones(d, [h], '2026-10-13') // 70 days: 7, 30, 60 reached
    expect(r.celebrate).toEqual([{ habitId: 'h1', milestone: 60 }])
    expect(earnedList(r.data, 'h1').map((e) => e.milestone)).toEqual([7, 30, 60])
  })
  it('once per tracker: two trackers can each have their own', () => {
    const a = habit('2026-10-03', 'a')
    const b = habit('2026-10-03', 'b')
    const d = syncMilestones(empty(), [a, b], '2026-10-05').data
    expect(syncMilestones(d, [a, b], '2026-10-13').celebrate).toEqual([{ habitId: 'a', milestone: 7 }, { habitId: 'b', milestone: 7 }])
  })
})

describe('reset keeps earned milestones', () => {
  const before = syncMilestones(empty(), [habit('2026-05-01')], '2026-10-13').data
  const reset = habit('2026-10-13')
  it('a reset does not remove anything; the ring restarts toward 7', () => {
    const r = syncMilestones(before, [reset], '2026-10-13')
    expect(earnedList(r.data, 'h1')).toHaveLength(4)
    expect(ringSegment(0).next).toBe(7)
    expect(nextUnearned(r.data, 'h1')).toBe(180)
  })
  it('re-reaching 7 / 30 after a reset is not celebrated again and keeps the first earned date', () => {
    let d = syncMilestones(before, [reset], '2026-10-13').data
    const r7 = syncMilestones(d, [reset], '2026-10-20')
    expect(r7.celebrate).toEqual([])
    expect(r7.data.trackers.h1.earned[7]).toBe('2026-05-08')
    d = syncMilestones(r7.data, [reset], '2026-11-12').data
    expect(earnedList(d, 'h1')[1]).toEqual({ milestone: 30, date: '2026-05-31' })
  })
  it('editing the start date earlier: newly passed milestones are earned quietly', () => {
    const d = backfillTracker(before, habit('2025-01-01'), '2026-10-13')
    expect(earnedList(d, 'h1').map((e) => e.milestone)).toEqual([7, 30, 60, 90, 180, 365])
    expect(syncMilestones(d, [habit('2025-01-01')], '2026-10-13').celebrate).toEqual([])
    expect(d.trackers.h1.earned[90]).toBe('2026-07-30') // the first earned date is kept
  })
  it('deleting a tracker removes its history', () => {
    expect(removeTracker(before, 'h1').trackers).toEqual({})
    expect(before.trackers.h1).toBeTruthy() // pure
  })
})

describe('storage', () => {
  it('saves and loads under a versioned key', () => {
    const s = memoryStorage()
    const d = syncMilestones(empty(), [habit('2026-05-01')], '2026-10-13').data
    expect(saveMilestones(d, s)).toBe(true)
    expect(JSON.parse(s.data[MILESTONES_KEY]).version).toBe(1)
    expect(loadMilestones(s)).toEqual(d)
  })
  it('missing or broken storage loads as empty (then backfills quietly)', () => {
    const s = memoryStorage()
    expect(loadMilestones(s)).toEqual(empty())
    s.data[MILESTONES_KEY] = '{not json'
    expect(loadMilestones(s)).toEqual(empty())
  })
  it('sanitize drops bad milestones, dates and records', () => {
    const clean = sanitizeMilestones({ trackers: {
      ok: { earned: { 7: '2026-05-08', 8: '2026-05-09', 30: 'bad', 730: '2028-04-27' }, seen: [7, 7, 8, 'x', 730] },
      broken: 'nope',
      list: [],
      noFields: {},
    } })
    expect(clean.trackers.ok).toEqual({ earned: { 7: '2026-05-08', 730: '2028-04-27' }, seen: [7, 730] })
    expect(clean.trackers.noFields).toEqual({ earned: {}, seen: [] })
    expect(clean.trackers.broken).toBeUndefined()
    expect(sanitizeMilestones(null)).toEqual(empty())
    expect(sanitizeMilestones({ trackers: [] })).toEqual(empty())
  })
})

describe('milestone list rows', () => {
  it('lists every milestone through at least 1 year with dates or distance', () => {
    const d = syncMilestones(empty(), [habit('2026-05-01')], '2026-10-13').data
    const rows = milestoneRows(d, habit('2026-05-01'), '2026-10-13')
    expect(rows.map((r) => r.milestone)).toEqual([7, 30, 60, 90, 180, 365])
    expect(rows[0]).toEqual({ milestone: 7, name: '7 days', date: '2026-05-08', inDays: null })
    expect(rows[4]).toMatchObject({ name: '6 months', date: null, inDays: 15 })
  })
  it('after 1 year the list grows with the yearly ones', () => {
    const h = habit('2024-01-01')
    const d = syncMilestones(empty(), [h], '2026-10-13').data
    expect(milestoneRows(d, h, '2026-10-13').map((r) => r.milestone).slice(-3)).toEqual([365, 730, 1095]) // 1013 days: next is 3 years
  })
})
