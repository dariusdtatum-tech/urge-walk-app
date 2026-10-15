import { describe, expect, it } from 'vitest'
import TOOLS from '../content/tools.json'
import { BREATH } from './breathe.js'
import { GROUND, GROUND_LINES } from './ground.js'
import { BREATHE_SECONDS, buildGroundRecord, sanitizeWalks } from './walkStorage.js'

const NO_MOTION = /walk|step|mov|going on|keep going|run|stride|pace/i

describe('shared tools.json', () => {
  it('Breathe timing comes from tools.json: in 4, hold 3, out 6, one minute', () => {
    expect(BREATH).toEqual({ inMs: 4000, holdMs: 3000, outMs: 6000 })
    expect(TOOLS.breathe.seconds).toBe(60)
    expect(BREATHE_SECONDS).toBe(60)
  })
  it('Ground is 5-4-3-2-1 across the five senses', () => {
    expect(GROUND.steps.map((s) => s.count)).toEqual([5, 4, 3, 2, 1])
    expect(GROUND.steps.map((s) => s.sense)).toEqual(['see', 'touch', 'hear', 'smell', 'taste'])
    for (const s of GROUND.steps) expect(s.line).toMatch(new RegExp(`^Name ${s.count} thing`))
  })
  it('no Ground or Breathe words mention walking or motion', () => {
    const all = [GROUND.intro, GROUND.outro, GROUND.title, GROUND.notePlaceholder, GROUND.noteHelp, ...GROUND.steps.flatMap((s) => [s.line, s.hint]), ...Object.values(TOOLS.breathe.words)]
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
