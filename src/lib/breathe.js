// One breath: in for 4s, hold for 3s, out for 6s (about 4.6 breaths fill the minute).
// Timing lives in content/tools.json, shared with the website's /breathe page.
import TOOLS from '../content/tools.json'

export const BREATH = { inMs: TOOLS.breathe.inhale * 1000, holdMs: TOOLS.breathe.hold * 1000, outMs: TOOLS.breathe.exhale * 1000 }
export const BREATH_CYCLES = TOOLS.breathe.cycles
// One session = `cycles` full breaths (5 × 13s = 65s).
export const BREATHE_SESSION_SECONDS = BREATH_CYCLES * (TOOLS.breathe.inhale + TOOLS.breathe.hold + TOOLS.breathe.exhale)
const CYCLE = BREATH.inMs + BREATH.holdMs + BREATH.outMs

// Where we are in the breath after `ms`: 'in' (growing), 'hold' (full, still) or 'out' (shrinking).
// Each phase matches its CSS transition, so the orb never sits still under "Breathe in".
export function breathPhase(ms) {
  const t = ((ms % CYCLE) + CYCLE) % CYCLE
  if (t < BREATH.inMs) return 'in'
  return t < BREATH.inMs + BREATH.holdMs ? 'hold' : 'out'
}

// Haptic tide (relay #3, idea 9): soft, slow taps that follow the water so Breathe works with eyes
// closed. A 'light' tap as each breath turns (in, out), then 'soft' taps every second on the way in
// and every 1.5 s on the way out. Nothing on the hold. iOS skips them when System Haptics is off.
const TIDE_TAPS = (() => {
  const taps = [{ at: 0, kind: 'light' }]
  for (let t = 1000; t < BREATH.inMs; t += 1000) taps.push({ at: t, kind: 'soft' })
  const out = BREATH.inMs + BREATH.holdMs
  taps.push({ at: out, kind: 'light' })
  for (let t = out + 1500; t < CYCLE; t += 1500) taps.push({ at: t, kind: 'soft' })
  return taps
})()
export const tideTaps = () => TIDE_TAPS.map((t) => ({ ...t }))

// The tap to play when the clock moves from prevMs to ms (null when none). If more than one tap was
// passed (a slow frame), only the latest plays.
export function tideTapBetween(prevMs, ms) {
  if (!(ms > prevMs)) return null
  let hit = null
  const first = Math.floor(Math.max(0, prevMs) / CYCLE)
  for (let c = first; c * CYCLE <= ms; c += 1) {
    for (const t of TIDE_TAPS) {
      const at = c * CYCLE + t.at
      if ((at > prevMs || (prevMs < 0 && at === 0)) && at <= ms) hit = t.kind
    }
  }
  return hit
}
