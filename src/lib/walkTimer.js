// Pure timer math for the urge walk. No React and no ticking counters:
// everything is worked out from saved timestamps (milliseconds since 1970),
// so the time stays right even if iOS freezes the app or the screen locks.
//
// There are two kinds of walk:
// - timed: plannedMinutes is a number (5 / 10 / 15 or a custom length); counts DOWN
// - open:  plannedMinutes is null (no set time); counts UP until "Finish walk"
//
// An "active walk" looks like:
// {
//   id, plannedMinutes,  // number, or null for an open walk
//   startedAt,     // when Start was tapped
//   pausedAt,      // when Pause was tapped, or null while walking
//   pausedMs,      // total time spent paused before the current pause
//   endedAt,       // null while the walk is going; set when it finishes or ends early
//   endedEarly,    // true if "End early" was used (timed walks only)
//   messageOffset, // which encouraging line to start with
// }

export const WALK_OPTIONS = [5, 10, 15]
export const DEFAULT_MINUTES = 10
export const CUSTOM_MIN = 1
export const CUSTOM_MAX = 120
export const DEFAULT_CUSTOM_MINUTES = 20
export const MESSAGE_EVERY_MS = 2 * 60 * 1000
export const EXTEND_MINUTES = 5
export const MAX_PLANNED_MINUTES = 240 // "+5 min" stops here

// Keep a custom length a whole number between 1 and 120 minutes.
export function clampCustomMinutes(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_CUSTOM_MINUTES
  return Math.min(Math.max(n, CUSTOM_MIN), CUSTOM_MAX)
}

export function startWalk(plannedMinutes, now, { id, messageOffset = 0 } = {}) {
  return {
    id,
    plannedMinutes: plannedMinutes ?? null,
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
    endedAt: null,
    endedEarly: false,
    messageOffset,
  }
}

export function isOpen(walk) {
  return walk.plannedMinutes == null
}

export function plannedMs(walk) {
  return isOpen(walk) ? Infinity : walk.plannedMinutes * 60 * 1000
}

// Time actually spent walking (pauses don't count). Timed walks stop at their planned length.
export function elapsedMs(walk, now) {
  const end = walk.endedAt ?? walk.pausedAt ?? now
  const ms = end - walk.startedAt - walk.pausedMs
  return Math.min(Math.max(ms, 0), plannedMs(walk))
}

// Timed walks only (an open walk has no end).
export function remainingMs(walk, now) {
  return plannedMs(walk) - elapsedMs(walk, now)
}

// 0 at the start, 1 when done. Open walks have no end, so this is always 0 for them.
export function progress(walk, now) {
  return isOpen(walk) ? 0 : elapsedMs(walk, now) / plannedMs(walk)
}

export function isPaused(walk) {
  return walk.pausedAt != null && walk.endedAt == null
}

export function isEnded(walk) {
  return walk.endedAt != null
}

// True once a timed walk has run its full length (never true for open walks).
export function isTimeUp(walk, now) {
  return !isOpen(walk) && !isEnded(walk) && !isPaused(walk) && remainingMs(walk, now) <= 0
}

export function pauseWalk(walk, now) {
  if (isEnded(walk) || isPaused(walk)) return walk
  return { ...walk, pausedAt: now }
}

export function resumeWalk(walk, now) {
  if (isEnded(walk) || !isPaused(walk)) return walk
  return { ...walk, pausedAt: null, pausedMs: walk.pausedMs + Math.max(now - walk.pausedAt, 0) }
}

// "+5 min": make a timed walk longer while it's going (walking or paused).
// Open walks have no end, so they're left alone; so are finished walks.
export function canExtend(walk, minutes = EXTEND_MINUTES) {
  return !isOpen(walk) && !isEnded(walk) && walk.plannedMinutes + minutes <= MAX_PLANNED_MINUTES
}

export function extendWalk(walk, minutes = EXTEND_MINUTES) {
  if (!canExtend(walk, minutes)) return walk
  return { ...walk, plannedMinutes: walk.plannedMinutes + minutes }
}

// Close out the walk.
// - Open walk: ends now ("Finish walk"); never counts as ended early.
// - Timed walk that ran its full time: endedAt is the exact moment the timer hit zero
//   (even if the app was closed and opened much later).
// - Timed walk with { early: true }: ends now and is marked endedEarly.
export function finishWalk(walk, now, { early = false } = {}) {
  if (isEnded(walk)) return walk
  const running = resumeWalk(walk, now) // fold any current pause into pausedMs
  if (isOpen(running)) {
    return { ...running, endedAt: Math.max(now, running.startedAt), endedEarly: false }
  }
  if (!early || remainingMs(running, now) <= 0) {
    const naturalEnd = running.startedAt + running.pausedMs + plannedMs(running)
    return { ...running, endedAt: Math.min(naturalEnd, now), endedEarly: false }
  }
  return { ...running, endedAt: now, endedEarly: true }
}

// The record saved for the Log. Times are ISO strings so they're easy to read later.
export function buildWalkRecord(walk, { result = null, note = '' } = {}) {
  const open = isOpen(walk)
  return {
    id: walk.id,
    kind: 'walk',
    startedAt: new Date(walk.startedAt).toISOString(),
    endedAt: new Date(walk.endedAt).toISOString(),
    mode: open ? 'open' : 'timed',
    plannedMinutes: open ? null : walk.plannedMinutes,
    actualSeconds: Math.round(elapsedMs(walk, walk.endedAt) / 1000),
    endedEarly: open ? false : Boolean(walk.endedEarly),
    result,
    note: note.trim(),
  }
}

function clock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = String(totalSeconds % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

// Countdown display: 599_001 ms -> "10:00", 0 -> "0:00", 2 h -> "2:00:00".
// Rounds up so the clock never shows 0:00 early.
export function formatClock(ms) {
  return clock(Math.max(Math.ceil(ms / 1000), 0))
}

// Count-up display (open walks, "you walked for"): rounds down, so 0:59.9 shows "0:59".
export function formatElapsed(ms) {
  return clock(Math.max(Math.floor(ms / 1000), 0))
}

// Which encouraging line to show: changes every 2 minutes of walking.
export function messageIndex(walk, now, count) {
  return (walk.messageOffset + Math.floor(elapsedMs(walk, now) / MESSAGE_EVERY_MS)) % count
}
