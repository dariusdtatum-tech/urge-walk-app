// Moods and writing prompts for the Journal. Moods use calm colors only (no red).
export const MOODS = [
  { id: 'great', emoji: '😄', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'hard', emoji: '😣', label: 'Hard' },
]
export const MOOD_IDS = MOODS.map((m) => m.id)

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
