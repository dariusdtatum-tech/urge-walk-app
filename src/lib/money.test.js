import { describe, expect, test } from 'vitest'
import { fmtMoney, goalProgress, keptLine, loadGoal, moneyKept, moneyOn, sanitizeGoal, saveGoal, withKept } from './money.js'

const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] } } }
const prof = (money, before = { daysPerWeek: null, timesPerDay: null }) => ({ before, timeBack: { hoursPerTime: 1, moneyPerTime: money } })
const habit = { id: 'h', name: 'Habit A', startDate: '2030-01-01' }
const walks = [{ result: 'yes' }, { result: 'kinda' }, { result: 'yes' }, { result: null }]

describe('money kept', () => {
  test('off by default (no $ each time)', () => {
    expect(moneyOn(null)).toBe(false)
    expect(moneyOn(prof(null))).toBe(false)
    expect(moneyKept(prof(null), habit, walks, '2030-02-01')).toBeNull()
    expect(keptLine(prof(null), 'yes')).toBe('')
  })
  test('counts urges that passed when setup answers were skipped', () => {
    expect(moneyKept(prof(12), habit, walks, '2030-02-01')).toEqual({ total: 24, perTime: 12, passed: 2, basis: 'urges' })
  })
  test('uses the Time back estimate when it can', () => {
    const k = moneyKept(prof(10, { daysPerWeek: 7, timesPerDay: 1 }), habit, walks, '2030-01-29')
    expect(k.basis).toBe('estimate')
    expect(k.total).toBe(280)
  })
  test('+$ kept only on passed saves', () => {
    expect(keptLine(prof(12.5), 'yes')).toBe('+$12.50 kept')
    expect(keptLine(prof(12), 'kinda')).toBe('')
    expect(withKept('Saved.', prof(12), 'yes')).toBe('Saved. +$12 kept.')
    expect(withKept('Saved.', prof(12), 'no')).toBe('Saved.')
  })
  test('format', () => {
    expect(fmtMoney(1240)).toBe('$1,240')
    expect(fmtMoney(3.5)).toBe('$3.50')
  })
  test('goal: optional name and target, progress', () => {
    expect(sanitizeGoal({ name: '  ', target: 0 })).toBeNull()
    expect(sanitizeGoal({ name: 'Car fund', target: '2000' })).toEqual({ version: 1, name: 'Car fund', target: 2000 })
    const s = mem(); saveGoal({ name: 'Car fund' }, s)
    expect(loadGoal(s)).toEqual({ version: 1, name: 'Car fund', target: null })
    expect(goalProgress(loadGoal(s), 50)).toBeNull()
    expect(goalProgress({ target: 200 }, 50)).toEqual({ pct: 25, left: 150 })
    expect(goalProgress({ target: 200 }, 500)).toEqual({ pct: 100, left: 0 })
  })
})
