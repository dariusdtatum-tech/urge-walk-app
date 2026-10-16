import { describe, expect, it } from 'vitest'
import { isSoftened, sceneState, skyTone, SOFTEN_MS, tideLevel, timeOfDay } from './scene.js'

const NOW = Date.parse('2030-05-14T10:00:00-04:00')
const w = (hoursAgo, kind = 'walk') => ({ startedAt: new Date(NOW - hoursAgo * 3600e3).toISOString(), kind })

describe('scene state', () => {
  it('counts walks and every urge ridden out; growth follows effort, not clean time', () => {
    const s = sceneState({ days: 12, walks: [w(1), w(2, 'breathe'), w(3, 'logged'), w(4, null), w(5, 'ground')], now: NOW })
    expect(s).toMatchObject({ days: 12, walks: 2, ridden: 5, growth: 5, softened: false })
  })
  it('a reset sets days to 0 but removes nothing from the scene, and softens the sky for 24 hours', () => {
    const walks = [w(30), w(50)]
    const before = sceneState({ days: 40, walks, hero: {}, now: NOW })
    const hero = { resets: [{ at: new Date(NOW - 3600e3).toISOString() }] }
    const after = sceneState({ days: 0, walks, hero, now: NOW })
    expect(after.growth).toBe(before.growth)
    expect(after.walks).toBe(before.walks)
    expect(after.softened).toBe(true)
    expect(skyTone(after).token).toBe('breathePearlB')
    expect(isSoftened(hero, NOW + SOFTEN_MS)).toBe(false)
  })
  it('ignores future records and junk', () => {
    expect(sceneState({ walks: [w(-5), null], now: NOW }).ridden).toBe(0)
    expect(sceneState().days).toBe(0)
    expect(isSoftened({ resets: [{ at: 'nope' }] }, NOW)).toBe(false)
  })
  it('time of day comes from the phone clock', () => {
    const at = (h) => timeOfDay(new Date(2030, 4, 14, h))
    expect([at(6), at(12), at(18), at(22), at(3)]).toEqual(['dawn', 'day', 'dusk', 'night', 'night'])
  })
  it('the tide only rises', () => {
    let prev = -1
    for (let g = 0; g < 300; g += 7) { const l = tideLevel(g); expect(l).toBeGreaterThan(prev); expect(l).toBeLessThan(1); prev = l }
    expect(tideLevel(0)).toBe(0)
  })
})
