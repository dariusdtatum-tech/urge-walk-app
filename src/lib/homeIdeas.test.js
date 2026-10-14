import { describe, expect, it } from 'vitest'
import { applyBackup, buildBackup, validateBackup } from './backup.js'
import {
  DAILY_LINES, MORE_OF_LINES, cleanCount, cleanRuns, cleanTime, cleanTimeLabel, dailyLine, dayNumber, last30,
  lifetimeRidden, milestoneCards, msToNextMinute, resetTracker, sinceLabel, timeBack, undoReset, undoableReset, UNDO_WINDOW_MS,
} from './homeIdeas.js'
import { addDaysISO } from './milestones.js'
import { sanitizeProfile } from './profile.js'
import { loadHabits, sanitizeHabits, saveHabits } from './storage.js'

function memoryStorage() {
  const data = {}
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] } }
}
const TODAY = '2026-10-10'
const at = (iso) => new Date(iso).getTime() // local times (tests run in America/New_York via TZ below)

describe('30 days clean across resets', () => {
  it('a 166-day count is 30 of 30', () => {
    const h = { id: 'a', name: 'G', startDate: '2026-04-27' }
    expect(cleanCount(last30(h, TODAY))).toBe(30)
  })
  it('a new tracker: only days since its start are clean', () => {
    expect(cleanCount(last30({ id: 'a', name: 'G', startDate: '2026-10-01' }, TODAY))).toBe(10)
  })
  it('one reset 21 days ago: only the slip day (the day before the new count) is hollow', () => {
    const h = resetTracker({ id: 'a', name: 'G', startDate: '2026-04-27' }, '2026-09-19', at('2026-09-19T20:00:00'))
    const days = last30(h, TODAY)
    expect(cleanCount(days)).toBe(29)
    expect(days.filter((d) => !d.clean).map((d) => d.date)).toEqual(['2026-09-18'])
  })
  it('two resets, a reset to a past date, and gaps', () => {
    let h = { id: 'a', name: 'G', startDate: '2026-09-01' }
    h = resetTracker(h, '2026-09-20', at('2026-09-22T09:00:00')) // slip on 19th
    h = resetTracker(h, '2026-10-05', at('2026-10-05T09:00:00')) // slip on 4th
    const off = last30(h, TODAY).filter((d) => !d.clean).map((d) => d.date)
    expect(off).toEqual(['2026-09-19', '2026-10-04'])
    expect(cleanRuns(h)).toEqual([['2026-09-01', '2026-09-18'], ['2026-09-20', '2026-10-03'], ['2026-10-05', null]])
  })
  it('a reset on the start day itself leaves no run behind', () => {
    const h = resetTracker({ id: 'a', name: 'G', startDate: TODAY }, TODAY, at('2026-10-10T12:00:00'))
    expect(cleanCount(last30(h, TODAY))).toBe(1)
  })
  it('never has more than 30 entries, oldest first, today last', () => {
    const d = last30({ id: 'a', name: 'G', startDate: '2020-01-01' }, TODAY)
    expect(d).toHaveLength(30)
    expect(d[0].date).toBe(addDaysISO(TODAY, -29))
    expect(d.at(-1).date).toBe(TODAY)
  })
})

describe('lifetime total', () => {
  it('counts every kind and ignores trackers and resets', () => {
    const walks = [{ kind: 'walk' }, { kind: 'breathe' }, { kind: 'logged' }, {}]
    expect(lifetimeRidden(walks)).toBe(4)
    expect(lifetimeRidden([])).toBe(0)
  })
})

describe('reset and undo', () => {
  const base = { id: 'a', name: 'G', startDate: '2026-04-27', startedAt: new Date('2026-04-27T23:40:00').toISOString() }
  it('reset today records the moment and the previous start', () => {
    const r = resetTracker(base, TODAY, at('2026-10-10T09:41:00'))
    expect(r.startDate).toBe(TODAY)
    expect(r.startedAt).toBe(new Date('2026-10-10T09:41:00').toISOString())
    expect(r.resets).toEqual([{ at: new Date('2026-10-10T09:41:00').toISOString(), prevStartDate: '2026-04-27', prevStartedAt: base.startedAt, startDate: TODAY }])
  })
  it('a past date has no start time; a future date is clamped to today', () => {
    expect(resetTracker(base, '2026-10-01', at('2026-10-10T09:41:00')).startedAt).toBe(null)
    expect(resetTracker(base, '2026-12-01', at('2026-10-10T09:41:00')).startDate).toBe(TODAY)
  })
  it('undo restores the exact previous start date and time', () => {
    const r = resetTracker(base, TODAY, at('2026-10-10T09:41:00'))
    expect(undoReset(r)).toEqual(base)
  })
  it('undo of a tracker that had no start time removes it; undo twice walks back two resets', () => {
    const plain = { id: 'a', name: 'G', startDate: '2026-04-27' }
    const r2 = resetTracker(resetTracker(plain, '2026-09-01', at('2026-09-01T10:00:00')), TODAY, at('2026-10-10T10:00:00'))
    expect(undoReset(undoReset(r2))).toEqual(plain)
    expect(undoReset(plain)).toBe(plain)
  })
  it('the new fields survive storage and backup; old trackers stay as they were', () => {
    const s = memoryStorage()
    const r = resetTracker(base, TODAY, at('2026-10-10T09:41:00'))
    saveHabits([r, { id: 'b', name: 'Old', startDate: '2026-01-01' }], s)
    const loaded = loadHabits(s).habits
    expect(loaded[0]).toEqual(r)
    expect(loaded[1]).toEqual({ id: 'b', name: 'Old', startDate: '2026-01-01' })
    const v = validateBackup(JSON.stringify(buildBackup(s)))
    expect(v.ok).toBe(true)
    const t = memoryStorage()
    applyBackup(v.backup, t)
    expect(loadHabits(t).habits[0]).toEqual(r)
  })
  it('damaged resets / start times are dropped, not fatal', () => {
    const [h] = sanitizeHabits([{ id: 'a', name: 'G', startDate: '2026-04-27', startedAt: '2026-05-02T10:00:00Z', resets: [{ at: 'x' }, 'y', { at: '2026-05-01T00:00:00Z', prevStartDate: 'bad', startDate: '2026-04-27' }] }])
    expect(h).toEqual({ id: 'a', name: 'G', startDate: '2026-04-27' })
  })
})

describe('clean time', () => {
  it('calendar days (same as the ring) plus hours so far today', () => {
    const h = { startDate: '2026-04-27', startedAt: new Date('2026-04-27T23:40:00').toISOString() }
    expect(cleanTime(h, at('2026-10-10T09:41:30'))).toEqual({ days: 166, hours: 9 })
    expect(cleanTimeLabel({ days: 1, hours: 1 })).toBe('1 day, 1 hour clean')
  })
  it('without a start time the count starts at local midnight', () => {
    expect(cleanTime({ startDate: '2026-10-09' }, at('2026-10-10T09:41:00'))).toEqual({ days: 1, hours: 9 })
  })
  it('lines the timer up with the next minute', () => {
    expect(msToNextMinute(60_000 * 5 + 12_345)).toBe(60_000 - 12_345)
  })
  it('since label', () => {
    expect(sinceLabel({ startDate: '2026-04-27' })).toBe('Mon, Apr 27')
    expect(sinceLabel({ startDate: '2026-04-27', startedAt: new Date('2026-04-27T23:40:00').toISOString() })).toBe('Mon, Apr 27 · 11:40 PM')
  })
})

describe('last and next milestone cards', () => {
  const ms = { trackers: { a: { earned: { 7: '2026-05-04', 30: '2026-05-27', 60: '2026-06-26', 90: '2026-07-26' }, seen: [] } } }
  it('166 days: last 90 days (Jul 26), next 6 months (Oct 24 · 14 days)', () => {
    const c = milestoneCards({ id: 'a', startDate: '2026-04-27' }, ms, TODAY)
    expect(c.last).toMatchObject({ milestone: 90, name: '90 days', date: '2026-07-26', dateLabel: 'Sun, Jul 26' })
    expect(c.next).toMatchObject({ milestone: 180, name: '6 months', date: '2026-10-24', inDays: 14, dateLabel: 'Sat, Oct 24 · 14 days' })
    expect(c.next.progress).toBeCloseTo(76 / 90)
  })
  it('on a milestone day, last is today and next is the following one', () => {
    const c = milestoneCards({ id: 'a', startDate: '2026-04-13' }, ms, TODAY) // 180 today
    expect(c.last.milestone).toBe(180)
    expect(c.next.milestone).toBe(365)
  })
  it('right after a reset, last is the most recent earned earlier (kept)', () => {
    const c = milestoneCards({ id: 'a', startDate: TODAY }, ms, TODAY)
    expect(c.last).toMatchObject({ milestone: 90, earlier: true })
    expect(c.next).toMatchObject({ milestone: 7, inDays: 7 })
    expect(milestoneCards({ id: 'z', startDate: TODAY }, { trackers: {} }, TODAY).last).toBe(null)
  })
})

describe('daily line', () => {
  const profile = { improve: ['calm', 'selfrespect'], why: 'For my family' }
  it('same all day, deterministic', () => {
    expect(dailyLine(profile, TODAY)).toEqual(dailyLine({ ...profile }, TODAY))
  })
  it('rotates ours -> a "more of" line -> the why', () => {
    const sources = [0, 1, 2, 3, 4, 5].map((i) => dailyLine(profile, addDaysISO(TODAY, i)).source)
    const n = dayNumber(TODAY) % 3
    const order = ['ours', 'more', 'why']
    expect(sources).toEqual([0, 1, 2, 3, 4, 5].map((i) => order[(n + i) % 3]))
  })
  it('no text repeats within 7 days except the why', () => {
    for (let start = 0; start < 120; start += 1) {
      const texts = [0, 1, 2, 3, 4, 5, 6].map((i) => dailyLine(profile, addDaysISO('2026-01-01', start + i))).filter((l) => l.source !== 'why').map((l) => l.text)
      expect(new Set(texts).size).toBe(texts.length)
    }
  })
  it('with no answers, our lines only; never empty', () => {
    const l = dailyLine(null, TODAY)
    expect(l.source).toBe('ours')
    expect(DAILY_LINES).toContain(l.text)
    for (let i = 0; i < 7; i += 1) expect(dailyLine({}, addDaysISO(TODAY, i)).source).toBe('ours')
  })
  it('about 40 lines, short, no exclamation marks, no attributed quotes', () => {
    expect(DAILY_LINES.length).toBeGreaterThanOrEqual(40)
    for (const l of [...DAILY_LINES, ...Object.values(MORE_OF_LINES).flat()]) {
      expect(l).not.toMatch(/[!—]|^“| - [A-Z]/)
      expect(l.length).toBeLessThanOrEqual(80)
    }
    expect(new Set(DAILY_LINES).size).toBe(DAILY_LINES.length)
  })
})

describe('time back', () => {
  const p = (before, tb) => sanitizeProfile({ before, ...(tb ? { timeBack: tb } : {}) })
  const hero = { startDate: '2026-04-27' }
  it('weeks × days a week × times a day × 1 h, rounded to 10', () => {
    // 166 days = 23.71 weeks × 5 × 3 = 355.7 -> about 360
    expect(timeBack(p({ daysPerWeek: 5, timesPerDay: 3 }), hero, TODAY)).toMatchObject({ hours: 360, money: null, hoursPerTime: 1 })
  })
  it('Adjust changes the hours per time; small numbers round to 1', () => {
    expect(timeBack(p({ daysPerWeek: 5, timesPerDay: 3 }, { hoursPerTime: 0.5 }), hero, TODAY).hours).toBe(180)
    expect(timeBack(p({ daysPerWeek: 1, timesPerDay: 1 }), { startDate: '2026-09-26' }, TODAY).hours).toBe(2)
  })
  it('money is off by default and opt-in', () => {
    expect(sanitizeProfile({}).timeBack).toEqual({ hoursPerTime: 1, moneyPerTime: null })
    expect(timeBack(p({ daysPerWeek: 5, timesPerDay: 3 }, { moneyPerTime: 20 }), hero, TODAY).money).toBe(7110)
  })
  it('hidden when days a week or times a day were skipped (or 0), or no tracker', () => {
    expect(timeBack(p({ daysPerWeek: null, timesPerDay: 3 }), hero, TODAY)).toBe(null)
    expect(timeBack(p({ daysPerWeek: 5, timesPerDay: null }), hero, TODAY)).toBe(null)
    expect(timeBack(p({ daysPerWeek: 0, timesPerDay: 3 }), hero, TODAY)).toBe(null)
    expect(timeBack(p({ daysPerWeek: 5, timesPerDay: 3 }), null, TODAY)).toBe(null)
    expect(timeBack(null, hero, TODAY)).toBe(null)
  })
  it('bad settings are cleaned', () => {
    expect(sanitizeProfile({ timeBack: { hoursPerTime: 99, moneyPerTime: -5 } }).timeBack).toEqual({ hoursPerTime: 1, moneyPerTime: null })
  })
})

describe('undo last reset (24 hours)', () => {
  const base = { id: 'a', name: 'G', startDate: '2030-01-01' }
  const t0 = new Date('2030-02-10T15:00:00').getTime()
  const r = resetTracker(base, '2030-02-10', t0)
  it('is offered for 24 hours after the reset', () => {
    expect(undoableReset(r, t0 + 60_000)).toEqual({ at: t0, until: t0 + UNDO_WINDOW_MS })
    expect(undoableReset(r, t0 + UNDO_WINDOW_MS - 1)).not.toBe(null)
    expect(undoableReset(r, t0 + UNDO_WINDOW_MS)).toBe(null)
  })
  it('survives a save/load round trip (stored with the tracker)', () => {
    const storage = memoryStorage()
    saveHabits([r], storage)
    const [loaded] = loadHabits(storage).habits
    expect(undoableReset(loaded, t0 + 3_600_000)).not.toBe(null)
    expect(undoReset(loaded)).toEqual(base)
  })
  it('is not offered with no reset, or after the start date was edited by hand', () => {
    expect(undoableReset(base, t0)).toBe(null)
    expect(undoableReset({ ...r, startDate: '2030-02-05' }, t0 + 60_000)).toBe(null)
  })
})
