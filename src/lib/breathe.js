// One breath: in for 4s, hold for 3s, out for 6s (about 4.6 breaths fill the minute).
// Timing lives in content/tools.json, shared with the website's /breathe page.
import TOOLS from '../content/tools.json'

export const BREATH = { inMs: TOOLS.breathe.inMs, holdMs: TOOLS.breathe.holdMs, outMs: TOOLS.breathe.outMs }
const CYCLE = BREATH.inMs + BREATH.holdMs + BREATH.outMs

// Where we are in the breath after `ms`: 'in' (growing), 'hold' (full, still) or 'out' (shrinking).
// Each phase matches its CSS transition, so the orb never sits still under "Breathe in".
export function breathPhase(ms) {
  const t = ((ms % CYCLE) + CYCLE) % CYCLE
  if (t < BREATH.inMs) return 'in'
  return t < BREATH.inMs + BREATH.holdMs ? 'hold' : 'out'
}
