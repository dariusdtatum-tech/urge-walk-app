import { describe, expect, test } from 'vitest'
import { loadAppLock, lockView, saveAppLock } from './appLock.js'

const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] } } }

describe('app lock', () => {
  test('off by default', () => {
    const s = mem()
    expect(loadAppLock(s)).toBe(false)
    saveAppLock(true, s)
    expect(loadAppLock(s)).toBe(true)
  })
  test('cover: off never covers; on covers when locked or not active (app switcher)', () => {
    expect(lockView({ enabled: false, locked: true, appState: 'background' })).toEqual({ cover: false, unlockable: false })
    expect(lockView({ enabled: true, locked: false, appState: 'active' })).toEqual({ cover: false, unlockable: false })
    expect(lockView({ enabled: true, locked: false, appState: 'inactive' }).cover).toBe(true)
    expect(lockView({ enabled: true, locked: true, appState: 'active' })).toEqual({ cover: true, unlockable: true })
    expect(lockView({ enabled: true, locked: true, appState: 'background' }).unlockable).toBe(false)
  })
})
