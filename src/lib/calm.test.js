import { describe, expect, it } from 'vitest'
import { clearAllData, lastBackupLabel } from './backup.js'
import { BANNER_KEY, CALM_AFTER_MS, bannerDismissed, dismissBanner, isCalm, markSaved, markStress, recentlySaved } from './calm.js'
import { appendWalk, buildLoggedRecord, loadWalks, removeWalk } from './walkStorage.js'

function memoryStorage() {
  const data = {}
  return {
    getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] },
    get length() { return Object.keys(data).length }, key: (i) => Object.keys(data)[i] ?? null, _data: data,
  }
}
const T = new Date('2030-03-05T15:00:00').getTime()

describe('calm moments', () => {
  it('reminders wait 30 minutes after a stressful moment', () => {
    const s = memoryStorage()
    expect(isCalm(T, s)).toBe(true)
    markStress(T, s)
    expect(isCalm(T + 60_000, s)).toBe(false)
    expect(isCalm(T + CALM_AFTER_MS - 1, s)).toBe(false)
    expect(isCalm(T + CALM_AFTER_MS, s)).toBe(true)
  })
  it('the save highlight lasts a few seconds', () => {
    const s = memoryStorage()
    markSaved('x', T, s)
    expect(recentlySaved(T + 1000, s)).toBe(true)
    expect(recentlySaved(T + 60_000, s)).toBe(false)
  })
  it('the undo banner stays dismissed for that reset only', () => {
    const s = memoryStorage()
    dismissBanner('2030-03-05T10:00:00.000Z', s)
    expect(bannerDismissed('2030-03-05T10:00:00.000Z', s)).toBe(true)
    expect(bannerDismissed('2030-03-06T10:00:00.000Z', s)).toBe(false)
  })
  it('dismissing one tracker’s banner never hides another’s', () => {
    const s = memoryStorage()
    dismissBanner('2030-03-05T10:00:00.000Z', s)
    dismissBanner('2030-03-05T10:00:05.000Z', s)
    expect(bannerDismissed('2030-03-05T10:00:00.000Z', s)).toBe(true)
    expect(bannerDismissed('2030-03-05T10:00:05.000Z', s)).toBe(true)
    expect(bannerDismissed('2030-03-05T10:00:09.000Z', s)).toBe(false)
    dismissBanner('2030-03-05T10:00:00.000Z', s) // no duplicates
    expect(JSON.parse(s.getItem(BANNER_KEY)).list).toHaveLength(2)
  })
  it('migrates the old single { at } value', () => {
    const s = memoryStorage()
    s.setItem(BANNER_KEY, JSON.stringify({ at: '2030-03-01T09:00:00.000Z' }))
    expect(bannerDismissed('2030-03-01T09:00:00.000Z', s)).toBe(true)
    dismissBanner('2030-03-02T09:00:00.000Z', s)
    expect(JSON.parse(s.getItem(BANNER_KEY))).toEqual({ list: ['2030-03-01T09:00:00.000Z', '2030-03-02T09:00:00.000Z'] })
  })
  it('ignores damaged values and keeps the list short', () => {
    const s = memoryStorage()
    s.setItem(BANNER_KEY, '{bad')
    expect(bannerDismissed('x', s)).toBe(false)
    s.setItem(BANNER_KEY, JSON.stringify({ list: [1, null, 'a'] }))
    expect(bannerDismissed('a', s)).toBe(true)
    for (let i = 0; i < 30; i += 1) dismissBanner(`r${i}`, s)
    expect(JSON.parse(s.getItem(BANNER_KEY)).list).toHaveLength(20)
    expect(bannerDismissed('r29', s)).toBe(true)
  })
})

describe('undo a log-only save', () => {
  it('removes just that record', () => {
    const s = memoryStorage()
    appendWalk(buildLoggedRecord({ id: 'a', at: T }), s)
    appendWalk(buildLoggedRecord({ id: 'b', at: T + 1 }), s)
    expect(removeWalk('b', s)).toBe(true)
    expect(loadWalks(s).walks.map((w) => w.id)).toEqual(['a'])
    expect(removeWalk('zzz', s)).toBe(false)
  })
})

describe('backup helpers', () => {
  it('labels the last backup in days', () => {
    expect(lastBackupLabel({}, T)).toBe('No backup yet')
    expect(lastBackupLabel({ lastBackupAt: new Date(T - 3600_000).toISOString() }, T)).toBe('Last backup today')
    expect(lastBackupLabel({ lastBackupAt: new Date('2030-03-04T23:00:00').toISOString() }, T)).toBe('Last backup yesterday')
    expect(lastBackupLabel({ lastBackupAt: new Date('2030-02-26T09:00:00').toISOString() }, T)).toBe('Last backup 7 days ago')
  })
  it('Reset app clears only Urge Walk keys', () => {
    const s = memoryStorage()
    s.setItem('urgewalk.v1.habits', '{}'); s.setItem('urgewalk.v1.walks', '{}'); s.setItem('other.app', '1')
    expect(clearAllData(s)).toBe(2)
    expect(Object.keys(s._data)).toEqual(['other.app'])
  })
})

describe('Just log it outcome', () => {
  it('defaults to Passed and keeps Kinda / Didn’t', () => {
    expect(buildLoggedRecord({ at: 0 }).result).toBe('yes')
    expect(buildLoggedRecord({ at: 0, result: 'kinda' }).result).toBe('kinda')
    expect(buildLoggedRecord({ at: 0, result: 'no' }).result).toBe('no')
    expect(buildLoggedRecord({ at: 0, result: 'bogus' }).result).toBe('yes')
  })
})
