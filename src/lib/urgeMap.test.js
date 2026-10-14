import { describe, expect, test } from 'vitest'
import { checkinSuggestion, dismissSuggestion, loadPatternPrefs, sanitizeTags, weeklyPattern, windowLabel, withTags } from './urgeMap.js'

// Local-time helper (vitest runs in the box zone; dates built with local components).
const at = (y, mo, d, h, m = 0) => new Date(y, mo - 1, d, h, m).toISOString()
const NOW = new Date(2030, 4, 17, 12).getTime() // Fri May 17 2030, noon local
const w = (iso, result = 'yes', tags) => ({ startedAt: iso, result, ...(tags ? { tags } : {}) })
const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] } } }

describe('tags', () => {
  test('only known tags, no repeats, at most 4', () => {
    expect(sanitizeTags(['home', 'home', 'nope', 'bored', 'tired', 'alone', 'people'])).toEqual(['home', 'bored', 'tired', 'alone'])
    expect(sanitizeTags('home')).toEqual([])
    expect(withTags({ id: 'a' }, [])).toEqual({ id: 'a' })
    expect(withTags({ id: 'a' }, ['stressed'])).toEqual({ id: 'a', tags: ['stressed'] })
  })
})

describe('weekly pattern', () => {
  test('nothing until 3 urges in the last 7 days', () => {
    expect(weeklyPattern([w(at(2030, 5, 16, 21)), w(at(2030, 5, 15, 21))], NOW)).toBeNull()
    expect(weeklyPattern([w(at(2030, 5, 1, 21)), w(at(2030, 5, 2, 21)), w(at(2030, 5, 3, 21)), w(at(2030, 5, 16, 21))], NOW)).toBeNull()
  })
  test('one plain sentence: peak window, weekdays, top tag, passed', () => {
    const walks = [
      w(at(2030, 5, 13, 21), 'yes', ['stressed']), w(at(2030, 5, 14, 20, 30), 'yes', ['stressed', 'home']), w(at(2030, 5, 15, 21, 30), 'kinda'),
      w(at(2030, 5, 16, 9), 'yes'), w(at(2030, 5, 17, 8), 'no'),
    ]
    const p = weeklyPattern(walks, NOW)
    expect(p.peak).toEqual({ start: 20, count: 3 })
    expect(p.when).toBe('weekdays')
    expect(p.sentence).toBe('Most urges hit 8 to 10 PM on weekdays. “Stressed” came up most. 3 of 5 passed.')
    expect(p.slots.reduce((a, b) => a + b)).toBe(5)
    expect(p.sentence).not.toMatch(/fail/i)
  })
  test('no clear peak: calm fallback', () => {
    const p = weeklyPattern([w(at(2030, 5, 11, 9)), w(at(2030, 5, 12, 15)), w(at(2030, 5, 15, 21), 'no')], NOW)
    expect(p.peak).toBeNull()
    expect(p.sentence).toBe('3 urges this week, spread across the day. 2 of 3 passed.')
  })
  test('window labels', () => {
    expect(windowLabel(20)).toBe('8 to 10 PM')
    expect(windowLabel(10)).toBe('10 AM to 12 PM')
    expect(windowLabel(22)).toBe('10 PM to 12 AM')
  })
})

describe('check-in suggestion', () => {
  const p = { peak: { start: 20, count: 3 } }
  test('15 minutes before a clear peak, only without a reminder', () => {
    expect(checkinSuggestion(p, null, {}, NOW)).toEqual({ hour: 19, minute: 45 })
    expect(checkinSuggestion(p, { hour: 8, minute: 30 }, {}, NOW)).toBeNull()
    expect(checkinSuggestion({ peak: { start: 20, count: 2 } }, null, {}, NOW)).toBeNull()
    expect(checkinSuggestion({ peak: { start: 0, count: 4 } }, null, {}, NOW)).toEqual({ hour: 23, minute: 45 })
  })
  test('dismissed: quiet for 30 days', () => {
    const s = mem()
    dismissSuggestion(s, NOW)
    expect(checkinSuggestion(p, null, loadPatternPrefs(s), NOW + 86_400_000)).toBeNull()
    expect(checkinSuggestion(p, null, loadPatternPrefs(s), NOW + 31 * 86_400_000)).not.toBeNull()
  })
})
