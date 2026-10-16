import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENE_PREFS, loadScenePrefs, saveScenePrefs, SCENE_LOOP, SCENE_PREFS_KEY } from './scenePrefs.js'

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m } }

describe('scene prefs', () => {
  it('defaults: scenes move, sound off, paired sound, 20 minutes', () => {
    expect(loadScenePrefs(mem())).toEqual(DEFAULT_SCENE_PREFS)
    expect(DEFAULT_SCENE_PREFS.sound).toBe(false)
  })
  it('saves each setting and keeps the others', () => {
    const s = mem()
    saveScenePrefs({ still: true }, s)
    saveScenePrefs({ sound: true, soundId: 'rain' }, s)
    expect(saveScenePrefs({ timer: 'walk' }, s)).toEqual({ still: true, sound: true, soundId: 'rain', timer: 'walk' })
    expect(loadScenePrefs(s)).toEqual({ still: true, sound: true, soundId: 'rain', timer: 'walk' })
  })
  it('junk falls back to safe defaults (sound stays off)', () => {
    const s = mem()
    s.setItem(SCENE_PREFS_KEY, JSON.stringify({ still: 'yes', sound: 1, soundId: 'jet', timer: 99 }))
    expect(loadScenePrefs(s)).toEqual(DEFAULT_SCENE_PREFS)
    s.setItem(SCENE_PREFS_KEY, '{broken')
    expect(loadScenePrefs(s)).toEqual(DEFAULT_SCENE_PREFS)
  })
  it('scene motion is slow and small', () => {
    expect(SCENE_LOOP.periodMs).toBeGreaterThanOrEqual(6000)
    expect(SCENE_LOOP.periodMs).toBeLessThanOrEqual(10000)
    expect(SCENE_LOOP.driftPx).toBeLessThan(4)
  })
})
