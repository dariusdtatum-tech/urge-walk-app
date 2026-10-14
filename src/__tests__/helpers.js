// Shared test helpers (not a test file).
export function memoryStorage(seed = {}) {
  const m = new Map(Object.entries(seed))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null, get length() { return m.size }, _map: m,
  }
}
export const T0 = Date.parse('2030-05-14T14:00:00Z') // neutral test date (10:00 New York)
export const habitsSeed = (start = '2029-12-02') => ({ 'urgewalk.v1.habits': JSON.stringify({ habits: [{ id: 'h1', name: 'Habit A', startDate: start }] }) })
export function fakeClock(start = T0) {
  let t = start
  const clock = () => t
  clock.advance = (ms) => { t += ms }
  return clock
}
export function stubDevice() {
  const calls = { tap: 0, breathTurn: 0, done: 0, alerts: [] }
  return {
    calls,
    tap() { calls.tap += 1 }, breathTurn() { calls.breathTurn += 1 }, done() { calls.done += 1 },
    syncWalkAlert(walk, now) { calls.alerts.push({ walk, now }); return Promise.resolve(null) },
  }
}
