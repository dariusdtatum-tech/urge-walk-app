import { describe, expect, it } from 'vitest'
import {
  CUSTOM_MAX, CUSTOM_MIN, buildWalkRecord, clampCustomMinutes, elapsedMs, finishWalk, formatClock, formatElapsed,
  MAX_PLANNED_MINUTES, canExtend, extendWalk, isOpen, isTimeUp, messageIndex, pauseWalk, progress, remainingMs,
  resumeWalk, startWalk,
} from './walkTimer.js'

const MIN = 60 * 1000
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0) // any fixed moment
const walk10 = () => startWalk(10, T0, { id: 'w1', messageOffset: 0 })

describe('remaining time from timestamps', () => {
  it('counts down from the planned length', () => {
    const w = walk10()
    expect(remainingMs(w, T0)).toBe(10 * MIN)
    expect(remainingMs(w, T0 + 3 * MIN)).toBe(7 * MIN)
    expect(formatClock(remainingMs(w, T0 + 2.5 * MIN))).toBe('7:30')
    expect(progress(w, T0 + 5 * MIN)).toBe(0.5)
  })

  it('never goes below zero or above the planned length', () => {
    const w = walk10()
    expect(remainingMs(w, T0 + 60 * MIN)).toBe(0)
    expect(remainingMs(w, T0 - 5 * MIN)).toBe(10 * MIN) // clock moved backwards
  })

  it('a long gap (screen locked / app frozen) is still counted', () => {
    const w = walk10()
    // nothing "ticks" between these two calls — only timestamps matter
    expect(remainingMs(w, T0 + 9 * MIN + 1000)).toBe(59 * 1000)
    expect(isTimeUp(w, T0 + 10 * MIN)).toBe(true)
  })
})

describe('pause / resume', () => {
  it('freezes the clock while paused', () => {
    let w = pauseWalk(walk10(), T0 + 2 * MIN)
    expect(remainingMs(w, T0 + 2 * MIN)).toBe(8 * MIN)
    expect(remainingMs(w, T0 + 30 * MIN)).toBe(8 * MIN)
    expect(isTimeUp(w, T0 + 30 * MIN)).toBe(false)
    w = resumeWalk(w, T0 + 5 * MIN) // paused for 3 minutes
    expect(w.pausedMs).toBe(3 * MIN)
    expect(remainingMs(w, T0 + 6 * MIN)).toBe(7 * MIN)
  })

  it('handles several pauses', () => {
    let w = walk10()
    w = resumeWalk(pauseWalk(w, T0 + 1 * MIN), T0 + 2 * MIN)
    w = resumeWalk(pauseWalk(w, T0 + 4 * MIN), T0 + 7 * MIN)
    expect(elapsedMs(w, T0 + 8 * MIN)).toBe(4 * MIN)
  })

  it('pause twice / resume when not paused are no-ops', () => {
    const p = pauseWalk(walk10(), T0 + MIN)
    expect(pauseWalk(p, T0 + 2 * MIN)).toBe(p)
    const w = walk10()
    expect(resumeWalk(w, T0 + MIN)).toBe(w)
  })
})

describe('resume after reload', () => {
  it('a walk saved as JSON and read back keeps its time', () => {
    const saved = JSON.stringify(pauseWalk(walk10(), T0 + 4 * MIN))
    let w = JSON.parse(saved)
    expect(remainingMs(w, T0 + 20 * MIN)).toBe(6 * MIN)
    w = resumeWalk(w, T0 + 20 * MIN)
    const again = JSON.parse(JSON.stringify(w))
    expect(remainingMs(again, T0 + 21 * MIN)).toBe(5 * MIN)
  })
})

describe('finishing', () => {
  it('full walk: endedAt is the moment the timer hit zero', () => {
    const w = finishWalk(walk10(), T0 + 45 * MIN) // app reopened long after
    expect(w.endedAt).toBe(T0 + 10 * MIN)
    expect(w.endedEarly).toBe(false)
    const r = buildWalkRecord(w, { result: 'yes', note: '  felt better  ' })
    expect(r).toEqual({
      kind: 'walk',
      id: 'w1',
      startedAt: '2026-01-01T12:00:00.000Z',
      endedAt: '2026-01-01T12:10:00.000Z',
      mode: 'timed',
      plannedMinutes: 10,
      actualSeconds: 600,
      endedEarly: false,
      result: 'yes',
      note: 'felt better',
    })
  })

  it('full walk with a pause ends later by the paused time', () => {
    const w = finishWalk(resumeWalk(pauseWalk(walk10(), T0 + MIN), T0 + 3 * MIN), T0 + 30 * MIN)
    expect(w.endedAt).toBe(T0 + 12 * MIN)
    expect(buildWalkRecord(w).actualSeconds).toBe(600)
  })

  it('end early records the time actually walked', () => {
    const w = finishWalk(walk10(), T0 + 3 * MIN + 20 * 1000, { early: true })
    expect(w.endedEarly).toBe(true)
    const r = buildWalkRecord(w)
    expect(r.actualSeconds).toBe(200)
    expect(r.result).toBeNull()
    expect(r.note).toBe('')
  })

  it('end early while paused does not count the pause', () => {
    const paused = pauseWalk(walk10(), T0 + 2 * MIN)
    const w = finishWalk(paused, T0 + 9 * MIN, { early: true })
    expect(buildWalkRecord(w).actualSeconds).toBe(120)
  })

  it('"end early" after the time is already up counts as a full walk', () => {
    const w = finishWalk(walk10(), T0 + 11 * MIN, { early: true })
    expect(w.endedEarly).toBe(false)
  })

  it('finishing twice changes nothing', () => {
    const w = finishWalk(walk10(), T0 + 11 * MIN)
    expect(finishWalk(w, T0 + 50 * MIN)).toBe(w)
  })
})

describe('display helpers', () => {
  it('formatClock rounds up', () => {
    expect(formatClock(10 * MIN)).toBe('10:00')
    expect(formatClock(10 * MIN - 1)).toBe('10:00')
    expect(formatClock(59_001)).toBe('1:00')
    expect(formatClock(1)).toBe('0:01')
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(120 * MIN)).toBe('2:00:00')
    expect(formatClock(61 * MIN)).toBe('1:01:00')
  })

  it('formatElapsed rounds down (count-up)', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(59_999)).toBe('0:59')
    expect(formatElapsed(23 * MIN + 5000)).toBe('23:05')
    expect(formatElapsed(75 * MIN)).toBe('1:15:00')
  })

  it('message changes every 2 minutes and wraps around', () => {
    const w = startWalk(15, T0, { id: 'x', messageOffset: 9 })
    expect(messageIndex(w, T0, 11)).toBe(9)
    expect(messageIndex(w, T0 + 119 * 1000, 11)).toBe(9)
    expect(messageIndex(w, T0 + 2 * MIN, 11)).toBe(10)
    expect(messageIndex(w, T0 + 4 * MIN, 11)).toBe(0)
  })
})

describe('open walk (counts up)', () => {
  const open = () => startWalk(null, T0, { id: 'o1', messageOffset: 0 })

  it('counts up from 0 with no end', () => {
    const w = open()
    expect(isOpen(w)).toBe(true)
    expect(elapsedMs(w, T0)).toBe(0)
    expect(formatElapsed(elapsedMs(w, T0 + 23 * MIN))).toBe('23:00')
    expect(elapsedMs(w, T0 + 300 * MIN)).toBe(300 * MIN) // no cap
    expect(isTimeUp(w, T0 + 1000 * MIN)).toBe(false)
    expect(progress(w, T0 + 10 * MIN)).toBe(0)
  })

  it('pause / resume', () => {
    let w = pauseWalk(open(), T0 + 5 * MIN)
    expect(elapsedMs(w, T0 + 20 * MIN)).toBe(5 * MIN)
    w = resumeWalk(w, T0 + 8 * MIN)
    expect(elapsedMs(w, T0 + 10 * MIN)).toBe(7 * MIN)
  })

  it('resumes after reload (saved as JSON)', () => {
    const w = JSON.parse(JSON.stringify(pauseWalk(open(), T0 + 4 * MIN)))
    expect(elapsedMs(w, T0 + 60 * MIN)).toBe(4 * MIN)
    const resumed = JSON.parse(JSON.stringify(resumeWalk(w, T0 + 60 * MIN)))
    expect(elapsedMs(resumed, T0 + 70 * MIN)).toBe(14 * MIN)
  })

  it('messages still rotate every 2 minutes', () => {
    expect(messageIndex(open(), T0 + 6 * MIN, 11)).toBe(3)
  })

  it('Finish walk ends now, never "ended early", record has plannedMinutes null', () => {
    const w = finishWalk(resumeWalk(pauseWalk(open(), T0 + 10 * MIN), T0 + 12 * MIN), T0 + 25 * MIN, { early: true })
    expect(w.endedAt).toBe(T0 + 25 * MIN)
    expect(w.endedEarly).toBe(false)
    expect(buildWalkRecord(w, { result: 'yes', note: 'x' })).toEqual({
      kind: 'walk',
      id: 'o1',
      startedAt: '2026-01-01T12:00:00.000Z',
      endedAt: '2026-01-01T12:25:00.000Z',
      mode: 'open',
      plannedMinutes: null,
      actualSeconds: 23 * 60,
      endedEarly: false,
      result: 'yes',
      note: 'x',
    })
  })

  it('finishing while paused does not count the pause', () => {
    const w = finishWalk(pauseWalk(open(), T0 + 3 * MIN), T0 + 30 * MIN)
    expect(buildWalkRecord(w).actualSeconds).toBe(180)
  })
})

describe('custom length', () => {
  it('is clamped to whole minutes between 1 and 120', () => {
    expect(CUSTOM_MIN).toBe(1)
    expect(CUSTOM_MAX).toBe(120)
    expect(clampCustomMinutes(20)).toBe(20)
    expect(clampCustomMinutes(0)).toBe(1)
    expect(clampCustomMinutes(-5)).toBe(1)
    expect(clampCustomMinutes(500)).toBe(120)
    expect(clampCustomMinutes('45')).toBe(45)
    expect(clampCustomMinutes(7.6)).toBe(8)
    expect(clampCustomMinutes('abc')).toBe(20)
  })

  it('a 20-minute custom walk counts down and records 20 planned minutes', () => {
    const w = startWalk(20, T0, { id: 'c1' })
    expect(formatClock(remainingMs(w, T0 + 5 * MIN))).toBe('15:00')
    const done = finishWalk(w, T0 + 21 * MIN)
    expect(done.endedAt).toBe(T0 + 20 * MIN)
    expect(buildWalkRecord(done)).toMatchObject({ mode: 'timed', plannedMinutes: 20, actualSeconds: 1200, endedEarly: false })
  })

  it('a 120-minute walk shows hours', () => {
    expect(formatClock(remainingMs(startWalk(120, T0, { id: 'c2' }), T0))).toBe('2:00:00')
  })
})

describe('+5 min (timed walks only)', () => {
  it('adds five minutes to the time left', () => {
    const w = extendWalk(walk10())
    expect(w.plannedMinutes).toBe(15)
    expect(formatClock(remainingMs(w, T0 + 4 * MIN))).toBe('11:00')
  })
  it('works while paused and keeps the paused time', () => {
    const paused = pauseWalk(walk10(), T0 + 2 * MIN)
    const w = extendWalk(paused)
    expect(w.pausedAt).toBe(T0 + 2 * MIN)
    expect(formatClock(remainingMs(w, T0 + 9 * MIN))).toBe('13:00')
  })
  it('a timed walk that ends after +5 is saved with the longer plan and is not "ended early"', () => {
    const w = extendWalk(walk10())
    const done = finishWalk(w, T0 + 30 * MIN)
    const rec = buildWalkRecord(done)
    expect(rec.plannedMinutes).toBe(15)
    expect(rec.actualSeconds).toBe(15 * 60)
    expect(rec.endedEarly).toBe(false)
  })
  it('does nothing for open walks, finished walks, or past the maximum', () => {
    const open = startWalk(null, T0, { id: 'o' })
    expect(canExtend(open)).toBe(false)
    expect(extendWalk(open)).toBe(open)
    const ended = finishWalk(walk10(), T0 + MIN, { early: true })
    expect(extendWalk(ended)).toBe(ended)
    const long = startWalk(MAX_PLANNED_MINUTES - 3, T0, { id: 'l' })
    expect(canExtend(long)).toBe(false)
  })
  it('finishing a timed walk early from the live screen marks it ended early', () => {
    const done = finishWalk(walk10(), T0 + 4 * MIN, { early: true })
    expect(done.endedEarly).toBe(true)
    expect(buildWalkRecord(done).actualSeconds).toBe(240)
  })
})
