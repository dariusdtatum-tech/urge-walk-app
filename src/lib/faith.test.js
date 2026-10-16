import { describe, expect, it } from 'vitest'
import { loadFaithOn, OPTIONAL_CONTENT_KEY, saveFaithOn } from './faith.js'

const mem = (seed = {}) => { const m = { ...seed }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v) }, removeItem: (k) => { delete m[k] } } }

describe('Faith content switch', () => {
  it('is off by default', () => expect(loadFaithOn(mem())).toBe(false))
  it('persists on and off', () => {
    const s = mem()
    saveFaithOn(true, s); expect(loadFaithOn(s)).toBe(true)
    expect(JSON.parse(s.getItem(OPTIONAL_CONTENT_KEY))).toEqual({ faith: true })
    saveFaithOn(false, s); expect(loadFaithOn(s)).toBe(false)
  })
  it('carries over an earlier Daily verse choice, and the new switch wins once set', () => {
    const s = mem({ 'urgewalk.v1.versePrefs': JSON.stringify({ enabled: true }) })
    expect(loadFaithOn(s)).toBe(true)
    saveFaithOn(false, s); expect(loadFaithOn(s)).toBe(false)
  })
  it('onboarding never mentions faith', async () => {
    const fs = await import('node:fs'); const path = await import('node:path')
    const dir = path.resolve(__dirname, '../screens')
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => /onboard/i.test(f) && /\.jsx?$/.test(f))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/faith|verse|prayer/i)
  })
})
