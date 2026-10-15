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

it('every theme defines every colour token (no theme falls back to a missing colour)', () => {
  expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort())
})

// WCAG 1.4.11 non-text contrast (Gemini review): each boundary that has to be seen is >= 3:1 against what it sits on.
const boundary = (s, key) => palette[s][key]
const NON_TEXT = {
  // [label, colour key (or a fallback key when the first is null), background key]
  light: [['ring track edge', 'trackEdge', 'bg'], ['money toggle off track', 'switchOff', 'card'], ['toggle off thumb', 'switchThumbOff', 'switchOff'],
    ['empty heatmap cell edge', 'cellEdge', 'card'], ['empty 30-day dot', 'cellEdge', 'card']],
  dark: [['ring track', 'ringTrack', 'bg'], ['ring fill vs track', 'ringA', 'ringTrack'], ['Breathe tile edge', 'breatheEdge', 'surface'],
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
