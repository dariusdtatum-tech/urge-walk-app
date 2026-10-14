// Urge Map: optional one-tap context tags on urges, and a calm weekly pattern computed on the phone.
// Tags live on the urge record (walk, breathe or log) as `tags: [id…]`, only when some were picked.
// urgewalk.v1.patternPrefs  { suggestDismissedAt: ISO | null }   the optional check-in suggestion
import { readObject, writeObject } from './storage.js'

export const PATTERN_PREFS_KEY = 'urgewalk.v1.patternPrefs'
export const TAG_GROUPS = [
  { id: 'place', label: 'Where', tags: [{ id: 'home', label: 'Home' }, { id: 'work', label: 'Work' }, { id: 'out', label: 'Out' }, { id: 'driving', label: 'Driving' }] },
  { id: 'feeling', label: 'Feeling', tags: [{ id: 'stressed', label: 'Stressed' }, { id: 'bored', label: 'Bored' }, { id: 'lonely', label: 'Lonely' }, { id: 'tired', label: 'Tired' }, { id: 'upset', label: 'Upset' }] },
  { id: 'trigger', label: 'Around', tags: [{ id: 'people', label: 'People' }, { id: 'alone', label: 'Alone' }, { id: 'screens', label: 'Screens' }, { id: 'after-meal', label: 'After a meal' }] },
]
export const TAGS = TAG_GROUPS.flatMap((g) => g.tags)
const TAG_IDS = new Set(TAGS.map((t) => t.id))
export const MAX_TAGS = 4
export const tagLabel = (id) => TAGS.find((t) => t.id === id)?.label ?? id

export function sanitizeTags(list) {
  if (!Array.isArray(list)) return []
  return [...new Set(list.filter((t) => TAG_IDS.has(t)))].slice(0, MAX_TAGS)
}
export const withTags = (record, tags) => { const t = sanitizeTags(tags); return t.length ? { ...record, tags: t } : record }

export const MIN_URGES = 3
const DAY_MS = 86_400_000
const WINDOW_H = 2
export const SLOTS = 24 / WINDOW_H

const hourLabel = (h) => { const x = ((h % 24) + 24) % 24; const ap = x < 12 ? 'AM' : 'PM'; const n = x % 12 === 0 ? 12 : x % 12; return { n, ap } }
export function windowLabel(start) {
  const a = hourLabel(start); const b = hourLabel(start + WINDOW_H)
  return a.ap === b.ap ? `${a.n} to ${b.n} ${b.ap}` : `${a.n} ${a.ap} to ${b.n} ${b.ap}`
}

// The last 7 days, in local time. null until there are at least 3 urges that week.
// { count, passed, slots[12], peak: { start, count } | null, when: 'weekdays'|'weekends'|null, tag: id|null, sentence }
export function weeklyPattern(walks, now = Date.now()) {
  const from = now - 7 * DAY_MS
  const week = (walks ?? []).filter((w) => { const t = Date.parse(w?.startedAt); return Number.isFinite(t) && t > from && t <= now })
  if (week.length < MIN_URGES) return null
  const slots = Array(SLOTS).fill(0)
  let weekday = 0
  const tagCount = {}
  for (const w of week) {
    const d = new Date(w.startedAt)
    slots[Math.floor(d.getHours() / WINDOW_H)]++
    if (d.getDay() !== 0 && d.getDay() !== 6) weekday++
    for (const t of sanitizeTags(w.tags)) tagCount[t] = (tagCount[t] ?? 0) + 1
  }
  const max = Math.max(...slots)
  const peakIdx = slots.indexOf(max)
  // A peak needs at least 2 urges and more than any other window (ties: no peak claimed).
  const peak = max >= 2 && slots.filter((x) => x === max).length === 1 ? { start: peakIdx * WINDOW_H, count: max } : null
  const share = weekday / week.length
  const when = share >= 0.8 && weekday >= 3 ? 'weekdays' : share <= 0.2 && week.length - weekday >= 3 ? 'weekends' : null
  const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const tag = topTag && topTag[1] >= 2 ? topTag[0] : null
  const passed = week.filter((w) => w.result === 'yes').length
  const parts = []
  if (peak) parts.push(`Most urges hit ${windowLabel(peak.start)}${when ? ` on ${when}` : ''}.`)
  else if (when) parts.push(`Most urges came on ${when}.`)
  else parts.push(`${week.length} urges this week, spread across the day.`)
  if (tag) parts.push(`“${tagLabel(tag)}” came up most.`)
  parts.push(`${passed} of ${week.length} passed.`)
  return { count: week.length, passed, slots, peak, when, tag, sentence: parts.join(' ') }
}

// "Want a check-in at 8:45 PM?" 15 minutes before the peak window, only with a clear peak of 3+,
// when no daily reminder is set and the suggestion wasn't dismissed in the last 30 days.
export function checkinSuggestion(pattern, reminder, prefs, now = Date.now()) {
  if (!pattern?.peak || pattern.peak.count < 3 || reminder) return null
  const d = prefs?.suggestDismissedAt ? Date.parse(prefs.suggestDismissedAt) : NaN
  if (Number.isFinite(d) && now - d < 30 * DAY_MS) return null
  const mins = (pattern.peak.start * 60 - 15 + 1440) % 1440
  return { hour: Math.floor(mins / 60), minute: mins % 60 }
}

export const loadPatternPrefs = (storage) => { const p = readObject(PATTERN_PREFS_KEY, storage); return { suggestDismissedAt: typeof p?.suggestDismissedAt === 'string' ? p.suggestDismissedAt : null } }
export const dismissSuggestion = (storage, now = Date.now()) => writeObject(PATTERN_PREFS_KEY, { version: 1, suggestDismissedAt: new Date(now).toISOString() }, storage)
