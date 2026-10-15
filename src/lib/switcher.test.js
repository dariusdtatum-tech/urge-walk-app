import { describe, expect, it } from 'vitest'
import { DEFAULT_SWITCHER, SWITCHER_PREFS_KEY, loadSwitcher, saveSwitcher } from './switcher.js'

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
describe('tracker switcher pref', () => {
  it('defaults to the sheet', () => { expect(DEFAULT_SWITCHER).toBe('sheet'); expect(loadSwitcher(mem())).toBe('sheet') })
  it('persists drawer and sheet, and ignores junk', () => {
    const s = mem()
    saveSwitcher('drawer', s); expect(loadSwitcher(s)).toBe('drawer')
    saveSwitcher('sheet', s); expect(loadSwitcher(s)).toBe('sheet')
    s.setItem(SWITCHER_PREFS_KEY, JSON.stringify({ style: 'menu' })); expect(loadSwitcher(s)).toBe('sheet')
  })
})
