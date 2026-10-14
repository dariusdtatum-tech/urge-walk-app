// Runs of consecutive calendar days (local time zone, same day keys as cleanDayCount) where at
// least one urge passed. Used for the soft brackets over the Week view. A quiet day simply ends a run.
import { todayISO } from './cleanTime.js'

// The local YYYY-MM-DD of each passed urge.
export function passedDayKeys(walks) {
  const keys = new Set()
  for (const w of walks || []) {
    if (w?.result !== 'yes') continue
    const t = Date.parse(w.startedAt)
    if (Number.isFinite(t)) keys.add(todayISO(new Date(t)))
  }
  return keys
}

// dayKeys: consecutive local days in order. Returns [{ start, end, length }] (indexes, inclusive)
// for every run of `min` or more passed days.
export function passedRuns(dayKeys, passed, min = 2) {
  const runs = []
  let start = -1
  dayKeys.forEach((k, i) => {
    if (passed.has(k)) { if (start < 0) start = i } else if (start >= 0) { runs.push([start, i - 1]); start = -1 }
  })
  if (start >= 0) runs.push([start, dayKeys.length - 1])
  return runs.map(([s, e]) => ({ start: s, end: e, length: e - s + 1 })).filter((r) => r.length >= min)
}
