import { describe, expect, it } from 'vitest'
import {
  RANGE_IDS, RANGE_PREFS_KEY, bucketCounts, chartPoints, cleanDays, heroHabit, loadRange, makePrimary, rangeBuckets,
  rangeStats, saveRange, shortDate, smoothPath, threeDayAverage,
} from './homeStats.js'

// Thursday Oct 8, 2026, 9:41 PM in New York (tests run with TZ=America/New_York)
const NOW = new Date(2026, 9, 8, 21, 41).getTime()
const walk = (iso, result = null) => ({ id: iso, startedAt: iso, endedAt: iso, plannedMinutes: 10, actualSeconds: 600, result })

describe('hero tracker', () => {
  const habits = [
    { id: 'a', name: 'A', startDate: '2026-04-27' },
    { id: 'b', name: 'B', startDate: '2025-01-01' },
    { id: 'c', name: 'C', startDate: '2026-10-01' },
  ]
  it('is the first habit, or none', () => {
    expect(heroHabit(habits).id).toBe('a')
    expect(heroHabit([])).toBeNull()
  })
  it('"Show on Home" moves a habit to the front and keeps the rest in order', () => {
    expect(makePrimary(habits, 'c').map((h) => h.id)).toEqual(['c', 'a', 'b'])
    expect(makePrimary(habits, 'missing')).toBe(habits)
  })
})

describe('clean days', () => {
  it('counts calendar days from the start date', () => {
    expect(cleanDays({ startDate: '2026-04-27' }, '2026-10-06')).toBe(162)
  })
  it('is 0 for a future start or no habit', () => {
    expect(cleanDays({ startDate: '2026-10-09' }, '2026-10-08')).toBe(0)
    expect(cleanDays(null, '2026-10-08')).toBe(0)
  })
  it('a "Didn\'t pass" walk does not reset the streak (walks are not an input)', () => {
    const habit = { startDate: '2026-04-27' }
    const before = cleanDays(habit, '2026-10-06')
    const walks = [walk('2026-10-06T12:00:00.000Z', 'no'), walk('2026-10-06T14:00:00.000Z', 'no')]
    expect(rangeStats(walks, 'D', new Date(2026, 9, 6, 20).getTime())).toEqual({ walked: 2, passed: 0, riddenOut: 2 })
    expect(cleanDays(habit, '2026-10-06')).toBe(before)
  })
})

describe('shortDate', () => {
  it('drops the year for this year only', () => {
    expect(shortDate('2026-03-15', '2026-10-08')).toBe('Mar 15')
    expect(shortDate('2025-03-15', '2026-10-08')).toBe('Mar 15, 2025')
    expect(shortDate('nope', '2026-10-08')).toBe('')
  })
})

describe('Week / Month / All time ranges', () => {
  it('Week = the last 7 days ending today, Fri..Thu, today highlighted', () => {
    const b = rangeBuckets('week', NOW)
    expect(b.map((x) => x.label)).toEqual(['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'])
    expect(b.map((x) => x.current)).toEqual([false, false, false, false, false, false, true])
    expect(b[0].start).toBe(new Date(2026, 9, 2).getTime())
    expect(b[6].end).toBe(new Date(2026, 9, 9).getTime())
  })
  it('Month = the last 30 days with sparse labels (first, +10, +20, today)', () => {
    const b = rangeBuckets('month', new Date(2026, 9, 9, 9, 41).getTime())
    expect(b).toHaveLength(30)
    expect(b.filter((x) => x.showLabel).map((x) => x.label)).toEqual(['Sep 10', 'Sep 20', 'Sep 30', 'Oct 9'])
    expect(b[29].current).toBe(true)
    expect(b.every((x, i) => i === 0 || x.start === b[i - 1].end)).toBe(true)
  })
  it('All time = weekly buckets since the tracker start, the last ending today', () => {
    const b = rangeBuckets('all', NOW, '2026-04-27') // 165 days -> 24 weeks
    expect(b).toHaveLength(24)
    expect(b.every((x) => (x.end - x.start) / 86400000 >= 6.9 && (x.end - x.start) / 86400000 <= 7.1)).toBe(true)
    expect(b[23].end).toBe(new Date(2026, 9, 9).getTime())
    expect(b[0].start).toBeLessThanOrEqual(new Date(2026, 3, 28).getTime())
    expect(b.filter((x) => x.showLabel)).toHaveLength(4)
  })
  it('All time stays readable for very long histories (wider buckets, <= 52 points)', () => {
    const b = rangeBuckets('all', NOW, '2006-01-01')
    expect(b.length).toBeLessThanOrEqual(52)
    expect(b.length).toBeGreaterThan(40)
    expect(rangeBuckets('all', NOW, '2026-10-08').length).toBe(2) // brand-new tracker still draws a line
    expect(rangeBuckets('all', NOW, null).length).toBe(2)
  })
  it('days are calendar days even across the DST change (Nov 1, 2026)', () => {
    const b = rangeBuckets('week', new Date(2026, 10, 3, 12).getTime())
    const lengths = b.map((x) => (x.end - x.start) / 3600000)
    expect(lengths).toContain(25)
    expect(b[6].start).toBe(new Date(2026, 10, 3).getTime())
  })
  it('every range id builds buckets', () => {
    for (const id of RANGE_IDS) expect(rangeBuckets(id, NOW, '2026-01-01').length).toBeGreaterThan(0)
  })
})

describe('3-day average', () => {
  it('is centered; the ends use the days that exist', () => {
    expect(threeDayAverage([0, 3, 0, 0, 6])).toEqual([1.5, 1, 1, 2, 3])
    expect(threeDayAverage([2])).toEqual([2])
    expect(threeDayAverage([])).toEqual([])
  })
  it('keeps the total roughly and never goes below zero', () => {
    const a = threeDayAverage([0, 0, 1, 0, 0])
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0)
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(1)
  })
})

describe('chips and chart numbers', () => {
  // Matches the mockup: yesterday 11:50 PM didn't pass; today 9:05 AM kinda, 7:15 PM passed; plus older walks
  const walks = [
    walk('2026-10-08T03:50:00.000Z', 'no'),
    walk('2026-10-08T13:05:00.000Z', 'kinda'),
    walk('2026-10-08T23:15:00.000Z', 'yes'),
    walk('2026-09-20T16:00:00.000Z', 'yes'),
    walk('2025-12-31T03:00:00.000Z', null),
  ]
  it('Week: 3 walked, 1 passed', () => {
    expect(rangeStats(walks, 'week', NOW)).toEqual({ walked: 3, passed: 1, riddenOut: 3 })
  })
  it('Month and All time change only these numbers', () => {
    expect(rangeStats(walks, 'month', NOW)).toEqual({ walked: 4, passed: 2, riddenOut: 4 })
    expect(rangeStats(walks, 'all', NOW)).toEqual({ walked: 5, passed: 2, riddenOut: 5 })
  })
  it('weekly line: Fri-Tue 0, Wed 1, Thu 2', () => {
    expect(bucketCounts(walks, rangeBuckets('week', NOW))).toEqual([0, 0, 0, 0, 0, 1, 2])
  })
  it('all-time buckets count every walk since the start', () => {
    const counts = bucketCounts(walks, rangeBuckets('all', NOW, '2025-12-30'))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(5)
  })
  it('the range is remembered (default Week, bad values ignored)', () => {
    const store = new Map()
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
    expect(loadRange(storage)).toBe('week')
    saveRange('month', storage)
    expect(loadRange(storage)).toBe('month')
    store.set(RANGE_PREFS_KEY, '{"walksRange":"D"}')
    expect(loadRange(storage)).toBe('week')
    store.set(RANGE_PREFS_KEY, 'garbage')
    expect(loadRange(storage)).toBe('week')
  })
})

describe('chart geometry', () => {
  it('scale tops out at least at 2 and puts zeros on the baseline', () => {
    const { max, points } = chartPoints([0, 1, 0], { width: 300, height: 100, padX: 10, padTop: 0, padBottom: 0 })
    expect(max).toBe(2)
    expect(points.map((p) => p.y)).toEqual([100, 50, 100])
    expect(points.map((p) => p.x)).toEqual([10, 150, 290])
  })
  it('smooth line passes through every point and never dips below a flat run', () => {
    const pts = [{ x: 0, y: 100 }, { x: 10, y: 100 }, { x: 20, y: 100 }, { x: 30, y: 50 }, { x: 40, y: 0 }]
    const d = smoothPath(pts)
    expect(d.startsWith('M0,100')).toBe(true)
    expect(d.endsWith('40,0')).toBe(true)
    const ys = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]))
    expect(Math.max(...ys)).toBeLessThanOrEqual(100)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
  })
  it('handles 0 or 1 point', () => {
    expect(smoothPath([])).toBe('')
    expect(smoothPath([{ x: 5, y: 6 }])).toBe('M5,6')
  })
})
