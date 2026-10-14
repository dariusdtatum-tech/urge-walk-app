import { describe, expect, it } from 'vitest'
import {
  ACTIVE_WALK_KEY, WALKS_KEY, WALK_PREFS_KEY, appendWalk, loadActiveWalk, loadWalkPrefs,
  loadWalks, plannedMinutesFor, saveActiveWalk, saveWalkPrefs,
} from './walkStorage.js'
import { pauseWalk, startWalk } from './walkTimer.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
  }
}

const record = (over = {}) => ({
  id: 'r1',
  startedAt: '2026-01-01T12:00:00.000Z',
  endedAt: '2026-01-01T12:10:00.000Z',
  plannedMinutes: 10,
  actualSeconds: 600,
  endedEarly: false,
  result: 'yes',
  note: 'ok',
  ...over,
})

describe('saved walks', () => {
  it('appends records under a versioned key', () => {
    const s = memoryStorage()
    expect(appendWalk(record(), s)).toBe(true)
    expect(appendWalk(record({ id: 'r2', result: null }), s)).toBe(true)
    expect(JSON.parse(s.data[WALKS_KEY]).version).toBe(1)
    const { walks, recovered } = loadWalks(s)
    expect(walks.map((w) => w.id)).toEqual(['r1', 'r2'])
    expect(walks[1].result).toBeNull()
    expect(recovered).toBe(false)
  })

  it('backs up corrupt data and starts a fresh list', () => {
    const s = memoryStorage({ [WALKS_KEY]: 'nope{' })
    expect(appendWalk(record(), s)).toBe(true)
    expect(loadWalks(s).walks).toHaveLength(1)
    const backup = Object.keys(s.data).find((k) => k.startsWith(`${WALKS_KEY}.corrupt-`))
    expect(s.data[backup]).toBe('nope{')
  })

  it('drops malformed records and cleans bad fields', () => {
    const s = memoryStorage({
      [WALKS_KEY]: JSON.stringify({ version: 1, walks: [
        record(),
        record({ id: 'bad', startedAt: 'yesterday-ish' }),
        record({ id: 'odd', result: 'maybe' }),
        42,
      ] }),
    })
    const { walks, recovered } = loadWalks(s)
    expect(walks.map((w) => w.id)).toEqual(['r1', 'odd'])
    expect(walks[1].result).toBeNull()
    expect(recovered).toBe(true)
  })
})

describe('walk in progress', () => {
  it('round-trips and can be cleared', () => {
    const s = memoryStorage()
    const w = pauseWalk(startWalk(10, 1000, { id: 'a', messageOffset: 3 }), 5000)
    saveActiveWalk(w, s)
    expect(loadActiveWalk(s)).toEqual({ version: 1, ...w })
    saveActiveWalk(null, s)
    expect(s.data[ACTIVE_WALK_KEY]).toBeUndefined()
    expect(loadActiveWalk(s)).toBeNull()
  })

  it('ignores and removes unusable data', () => {
    const s = memoryStorage({ [ACTIVE_WALK_KEY]: JSON.stringify({ id: 'a', startedAt: 'soon' }) })
    expect(loadActiveWalk(s)).toBeNull()
    expect(s.data[ACTIVE_WALK_KEY]).toBeUndefined()
    const s2 = memoryStorage({ [ACTIVE_WALK_KEY]: '{{' })
    expect(loadActiveWalk(s2)).toBeNull()
  })
})

describe('preferences', () => {
  it('defaults to 10 minutes and a custom length of 20', () => {
    expect(loadWalkPrefs(memoryStorage())).toEqual({ choice: 10, customMinutes: 20 })
  })

  it('remembers the last choice and last custom value', () => {
    const s = memoryStorage()
    saveWalkPrefs({ choice: 'custom', customMinutes: 45 }, s)
    expect(loadWalkPrefs(s)).toEqual({ choice: 'custom', customMinutes: 45 })
    saveWalkPrefs({ choice: 'open', customMinutes: 45 }, s)
    expect(loadWalkPrefs(s)).toEqual({ choice: 'open', customMinutes: 45 })
  })

  it('reads the older { minutes } format and rejects bad values', () => {
    expect(loadWalkPrefs(memoryStorage({ [WALK_PREFS_KEY]: JSON.stringify({ minutes: 5 }) }))).toEqual({ choice: 5, customMinutes: 20 })
    expect(loadWalkPrefs(memoryStorage({ [WALK_PREFS_KEY]: JSON.stringify({ choice: 7, customMinutes: 999 }) }))).toEqual({ choice: 10, customMinutes: 120 })
  })

  it('plannedMinutesFor', () => {
    expect(plannedMinutesFor({ choice: 15, customMinutes: 30 })).toBe(15)
    expect(plannedMinutesFor({ choice: 'custom', customMinutes: 30 })).toBe(30)
    expect(plannedMinutesFor({ choice: 'open', customMinutes: 30 })).toBeNull()
  })
})

describe('open walks and older records', () => {
  it('keeps open walks (plannedMinutes null) and fills in mode for old records', () => {
    const s = memoryStorage({
      [WALKS_KEY]: JSON.stringify({ version: 1, walks: [
        record({ id: 'old' }), // saved before `mode` existed
        record({ id: 'open', mode: 'open', plannedMinutes: null, endedEarly: true }),
        record({ id: 'custom', mode: 'timed', plannedMinutes: 37 }),
        record({ id: 'bad', plannedMinutes: -3 }),
      ] }),
    })
    const { walks } = loadWalks(s)
    expect(walks.map((w) => [w.id, w.mode, w.plannedMinutes, w.endedEarly])).toEqual([
      ['old', 'timed', 10, false], ['open', 'open', null, false], ['custom', 'timed', 37, false],
    ])
  })

  it('an open walk in progress survives a reload', () => {
    const s = memoryStorage()
    const w = startWalk(null, 1000, { id: 'o', messageOffset: 0 })
    saveActiveWalk(w, s)
    expect(loadActiveWalk(s)).toEqual({ version: 1, ...w })
  })
})
