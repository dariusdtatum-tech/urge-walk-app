import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENTITLEMENTS, FREE_FOREVER, canUse } from './entitlements.js'

const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p] })
const SRC = files('src').filter((f) => /\.(js|jsx)$/.test(f) && !/\.test\./.test(f))

describe('Free forever', () => {
  it('has the promise and the core features', () => {
    expect(FREE_FOREVER.promise).toBe('Everything in Urge Walk is free to use, with no ads and no account.')
    const ids = FREE_FOREVER.features.map((f) => f.id)
    for (const id of ['ride-walk', 'ride-breathe', 'ride-ground', 'log-urge', 'counters', 'urge-map', 'crisis', 'undo', 'backup']) expect(ids).toContain(id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every free feature is free in the entitlement map, with no entitlement check', () => {
    for (const f of FREE_FOREVER.features) {
      expect(ENTITLEMENTS[f.id]).toEqual({ free: true, entitlement: null })
      expect(canUse(f.id, [])).toBe(true)
    }
  })
  it('nothing is gated: no paywall SDK, no Plus tag or lock on the free features, no upsell words', () => {
    for (const f of SRC) {
      const s = readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '') // code only, not comments
      expect(s, f).not.toMatch(/react-native-purchases|RevenueCat|Purchases\.|paywall/i)
      if (!f.endsWith('kit.jsx') && !f.endsWith('DesignCheck.jsx')) expect(s, f).not.toMatch(/tone="plus"/)
      expect(s, f).not.toMatch(/\b(upgrade|unlock premium|go premium|subscribe now)\b/i)
    }
  })
})
