import { describe, expect, it, vi } from 'vitest'
import { applyBackup, buildBackup, validateBackup } from './backup.js'
import {
  CHECKIN_REMINDER_CONTENT, COMMIT_HOLD_MS, MOODS, checkinFor, cleanWord, loadCheckins, loadReminder, reminderLabel,
  sanitizeCheckins, saveCheckIn, saveReminder, stepReminder,
} from './checkin.js'
import { CHECKIN_REMINDER_ID, syncCheckinReminder } from '../native/checkinReminder.js'

function mem() {
  const d = {}
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] }, key: (i) => Object.keys(d)[i] ?? null, get length() { return Object.keys(d).length } }
}

describe('daily check-in', () => {
  it('Steady / Shaky / Rough, and any hold is at least 3 seconds', () => {
    expect(MOODS.map((m) => m.label)).toEqual(['Steady', 'Shaky', 'Rough'])
    expect(COMMIT_HOLD_MS).toBeGreaterThanOrEqual(3000)
  })
  it('one optional word', () => {
    expect(cleanWord('  tired today ')).toBe('tired')
    expect(cleanWord('x'.repeat(40))).toHaveLength(24)
    expect(cleanWord(null)).toBe('')
  })
  it('saves one check-in per day; a later one that day replaces it; missed days are simply absent', () => {
    const s = mem()
    expect(saveCheckIn('2030-05-14', { mood: 'shaky', word: 'tired', committed: true }, s, 5)).toBe(true)
    saveCheckIn('2030-05-14', { mood: 'steady' }, s, 6)
    saveCheckIn('2030-05-12', { mood: 'rough' }, s, 1)
    expect(checkinFor(s, '2030-05-14')).toEqual({ mood: 'steady', at: 6 })
    expect(checkinFor(s, '2030-05-13')).toBe(null)
    expect(Object.keys(loadCheckins(s).days).sort()).toEqual(['2030-05-12', '2030-05-14'])
    expect(saveCheckIn('2030-05-14', { mood: 'great' }, s)).toBe(false)
  })
  it('sanitizes stored or imported data', () => {
    expect(sanitizeCheckins({ days: { '2030-05-14': { mood: 'rough', word: 'a b', committed: 'yes', at: 3 }, bad: { mood: 'steady' }, '2030-05-13': { mood: 'x' } } }))
      .toEqual({ version: 1, days: { '2030-05-14': { mood: 'rough', word: 'a', at: 3 } } })
    expect(sanitizeCheckins(null)).toEqual({ version: 1, days: {} })
  })
  it('check-ins go in the backup file (format 1) only when there are some, and come back on import', () => {
    const s = mem()
    expect('checkins' in buildBackup(s).data).toBe(false)
    saveCheckIn('2030-05-14', { mood: 'steady', committed: true }, s, 9)
    const file = JSON.stringify(buildBackup(s))
    const v = validateBackup(file)
    expect(v.ok).toBe(true)
    const t = mem()
    applyBackup(v.backup, t)
    expect(checkinFor(t, '2030-05-14')).toEqual({ mood: 'steady', committed: true, at: 9 })
    expect(validateBackup(JSON.stringify({ ...JSON.parse(file), data: { ...JSON.parse(file).data, checkins: [1] } })).ok).toBe(false)
  })
  it('reminder: off by default, 15-minute steps, plain label', () => {
    const s = mem()
    expect(loadReminder(s)).toBe(null)
    saveReminder({ hour: 20, minute: 45 }, s)
    expect(loadReminder(s)).toEqual({ hour: 20, minute: 45 })
    expect(reminderLabel({ hour: 20, minute: 45 })).toBe('8:45 PM')
    expect(reminderLabel({ hour: 0, minute: 0 })).toBe('12:00 AM')
    expect(stepReminder({ hour: 23, minute: 45 }, 1)).toEqual({ hour: 0, minute: 0 })
    expect(stepReminder({ hour: 0, minute: 0 }, -1)).toEqual({ hour: 23, minute: 45 })
  })
  it('the reminder is one daily local notification with calm wording; off cancels it', async () => {
    const N = { cancelScheduledNotificationAsync: vi.fn(async () => {}), getPermissionsAsync: async () => ({ granted: true }), scheduleNotificationAsync: vi.fn(async () => {}) }
    expect(await syncCheckinReminder(N, { hour: 8, minute: 30 })).toBe(true)
    expect(N.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({ identifier: CHECKIN_REMINDER_ID, trigger: { type: 'daily', hour: 8, minute: 30 } })
    expect(await syncCheckinReminder(N, null)).toBe(false)
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2)
    expect(`${CHECKIN_REMINDER_CONTENT.title} ${CHECKIN_REMINDER_CONTENT.body}`).not.toMatch(/streak|miss|fail|!/i)
  })
})
