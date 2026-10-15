import { describe, expect, test } from 'vitest'
import {
  MAX_REASONS, REASONS_KEY, addReason, loadReasons, loadReasonsData, mediaUris, reasonsForBackup, removeReason,
  sanitizeReasonsData, setReasonsLock, takeNextReason,
} from './reasons.js'
import { applyBackup, buildBackup, validateBackup } from './backup.js'

function memoryStorage(init = {}) {
  const d = { ...init }
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] }, key: (i) => Object.keys(d)[i] ?? null, get length() { return Object.keys(d).length } }
}

describe('reasons vault', () => {
  test('empty by default, lock off', () => {
    const s = memoryStorage()
    expect(loadReasonsData(s)).toEqual({ version: 1, reasons: [], next: 0, lock: false })
    expect(takeNextReason(s)).toBeNull()
  })
  test('add text, photo, voice; rejects empty words and missing files', () => {
    const s = memoryStorage()
    expect(addReason(s, { kind: 'text', text: '  ' }).ok).toBe(false)
    expect(addReason(s, { kind: 'photo' }).ok).toBe(false)
    expect(addReason(s, { kind: 'text', text: 'A clear head  in the morning' }).ok).toBe(true)
    expect(addReason(s, { kind: 'photo', uri: 'file:///r/a.jpg' }).ok).toBe(true)
    expect(addReason(s, { kind: 'voice', uri: 'file:///r/b.m4a', durationMs: 999999 }).ok).toBe(true)
    const r = loadReasons(s)
    expect(r.map((x) => x.kind)).toEqual(['text', 'photo', 'voice'])
    expect(r[0].text).toBe('A clear head in the morning')
    expect(r[2].durationMs).toBe(60000)
    expect(mediaUris(s)).toEqual(['file:///r/a.jpg', 'file:///r/b.m4a'])
  })
  test('caps at 12', () => {
    const s = memoryStorage()
    for (let i = 0; i < MAX_REASONS; i++) addReason(s, { kind: 'text', text: `r${i}` })
    expect(addReason(s, { kind: 'text', text: 'one more' }).ok).toBe(false)
  })
  test('rotates one at a time and wraps', () => {
    const s = memoryStorage()
    for (const t of ['a', 'b', 'c']) addReason(s, { kind: 'text', text: t })
    expect([1, 2, 3, 4].map(() => takeNextReason(s).text)).toEqual(['a', 'b', 'c', 'a'])
  })
  test('remove returns the removed reason; rotation survives', () => {
    const s = memoryStorage()
    addReason(s, { kind: 'text', text: 'a' }); const { reason } = addReason(s, { kind: 'photo', uri: 'file:///x.jpg' })
    expect(removeReason(s, reason.id).uri).toBe('file:///x.jpg')
    expect(removeReason(s, 'nope')).toBeNull()
    expect(takeNextReason(s).text).toBe('a')
  })
  test('sanitize drops junk', () => {
    expect(sanitizeReasonsData(null)).toBeNull()
    expect(sanitizeReasonsData({ reasons: [{ kind: 'video', uri: 'x' }, { kind: 'text', text: 'ok', id: 'a' }, { kind: 'text', text: 'dup', id: 'a' }], lock: 'yes' }))
      .toMatchObject({ reasons: [{ id: 'a', text: 'ok' }], lock: false })
  })
  test('backup keeps words only; import keeps photos and voice already on the phone', () => {
    const s = memoryStorage()
    addReason(s, { kind: 'text', text: 'words' }); addReason(s, { kind: 'photo', uri: 'file:///p.jpg' }); setReasonsLock(s, true)
    const b = buildBackup(s)
    expect(b.data.reasons.reasons.map((r) => r.kind)).toEqual(['text'])
    expect(JSON.stringify(b)).not.toContain('p.jpg')
    const other = memoryStorage()
    addReason(other, { kind: 'voice', uri: 'file:///v.m4a', durationMs: 3000 }); addReason(other, { kind: 'text', text: 'old words' })
    expect(applyBackup(validateBackup(JSON.stringify(b)).backup, other)).toBe(true)
    const after = loadReasonsData(other)
    expect(after.reasons.map((r) => r.text || r.uri)).toEqual(['file:///v.m4a', 'words'])
    expect(after.lock).toBe(true)
  })
  test('no reasons → no backup section', () => {
    expect(reasonsForBackup(null)).toBeNull()
    expect(buildBackup(memoryStorage()).data.reasons).toBeUndefined()
    expect(REASONS_KEY).toBe('urgewalk.v1.reasons')
  })
})

describe('homeReasonOf', () => {
  test('latest saved reason, else the setup why, else null; never while locked', async () => {
    const { homeReasonOf } = await import('./reasons.js')
    const d = (reasons, lock = false) => ({ version: 1, reasons, next: 0, lock })
    const r = { id: 'a', kind: 'text', text: 'Saved', at: '2030-01-01T00:00:00.000Z' }
    expect(homeReasonOf(d([r]), { why: 'Setup' })).toBe(r)
    expect(homeReasonOf(d([]), { why: '  Setup  ' })).toMatchObject({ kind: 'text', text: 'Setup' })
    expect(homeReasonOf(d([]), { why: '' })).toBeNull()
    expect(homeReasonOf(d([]), null)).toBeNull()
    expect(homeReasonOf(d([r], true), { why: 'Setup' })).toBeNull()
  })
})
