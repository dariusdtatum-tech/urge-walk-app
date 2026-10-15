// Ground: the 5-4-3-2-1 senses exercise, one line at a time. Wording comes from content/tools.json,
// a byte-for-byte copy of the website's /tools.json (the single source; see tools.test.jsx).
// The title and the optional-note label are the app's own (the site file doesn't carry them).
import TOOLS from '../content/tools.json'

export const GROUND = {
  ...TOOLS.ground,
  title: 'Ground',
  notePlaceholder: 'A word or two, if you like',
  noteHelp: 'Optional. Only on screen, never saved.',
}
// The screens in order: intro, five senses (line + prompt), finish. Index past the end = check-in.
export const GROUND_LINES = [
  { id: 'intro', line: GROUND.intro },
  ...GROUND.steps.map((s) => ({ id: s.sense, line: s.line, hint: s.prompt, note: true })),
  { id: 'outro', line: GROUND.finish },
]
export const groundProgress = (i) => {
  const senses = GROUND.steps.length
  const done = Math.max(0, Math.min(senses, i))
  return `${done} of ${senses}`
}
