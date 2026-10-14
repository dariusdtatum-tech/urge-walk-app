// The ring (cleanDays) and page 2 (cleanTime) must always show the same day number.
// Tests run in America/New_York (see vite.config.js), so the DST cases are real.
// Neutral fixture dates only.
import { describe, expect, it } from 'vitest'
import { cleanDayCount, todayISO } from './cleanTime.js'
import { cleanTime } from './homeIdeas.js'
import { cleanDays } from './homeStats.js'

const at = (local) => new Date(local).getTime() // local wall-clock time
const both = (habit, local) => {
  const now = at(local)
  return { ring: cleanDays(habit, todayISO(new Date(now))), page2: cleanTime(habit, now).days }
}

describe('shared clean-day count', () => {
  it('start day is 0, future start is 0, bad date is 0', () => {
    expect(cleanDayCount('2030-01-10', '2030-01-10')).toBe(0)
    expect(cleanDayCount('2030-01-11', '2030-01-10')).toBe(0)
    expect(cleanDayCount('nope', '2030-01-10')).toBe(0)
    expect(cleanDayCount('2030-01-01', '2030-01-10')).toBe(9)
  })

  it('goes up exactly at local midnight, for ring and page 2 alike', () => {
    const h = { startDate: '2030-01-01', startedAt: new Date('2030-01-01T23:30:00').toISOString() }
    expect(both(h, '2030-01-10T23:59:00')).toEqual({ ring: 9, page2: 9 })
    expect(both(h, '2030-01-11T00:01:00')).toEqual({ ring: 10, page2: 10 })
    expect(cleanTime(h, at('2030-01-11T00:01:00')).hours).toBe(0)
  })

  it('a late-evening start still counts calendar days (no elapsed-time lag)', () => {
    const h = { startDate: '2030-01-01', startedAt: new Date('2030-01-01T23:50:00').toISOString() }
    expect(both(h, '2030-01-02T00:10:00')).toEqual({ ring: 1, page2: 1 })
    expect(cleanTime(h, at('2030-01-01T23:55:00'))).toEqual({ days: 0, hours: 0 })
  })

  it('spring-forward DST (23-hour day) does not shift the count', () => {
    const h = { startDate: '2030-03-09' }
    expect(both(h, '2030-03-10T23:30:00')).toEqual({ ring: 1, page2: 1 })
    expect(both(h, '2030-03-11T00:30:00')).toEqual({ ring: 2, page2: 2 })
    expect(cleanTime(h, at('2030-03-10T12:00:00')).hours).toBe(11) // 2 a.m. skipped
  })

  it('fall-back DST (25-hour day) does not shift the count', () => {
    const h = { startDate: '2030-11-02' }
    expect(both(h, '2030-11-03T23:30:00')).toEqual({ ring: 1, page2: 1 })
    expect(both(h, '2030-11-04T00:30:00')).toEqual({ ring: 2, page2: 2 })
    expect(cleanTime(h, at('2030-11-03T12:00:00')).hours).toBe(13) // 1 a.m. twice
  })

  it('ring and page 2 agree every hour across a year with DST', () => {
    const h = { startDate: '2030-01-01', startedAt: new Date('2030-01-01T21:15:00').toISOString() }
    for (let t = at('2030-01-01T21:15:00'); t < at('2031-01-02T00:00:00'); t += 3_600_000 + 7 * 60_000) {
      expect(cleanTime(h, t).days).toBe(cleanDays(h, todayISO(new Date(t))))
    }
  })
})
