import { describe, expect, it } from 'vitest'
import { CHECKIN_REMINDER_CONTENT } from './checkin.js'
import { FOLLOWUP_CONTENT } from './followUp.js'
import { BUDGET, fitsBudget, inQuietHours, loadNotifyPrefs, recordSent, saveNotifyPrefs, unrecordSent, weekPreview } from './notifyBudget.js'
import { WALK_ALERT_CONTENT } from '../native/walkAlert.js'

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const at = (d, h, m = 0) => new Date(2030, 4, d, h, m).getTime()

describe('notification budget', () => {
  it('quiet hours are 10 PM to 8 AM', () => {
    expect(BUDGET).toEqual({ perDay: 1, quietStart: 22, quietEnd: 8 })
    expect(inQuietHours(at(14, 21, 59))).toBe(false)
    expect(inQuietHours(at(14, 22))).toBe(true)
    expect(inQuietHours(at(15, 7, 59))).toBe(true)
    expect(inQuietHours(at(15, 8))).toBe(false)
  })
  it('one counted notification a day; a cancelled one gives the day back', () => {
    const s = mem()
    expect(fitsBudget(at(14, 10), s)).toBe(true)
    recordSent(at(14, 10), s)
    expect(fitsBudget(at(14, 15), s)).toBe(false)
    expect(fitsBudget(at(15, 9), s)).toBe(true)
    unrecordSent(at(14, 10), s)
    expect(fitsBudget(at(14, 15), s)).toBe(true)
    expect(fitsBudget(at(14, 23), s)).toBe(false)
  })
  it('the walk alert is on unless turned off', () => {
    const s = mem()
    expect(loadNotifyPrefs(s).walkAlert).toBe(true)
    saveNotifyPrefs({ walkAlert: false }, s)
    expect(loadNotifyPrefs(s).walkAlert).toBe(false)
  })
  it('the preview shows the exact words each notification uses, in a plain voice', () => {
    const p = weekPreview({ reminder: { hour: 8, minute: 30 }, followUpOn: true, walkAlertOn: true })
    expect(p.map((n) => [n.id, n.counts])).toEqual([['checkin', false], ['followUp', true], ['walkAlert', false]])
    expect(p[0]).toMatchObject({ title: CHECKIN_REMINDER_CONTENT.title, body: CHECKIN_REMINDER_CONTENT.body, when: 'Every day at 8:30 AM' })
    expect(p[1]).toMatchObject({ title: FOLLOWUP_CONTENT.title, body: FOLLOWUP_CONTENT.body })
    expect(p[2]).toMatchObject({ title: WALK_ALERT_CONTENT.title, body: WALK_ALERT_CONTENT.body })
    for (const n of p) expect(`${n.title} ${n.body}`).not.toMatch(/streak|don.t break|miss|fail|lose/i)
  })
})
