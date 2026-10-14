// Days (local time zone, same day keys as cleanDayCount) with at least one urge passed.
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

// How many of these days had at least one urge passed. The Week view shows this single total
// ("6 days with an urge passed") instead of run brackets: a quiet day is just an empty day,
// never a gap or a broken streak.
export function passedDaysIn(dayKeys, passed) {
  return dayKeys.filter((k) => passed.has(k)).length
}
