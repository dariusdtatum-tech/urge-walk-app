// Urge record kinds: walk / breathe / logged ("Ride it out").
import { describe, expect, it } from 'vitest'
import { applyBackup, buildBackup, summaryText, validateBackup } from './backup.js'
import { BREATH, breathPhase } from './breathe.js'
import { homeChipsFixture } from './kinds.fixtures.js'
import { finishedLabel, kindOf, plannedLabel, summarize, walkSummaryLabel, weekDays } from './logStats.js'
import { rangeStats } from './homeStats.js'
import {
  BREATHE_SECONDS, buildBreatheRecord, buildLoggedRecord, lengthLabel, loadWalks, sanitizeWalks, saveWalks,
} from './walkStorage.js'
import { startWalkNow } from './walkStart.js'
import { buildWalkRecord, startWalk, finishWalk } from './walkTimer.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
    key: (i) => Object.keys(data)[i] ?? null,
    get length() { return Object.keys(data).length },
    _data: data,
  }
}

const OLD_WALK = { id: 'old', startedAt: '2026-10-01T16:00:00.000Z', endedAt: '2026-10-01T16:10:00.000Z', plannedMinutes: 10, actualSeconds: 600, endedEarly: false, result: 'yes', note: 'before kinds' }

describe('kinds on saved records', () => {
  it('old records without a kind are walks, unchanged otherwise (no destructive migration)', () => {
    const [w] = sanitizeWalks([OLD_WALK])
    expect(w).toMatchObject({ ...OLD_WALK, kind: 'walk', mode: 'timed' })
  })
  it('unknown kinds fall back to walk', () => {
    expect(sanitizeWalks([{ ...OLD_WALK, kind: 'swim' }])[0].kind).toBe('walk')
  })
  it('old data in storage loads as walks and is not rewritten just by reading', () => {
    const raw = JSON.stringify({ version: 1, walks: [OLD_WALK] })
    const s = memoryStorage({ 'urgewalk.v1.walks': raw })
    expect(loadWalks(s).walks[0].kind).toBe('walk')
    expect(s._data['urgewalk.v1.walks']).toBe(raw)
  })
  it('new walk records carry kind "walk"', () => {
    const w = finishWalk(startWalk(10, 0, { id: 'a', messageOffset: 0 }), 600_000)
    expect(buildWalkRecord(w).kind).toBe('walk')
  })
  it('breathe records: 1 minute, timed, clamped, outcome kept', () => {
    const full = buildBreatheRecord({ id: 'b', startedAt: 0, endedAt: 60_000, result: 'kinda', note: ' slow ' })
    expect(full).toMatchObject({ id: 'b', kind: 'breathe', mode: 'timed', plannedMinutes: 1, actualSeconds: 60, endedEarly: false, result: 'kinda', note: 'slow' })
    const early = buildBreatheRecord({ startedAt: 0, endedAt: 20_400 })
    expect(early).toMatchObject({ actualSeconds: 20, endedEarly: true, result: null })
    expect(buildBreatheRecord({ startedAt: 0, endedAt: 999_000 }).actualSeconds).toBe(BREATHE_SECONDS)
    expect(sanitizeWalks([full])[0]).toEqual(full)
  })
  it('"Just log it" records: an urge ridden out (passed), no duration, optional note', () => {
    const r = buildLoggedRecord({ id: 'l', at: Date.parse('2026-10-10T12:00:00Z'), note: '  phoned a friend ' })
    expect(r).toEqual({ id: 'l', kind: 'logged', startedAt: '2026-10-10T12:00:00.000Z', endedAt: '2026-10-10T12:00:00.000Z', mode: 'open', plannedMinutes: null, actualSeconds: 0, endedEarly: false, result: 'yes', note: 'phoned a friend' })
    expect(sanitizeWalks([r])[0]).toEqual(r)
    expect(sanitizeWalks([{ ...r, actualSeconds: 500 }])[0].actualSeconds).toBe(0)
  })
  it('kindOf tolerates missing data', () => {
    expect([kindOf({}), kindOf(null), kindOf({ kind: 'breathe' })]).toEqual(['walk', 'walk', 'breathe'])
  })
})

describe('stats count urges ridden out separately from walks', () => {
  const now = new Date(2026, 9, 10, 20).getTime()
  const list = homeChipsFixture()
  it('Home chips: Walked = walks only, Passed = any kind, ridden out = everything', () => {
    expect(rangeStats(list, 'week', now)).toEqual({ walked: 2, passed: 3, riddenOut: 5 })
    expect(rangeStats(list, 'all', now)).toEqual({ walked: 3, passed: 4, riddenOut: 6 })
  })
  it('Log summary: totals by kind; minutes are walking minutes only', () => {
    const s = summarize(list)
    expect(s.kinds).toEqual({ walk: 3, breathe: 2, ground: 0, logged: 1 })
    expect(s.total).toBe(6)
    expect(s.onlyWalks).toBe(false)
    expect(s.totalMinutes).toBe(30)
    expect(summarize([OLD_WALK]).onlyWalks).toBe(true)
  })
  it('This week marks include every kind', () => {
    const days = weekDays(list, '2026-10-10')
    expect(days.reduce((n, d) => n + d.count, 0)).toBe(5)
  })
  it('list labels per kind', () => {
    const [walk, breathe, logged] = [list[0], list[1], list[2]]
    expect(walkSummaryLabel(walk)).toBe('10 min walk')
    expect(walkSummaryLabel(breathe)).toBe('Breathed · 1 min')
    expect(walkSummaryLabel(logged)).toBe('Rode it out · logged')
    expect([plannedLabel(logged), finishedLabel(logged)]).toEqual(['Just logged', 'Rode it out'])
    expect(finishedLabel(breathe)).toBe('Full minute')
    expect(finishedLabel({ ...breathe, endedEarly: true })).toBe('Ended early')
  })
})

describe('backups with kinds', () => {
  it('round-trip keeps every kind', () => {
    const s = memoryStorage()
    saveWalks(homeChipsFixture(), s)
    const text = JSON.stringify(buildBackup(s, Date.parse('2026-10-10T12:00:00Z')))
    const r = validateBackup(text)
    expect(r.ok).toBe(true)
    expect(r.summary).toMatchObject({ walks: 3, breathes: 2, logged: 1 })
    expect(summaryText(r.summary)).toBe('0 habits, 3 walks, 2 breathing minutes, 1 logged urge, 0 journal entries')
    const t = memoryStorage()
    expect(applyBackup(r.backup, t).ok).not.toBe(false)
    expect(loadWalks(t).walks.map((w) => w.kind)).toEqual(homeChipsFixture().map((w) => w.kind))
  })
  it('old backups (records without kind) still import, as walks', () => {
    const old = { app: 'urge-walk', format: 1, exportedAt: '2026-09-01T12:00:00.000Z', data: { habits: [], walks: [OLD_WALK], journal: [] } }
    const r = validateBackup(JSON.stringify(old))
    expect(r.ok).toBe(true)
    expect(r.backup.data.walks[0].kind).toBe('walk')
    expect(summaryText(r.summary)).toBe('0 habits, 1 walk, 0 journal entries')
  })
  it('bad kinds in a backup become walks; broken records are skipped, not fatal', () => {
    const data = { habits: [], walks: [{ ...OLD_WALK, kind: 42 }, { kind: 'breathe' }], journal: [] }
    const r = validateBackup(JSON.stringify({ app: 'urge-walk', format: 1, exportedAt: '2026-09-01T12:00:00.000Z', data }))
    expect(r.ok).toBe(true)
    expect(r.backup.data.walks).toHaveLength(1)
    expect(r.backup.data.walks[0].kind).toBe('walk')
  })
})

describe('breathing timing', () => {
  it('in 4s, hold 3s, out 6s, repeating', () => {
    expect(BREATH).toEqual({ inMs: 4000, holdMs: 3000, outMs: 6000 })
    expect([0, 3999, 4000, 5500, 6999, 7000, 12999, 13000].map(breathPhase)).toEqual(['in', 'in', 'hold', 'hold', 'hold', 'out', 'out', 'in'])
  })
  it('about 5.5 breaths in the minute', () => {
    expect(60_000 / (BREATH.inMs + BREATH.holdMs + BREATH.outMs)).toBeCloseTo(4.62, 1)
  })
})

describe('starting a walk from Ride it out', () => {
  it('starts at the remembered length and saves it; never replaces a walk in progress', () => {
    const s = memoryStorage({ 'urgewalk.v1.walkPrefs': JSON.stringify({ version: 1, choice: 'custom', customMinutes: 25 }) })
    const w = startWalkNow(s)
    expect(w.plannedMinutes).toBe(25)
    expect(JSON.parse(s._data['urgewalk.v1.activeWalk']).id).toBe(w.id)
    expect(startWalkNow(s).id).toBe(w.id)
  })
  it('uses the clock it is given (so the app clock and tests agree)', () => {
    expect(startWalkNow(memoryStorage(), 123456789).startedAt).toBe(123456789)
  })
  it('open walks and length labels', () => {
    const s = memoryStorage({ 'urgewalk.v1.walkPrefs': JSON.stringify({ version: 1, choice: 'open', customMinutes: 20 }) })
    expect(startWalkNow(s).plannedMinutes).toBe(null)
    expect(lengthLabel({ choice: 'open', customMinutes: 20 })).toBe('Open walk')
    expect(lengthLabel({ choice: 15, customMinutes: 20 })).toBe('15 min')
    expect(lengthLabel({ choice: 'custom', customMinutes: 33 })).toBe('33 min')
  })
})
