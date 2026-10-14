import { describe, expect, it } from 'vitest'
import { passedDayKeys, passedDaysIn } from './dayRuns.js'

const WEEK = ['2030-03-04', '2030-03-05', '2030-03-06', '2030-03-07', '2030-03-08', '2030-03-09', '2030-03-10']
const set = (...idx) => new Set(idx.map((i) => WEEK[i]))
const at = (day, time, result = 'yes') => ({ startedAt: new Date(`${day}T${time}`).toISOString(), result })

describe('days with an urge passed (Week total, no runs)', () => {
  it('counts days, not runs: a quiet day changes nothing else', () => {
    expect(passedDaysIn(WEEK, set(0, 1, 2, 4, 5))).toBe(5)
    expect(passedDaysIn(WEEK, set(0, 2, 4, 6))).toBe(4)
    expect(passedDaysIn(WEEK, set(3))).toBe(1)
    expect(passedDaysIn(WEEK, set(0, 1, 2, 3, 4, 5, 6))).toBe(7)
    expect(passedDaysIn(WEEK, new Set())).toBe(0)
  })
  it('only days in the range count', () => {
    expect(passedDaysIn(WEEK.slice(0, 3), set(0, 5, 6))).toBe(1)
  })
  it('counts only passed urges, by local calendar day', () => {
    const keys = passedDayKeys([
      at('2030-03-04', '23:59:00'), at('2030-03-05', '00:01:00'), at('2030-03-05', '09:00:00'),
      at('2030-03-06', '12:00:00', 'kinda'), at('2030-03-07', '12:00:00', 'no'), at('2030-03-08', '12:00:00', null),
      { startedAt: 'bad', result: 'yes' },
    ])
    expect([...keys].sort()).toEqual(['2030-03-04', '2030-03-05'])
    expect(passedDaysIn(WEEK, keys)).toBe(2)
  })
})
