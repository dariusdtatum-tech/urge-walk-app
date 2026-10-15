import { describe, expect, test } from 'vitest'
import { MAX_VERSE_CHARS, VERSES, VERSE_TRANSLATIONS, dayOfYear, loadVerseEnabled, refLine, saveVerseEnabled, verseFor, verseLabel } from './verse.js'

const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] } } }

describe('daily verse', () => {
  test('about 30 short public-domain verses, no duplicates', () => {
    expect(VERSES.length).toBeGreaterThanOrEqual(28)
    expect(new Set(VERSES.map((v) => v.ref)).size).toBe(VERSES.length)
    for (const v of VERSES) {
      expect(VERSE_TRANSLATIONS).toContain(v.tr)
      expect(v.text.length).toBeLessThanOrEqual(MAX_VERSE_CHARS)
      expect(v.text).not.toMatch(/judg|condemn|wrath|guilt|hell|punish/i)
    }
  })
  test('every verse is complete: no partial quotes, keys are only ref / tr / text', () => {
    for (const v of VERSES) expect(Object.keys(v).sort()).toEqual(['ref', 'text', 'tr'])
    expect(VERSES.length).toBe(30)
  })
  test('short seed verses are in the list', () => {
    const refs = VERSES.map((v) => v.ref)
    for (const r of ['Galatians 5:1', 'Philippians 4:13', '2 Corinthians 10:4', 'James 1:12', 'Romans 8:37', '2 Timothy 1:7', 'Psalm 46:1', 'John 8:36']) expect(refs).toContain(r)
  })
  test('rotates by day of year; the same all day', () => {
    expect(dayOfYear(new Date(2030, 0, 1, 0, 5))).toBe(1)
    expect(dayOfYear(new Date(2030, 11, 31, 23, 55))).toBe(365)
    expect(dayOfYear(new Date(2028, 11, 31, 12))).toBe(366)
    expect(verseFor(new Date(2030, 0, 1, 0, 1))).toBe(VERSES[0])
    expect(verseFor(new Date(2030, 0, 1, 23, 59))).toBe(VERSES[0])
    expect(verseFor(new Date(2030, 0, 2, 8))).toBe(VERSES[1])
    expect(verseFor(new Date(2030, 0, 1 + VERSES.length, 8))).toBe(VERSES[0])
  })
  test('off by default; can be turned on', () => {
    const s = mem()
    expect(loadVerseEnabled(s)).toBe(false)
    saveVerseEnabled(true, s)
    expect(loadVerseEnabled(s)).toBe(true)
  })
  test('lines and the combined a11y label', () => {
    const v = { ref: 'Psalm 46:1', tr: 'KJV', text: 'God is our refuge and strength, a very present help in trouble.' }
    expect(refLine(v)).toBe('Psalm 46:1 · KJV')
    expect(verseLabel(v)).toBe('God is our refuge and strength, a very present help in trouble, Psalm 46:1')
  })
})
