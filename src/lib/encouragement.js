// The rotating encouragement lines (live walk and Breathe).
// The "more of" picks from onboarding  choose which lines rotate; with no picks,
// the general walk lines are used. A few general lines always stay in the mix.
import { WALK_MESSAGES } from './walkMessages.js'

export const LINES_BY_IMPROVE = {
  sleep: ['Tonight you sleep knowing you rode this one out.', 'Every urge you pass is rest you get back.', 'A clear head tonight starts right here.'],
  energy: ['Your body is thanking you for this.', 'Energy comes back when you stop spending it on the urge.', 'This is a healthy choice, right now.'],
  fitness: ['Moving is medicine. Keep going.', 'Every step is a healthy choice.', 'Stronger, one walk at a time.'],
  outdoors: ['Look up for a second. The sky is still there.', 'Fresh air is on your side.', 'Notice one thing around you you’d usually miss.'],
  clearhead: ['A clear head is on the other side of this.', 'The fog lifts a little with each minute.', 'Let the thoughts pass like traffic.'],
  calm: ['Let your shoulders drop. Calm is on the other side of this.', 'The wave is loud right now. It gets quieter.', 'Slow breath in. Slower breath out.'],
  focus: ['One thing at a time. Right now, just this.', 'Your attention is yours again.', 'Back to what matters to you.'],
  selfrespect: ['You’re in charge here, not the urge.', 'This is you taking back control, one step at a time.', 'The urge asks. You decide.'],
  confidence: ['This is a moment to be proud of.', 'You chose this. That’s worth being proud of.', 'Remember this one. You did it.'],
  creativity: ['Think of something you’d love to make next.', 'There’s more to your day than this urge.', 'Room is opening up for new ideas.'],
  family: ['The people who love you are glad you’re here.', 'Every urge you ride out is time you give back to them.', 'You’re showing up for yourself, and for them.'],
  friendships: ['Good friends want this for you.', 'Every urge you ride out makes you easier to be around, for you too.', 'Think of someone you could call later.'],
  money: ['The money stays yours today.', 'Every urge you pass keeps something in your pocket.', 'This walk costs nothing. The urge would have.'],
  hobbies: ['Think of something you’d love to try next.', 'There’s more to your day than this urge.', 'Room is opening up for new things.'],
  work: ['Tomorrow’s work goes better after a night like this.', 'You keep your word to yourself. That carries over.', 'Steady days build steady work.'],
  faith: ['You don’t have to carry this alone.', 'A quiet word of thanks for getting this far.', 'Grace is in small choices like this one.'],
  present: ['Right here, right now. That’s enough.', 'Feel your feet. You’re here.', 'This moment passes. You stay.'],
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
