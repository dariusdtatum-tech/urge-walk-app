// Shared test data: 6 urge records of every kind (no personal data).
export function homeChipsFixture() {
  const iso = (d, h, m = 0) => new Date(2026, 9, d, h, m).toISOString()
  const plus = (s, sec) => new Date(Date.parse(s) + sec * 1000).toISOString()
  const walk = (id, s, result) => ({ id, kind: 'walk', startedAt: s, endedAt: plus(s, 600), mode: 'timed', plannedMinutes: 10, actualSeconds: 600, endedEarly: false, result, note: '' })
  const breathe = (id, s, result) => ({ id, kind: 'breathe', startedAt: s, endedAt: plus(s, 60), mode: 'timed', plannedMinutes: 1, actualSeconds: 60, endedEarly: false, result, note: '' })
  const logged = (id, s) => ({ id, kind: 'logged', startedAt: s, endedAt: s, mode: 'open', plannedMinutes: null, actualSeconds: 0, endedEarly: false, result: 'yes', note: '' })
  return [
    walk('w1', iso(9, 18), 'yes'),
    breathe('b1', iso(10, 9), 'yes'),
    logged('l1', iso(10, 12)),
    walk('w2', iso(10, 15), 'kinda'),
    breathe('b2', iso(8, 7), null),
    walk('w3', iso(1, 7), 'yes'),
  ]
}
