// Pure date math for the clean-time tracker. No React here, so it's easy to test.
//
// Dates are stored as plain 'YYYY-MM-DD' strings (what <input type="date"> gives us).
// We treat them as calendar days, not moments in time, so daylight-saving changes
// and time zones can never make a day count jump or skip.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

// 'YYYY-MM-DD' -> { y, m, d } (m is 1-12), or null if it isn't a real calendar date.
export function parseISODate(str) {
  if (typeof str !== 'string') return null
  const match = ISO_DATE.exec(str)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  // Reject things like 2026-02-30 by round-tripping through a UTC date.
  const check = new Date(Date.UTC(y, m - 1, d))
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null
  }
  return { y, m, d }
}

export function isValidISODate(str) {
  return parseISODate(str) !== null
}

// Today's date in the device's local time zone, as 'YYYY-MM-DD'.
export function todayISO(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Calendar date -> day number (counts days since 1970-01-01). Used only for subtraction.
function dayNumber({ y, m, d }) {
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

// Whole calendar days from start to end. The start date itself is day 0.
export function daysBetween(startISO, endISO) {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  if (!start || !end) return NaN
  return dayNumber(end) - dayNumber(start)
}

// THE clean-day count. The Home ring, page 2 (clean time), milestones and tracker lists all use
// this, so they always agree: whole calendar days from the start date to today in the phone's
// time zone (start day = 0; a future start = 0). Calendar days, not elapsed hours, so midnight
// is when the count goes up and DST can never make it jump or lag.
export function cleanDayCount(startISO, todayKey = todayISO()) {
  const days = daysBetween(startISO, todayKey)
  return Number.isFinite(days) && days > 0 ? days : 0
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate() // day 0 of next month = last day of m
}

// Add whole months, clamping to the end of shorter months (Jan 31 + 1 month = Feb 28/29).
function addMonths({ y, m, d }, months) {
  const total = (y * 12 + (m - 1)) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return { y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) }
}

// Friendly breakdown of the streak: { years, months, weeks, days, totalDays }.
// Years/months are real calendar months (Mar 15 -> Aug 15 is 5 months), and the leftover
// days are counted after that. `weeks` is only used for streaks under a month.
export function breakdown(startISO, endISO) {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  if (!start || !end) return null
  const totalDays = dayNumber(end) - dayNumber(start)
  if (totalDays < 0) return null

  let months = (end.y - start.y) * 12 + (end.m - start.m)
  if (dayNumber(addMonths(start, months)) > dayNumber(end)) months -= 1
  const days = dayNumber(end) - dayNumber(addMonths(start, months))

  const years = Math.floor(months / 12)
  const restMonths = months % 12
  if (months === 0) {
    return { years: 0, months: 0, weeks: Math.floor(days / 7), days: days % 7, totalDays }
  }
  return { years, months: restMonths, weeks: 0, days, totalDays }
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// "1 year, 2 months, 3 days" / "5 months, 9 days" / "2 weeks, 1 day" / "Starting today"
export function formatBreakdown(b) {
  if (!b) return ''
  if (b.totalDays === 0) return 'Starting today'
  const parts = []
  if (b.years) parts.push(plural(b.years, 'year'))
  if (b.months) parts.push(plural(b.months, 'month'))
  if (b.weeks) parts.push(plural(b.weeks, 'week'))
  if (b.days) parts.push(plural(b.days, 'day'))
  return parts.join(', ')
}

// 'YYYY-MM-DD' -> "Mar 15, 2026" in the device's language.
export function formatDate(iso) {
  const p = parseISODate(iso)
  if (!p) return ''
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
