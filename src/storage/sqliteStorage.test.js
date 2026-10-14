import { describe, expect, it } from 'vitest'
import { createSqliteStorage } from './sqliteStorage.js'
import { openTestDatabase } from './sqlJsShim.js'
import { applyBackup, buildBackup, clearAllData, validateBackup } from '../lib/backup.js'
import { loadHabits, readObject } from '../lib/storage.js'
import { loadWalks } from '../lib/walkStorage.js'
import { bannerDismissed, dismissBanner } from '../lib/calm.js'
import pwaBackup from './fixtures/pwa-backup-format1.json'

const fresh = async () => createSqliteStorage(await openTestDatabase())

describe('SQLite storage adapter (localStorage shape)', () => {
  it('get / set / remove / overwrite', async () => {
    const s = await fresh()
    expect(s.getItem('a')).toBeNull()
    s.setItem('a', '1'); s.setItem('a', '2'); s.setItem('b', 'x')
    expect(s.getItem('a')).toBe('2')
    expect(s.length).toBe(2)
    s.removeItem('a')
    expect(s.getItem('a')).toBeNull()
    expect(s.length).toBe(1)
  })
  it('key(i) walks every key; values are stored as strings', async () => {
    const s = await fresh()
    s.setItem('urgewalk.v1.b', 5); s.setItem('urgewalk.v1.a', '{"x":1}'); s.setItem('other', 'y')
    const keys = Array.from({ length: s.length }, (_, i) => s.key(i))
    expect(keys).toEqual(['other', 'urgewalk.v1.a', 'urgewalk.v1.b'])
    expect(s.key(9)).toBeNull()
    expect(s.getItem('urgewalk.v1.b')).toBe('5')
  })
  it('works with the shared lib (calm, clearAllData)', async () => {
    const s = await fresh()
    dismissBanner('2030-03-05T10:00:00.000Z', s)
    expect(bannerDismissed('2030-03-05T10:00:00.000Z', s)).toBe(true)
    s.setItem('not-ours', 'keep')
    expect(clearAllData(s)).toBe(1)
    expect(s.getItem('not-ours')).toBe('keep')
  })
  it('keeps quarantine copies for damaged data instead of deleting it', async () => {
    const s = await fresh()
    s.setItem('urgewalk.v1.habits', '{broken')
    expect(loadHabits(s).habits).toEqual([])
    const keys = Array.from({ length: s.length }, (_, i) => s.key(i))
    expect(keys.some((k) => k.startsWith('urgewalk.v1.habits.corrupt-'))).toBe(true)
  })
})

describe('backup format 1 round-trip (PWA file → SQLite → file)', () => {
  const text = JSON.stringify(pwaBackup, null, 2)
  it('the PWA file validates', () => {
    const v = validateBackup(text)
    expect(v.ok).toBe(true)
  })
  it('imports into SQLite and exports the same data back', async () => {
    const s = await fresh()
    const v = validateBackup(text)
    applyBackup(v.backup, s, Date.parse('2030-04-01T12:00:00Z'))
    expect(loadHabits(s).habits.map((h) => h.name)).toEqual(['Habit A', 'Habit B'])
    expect(loadWalks(s).walks).toHaveLength(3)
    expect(readObject('urgewalk.v1.profile', s)?.why).toBe('Test reason')
    const out = buildBackup(s, Date.parse('2030-04-02T12:00:00Z'))
    expect(out.app).toBe('urge-walk')
    expect(out.format).toBe(1)
    expect(out.data).toEqual(v.backup.data)
    expect(out.data).toEqual(pwaBackup.data) // byte-for-byte the same data the PWA exported
    expect(out.data.journal).toHaveLength(1)
    expect(out.data.habits[0].resets).toHaveLength(1)
    // and the exported file is itself a valid format 1 backup the PWA can read
    expect(validateBackup(JSON.stringify(out)).ok).toBe(true)
  })
})
