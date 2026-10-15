import { describe, expect, it } from 'vitest'
import { FIRST_WEEK_STEPS, doneSteps, firstWeekView, loadFirstWeek, saveFirstWeek, skipStep } from './firstWeek.js'

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) } }
const start = new Date(2030, 4, 1, 9).toISOString()
const day = (n) => new Date(2030, 4, 1 + n, 12).getTime()
const none = { start: false, breathe: false, contact: false, walk: false, checkin: false, map: false }
const fresh = { shown: false, skipped: [], seenMap: false, completeDismissed: false }

describe('first-week shoreline path', () => {
  it('six small optional steps in order (no reason step: reasons live in You → Your why)', () => {
    expect(FIRST_WEEK_STEPS.map((s) => s.id)).toEqual(['start', 'breathe', 'contact', 'walk', 'checkin', 'map'])
  })
  it('day 1 offers the first step; later days stay faint', () => {
    const v = firstWeekView({ onboardedAt: start, now: day(0), done: none, fw: fresh })
    expect(v.mode).toBe('path')
    expect(v.step.id).toBe('start')
    expect(v.dots.map((d) => d.status)).toEqual(['open', 'later', 'later', 'later', 'later', 'later'])
  })
  it('missed days just stay open, with no penalty; the earliest open step is offered', () => {
    const v = firstWeekView({ onboardedAt: start, now: day(3), done: { ...none, start: true, contact: true }, fw: fresh })
    expect(v.dots.map((d) => d.status)).toEqual(['done', 'open', 'done', 'open', 'later', 'later'])
    expect(v.step.id).toBe('breathe')
    expect(v.doneCount).toBe(2)
  })
  it('skip settles a step; with today’s steps settled there is a quiet rest line (step null)', () => {
    const s = mem()
    skipStep('start', s)
    const v = firstWeekView({ onboardedAt: start, now: day(0), done: none, fw: loadFirstWeek(s) })
    expect(v.dots[0].status).toBe('skipped')
    expect(v.step).toBeNull()
  })
  it('after day 7 the complete note shows once, only to people who had the path', () => {
    expect(firstWeekView({ onboardedAt: start, now: day(7), done: none, fw: fresh }).mode).toBeNull()
    const s = mem()
    saveFirstWeek({ shown: true }, s)
    expect(firstWeekView({ onboardedAt: start, now: day(7), done: none, fw: loadFirstWeek(s) }).mode).toBe('complete')
    saveFirstWeek({ completeDismissed: true }, s)
    expect(firstWeekView({ onboardedAt: start, now: day(9), done: none, fw: loadFirstWeek(s) }).mode).toBeNull()
  })
  it('everything done early: complete', () => {
    const all = Object.fromEntries(Object.keys(none).map((k) => [k, true]))
    expect(firstWeekView({ onboardedAt: start, now: day(2), done: all, fw: { ...fresh, shown: true } }).mode).toBe('complete')
  })
  it('done comes from the data the app already keeps', () => {
    const d = doneSteps({ habits: [{}], reasons: [], contacts: [{}], walks: [{ kind: 'breathe' }, { startedAt: 'x' }], checkins: { days: { '2030-05-02': {} } }, fw: { ...fresh, seenMap: true } })
    expect(d).toEqual({ start: true, breathe: true, contact: true, walk: true, checkin: true, map: true })
  })
  it('stored progress from the old seven-step path stays valid (an old "reason" skip is ignored)', () => {
    const s = mem()
    s.setItem('urgewalk.v1.firstWeek', JSON.stringify({ shown: true, skipped: ['reason', 'start'] }))
    const v = firstWeekView({ onboardedAt: start, now: day(1), done: none, fw: loadFirstWeek(s) })
    expect(v.mode).toBe('path')
    expect(v.dots).toHaveLength(6)
    expect(v.dots[0].status).toBe('skipped')
    expect(v.step.id).toBe('breathe')
  })
  it('day 7 is a rest day: all six steps were offered by day 6', () => {
    const v = firstWeekView({ onboardedAt: start, now: day(6), done: none, fw: fresh })
    expect(v.dots.every((d) => d.status === 'open')).toBe(true)
  })
  it('no setup yet: nothing', () => {
    expect(firstWeekView({ onboardedAt: null, now: day(0), done: none, fw: fresh }).mode).toBeNull()
  })
})
