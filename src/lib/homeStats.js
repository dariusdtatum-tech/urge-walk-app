// Pure helpers for the Home screen: the hero tracker, the D / W / M ranges,
// the stat chips and the "urges walked" line chart. No React here.
import { cleanDayCount, parseISODate, todayISO } from './cleanTime.js'

// The tracker shown in the Home ring: the stored active one (activeTracker.js), else the first.
export function heroHabit(habits, activeId = null) {
  return habits.find((h) => h.id === activeId) ?? (habits.length > 0 ? habits[0] : null)
}

// Move one habit to the front of the list (keeps everything else in order).
export function makePrimary(habits, id) {
  const chosen = habits.find((h) => h.id === id)
  if (!chosen) return habits
  return [chosen, ...habits.filter((h) => h.id !== id)]
}

// Clean days for a habit. Comes only from its start date: walks (including
// "Didn't pass") never change it. A start date in the future counts as 0.
export function cleanDays(habit, todayKey = todayISO()) {
  return habit ? cleanDayCount(habit.startDate, todayKey) : 0
}

// "Mar 15" this year, "Mar 15, 2025" for other years.
export function shortDate(iso, todayKey = todayISO()) {
  const p = parseISODate(iso)
  const t = parseISODate(todayKey)
  if (!p) return ''
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', ...(t && t.y === p.y ? {} : { year: 'numeric' }),
  })
}

// ---------- "Your walks" card: Week / Month / All time ----------
// Week = the last 7 days (daily points), Month = the last 30 days (shown as a 3-day average),
// All time = weekly buckets since the tracker started (or the first walk). Ending today.
// These change only the card (Walked, Passed, chart). Clean days never depend on them.
export const RANGES = {
  week: { id: 'week', name: 'Week' },
  month: { id: 'month', name: 'Month', caption: '3-day avg · urges walked', captionAll: '3-day avg · urges ridden out' },
  all: { id: 'all', name: 'All time' },
}
export const RANGE_IDS = ['week', 'month', 'all']
export const RANGE_PREFS_KEY = 'urgewalk.v1.homePrefs'
const MAX_ALL_TIME_POINTS = 52

function midnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const dayLabelShort = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// Buckets of `size` calendar days, `count` of them, the last one ending today (local time, DST-safe).
function dayBuckets(today, count, size) {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const out = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const first = new Date(y, m, d - i * size - (size - 1))
    out.push({ start: first.getTime(), end: new Date(y, m, d - i * size + 1).getTime(), first, current: i === 0 })
  }
  return out
}

// The chart's buckets, oldest first: [{ start, end, label, showLabel, current }] (start/end in ms, end exclusive).
// `since` ('YYYY-MM-DD') is where All time begins.
export function rangeBuckets(rangeId, now = Date.now(), since = null) {
  const today = midnight(new Date(now))
  if (rangeId === 'month') {
    return dayBuckets(today, 30, 1).map((b, i) => ({
      ...b, label: dayLabelShort(b.first), showLabel: i === 0 || i === 10 || i === 20 || i === 29,
    }))
  }
  if (rangeId === 'all') {
    let days = 7
    const p = since && parseISODate(since)
    if (p) days = Math.max(1, Math.round((today - new Date(p.y, p.m - 1, p.d)) / 86400000) + 1)
    // Weekly points; for very long histories, wider buckets so the line stays readable.
    const weeks = Math.max(2, Math.ceil(days / 7))
    const size = 7 * Math.ceil(weeks / MAX_ALL_TIME_POINTS)
    const count = Math.max(2, Math.ceil(days / size))
    const buckets = dayBuckets(today, count, size)
    const marks = new Set([0, Math.round((count - 1) / 3), Math.round((2 * (count - 1)) / 3), count - 1])
    return buckets.map((b, i) => ({
      ...b, label: dayLabelShort(b.first), showLabel: marks.has(i) && (count >= 4 || i === 0 || i === count - 1),
    }))
  }
  return dayBuckets(today, 7, 1).map((b) => ({
    ...b, label: b.first.toLocaleDateString(undefined, { weekday: 'short' }), showLabel: true,
  }))
}

// How many walks started in each bucket.
export function bucketCounts(walks, buckets) {
  const counts = buckets.map(() => 0)
  for (const w of walks) {
    const t = Date.parse(w.startedAt)
    const i = buckets.findIndex((b) => t >= b.start && t < b.end)
    if (i >= 0) counts[i] += 1
  }
  return counts
}

// Centered 3-day moving average (the ends use the days that exist).
export function threeDayAverage(counts) {
  return counts.map((_, i) => {
    const win = counts.slice(Math.max(0, i - 1), i + 2)
    return win.reduce((a, b) => a + b, 0) / win.length
  })
}

// Numbers for the chips. walked = walks only; riddenOut = every urge record (walks, breathing, logged);
// passed = any kind that passed. All time counts everything.
export function rangeStats(walks, rangeId, now = Date.now()) {
  let from = -Infinity
  let to = Infinity
  if (rangeId !== 'all') {
    const buckets = rangeBuckets(rangeId, now)
    from = buckets[0].start
    to = buckets[buckets.length - 1].end
  }
  let walked = 0
  let passed = 0
  let riddenOut = 0
  for (const w of walks) {
    const t = Date.parse(w.startedAt)
    if (t >= from && t < to) {
      riddenOut += 1
      if (w.kind == null || w.kind === 'walk') walked += 1
      if (w.result === 'yes') passed += 1
    }
  }
  return { walked, passed, riddenOut }
}

// Remembered card range (default Week).
export function loadRange(storage = globalThis.localStorage) {
  try {
    const p = JSON.parse(storage.getItem(RANGE_PREFS_KEY))
    return RANGE_IDS.includes(p?.walksRange) ? p.walksRange : 'week'
  } catch {
    return 'week'
  }
}

export function saveRange(rangeId, storage = globalThis.localStorage) {
  try {
    storage.setItem(RANGE_PREFS_KEY, JSON.stringify({ version: 1, walksRange: rangeId }))
    return true
  } catch {
    return false
  }
}

// ---------- Chart geometry ----------

// Smooth line through the points that never overshoots (monotone cubic, Fritsch–Carlson),
// so a flat run of zeros stays flat instead of dipping below the baseline.
export function smoothPath(points) {
  const n = points.length
  if (n === 0) return ''
  const f = (v) => Math.round(v * 100) / 100
  if (n === 1) return `M${f(points[0].x)},${f(points[0].y)}`
  const dx = []
  const slope = []
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1].x - points[i].x)
    slope.push((points[i + 1].y - points[i].y) / dx[i])
  }
  const t = [slope[0]]
  for (let i = 1; i < n - 1; i += 1) {
    t.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2)
  }
  t.push(slope[n - 2])
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / slope[i]
    const b = t[i + 1] / slope[i]
    const h = a * a + b * b
    if (h > 9) {
      const k = 3 / Math.sqrt(h)
      t[i] = k * a * slope[i]
      t[i + 1] = k * b * slope[i]
    }
  }
  let d = `M${f(points[0].x)},${f(points[0].y)}`
  for (let i = 0; i < n - 1; i += 1) {
    const p = points[i]
    const q = points[i + 1]
    const h = dx[i] / 3
    d += ` C${f(p.x + h)},${f(p.y + t[i] * h)} ${f(q.x - h)},${f(q.y - t[i + 1] * h)} ${f(q.x)},${f(q.y)}`
  }
  return d
}

// Place the counts in a box. The top of the scale is at least 2, so one walk
// doesn't shoot straight to the top of the chart.
export function chartPoints(counts, { width, height, padX = 0, padTop = 0, padBottom = 0 }) {
  const max = Math.max(2, ...counts)
  const usable = height - padTop - padBottom
  const step = counts.length > 1 ? (width - padX * 2) / (counts.length - 1) : 0
  return {
    max,
    points: counts.map((c, i) => ({
      x: padX + step * i,
      y: padTop + usable * (1 - c / max),
      value: c,
    })),
  }
}
