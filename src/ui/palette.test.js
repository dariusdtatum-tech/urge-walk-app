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
