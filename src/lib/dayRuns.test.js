import { describe, expect, it } from 'vitest'
import { passedDayKeys, passedRuns } from './dayRuns.js'

const WEEK = ['2030-03-04', '2030-03-05', '2030-03-06', '2030-03-07', '2030-03-08', '2030-03-09', '2030-03-10']
const set = (...idx) => new Set(idx.map((i) => WEEK[i]))
const at = (day, time, result = 'yes') => ({ startedAt: new Date(`${day}T${time}`).toISOString(), result })

describe('passed-day runs (Week brackets)', () => {
  it('splits on a quiet day', () => {
    expect(passedRuns(WEEK, set(0, 1, 2, 4, 5))).toEqual([{ start: 0, end: 2, length: 3 }, { start: 4, end: 5, length: 2 }])
  })
  it('run at the start of the week', () => {
    expect(passedRuns(WEEK, set(0, 1))).toEqual([{ start: 0, end: 1, length: 2 }])
  })
  it('run at the end of the week', () => {
    expect(passedRuns(WEEK, set(4, 5, 6))).toEqual([{ start: 4, end: 6, length: 3 }])
  })
  it('a single day is not a run', () => {
    expect(passedRuns(WEEK, set(3))).toEqual([])
    expect(passedRuns(WEEK, set(0, 2, 4, 6))).toEqual([])
  })
  it('the whole week is one run', () => {
    expect(passedRuns(WEEK, set(0, 1, 2, 3, 4, 5, 6))).toEqual([{ start: 0, end: 6, length: 7 }])
  })
  it('no passed days → no runs', () => {
    expect(passedRuns(WEEK, new Set())).toEqual([])
  })
  it('counts only passed urges, by local calendar day', () => {
    const keys = passedDayKeys([
      at('2030-03-04', '23:59:00'), at('2030-03-05', '00:01:00'), // local late night / just after midnight
      at('2030-03-06', '12:00:00', 'kinda'), at('2030-03-07', '12:00:00', 'no'), at('2030-03-08', '12:00:00', null),
      { startedAt: 'bad', result: 'yes' },
    ])
    expect([...keys].sort()).toEqual(['2030-03-04', '2030-03-05'])
    expect(passedRuns(WEEK, keys)).toEqual([{ start: 0, end: 1, length: 2 }])
  })
})
