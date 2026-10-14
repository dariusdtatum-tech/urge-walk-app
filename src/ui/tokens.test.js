// Density tokens: one scale for type, space and sizes. Guards the pass's two hard rules.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import * as theme from './tokens.js'

function jsxFiles(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : jsxFiles(p)
    return p.endsWith('.jsx') ? [p] : []
  })
}
const files = jsxFiles('src')

describe('density tokens', () => {
  test('values from the spec', () => {
    const { type, space, size } = theme
    expect([type.body, type.screenTitle, type.sheetTitle, type.rideSheetTitle, type.ringDays]).toEqual([15, 28, 24, 26, 56])
    expect([space.screen, space.card, space.section]).toEqual([16, 14, 12])
    expect([size.ring, size.ringStroke, size.row, size.rideBar, size.rideTile, size.tabCenter, size.button]).toEqual([164, 8, 48, 56, 96, 56, 48])
  })
  test('no text size under 12pt', () => {
    expect(Math.min(...Object.values(theme.type))).toBeGreaterThanOrEqual(12)
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/<T\b[^>]*\bsize=\{(\d+)\}/g)) expect({ f, ok: Number(m[1]) >= 12 }).toEqual({ f, ok: true })
    }
  })
  test('every tap target stays at least 44pt', () => {
    for (const k of ['minTap', 'row', 'button', 'seg', 'logIt', 'rideBar', 'rideTile', 'tabCenter']) expect(theme.size[k]).toBeGreaterThanOrEqual(44)
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/minHeight: (\d+)/g)) expect({ f, v: Number(m[1]) >= 44 }).toEqual({ f, v: true })
    }
  })
})
