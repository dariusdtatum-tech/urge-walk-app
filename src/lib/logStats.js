// Pure helpers for the Log tab: summary numbers, grouping by day, and edits.
import { daysBetween, parseISODate, todayISO } from './cleanTime.js'
import { KINDS, MAX_NOTE_LENGTH, RESULTS } from './walkStorage.js'

// Older records have no kind: they're walks.
export const kindOf = (w) => (KINDS.includes(w?.kind) ? w.kind : 'walk')
export const KIND_LABELS = { walk: 'Walk', breathe: 'Breathe', logged: 'Logged' }

// Totals for the summary card.
// total = every urge ridden out (all kinds); minutes count walking only.
export function summarize(walks) {
  const s = { total: walks.length, yes: 0, kinda: 0, no: 0, skipped: 0, totalSeconds: 0, kinds: { walk: 0, breathe: 0, logged: 0 } }
  for (const w of walks) {
    const kind = kindOf(w)
    s.kinds[kind] += 1
    if (RESULTS.includes(w.result)) s[w.result] += 1
    else s.skipped += 1
    if (kind === 'walk') s.totalSeconds += w.actualSeconds
  }
  s.totalMinutes = Math.round(s.totalSeconds / 60)
  s.onlyWalks = s.kinds.walk === s.total
  return s
}

// The local calendar day a walk started on, as 'YYYY-MM-DD'.
export function localDayKey(isoTime) {
  return todayISO(new Date(isoTime))
}

// "Today", "Yesterday", "Sat, Oct 3", or "Wed, Dec 31, 2025" for other years.
export function dayLabel(dayKey, todayKey) {
  const diff = daysBetween(dayKey, todayKey)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  const d = parseISODate(dayKey)
  const sameYear = d.y === parseISODate(todayKey).y
  return new Date(d.y, d.m - 1, d.d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  })
}

// Newest first, grouped by local day: [{ key, label, walks: [...] }]
// `getTime` picks the ISO time to sort/group by (walks use startedAt; the Journal passes its own).
export function groupByDay(items, todayKey = todayISO(), getTime = (w) => w.startedAt) {
  const sorted = [...items].sort((a, b) => Date.parse(getTime(b)) - Date.parse(getTime(a)))
  const groups = []
  for (const item of sorted) {
    const key = localDayKey(getTime(item))
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(key, todayKey), walks: [] }
      groups.push(group)
    }
    group.walks.push(item)
  }
  return groups
}

// "8:05 PM" in the device's language.
export function formatTimeOfDay(isoTime) {
  return new Date(isoTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// 600 -> "10 min", 200 -> "3 min 20 sec", 45 -> "45 sec"
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} sec`
  if (s === 0) return `${m} min`
  return `${m} min ${s} sec`
}

// Change the result and/or note of one walk. Returns a new list.
export function updateWalk(walks, id, changes) {
  return walks.map((w) => {
    if (w.id !== id) return w
    const next = { ...w }
    if ('result' in changes) next.result = RESULTS.includes(changes.result) ? changes.result : null
    if ('note' in changes) next.note = String(changes.note ?? '').trim().slice(0, MAX_NOTE_LENGTH)
    return next
  })
}

export function deleteWalk(walks, id) {
  return walks.filter((w) => w.id !== id)
}

// Short description for lists: "Open walk · 23 min" or "10 min walk".
export function walkSummaryLabel(w) {
  const kind = kindOf(w)
  if (kind === 'logged') return 'Rode it out · logged'
  if (kind === 'breathe') return `Breathed · ${formatDuration(w.actualSeconds)}`
  if (w.plannedMinutes == null) return `Open walk · ${formatDuration(w.actualSeconds)}`
  return `${formatDuration(w.actualSeconds)} walk`
}

// "Planned" field in the details sheet.
export function plannedLabel(w) {
  if (kindOf(w) === 'logged') return 'Just logged'
  return w.plannedMinutes == null ? 'No set time' : `${w.plannedMinutes} min`
}

// "Finished" field in the details sheet.
export function finishedLabel(w) {
  if (kindOf(w) === 'logged') return 'Rode it out'
  if (kindOf(w) === 'breathe') return w.endedEarly ? 'Ended early' : 'Full minute'
  if (w.plannedMinutes == null) return 'Open walk'
  return w.endedEarly ? 'Ended early' : 'Full walk'
}

// ---------- Outcomes ----------
// yes = Passed (mint), kinda = Kinda (amber), no = Didn't pass (grey), null = No check-in (dim grey).
// "Didn't pass" is how one urge went. It is not a relapse and never touches the clean-day count.
export const OUTCOME_ORDER = ['yes', 'kinda', 'no']
export const OUTCOME_LABELS = { yes: 'Passed', kinda: 'Kinda', no: 'Didn’t pass', skipped: 'No check-in' }
export const outcomeKey = (result) => (OUTCOME_ORDER.includes(result) ? result : 'skipped')

// "This week" marks on the Log: the last 7 days ending today, oldest first.
// [{ key, label: 'Fr', isToday, count, outcomes: ['yes', 'kinda'] (distinct, in a fixed order), state }]
// state: 'none' (no urge logged), 'skipped' (walks without a check-in), or the outcomes joined with '+'.
export function weekDays(walks, todayKey = todayISO()) {
  const t = parseISODate(todayKey)
  const days = []
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(t.y, t.m - 1, t.d - i)
    const key = todayISO(date)
    const label = date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)
    days.push({ key, label, isToday: i === 0, count: 0, found: new Set() })
  }
  for (const w of walks) {
    const day = days.find((d) => d.key === localDayKey(w.startedAt))
    if (!day) continue
    day.count += 1
    day.found.add(outcomeKey(w.result))
  }
  return days.map(({ found, ...d }) => {
    const outcomes = OUTCOME_ORDER.filter((o) => found.has(o))
    let state = 'none'
    if (outcomes.length > 0) state = outcomes.join('+')
    else if (d.count > 0) state = 'skipped'
    return { ...d, outcomes, state }
  })
}
