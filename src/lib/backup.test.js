import { describe, expect, it } from 'vitest'
import {
  APP_NAME, BACKUP_FORMAT, MAX_FILE_BYTES, UNDO_KEY, applyBackup, backupFilename, buildBackup, dismissNudge,
  getUndoInfo, hasAnyData, loadBackupMeta, recordBackup, shouldNudge, summaryText, undoImport, validateBackup,
} from './backup.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
  }
}

const T0 = Date.parse('2026-10-08T13:30:00Z') // 9:30 AM New York
const DAY = 24 * 60 * 60 * 1000

function seeded() {
  const s = memoryStorage()
  s.setItem('urgewalk.v1.habits', JSON.stringify({ version: 1, habits: [
    { id: 'h1', name: 'Habit one', startDate: '2025-01-15' },
    { id: 'h2', name: 'Habit two', startDate: '2024-02-29' },
  ] }))
  s.setItem('urgewalk.v1.walks', JSON.stringify({ version: 1, walks: [
    { id: 'w1', startedAt: '2026-10-07T12:00:00.000Z', endedAt: '2026-10-07T12:10:00.000Z', mode: 'timed', plannedMinutes: 10, actualSeconds: 600, endedEarly: false, result: 'yes', note: 'felt better' },
    { id: 'w2', startedAt: '2026-10-07T18:00:00.000Z', endedAt: '2026-10-07T18:23:00.000Z', mode: 'open', plannedMinutes: null, actualSeconds: 1380, endedEarly: false, result: null, note: '' },
  ] }))
  s.setItem('urgewalk.v1.journal', JSON.stringify({ version: 1, entries: [
    { id: 'j1', createdAt: '2026-10-06T01:00:00.000Z', updatedAt: '2026-10-06T01:05:00.000Z', title: 'Night', body: 'Private words', mood: 'okay' },
  ] }))
  s.setItem('urgewalk.v1.walkPrefs', JSON.stringify({ version: 1, choice: 'custom', customMinutes: 25 }))
  s.setItem('urgewalk.v1.activeWalk', JSON.stringify({ version: 1, id: 'a', plannedMinutes: 10, startedAt: T0, pausedAt: null, pausedMs: 0, endedAt: null, endedEarly: false, messageOffset: 0 }))
  s.setItem('urgewalk.v1.journalDraft', JSON.stringify({ version: 1, entryId: null, startedAt: '2026-10-08T13:00:00.000Z', title: '', body: 'draft', mood: null }))
  return s
}

const fileText = (over = {}, dataOver = {}) => JSON.stringify({
  ...buildBackup(seeded(), T0), ...over, data: { ...buildBackup(seeded(), T0).data, ...dataOver },
})

describe('export', () => {
  it('has app name, format version, export time and all data (not the temporary walk/draft)', () => {
    const b = buildBackup(seeded(), T0)
    expect(b.app).toBe(APP_NAME)
    expect(b.format).toBe(BACKUP_FORMAT)
    expect(b.exportedAt).toBe('2026-10-08T13:30:00.000Z')
    expect(Object.keys(b.data)).toEqual(['habits', 'walks', 'journal', 'walkPrefs', 'milestones'])
    expect(b.data.habits).toHaveLength(2)
    expect(b.data.walks).toHaveLength(2)
    expect(b.data.journal[0].body).toBe('Private words')
    expect(b.data.walkPrefs).toEqual({ choice: 'custom', customMinutes: 25 })
    expect(JSON.stringify(b)).not.toContain('draft')
  })

  it('filename uses the local date', () => {
    expect(backupFilename(T0)).toBe('urge-walk-backup-2026-10-08.json')
    expect(backupFilename(Date.parse('2026-10-09T02:00:00Z'))).toBe('urge-walk-backup-2026-10-08.json') // 10 PM local
  })

  it('hasAnyData', () => {
    expect(hasAnyData(memoryStorage())).toBe(false)
    expect(hasAnyData(seeded())).toBe(true)
  })
})

describe('validation', () => {
  it('accepts a real backup and summarizes it', () => {
    const r = validateBackup(fileText())
    expect(r.ok).toBe(true)
    expect(r.summary).toEqual({ habits: 2, walks: 2, breathes: 0, logged: 0, journal: 1, exportedAt: '2026-10-08T13:30:00.000Z', skipped: 0 })
    expect(summaryText(r.summary)).toBe('2 habits, 2 walks, 1 journal entry')
  })

  it('rejects junk with a clear message (never throws)', () => {
    const bad = ['', '   ', 'hello', '{', '[]', 'null', '42', '{"app":"other-app","format":1}', JSON.stringify({ format: 1 })]
    for (const text of bad) {
      const r = validateBackup(text)
      expect(r.ok).toBe(false)
      expect(typeof r.error).toBe('string')
    }
    expect(validateBackup('hello').error).toMatch(/isn’t an Urge Walk backup/)
    expect(validateBackup(undefined).ok).toBe(false)
  })

  it('rejects newer, old/unknown or missing format versions', () => {
    expect(validateBackup(fileText({ format: 2 })).error).toMatch(/newer version/)
    expect(validateBackup(fileText({ format: 0 })).ok).toBe(false)
    expect(validateBackup(fileText({ format: '1' })).ok).toBe(false)
    expect(validateBackup(fileText({ format: undefined })).ok).toBe(false)
  })

  it('rejects missing or damaged fields', () => {
    expect(validateBackup(fileText({ exportedAt: 'yesterday' })).ok).toBe(false)
    expect(validateBackup(JSON.stringify({ app: APP_NAME, format: 1, exportedAt: '2026-10-08T00:00:00Z' })).error).toMatch(/No data/)
    expect(validateBackup(fileText({}, { walks: { not: 'a list' } })).error).toMatch(/walks/)
    expect(validateBackup(fileText({}, { walkPrefs: 'fast' })).ok).toBe(false)
  })

  it('treats missing lists as empty and skips damaged items', () => {
    const r = validateBackup(fileText({}, {
      journal: undefined,
      walks: [{ id: 'x', startedAt: 'nope' }, ...buildBackup(seeded(), T0).data.walks],
      habits: [{ name: '', startDate: '2020-01-01' }],
    }))
    expect(r.ok).toBe(true)
    expect(r.summary).toMatchObject({ habits: 0, walks: 2, journal: 0, skipped: 2 })
  })

  it('rejects huge files and absurd item counts', () => {
    expect(validateBackup('x'.repeat(MAX_FILE_BYTES + 1)).error).toMatch(/too large/)
    const many = Array.from({ length: 501 }, (_, i) => ({ id: `h${i}`, name: 'x', startDate: '2020-01-01' }))
    expect(validateBackup(fileText({}, { habits: many })).error).toMatch(/too many habits/)
  })

  it('cleans prefs values', () => {
    const r = validateBackup(fileText({}, { walkPrefs: { choice: 'turbo', customMinutes: 999 } }))
    expect(r.backup.data.walkPrefs).toEqual({ choice: 10, customMinutes: 120 })
  })
})

describe('import round-trip, safety copy and undo', () => {
  it('export then import on an empty phone gives back the same data', () => {
    const original = seeded()
    const text = JSON.stringify(buildBackup(original, T0))
    const target = memoryStorage()
    const r = validateBackup(text)
    expect(applyBackup(r.backup, target, T0)).toBe(true)
    expect(buildBackup(target, T0).data).toEqual(buildBackup(original, T0).data)
  })

  it('keeps a safety copy and undo restores exactly what was there', () => {
    const phone = seeded()
    const before = { ...phone.data }
    const other = memoryStorage()
    other.setItem('urgewalk.v1.habits', JSON.stringify({ version: 1, habits: [{ id: 'z', name: 'Other', startDate: '2026-01-01' }] }))
    const { backup } = validateBackup(JSON.stringify(buildBackup(other, T0)))

    applyBackup(backup, phone, T0)
    expect(getUndoInfo(phone)).toEqual({ savedAt: '2026-10-08T13:30:00.000Z' })
    expect(buildBackup(phone, T0).data.habits.map((h) => h.name)).toEqual(['Other'])
    expect(buildBackup(phone, T0).data.walks).toEqual([])
    expect(phone.getItem('urgewalk.v1.activeWalk')).toBeNull() // replaced too
    expect(phone.getItem('urgewalk.v1.journalDraft')).toBeNull()

    expect(undoImport(phone)).toBe(true)
    expect(phone.data).toEqual(before) // byte-for-byte, incl. walk in progress and draft
    expect(getUndoInfo(phone)).toBeNull()
    expect(undoImport(phone)).toBe(false)
  })

  it('undo removes keys that did not exist before the import', () => {
    const phone = memoryStorage()
    applyBackup(validateBackup(fileText()).backup, phone, T0)
    expect(hasAnyData(phone)).toBe(true)
    undoImport(phone)
    expect(phone.data).toEqual({})
  })

  it('a second import replaces the safety copy', () => {
    const phone = seeded()
    const { backup } = validateBackup(fileText())
    applyBackup(backup, phone, T0)
    applyBackup(backup, phone, T0 + DAY)
    expect(getUndoInfo(phone).savedAt).toBe(new Date(T0 + DAY).toISOString())
    expect(JSON.parse(phone.data[UNDO_KEY]).values['urgewalk.v1.activeWalk']).toBeNull()
  })

  it('does not touch data if the safety copy cannot be written', () => {
    const phone = seeded()
    const before = { ...phone.data }
    const blocked = { ...phone, setItem: () => { throw new Error('quota') } }
    expect(applyBackup(validateBackup(fileText()).backup, blocked, T0)).toBe(false)
    expect(phone.data).toEqual(before)
  })
})

describe('backup reminder', () => {
  it('nudges after 7 days, never without data, and dismissing hides it for 7 days', () => {
    const none = { lastBackupAt: null, nudgeDismissedAt: null }
    expect(shouldNudge(none, true, T0)).toBe(true)
    expect(shouldNudge(none, false, T0)).toBe(false)
    const at = (days) => new Date(T0 - days * DAY).toISOString()
    expect(shouldNudge({ ...none, lastBackupAt: at(6.9) }, true, T0)).toBe(false)
    expect(shouldNudge({ ...none, lastBackupAt: at(7) }, true, T0)).toBe(true)
    expect(shouldNudge({ lastBackupAt: at(30), nudgeDismissedAt: at(2) }, true, T0)).toBe(false)
    expect(shouldNudge({ lastBackupAt: at(30), nudgeDismissedAt: at(8) }, true, T0)).toBe(true)
  })

  it('records last backup and dismissal times', () => {
    const s = memoryStorage()
    recordBackup(T0, s)
    dismissNudge(T0 + DAY, s)
    expect(loadBackupMeta(s)).toEqual({ lastBackupAt: '2026-10-08T13:30:00.000Z', nudgeDismissedAt: '2026-10-09T13:30:00.000Z' })
    expect(loadBackupMeta(memoryStorage({ 'urgewalk.v1.backupMeta': '{x' }))).toEqual({ lastBackupAt: null, nudgeDismissedAt: null })
  })
})

describe('milestones in backups', () => {
  const withMilestones = () => {
    const s = seeded()
    s.setItem('urgewalk.v1.milestones', JSON.stringify({ version: 1, trackers: {
      h1: { earned: { 7: '2025-01-22', 30: '2025-02-14' }, seen: [7, 30] },
    } }))
    return s
  }
  it('round-trips the earned / seen history', () => {
    const text = JSON.stringify(buildBackup(withMilestones(), T0))
    const v = validateBackup(text)
    expect(v.ok).toBe(true)
    const phone = memoryStorage()
    expect(applyBackup(v.backup, phone, T0)).toBe(true)
    expect(JSON.parse(phone.data['urgewalk.v1.milestones']).trackers).toEqual({
      h1: { earned: { 7: '2025-01-22', 30: '2025-02-14' }, seen: [7, 30] },
    })
    expect(buildBackup(phone, T0).data.milestones).toEqual(buildBackup(withMilestones(), T0).data.milestones)
  })
  it('old backups without milestones still import (and clear stale history so it is rebuilt quietly)', () => {
    const old = buildBackup(seeded(), T0)
    delete old.data.milestones
    const v = validateBackup(JSON.stringify(old))
    expect(v.ok).toBe(true)
    expect(v.backup.data.milestones).toBeUndefined()
    const phone = withMilestones()
    expect(applyBackup(v.backup, phone, T0)).toBe(true)
    expect(phone.getItem('urgewalk.v1.milestones')).toBeNull()
  })
  it('damaged milestones: wrong type is rejected, bad entries are dropped, unknown trackers are dropped', () => {
    expect(validateBackup(fileText({}, { milestones: 'oops' })).ok).toBe(false)
    expect(validateBackup(fileText({}, { milestones: [] })).ok).toBe(false)
    const v = validateBackup(fileText({}, { milestones: { trackers: {
      h1: { earned: { 7: '2025-01-22', 9: '2025-01-24', 30: 'x' }, seen: [7, 'y'] },
      ghost: { earned: { 7: '2025-01-22' }, seen: [7] },
    } } }))
    expect(v.ok).toBe(true)
    expect(v.backup.data.milestones.trackers).toEqual({ h1: { earned: { 7: '2025-01-22' }, seen: [7] } })
  })
  it('undo puts the previous milestone history back', () => {
    const phone = withMilestones()
    const before = phone.getItem('urgewalk.v1.milestones')
    const old = buildBackup(seeded(), T0)
    delete old.data.milestones
    applyBackup(validateBackup(JSON.stringify(old)).backup, phone, T0)
    expect(undoImport(phone)).toBeTruthy()
    expect(phone.getItem('urgewalk.v1.milestones')).toBe(before)
  })
})

