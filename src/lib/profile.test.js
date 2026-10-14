import { describe, expect, it } from 'vitest'
import { applyBackup, buildBackup, validateBackup } from './backup.js'
import { LINES_BY_IMPROVE, encouragementLines } from './encouragement.js'
import {
  COMMUNITY_INVITE_URL, PROFILE_KEY, communityAvailable, emptyProfile, identityLine, loadProfile, resolveOnboarding,
  sanitizeProfile, saveProfile, smsHref, supportValid, trackersFromPicks, trustedContact, validatePhone,
} from './profile.js'
import { loadHabits, saveHabits } from './storage.js'
import { WALK_MESSAGES } from './walkMessages.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
    _data: data,
  }
}
const NOW = Date.parse('2026-10-10T12:00:00Z')
const FULL = {
  version: 1, onboardedAt: '2026-10-10T12:00:00.000Z', skipped: false, adultConfirmed: true, privacyAckAt: '2026-10-10T11:58:00.000Z',
  before: { daysPerWeek: 5, timesPerDay: 3 }, improve: ['calm', 'proud', 'control'], importance: 'very', identity: 'control',
  support: 'trusted', trustedName: 'Sam', trustedPhone: '+15551234567', why: 'To be there for my family',
  timeBack: { hoursPerTime: 1, moneyPerTime: null },
}

describe('profile storage and validation', () => {
  it('round-trips a full profile', () => {
    const s = memoryStorage()
    expect(saveProfile(FULL, s)).toBe(true)
    expect(loadProfile(s)).toEqual(FULL)
  })
  it('missing -> null; not an object -> null', () => {
    expect(loadProfile(memoryStorage())).toBe(null)
    expect(sanitizeProfile([1])).toBe(null)
    expect(sanitizeProfile('x')).toBe(null)
  })
  it('drops unknown and out-of-range values', () => {
    const p = sanitizeProfile({
      onboardedAt: 'nope', adultConfirmed: 'yes', privacyAckAt: '2026-01-01', before: { daysPerWeek: 9, timesPerDay: 0 },
      improve: ['calm', 'calm', 'bogus', 'sleep', 'proud', 'health'], importance: 'urgent', identity: 'hero', support: 'everyone', why: 42,
    })
    expect(p).toEqual({ ...emptyProfile(), improve: ['calm', 'sleep', 'proud'] })
  })
  it('why is trimmed, whitespace-collapsed and capped at 140', () => {
    expect(sanitizeProfile({ why: '  a\n  b  ' }).why).toBe('a b')
    expect(sanitizeProfile({ why: 'x'.repeat(300) }).why).toHaveLength(140)
  })
  it('a trusted contact needs a name and a valid phone, or it is dropped', () => {
    expect(sanitizeProfile({ ...FULL, trustedPhone: 'call me' })).toMatchObject({ support: null, trustedName: '', trustedPhone: '' })
    expect(sanitizeProfile({ ...FULL, trustedName: '  ' }).support).toBe(null)
    expect(sanitizeProfile({ ...FULL, support: 'private' })).toMatchObject({ support: 'private', trustedName: '', trustedPhone: '' })
    expect(sanitizeProfile({ ...FULL, trustedPhone: '(555) 123-4567' }).trustedPhone).toBe('5551234567')
  })
  it('community cannot be picked until there is a public invite (one config constant)', () => {
    expect(COMMUNITY_INVITE_URL).toBe(null)
    expect(communityAvailable()).toBe(false)
    expect(sanitizeProfile({ support: 'community' }).support).toBe(null)
  })
})

describe('phone validation', () => {
  it.each([
    ['(555) 123-4567', '5551234567'], ['555.123.4567', '5551234567'], ['+1 555 123 4567', '+15551234567'],
    ['+44 20 7946 0958', '+442079460958'], ['5551234', '5551234'],
  ])('accepts %s', (input, out) => expect(validatePhone(input)).toBe(out))
  it.each(['', '   ', '123', '555-CALL-NOW', '++15551234567', '1+5551234567', '1234567890123456', 'javascript:alert(1)', null, 5551234567])(
    'rejects %s', (input) => expect(validatePhone(input)).toBe(null))
  it('sms: link with no prefilled text', () => {
    expect(smsHref('(555) 123-4567')).toBe('sms:5551234567')
    expect(smsHref('nope')).toBe(null)
  })
  it('screen 10 gate', () => {
    expect(supportValid({ support: 'trusted', trustedName: 'Sam', trustedPhone: '555 123 4567' })).toBe(true)
    expect(supportValid({ support: 'trusted', trustedName: 'Sam', trustedPhone: '12' })).toBe(false)
    expect(supportValid({ support: 'trusted', trustedName: '', trustedPhone: '555 123 4567' })).toBe(false)
    expect(supportValid({ support: 'private' })).toBe(true)
    expect(supportValid({ support: null })).toBe(true)
  })
  it('Text <name> only with a valid trusted contact', () => {
    expect(trustedContact(FULL)).toEqual({ name: 'Sam', href: 'sms:+15551234567' })
    expect(trustedContact({ ...FULL, support: 'private' })).toBe(null)
    expect(trustedContact(null)).toBe(null)
  })
})

describe('who sees onboarding', () => {
  it('new user (no data, no profile): shown, nothing written', () => {
    const s = memoryStorage()
    expect(resolveOnboarding({ hasData: false }, s, NOW)).toBe(true)
    expect(s._data[PROFILE_KEY]).toBeUndefined()
  })
  it('existing user (trackers, no profile): skipped and {onboardedAt, skipped:true} written once', () => {
    const s = memoryStorage()
    expect(resolveOnboarding({ hasData: true }, s, NOW)).toBe(false)
    expect(loadProfile(s)).toMatchObject({ onboardedAt: '2026-10-10T12:00:00.000Z', skipped: true })
    const written = s._data[PROFILE_KEY]
    expect(resolveOnboarding({ hasData: true }, s, NOW + 1000)).toBe(false)
    expect(s._data[PROFILE_KEY]).toBe(written)
  })
  it('finished profile: never shown again, even with no data', () => {
    const s = memoryStorage()
    saveProfile(FULL, s)
    expect(resolveOnboarding({ hasData: false }, s, NOW)).toBe(false)
  })
  it('a started-but-unfinished profile without data shows it', () => {
    const s = memoryStorage()
    saveProfile({ adultConfirmed: true }, s)
    expect(resolveOnboarding({ hasData: false }, s, NOW)).toBe(true)
  })
})

describe('trackers from picks', () => {
  let n = 0
  const id = () => `t${(n += 1)}`
  it('one tracker per pick, one start date', () => {
    n = 0
    expect(trackersFromPicks(['Gambling', 'Sports betting'], '2026-04-30', [], id)).toEqual([
      { id: 't1', name: 'Gambling', startDate: '2026-04-30' }, { id: 't2', name: 'Sports betting', startDate: '2026-04-30' },
    ])
  })
  it('custom entries trimmed; duplicates and existing names (any case) skipped; blanks dropped', () => {
    n = 0
    const out = trackersFromPicks(['  My thing  ', 'gambling', 'Alcohol', 'alcohol', ''], '2026-05-01', [{ id: 'h', name: 'Gambling', startDate: '2026-01-01' }], id)
    expect(out.map((t) => t.name)).toEqual(['My thing', 'Alcohol'])
  })
  it('created trackers save and load through the habits store', () => {
    const s = memoryStorage()
    n = 0
    saveHabits(trackersFromPicks(['Gaming', 'Scrolling', 'Shopping'], '2026-06-01', [], id), s)
    expect(loadHabits(s).habits.map((h) => h.name)).toEqual(['Gaming', 'Scrolling', 'Shopping'])
  })
})

describe('encouragement selection', () => {
  it('no picks -> the general walk lines', () => {
    expect(encouragementLines([])).toBe(WALK_MESSAGES)
    expect(encouragementLines(undefined)).toBe(WALK_MESSAGES)
  })
  it('picks choose the lines, interleaved by topic, with a few general lines after', () => {
    const lines = encouragementLines(['money', 'calm'])
    expect(lines.slice(0, 2)).toEqual([LINES_BY_IMPROVE.money[0], LINES_BY_IMPROVE.calm[0]])
    expect(lines.slice(0, 6).sort()).toEqual([...LINES_BY_IMPROVE.money, ...LINES_BY_IMPROVE.calm].sort())
    expect(lines.slice(6)).toEqual(WALK_MESSAGES.slice(0, 3))
    expect(lines.some((l) => LINES_BY_IMPROVE.sleep.includes(l))).toBe(false)
  })
  it('every improve option has lines', () => {
    for (const id of ['calm', 'sleep', 'proud', 'relationships', 'control', 'money', 'health', 'interests']) expect(LINES_BY_IMPROVE[id].length).toBeGreaterThan(1)
  })
})

describe('what answers power', () => {
  it('identity line under the tagline', () => {
    expect(identityLine(FULL)).toBe('Someone taking back control')
    expect(identityLine({ identity: null })).toBe('')
  })
})

describe('backup with the profile', () => {
  it('round-trip keeps the profile', () => {
    const s = memoryStorage()
    saveProfile(FULL, s)
    const r = validateBackup(JSON.stringify(buildBackup(s, NOW)))
    expect(r.ok).toBe(true)
    expect(r.backup.data.profile).toEqual(FULL)
    const t = memoryStorage()
    expect(applyBackup(r.backup, t, NOW)).toBe(true)
    expect(loadProfile(t)).toEqual(FULL)
  })
  it('no profile on the phone -> none in the file', () => {
    expect('profile' in buildBackup(memoryStorage(), NOW).data).toBe(false)
  })
  it('old backups (no profile) still import and clear any profile; trackers then skip onboarding', () => {
    const old = { app: 'urge-walk', format: 1, exportedAt: '2026-09-01T12:00:00.000Z', data: { habits: [{ id: 'h', name: 'Gambling', startDate: '2026-05-01' }], walks: [], journal: [] } }
    const r = validateBackup(JSON.stringify(old))
    expect(r.ok).toBe(true)
    const t = memoryStorage()
    saveProfile(FULL, t)
    expect(applyBackup(r.backup, t, NOW)).toBe(true)
    expect(loadProfile(t)).toBe(null)
    expect(resolveOnboarding({ hasData: true }, t, NOW)).toBe(false)
    expect(loadProfile(t).skipped).toBe(true)
  })
  it('a damaged profile fails the import; bad values inside are cleaned', () => {
    const base = { app: 'urge-walk', format: 1, exportedAt: '2026-09-01T12:00:00.000Z', data: { habits: [], walks: [], journal: [] } }
    expect(validateBackup(JSON.stringify({ ...base, data: { ...base.data, profile: 'x' } })).ok).toBe(false)
    const r = validateBackup(JSON.stringify({ ...base, data: { ...base.data, profile: { ...FULL, trustedPhone: '<script>', importance: 'max' } } }))
    expect(r.ok).toBe(true)
    expect(r.backup.data.profile).toMatchObject({ importance: null, support: null, trustedPhone: '' })
  })
  it('undo after import restores the previous profile', async () => {
    const { undoImport } = await import('./backup.js')
    const t = memoryStorage()
    saveProfile(FULL, t)
    const r = validateBackup(JSON.stringify({ app: 'urge-walk', format: 1, exportedAt: '2026-09-01T12:00:00.000Z', data: { habits: [], walks: [], journal: [], profile: { ...FULL, why: 'new' } } }))
    applyBackup(r.backup, t, NOW)
    expect(loadProfile(t).why).toBe('new')
    expect(undoImport(t)).toBe(true)
    expect(loadProfile(t).why).toBe(FULL.why)
  })
})
