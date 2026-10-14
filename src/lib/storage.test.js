import { describe, expect, it } from 'vitest'
import { HABITS_KEY, loadHabits, saveHabits } from './storage.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
  }
}

describe('storage', () => {
  it('round-trips habits', () => {
    const s = memoryStorage()
    const habits = [{ id: 'a', name: 'Habit', startDate: '2020-01-01' }]
    expect(saveHabits(habits, s)).toBe(true)
    expect(loadHabits(s)).toEqual({ habits, recovered: false })
  })

  it('returns empty list on first run', () => {
    expect(loadHabits(memoryStorage())).toEqual({ habits: [], recovered: false })
  })

  it('backs up and recovers from corrupt JSON', () => {
    const s = memoryStorage({ [HABITS_KEY]: '{not json' })
    expect(loadHabits(s)).toEqual({ habits: [], recovered: true })
    const backupKey = Object.keys(s.data).find((k) => k.startsWith(`${HABITS_KEY}.corrupt-`))
    expect(s.data[backupKey]).toBe('{not json')
  })

  it('drops invalid entries but keeps good ones', () => {
    const s = memoryStorage({
      [HABITS_KEY]: JSON.stringify({ version: 1, habits: [
        { id: 'a', name: 'Good', startDate: '2020-01-01' },
        { id: 'b', name: '', startDate: '2020-01-01' },
        { id: 'c', name: 'Bad date', startDate: '2020-02-31' },
        null,
      ] }),
    })
    const { habits, recovered } = loadHabits(s)
    expect(habits).toEqual([{ id: 'a', name: 'Good', startDate: '2020-01-01' }])
    expect(recovered).toBe(true)
  })
})
