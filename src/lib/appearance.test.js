import { describe, expect, it } from 'vitest'
import { loadTheme, saveTheme, THEME_KEY } from './appearance.js'

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m } }

describe('appearance', () => {
  it('defaults to System and remembers Light / Dark', () => {
    const s = mem()
    expect(loadTheme(s)).toBe('system')
    expect(saveTheme('dark', s)).toBe('dark')
    expect(loadTheme(s)).toBe('dark')
    expect(saveTheme('system', s)).toBe('system')
    expect(s.m.has(THEME_KEY)).toBe(false)
  })
  it('ignores junk', () => {
    const s = mem(); s.setItem(THEME_KEY, 'neon')
    expect(loadTheme(s)).toBe('system')
    expect(saveTheme('neon', s)).toBe('system')
  })
})
