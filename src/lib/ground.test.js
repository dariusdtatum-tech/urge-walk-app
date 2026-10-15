import { describe, expect, it } from 'vitest'
import TOOLS from '../content/tools.json'
import { BREATH } from './breathe.js'
import { GROUND, GROUND_LINES } from './ground.js'
import { BREATHE_SECONDS, buildGroundRecord, sanitizeWalks } from './walkStorage.js'

// No walking or motion words. ("step" is allowed here: the site's intro says "Five small steps", meaning parts of the exercise.)
const NO_MOTION = /walk|mov|going on|keep going|\brun|stride|pace|footstep|step (out|outside)/i

describe('shared tools.json', () => {
  it('Breathe timing comes from tools.json: in 4, hold 3, out 6, five cycles', () => {
    expect(BREATH).toEqual({ inMs: 4000, holdMs: 3000, outMs: 6000 })
    expect(TOOLS.breathe.cycles).toBe(5)
    expect(BREATHE_SECONDS).toBe(65)
  })
  it('Ground is 5-4-3-2-1 across the five senses', () => {
    expect(GROUND.steps.map((s) => s.count)).toEqual([5, 4, 3, 2, 1])
    expect(GROUND.steps.map((s) => s.sense)).toEqual(['see', 'touch', 'hear', 'smell', 'taste'])
    for (const s of GROUND.steps) { expect(s.line).toMatch(new RegExp(`^${s.count} thing`)); expect(s.prompt.length).toBeGreaterThan(10) }
  })
  it('no Ground or Breathe words mention walking or motion', () => {
    const all = [GROUND.intro, GROUND.finish, GROUND.title, GROUND.notePlaceholder, GROUND.noteHelp, ...GROUND.steps.flatMap((s) => [s.line, s.prompt]), 'Breathe in', 'Hold', 'Breathe out']
    for (const l of all) expect(l).not.toMatch(NO_MOTION)
  })
  it('one line per screen: intro, five senses, outro', () => {
    expect(GROUND_LINES).toHaveLength(7)
    expect(GROUND_LINES.filter((l) => l.note)).toHaveLength(5)
  })
})

describe('ground records', () => {
  it('logs a ground tool type that survives a reload, with no step notes', () => {
    const r = buildGroundRecord({ id: 'g1', startedAt: 0, endedAt: 150000, result: 'yes', note: ' ok ', tags: ['home'], completed: true })
    expect(r).toMatchObject({ kind: 'ground', actualSeconds: 150, endedEarly: false, result: 'yes', note: 'ok', tags: ['home'], plannedMinutes: null })
    expect(sanitizeWalks([r])[0].kind).toBe('ground')
    expect(buildGroundRecord({ startedAt: 0, endedAt: 1000, completed: false }).endedEarly).toBe(true)
  })
})
