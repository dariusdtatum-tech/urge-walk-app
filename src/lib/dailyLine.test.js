import { describe, expect, it } from 'vitest'
import LINES from '../content/daily-lines.json'
import { OPTIONAL_CONTENT_KEY } from './faith.js'
import { lineFor, lineLabel, loadDailyLineSource, saveDailyLineSource } from './dailyLine.js'

const mem = (seed = {}) => { const m = { ...seed }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v) }, removeItem: (k) => { delete m[k] } } }
const day = (d, h = 9) => new Date(2026, 9, d, h)

describe('daily line', () => {
  it('ships 30 quotes and 30 poem excerpts, each with an author; poems are 1-4 lines', () => {
    expect(LINES.quotes).toHaveLength(30)
    expect(LINES.poems).toHaveLength(30)
    for (const q of LINES.quotes) { expect(q.by).toBeTruthy(); expect(q.text.length).toBeLessThanOrEqual(130) }
    for (const p of LINES.poems) { expect(p.by && p.title).toBeTruthy(); expect(p.lines.length).toBeGreaterThanOrEqual(1); expect(p.lines.length).toBeLessThanOrEqual(4) }
  })
  it('defaults to Quotes', () => expect(loadDailyLineSource(mem())).toBe('quotes'))
  it('Off hides the line', () => expect(lineFor(day(16), 'off')).toBeNull())
  it('picks only from the one chosen source', () => {
    for (let d = 1; d <= 28; d += 1) {
      expect(lineFor(day(d), 'quotes').kind).toBe('quote')
      expect(lineFor(day(d), 'poetry').kind).toBe('poem')
      expect(lineFor(day(d), 'verse').kind).toBe('verse')
    }
  })
  it('is stable for the whole local day and changes across days', () => {
    const s = 'quotes'
    expect(lineFor(day(16, 0), s)).toEqual(lineFor(day(16, 23), s))
    const week = new Set(Array.from({ length: 7 }, (_, i) => lineLabel(lineFor(day(10 + i), s))))
    expect(week.size).toBeGreaterThan(4)
  })
  it('label reads the line then "by" the author, or "from" the reference', () => {
    expect(lineLabel({ kind: 'quote', text: 'A.', by: 'Seneca' })).toBe('A., by Seneca')
    expect(lineLabel({ kind: 'verse', text: 'B.', by: 'Psalm 46:10' })).toBe('B., from Psalm 46:10')
  })
  it('migration: Faith on (new or legacy key) starts on Verse; a saved choice wins', () => {
    expect(loadDailyLineSource(mem({ [OPTIONAL_CONTENT_KEY]: JSON.stringify({ faith: true }) }))).toBe('verse')
    expect(loadDailyLineSource(mem({ 'urgewalk.v1.versePrefs': JSON.stringify({ enabled: true }) }))).toBe('verse')
    expect(loadDailyLineSource(mem({ [OPTIONAL_CONTENT_KEY]: JSON.stringify({ faith: true, dailyLineSource: 'poetry' }) }))).toBe('poetry')
  })
  it('saves a single choice and ignores unknown values', () => {
    const s = mem()
    expect(saveDailyLineSource('poetry', s)).toBe('poetry')
    expect(saveDailyLineSource('verse', s)).toBe('verse')
    expect(saveDailyLineSource('nonsense', s)).toBe('verse')
    expect(JSON.parse(s.getItem(OPTIONAL_CONTENT_KEY))).toEqual({ dailyLineSource: 'verse' })
  })
})
