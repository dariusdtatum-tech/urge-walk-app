import { describe, expect, it } from 'vitest'
import { BREATHE_LINES } from './encouragement.js'

describe('Breathe lines', () => {
  it('has about six plain lines', () => {
    expect(BREATHE_LINES.length).toBeGreaterThanOrEqual(5)
    for (const l of BREATHE_LINES) expect(l.length).toBeLessThan(80)
  })
  it('never mention walking, steps or moving', () => {
    for (const l of BREATHE_LINES) expect(l).not.toMatch(/walk|step|mov|going on|keep going/i)
  })
})
