import { describe, expect, it } from 'vitest'
import { BREATH, tideTapBetween, tideTaps } from './breathe.js'

describe('haptic tide', () => {
  it('turns with a light tap, soft taps in and out, nothing on the hold', () => {
    const taps = tideTaps()
    expect(taps[0]).toEqual({ at: 0, kind: 'light' })
    const holdStart = BREATH.inMs, holdEnd = BREATH.inMs + BREATH.holdMs
    expect(taps.filter((t) => t.at > holdStart && t.at < holdEnd)).toEqual([])
    expect(taps.find((t) => t.at === holdEnd)?.kind).toBe('light')
    expect(taps.filter((t) => t.kind === 'soft').length).toBeGreaterThanOrEqual(5)
  })
  it('finds the tap between two clock reads, across cycles', () => {
    expect(tideTapBetween(-1, 0)).toBe('light')
    expect(tideTapBetween(0, 900)).toBe(null)
    expect(tideTapBetween(900, 1100)).toBe('soft')
    expect(tideTapBetween(4100, 6900)).toBe(null) // the hold is quiet
    const cycle = BREATH.inMs + BREATH.holdMs + BREATH.outMs
    expect(tideTapBetween(cycle - 100, cycle + 100)).toBe('light')
    expect(tideTapBetween(500, 500)).toBe(null)
  })
})
