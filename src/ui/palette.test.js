import { describe, expect, it } from 'vitest'
import { palettes as palette } from './palette.js'

const lum = (hex) => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const TEXT_PAIRS = [
  ['text', 'bg'], ['text', 'surface'], ['title', 'bg'], ['muted', 'bg'], ['muted', 'surface'], ['accent', 'bg'], ['accent', 'surface'],
  ['text', 'sand'], ['title', 'sand'], ['mutedSand', 'sand'], ['onAction', 'action'], ['onTileAlt', 'tileAlt'], ['onDanger', 'danger'],
  // Milestone 3: Log outcome words, delete / error text, cards, toasts, segmented controls
  ['resYes', 'card'], ['resKinda', 'card'], ['resNoText', 'card'], ['resYes', 'surface'], ['resKinda', 'surface'], ['resNoText', 'surface'],
  ['danger', 'surface'], ['danger', 'card'], ['danger', 'bg'], ['error', 'surface'], ['error', 'bg'],
  ['text', 'card'], ['textSoft', 'card'], ['muted', 'card'], ['title', 'card'], ['accent', 'card'],
  ['toastText', 'toastBg'], ['toastAct', 'toastBg'], ['mutedSand', 'seg'], ['onActionSoft', 'action'],
  // Phase 1: text on the hold button's sea-glass fill
  ['title', 'holdFill'],
  // Daily verse card
  ['verseLabel', 'verseBg'], ['verseText', 'verseBg'], ['verseRef', 'verseBg'],
  // Component kit: Plus tag
  ['onPlus', 'plusBg'],
  // Editorial lists: section labels on the background, text in the flat featured panel
  ['sectionLabel', 'bg'], ['title', 'featured'], ['text', 'featured'], ['textSoft', 'featured'], ['mutedSand', 'featured'],
]
describe.each(['light', 'dark'])('%s palette meets WCAG AA', (s) => {
  it.each(TEXT_PAIRS)('%s on %s ≥ 4.5', (fg, bg) => {
    expect(ratio(palette[s][fg], palette[s][bg])).toBeGreaterThanOrEqual(4.5)
  })
})
it('deep sea #3f7a6b is never paired with sand as text', () => {
  expect(ratio('#3f7a6b', palette.light.sand)).toBeLessThan(4.5)
  expect(palette.light.mutedSand.toLowerCase()).not.toBe('#3f7a6b')
})

it('verse reference colour is the navy/cream at 70% blended on the card', () => {
  const blend = (f, b, a) => '#' + [1, 3, 5].map((i) => Math.round(a * parseInt(f.slice(i, i + 2), 16) + (1 - a) * parseInt(b.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('')
  expect(palette.light.verseRef).toBe(blend('#24395c', '#faf7f1', 0.7))
  expect(palette.dark.verseRef).toBe(blend('#f3ede2', '#182b47', 0.7))
})

it('editorial colours: deep sea labels in light, cream at 70% in dark, hairlines at 10%, featured panel sand / #182b47', () => {
  const blend = (f, b, a) => '#' + [1, 3, 5].map((i) => Math.round(a * parseInt(f.slice(i, i + 2), 16) + (1 - a) * parseInt(b.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('')
  expect(palette.light.sectionLabel).toBe('#3f7a6b')
  expect(palette.dark.sectionLabel).toBe(blend('#f3ede2', '#0f1d33', 0.7))
  expect(palette.light.hairline).toBe('rgba(36, 57, 92, 0.10)')
  expect(palette.dark.hairline).toBe('rgba(243, 237, 226, 0.10)')
  expect([palette.light.featured, palette.dark.featured]).toEqual(['#f1ebe0', '#182b47'])
})

it('every theme defines every colour token (no theme falls back to a missing colour)', () => {
  expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort())
})

// WCAG 1.4.11 non-text contrast (Gemini review): each boundary that has to be seen is >= 3:1 against what it sits on.
const boundary = (s, key) => palette[s][key]
const NON_TEXT = {
  // [label, colour key (or a fallback key when the first is null), background key]
  light: [['ring track edge', 'trackEdge', 'bg'], ['mood dot outline on cream', 'cellEdge', 'bg'], ['mood dot outline on a selected (sand) mood', 'cellEdge', 'sand'], ['money toggle off track', 'switchOff', 'card'], ['toggle off thumb', 'switchThumbOff', 'switchOff'],
    ['empty heatmap cell edge', 'cellEdge', 'card'], ['empty 30-day dot', 'cellEdge', 'card']],
  dark: [['ring track', 'ringTrack', 'bg'], ['mood dot outline on night', 'cellEdge', 'bg'], ['mood dot outline on a selected mood', 'cellEdge', 'sand'], ['ring fill vs track', 'ringA', 'ringTrack'], ['Breathe tile edge', 'breatheEdge', 'surface'],
    ['money toggle off track', 'switchOff', 'card'], ['toggle off thumb', 'switchThumbOff', 'switchOff'],
    ['empty heatmap cell edge', 'cellEdge', 'card'], ['empty 30-day dot', 'cellEdge', 'card']],
}
describe.each(['light', 'dark'])('%s non-text contrast ≥ 3:1', (s) => {
  it.each(NON_TEXT[s])('%s', (_label, fg, bg) => {
    expect(ratio(boundary(s, fg), palette[s][bg])).toBeGreaterThanOrEqual(3)
  })
  it.each([['onWalkTile', 'walkTile'], ['onWalkTileSoft', 'walkTile'], ['breatheAccent', 'tileAlt']])('%s on %s ≥ 4.5 (Ride it out tiles)', (fg, bg) => {
    expect(ratio(palette[s][fg], palette[s][bg])).toBeGreaterThanOrEqual(4.5)
  })
})
it('the before colours really failed (kept as a record of the fix)', () => {
  expect(ratio(palette.dark.track, palette.dark.bg)).toBeLessThan(3) // old ring track #22375a, 1.42:1
  expect(ratio(palette.dark.tileAlt, palette.dark.surface)).toBeLessThan(3) // Breathe fill alone, 1.23:1
  expect(ratio(palette.dark.sand, palette.dark.card)).toBeLessThan(3) // empty cell fill alone, 1.09:1
})

// Gemini review 2: off-palette colours are banned outside the palette, and the palette itself no longer
// uses them (#009688 was react-native-web's default switch thumb; #fdfbf7 an off-brand near-white;
// #6b7280 a stock cool grey). Snapshots are generated output and skipped.
it('bans #009688, #fdfbf7 and #6b7280 everywhere in src (and in the palette)', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs')
  const { join } = await import('node:path')
  const files = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === '__snapshots__' ? [] : files(p)) : /\.(jsx?|json)$/.test(n) && !n.endsWith('.test.js') ? [p] : [] })
  const hits = files('src').flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => (/#(009688|fdfbf7|6b7280)\b/i.test(l) ? `${f}:${i + 1}` : null)).filter(Boolean))
  expect(hits).toEqual([])
})

it('no sea glass text at night: every dark text colour is cream (or cream at 70%)', () => {
  for (const k of ['text', 'textSoft', 'title', 'accent', 'verseLabel', 'resYes', 'tabActive', 'sectionLabel', 'toastText'])
    expect([k, palette.dark[k].toLowerCase()]).not.toEqual([k, '#a9cbc0'])
  expect(palette.dark.accent).toBe('#f3ede2')
})

it('switch thumbs are palette colours: cream on navy in light, night navy on sea glass in dark', () => {
  expect([palette.light.switchThumbOn, palette.light.action]).toEqual(['#faf7f1', '#24395c'])
  expect([palette.dark.switchThumbOn, palette.dark.action]).toEqual(['#0f1d33', '#a9cbc0'])
})
