// Daily line on Home: one line a day from ONE chosen source. All bundled, offline.
// urgewalk.v1.optionalContent  { faith, dailyLineSource: 'quotes' | 'poetry' | 'verse' | 'off' }  default 'quotes'.
// Verse is always offered; choosing it is the opt-in. The old Faith content switch only migrates.
import LINES from '../content/daily-lines.json'
import VERSES from '../content/verses.json'
import { loadFaithOn, OPTIONAL_CONTENT_KEY } from './faith.js'
import { readObject, writeObject } from './storage.js'

export const DAILY_SOURCES = ['quotes', 'poetry', 'verse', 'off']

// Existing users who had the Daily verse (Faith content) on start on 'verse'; everyone else on 'quotes'.
// Picking Verse is the opt-in; it is never the default for anyone new.
export function loadDailyLineSource(storage) {
  const v = readObject(OPTIONAL_CONTENT_KEY, storage) || {}
  if (DAILY_SOURCES.includes(v.dailyLineSource)) return v.dailyLineSource
  return loadFaithOn(storage) ? 'verse' : 'quotes'
}
export function saveDailyLineSource(source, storage) {
  if (DAILY_SOURCES.includes(source)) writeObject(OPTIONAL_CONTENT_KEY, { ...(readObject(OPTIONAL_CONTENT_KEY, storage) || {}), dailyLineSource: source }, storage)
  return loadDailyLineSource(storage)
}

export const SOURCE_HELP = {
  quotes: 'Short lines from writers and thinkers.',
  poetry: 'A few lines from classic poems.',
  verse: 'A daily verse from the Bible (KJV).',
  off: 'No daily line on Home.',
}

const pools = {
  quotes: () => LINES.quotes.map((q) => ({ kind: 'quote', text: q.text, by: q.by })),
  poetry: () => LINES.poems.map((p) => ({ kind: 'poem', lines: p.lines, by: `${p.by}, ${p.title}` })),
  verse: () => VERSES.map((v) => ({ kind: 'verse', text: v.text, by: v.ref, tr: v.tr })),
}

// Local calendar day as a whole number, so the pick is the same all day.
const dayNumber = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)

// One line for the day from the chosen source, or null for 'off'.
export function lineFor(date, source) {
  const pool = pools[source]?.()
  if (!pool?.length) return null
  const h = Math.imul(dayNumber(date) + 1, 2654435761) >>> 0
  return pool[h % pool.length]
}

export const lineText = (l) => (l.kind === 'poem' ? l.lines.join('\n') : l.text)
export const lineLabel = (l) => `${lineText(l).replace(/\n/g, ' ')}, ${l.kind === 'verse' ? 'from' : 'by'} ${l.by}`
