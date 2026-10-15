// Journal mood: a 5-step word scale, stored as a level 1–5. No emoji, no red, no colour judgment: each
// step is a small sea-glass dot whose fill grows from 20% to 100%, plus the word.
export const MOODS = [
  { id: 1, label: 'Rough', fill: 0.2 },
  { id: 2, label: 'Low', fill: 0.4 },
  { id: 3, label: 'Okay', fill: 0.6 },
  { id: 4, label: 'Steady', fill: 0.8 },
  { id: 5, label: 'Good', fill: 1 },
]
export const MOOD_IDS = MOODS.map((m) => m.id)
// The old emoji scale (best first) stored string ids. Levels are numbers, so the two never collide and an
// old entry, draft or backup maps by position: Hard → Rough, Low → Low, Okay → Okay, Good → Steady, Great → Good.
export const LEGACY_MOODS = { hard: 1, low: 2, okay: 3, good: 4, great: 5 }
export const toMood = (m) => (MOOD_IDS.includes(m) ? m : (typeof m === 'string' && LEGACY_MOODS[m]) || null)
export const moodInfo = (m) => MOODS.find((x) => x.id === toMood(m)) ?? null

export const PROMPTS = [
  'What went well today?',
  'What triggered an urge today, and what did you do?',
  'What are you grateful for right now?',
  'How does your body feel at the moment?',
  'What’s one small win you want to remember?',
  'Who or what helped you today?',
  'What would make tomorrow a little easier?',
  'What’s something kind you can say to yourself tonight?',
]
