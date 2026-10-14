// Kind lines shown during a walk. One changes every ~2 minutes.
export const WALK_MESSAGES = [
  'Urges rise, peak, and fade. You’re riding this one out.',
  'Every step is a choice you’re making for yourself.',
  'You don’t have to fight the feeling. Just keep walking.',
  'Notice your feet on the ground. You’re right here, right now.',
  'This feeling is temporary. It’s already changing.',
  'Moving your body is one of the best things you can do right now.',
  'Breathe in slowly… and let it all the way out.',
  'You chose a walk. That’s worth being proud of.',
  'It’s okay if this is hard. Hard doesn’t mean it won’t pass.',
  'Look around. Find one thing you can see, one you can hear.',
  'Every minute you walk, the urge loses a little strength.',
]

// Shown after saving, based on the answer to "Did the urge pass?"
export const SAVED_MESSAGES = {
  yes: 'Nice work. You rode it out.',
  kinda: 'Every bit of distance helps. Glad you walked.',
  no: 'Thanks for walking anyway. Showing up is the hard part.',
  skip: 'Walk saved. Good job taking care of yourself.',
}

// After a minute of breathing or a "Just log it"
export const BREATHE_SAVED_MESSAGES = {
  yes: 'Nice work. You rode it out.',
  kinda: 'Every breath helps. Glad you paused.',
  no: 'Thanks for stopping to breathe. Showing up is the hard part.',
  skip: 'Saved. Good job taking care of yourself.',
}
export const LOGGED_SAVED_MESSAGE = 'Saved. You rode one out.'
