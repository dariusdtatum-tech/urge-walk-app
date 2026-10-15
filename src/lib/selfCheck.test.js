import { describe, expect, it } from 'vitest'
import { PROBE_KEY, planSelfCheck, probeStorage } from './selfCheck.js'

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) } }
const R = { hour: 20, minute: 0 }

describe('launch self-check', () => {
  it('storage probe: a write survives a read back', () => {
    const s = mem()
    expect(probeStorage(s, 5)).toBe(true)
    expect(s.getItem(PROBE_KEY)).toBe('5')
    expect(probeStorage({ getItem: () => null, setItem: () => {} })).toBe(false)
    expect(probeStorage({ getItem: () => { throw new Error() }, setItem: () => { throw new Error() } })).toBe(false)
  })
  it('all fine: nothing to do, nothing shown', () => {
    expect(planSelfCheck({ reminder: R, status: { permission: 'granted', scheduled: ['urgewalk-checkin'] }, storageOk: true })).toEqual({ reschedule: false, issues: [] })
    expect(planSelfCheck({ reminder: null, status: { permission: 'denied', scheduled: [] }, storageOk: true })).toEqual({ reschedule: false, issues: [] })
  })
  it('a missing reminder is rescheduled silently', () => {
    expect(planSelfCheck({ reminder: R, status: { permission: 'granted', scheduled: [] }, storageOk: true })).toEqual({ reschedule: true, issues: [] })
  })
  it('notifications off in Settings: one calm row, no reschedule', () => {
    const r = planSelfCheck({ reminder: R, status: { permission: 'denied', scheduled: [] }, storageOk: true })
    expect(r.reschedule).toBe(false)
    expect(r.issues).toEqual([expect.objectContaining({ id: 'notifications', title: 'Reminders are off in Settings', action: 'Turn on' })])
  })
  it('unknown status (web) does nothing', () => {
    expect(planSelfCheck({ reminder: R, status: { permission: null, scheduled: null }, storageOk: true })).toEqual({ reschedule: false, issues: [] })
  })
  it('storage trouble is shown calmly', () => {
    expect(planSelfCheck({ reminder: null, status: null, storageOk: false }).issues[0].sub).toMatch(/already saved is safe/)
  })
})
