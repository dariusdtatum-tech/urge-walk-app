// The rotating encouragement lines (live walk and Breathe).
// The "more of" picks from onboarding (up to 3) choose which lines rotate; with no picks,
// the general walk lines are used. A few general lines always stay in the mix.
import { WALK_MESSAGES } from './walkMessages.js'

export const LINES_BY_IMPROVE = {
  calm: ['Let your shoulders drop. Calm is on the other side of this.', 'The wave is loud right now. It gets quieter.', 'Slow breath in. Slower breath out.'],
  sleep: ['Tonight you sleep knowing you rode this one out.', 'Every urge you pass is rest you get back.', 'A clear head tonight starts right here.'],
  proud: ['This is a moment to be proud of.', 'You chose this. That’s worth being proud of.', 'Remember this one. You did it.'],
  relationships: ['The people who love you are glad you’re here.', 'Every urge you ride out is time you give back to them.', 'You’re showing up for yourself, and for them.'],
  control: ['You’re in charge here, not the urge.', 'This is you taking back control, one step at a time.', 'The urge asks. You decide.'],
  money: ['The money stays yours today.', 'Every urge you pass keeps something in your pocket.', 'This walk costs nothing. The urge would have.'],
  health: ['Your body is thanking you for this.', 'Moving is medicine. Keep going.', 'Every step is a healthy choice.'],
  interests: ['Think of something you’d love to try next.', 'There’s more to your day than this urge.', 'Room is opening up for new things.'],
}
const GENERAL = WALK_MESSAGES.slice(0, 3)

// Picked lines first, interleaved so the topics alternate, then a few general lines.
export function encouragementLines(improve = []) {
  const picked = (improve || []).filter((id) => LINES_BY_IMPROVE[id])
  if (picked.length === 0) return WALK_MESSAGES
  const lists = picked.map((id) => LINES_BY_IMPROVE[id])
  const out = []
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i += 1) {
    for (const l of lists) if (l[i]) out.push(l[i])
  }
  return [...out, ...GENERAL]
}

// Breathe has its own still, breath-focused lines: no walking or movement words.
export const BREATHE_LINES = [
  'You don’t have to fight the feeling. Just breathe with it.',
  'Breathe in through your nose. Let it out slowly.',
  'Let the out-breath be a little longer than the in-breath.',
  'The urge is a feeling. It rises, peaks and fades.',
  'Notice the air going in and out. That’s all for now.',
  'Stay where you are. Count each breath out.',
]
