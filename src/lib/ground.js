// Ground: the 5-4-3-2-1 senses exercise, one line at a time. Copy lives in content/tools.json,
// shared with the website's /ground page (see handoff/ground-tools-json.md).
import TOOLS from '../content/tools.json'

export const GROUND = TOOLS.ground
// The screens in order: intro, five senses, outro. Index past the end = check-in.
export const GROUND_LINES = [
  { id: 'intro', line: GROUND.intro },
  ...GROUND.steps.map((s) => ({ id: s.sense, line: s.line, hint: s.hint, note: true })),
  { id: 'outro', line: GROUND.outro },
]
export const groundProgress = (i) => {
  const senses = GROUND.steps.length
  const done = Math.max(0, Math.min(senses, i))
  return `${done} of ${senses}`
}
