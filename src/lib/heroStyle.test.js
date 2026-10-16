import { describe, expect, it } from 'vitest'
import { DEFAULT_HERO, HERO_PREFS_KEY, HERO_STYLES, loadHeroStyle, saveHeroStyle } from './heroStyle.js'

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m } }

describe('home hero style', () => {
  it('the ring is the default and listed first', () => {
    expect(DEFAULT_HERO).toBe('ring')
    expect(HERO_STYLES.map((h) => h.id)).toEqual(['ring', 'tide', 'stones', 'trail'])
    expect(loadHeroStyle(mem())).toBe('ring')
  })
  it('remembers each optional style and going back to the ring', () => {
    const s = mem()
    for (const id of ['tide', 'stones', 'trail', 'ring']) {
      expect(saveHeroStyle(id, s)).toBe(id)
      expect(loadHeroStyle(s)).toBe(id)
    }
    expect(JSON.parse(s.m.get(HERO_PREFS_KEY))).toMatchObject({ style: 'ring' })
  })
  it('junk or damaged data falls back to the ring', () => {
    const s = mem()
    expect(saveHeroStyle('neon', s)).toBe('ring')
    s.setItem(HERO_PREFS_KEY, '{oops')
    expect(loadHeroStyle(s)).toBe('ring')
    s.setItem(HERO_PREFS_KEY, JSON.stringify({ style: 'neon' }))
    expect(loadHeroStyle(s)).toBe('ring')
  })
})
