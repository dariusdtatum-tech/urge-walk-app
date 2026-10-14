import { describe, expect, it } from 'vitest'
import { breakdown, daysBetween, formatBreakdown, isValidISODate, todayISO } from './cleanTime.js'

describe('daysBetween', () => {
  it('counts the start date itself as day 0', () => {
    expect(daysBetween('2026-10-07', '2026-10-07')).toBe(0)
    expect(daysBetween('2026-10-06', '2026-10-07')).toBe(1)
  })

  it('sanity check: a 162-day span', () => {
    expect(daysBetween('2026-04-27', '2026-10-06')).toBe(162)
  })

  it('handles leap years', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2) // 2024 is a leap year
    expect(daysBetween('2025-02-28', '2025-03-01')).toBe(1) // 2025 is not
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366)
    expect(daysBetween('1900-02-28', '1900-03-01')).toBe(1) // 1900 was not a leap year
    expect(daysBetween('2000-02-28', '2000-03-01')).toBe(2) // 2000 was
  })

  it('handles a start date 20 years ago', () => {
    expect(daysBetween('2006-10-07', '2026-10-07')).toBe(7305) // 20*365 + 5 leap days
  })

  it('is not thrown off by daylight-saving changes', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2) // US spring forward is Mar 8
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2) // fall back is Nov 1
  })

  it('returns NaN for invalid input', () => {
    expect(daysBetween('not a date', '2026-10-07')).toBeNaN()
  })
})

describe('breakdown + formatBreakdown', () => {
  const fmt = (a, b) => formatBreakdown(breakdown(a, b))

  it('a 162-day span is 5 months, 9 days', () => {
    expect(breakdown('2026-04-27', '2026-10-06')).toEqual({ years: 0, months: 5, weeks: 0, days: 9, totalDays: 162 })
    expect(fmt('2026-04-27', '2026-10-06')).toBe('5 months, 9 days')
  })

  it('day 0 and short streaks', () => {
    expect(fmt('2026-10-07', '2026-10-07')).toBe('Starting today')
    expect(fmt('2026-10-06', '2026-10-07')).toBe('1 day')
    expect(fmt('2026-09-22', '2026-10-07')).toBe('2 weeks, 1 day')
  })

  it('20 years ago is exactly 20 years', () => {
    expect(fmt('2006-10-07', '2026-10-07')).toBe('20 years')
    expect(fmt('2006-04-27', '2026-10-06')).toBe('20 years, 5 months, 9 days')
  })

  it('leap day starts and month-end clamping', () => {
    // A Feb 29 start has its anniversary on Feb 28 in non-leap years
    expect(fmt('2024-02-29', '2025-02-28')).toBe('1 year')
    expect(fmt('2024-02-29', '2025-03-01')).toBe('1 year, 1 day')
    expect(fmt('2026-01-31', '2026-02-28')).toBe('1 month') // end of a short month counts
    expect(fmt('2026-01-31', '2026-02-27')).toBe('3 weeks, 6 days')
    expect(fmt('2026-01-31', '2026-03-01')).toBe('1 month, 1 day')
    expect(fmt('2025-12-31', '2026-01-31')).toBe('1 month')
  })

  it('future start dates give no breakdown', () => {
    expect(breakdown('2026-10-08', '2026-10-07')).toBeNull()
  })
})

describe('helpers', () => {
  it('validates real calendar dates only', () => {
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2025-02-29')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('')).toBe(false)
  })

  it('todayISO uses local calendar date', () => {
    expect(todayISO(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07')
    expect(todayISO(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})
