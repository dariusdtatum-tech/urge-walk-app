// Editorial lists (You sections, Track): one hero stat, small-caps section labels, hairline rows,
// an occasional stat pair, and at most one flat featured panel per screen. Behaviour is unchanged.
import { fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { SECTION_ORDER } from '../screens/you/Sections.jsx'
import { palettes } from '../ui/palette.js'
import { type } from '../ui/theme.js'
import { buildLoggedRecord } from '../lib/walkStorage.js'
import { DAY, fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0 } from './helpers.js'

const renderApp = async (scheme = 'light', seed = habitsSeed()) => {
  const storage = memoryStorage({ ...onboardedProfile(), ...seed })
  const r = await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme={scheme} />)
  return { storage, ...r }
}
const press = (id) => fireEvent.press(screen.getByTestId(id))
const tab = (name) => fireEvent.press(screen.getByRole('tab', { name }))
const flat = (n) => StyleSheet.flatten(n.props.style)
const panels = () => screen.queryAllByTestId(/^(support-featured|time-back)$/)
// Any box with a fill and a border: the old stacked-card pattern.
const boxedRows = () => {
  const out = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach(walk)
    const st = StyleSheet.flatten(n.props?.style)
    if (st?.borderWidth === 1 && st?.borderRadius && st?.backgroundColor) out.push(n.props.testID ?? n.type)
    walk(n.children)
  }
  walk(screen.toJSON())
  return out
}

describe.each(['light', 'dark'])('editorial You in %s', (scheme) => {
  const c = palettes[scheme]
  test('You: hero stat on the background, rows grouped under small-caps labels with hairlines', async () => {
    await renderApp(scheme)
    await tab('You')
    expect(screen.getByTestId('you-hero')).toHaveProp('accessibilityLabel', expect.stringMatching(/^\d[\d,]* days? clean Habit A$/))
    const labels = screen.getAllByRole('header').filter((h) => flat(h).fontSize === type.label)
    expect(labels.map((h) => [].concat(h.props.children).join(''))).toEqual(['Help and reasons', 'Progress', 'Settings'])
    for (const h of labels) expect(flat(h)).toMatchObject({ color: c.sectionLabel, textTransform: 'uppercase', letterSpacing: type.label * 0.08 })
    for (const id of SECTION_ORDER) expect(screen.getByTestId(`you-${id}`)).toBeTruthy()
    const row = flat({ props: { style: screen.getByTestId('you-progress').props.style } })
    expect(row).toMatchObject({ borderBottomWidth: 1, borderBottomColor: c.hairline })
    expect(row.backgroundColor).toBeUndefined()
  })

  test('Progress: hero, a two-up stat pair, labelled groups, one featured panel, no boxed rows', async () => {
    await renderApp(scheme)
    await tab('You')
    await press('you-progress')
    expect(screen.getByTestId('progress-hero')).toHaveProp('accessibilityLabel', expect.stringMatching(/days? clean Habit A · since/))
    expect(screen.getByTestId('progress-pair')).toBeTruthy()
    expect(screen.getByTestId('pair-milestones')).toHaveProp('accessibilityLabel', expect.stringMatching(/^\d+ milestones? earned$/))
    expect(panels().length).toBeLessThanOrEqual(1)
    expect(boxedRows()).toHaveLength(0)
    // Behaviour unchanged: rows still open their sheets.
    expect(screen.queryByTestId('walk-options')).toBeNull()
    await press('walk-length')
    expect(screen.getByTestId('walk-options')).toBeTruthy()
  })

  test.each(SECTION_ORDER)('%s section: at most one featured panel and no boxed rows', async (id) => {
    await renderApp(scheme)
    await tab('You')
    await press(`you-${id}`)
    // Appearance has no hero: its title says what the screen is, and the theme picker shows the current value
    expect(screen.queryAllByTestId(/-hero$/).length).toBe(id === 'appearance' ? 0 : 1)
    expect(panels().length).toBeLessThanOrEqual(1)
    expect(boxedRows()).toHaveLength(0)
  })
})

test.each([['light', '#f1ebe0'], ['dark', '#182b47']])('featured panel is flat (%s: %s), with no border or shadow', async (scheme, bg) => {
  await renderApp(scheme)
  await tab('You'); await press('you-support')
  const s = flat(screen.getByTestId('support-featured'))
  expect(s.backgroundColor).toBe(bg)
  expect(s.borderWidth ?? 0).toBe(0); expect(s.shadowOpacity ?? 0).toBe(0)
})

test.each(['light', 'dark'])('Track lists use hairline rows under section labels (%s)', async (scheme) => {
  await renderApp(scheme, { ...habitsSeed(), 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks: [0, 1].map((d) => buildLoggedRecord({ id: `w${d}`, at: T0 - d * DAY, note: 'A short note', result: 'yes' })) }) })
  await tab('Track')
  expect(screen.getAllByTestId('log-entry')).toHaveLength(2)
  expect(screen.getByTestId('summary-total')).toBeTruthy()
  for (const e of screen.queryAllByTestId('log-entry')) expect(flat(e)).toMatchObject({ borderBottomWidth: 1, borderBottomColor: palettes[scheme].hairline })
  expect(boxedRows().filter((id) => id === 'log-entry' || id === 'journal-item' || id === 'summary')).toEqual([])
})

test.each(['light', 'dark'])('Track Log: chart sections are unboxed; the Urge Map is the one sand panel (%s)', async (scheme) => {
  const walks = [0, 0, 1, 1, 2].map((d, i) => buildLoggedRecord({ id: `w${i}`, at: T0 - d * DAY - i * 3600000, note: '', result: 'yes' }))
  await renderApp(scheme, { ...habitsSeed(), 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks }) })
  await tab('Track')
  expect(flat(screen.getByTestId('pattern-card')).backgroundColor).toBe(palettes[scheme].featured)
  for (const id of ['never-zero', 'walks-card']) expect(flat(screen.getByTestId(id)).backgroundColor).toBeUndefined()
  expect(boxedRows().filter((id) => id !== 'pattern-empty')).toEqual([]) // the heat-strip cells are the chart itself
  for (const ch of ['chip-walked', 'chip-passed', 'chip-avg']) expect(flat(screen.getByTestId(ch)).backgroundColor).toBeUndefined()
})

test('Journal rows show the mood word and a dot, never an emoji; old moods map (great → Good, good → Steady)', async () => {
  const at = new Date(T0).toISOString()
  const entries = [{ id: 'a', createdAt: at, title: 'One', body: 'x', mood: 'great' }, { id: 'b', createdAt: at, title: 'Two', body: 'y', mood: 'good' }]
  await renderApp('light', { ...habitsSeed(), 'urgewalk.v1.journal': JSON.stringify({ version: 1, entries }) })
  await tab('Track')
  await fireEvent.press(screen.getByTestId('track-journal'))
  const moods = screen.getAllByTestId('journal-mood')
  expect(moods.map((m) => m.props.accessibilityLabel).sort()).toEqual(['Mood: Good', 'Mood: Steady'])
  expect(JSON.stringify(screen.toJSON())).not.toMatch(/[\u{1F600}-\u{1F64F}]/u)
})

// No emoji anywhere in the product (DESIGN-RULES.md). Plain marks like ✓ ✕ ↻ are text glyphs, not emoji.
const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u
const strings = (node, out = []) => {
  if (node == null) return out
  if (typeof node === 'string') { out.push(node); return out }
  if (Array.isArray(node)) { node.forEach((n) => strings(n, out)); return out }
  if (typeof node === 'object') { for (const k of ['accessibilityLabel', 'placeholder']) if (typeof node.props?.[k] === 'string') out.push(node.props[k]); strings(node.children, out) }
  return out
}
test('no emoji in rendered UI strings across the main screens', async () => {
  const at = new Date(T0).toISOString()
  const walks = ['walk', 'breathe', 'ground', 'logged'].map((kind, i) => ({ ...buildLoggedRecord({ id: `w${i}`, at: T0 - i * 3600000, note: 'A note', result: 'yes' }), kind }))
  await renderApp('light', { ...habitsSeed(), 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks }),
    'urgewalk.v1.journal': JSON.stringify({ version: 1, entries: [{ id: 'a', createdAt: at, title: 'One', body: 'x', mood: 'great' }] }) })
  const seen = []
  const grab = () => seen.push(...strings(screen.toJSON()))
  grab()
  await tab('Track'); grab()
  await fireEvent.press(screen.getByTestId('track-journal')); grab()
  expect(screen.getAllByTestId('note-tag').length).toBeGreaterThan(0)
  await tab('You'); grab()
  for (const id of SECTION_ORDER) { await press(`you-${id}`); grab(); await press('you-back') }
  expect(seen.length).toBeGreaterThan(50)
  expect(seen.filter((s) => EMOJI.test(s))).toEqual([])
})

test('no emoji in user-facing source: screens, copy, notifications, verses', () => {
  const { readdirSync, readFileSync, statSync } = require('fs')
  const { join } = require('path')
  const files = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === '__tests__' ? [] : files(p)) : /\.(jsx?|json)$/.test(n) && !/\.test\./.test(n) ? [p] : [] })
  const hits = files('src').concat('app.json').flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => (EMOJI.test(l) ? `${f}:${i + 1}` : null)).filter(Boolean))
  expect(hits).toEqual([])
})

test('Progress, Track Log and Journal pad the bottom by tab bar + safe area + 24', async () => {
  const { bottomSpace } = require('../ui/layout.js')
  const { size } = require('../ui/tokens.js')
  expect(bottomSpace(34)).toBe(size.tabBar + 34 + 24)
  const pad = (id) => StyleSheet.flatten(screen.getByTestId(id).props.contentContainerStyle).paddingBottom
  await renderApp('light', { ...habitsSeed(), 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks: [buildLoggedRecord({ id: 'w', at: T0, note: '', result: 'yes' })] }) })
  await tab('Track'); expect(pad('log')).toBe(bottomSpace(0))
  await press('track-journal'); expect(pad('journal')).toBe(bottomSpace(0))
  await tab('You'); await press('you-progress'); expect(pad('you')).toBe(bottomSpace(0))
})

test('Track header: Week / Month / All sits in the title row on Log, + New entry on Journal; "Last 30 days" replaces "Never zero"', async () => {
  const at = new Date(T0).toISOString()
  await renderApp('light', { ...habitsSeed(), 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks: [buildLoggedRecord({ id: 'w', at: T0, note: 'n', result: 'yes' })] }),
    'urgewalk.v1.journal': JSON.stringify({ version: 1, entries: [{ id: 'a', createdAt: at, title: 'One', body: 'x', mood: 3 }] }) })
  await tab('Track')
  const { within } = require('@testing-library/react-native')
  expect(within(screen.getByTestId('track-title-row')).getByTestId('range')).toBeTruthy()
  expect(screen.getAllByTestId('range')).toHaveLength(1) // not repeated in Your walks
  expect(screen.getAllByText('Last 30 days').length).toBeGreaterThan(0)
  expect(screen.queryByText(/never zero/i)).toBeNull()
  await press('range-month')
  expect(screen.getByTestId('range-month').props.accessibilityState.checked).toBe(true)
  await press('track-journal')
  expect(within(screen.getByTestId('track-title-row')).getByTestId('journal-new')).toBeTruthy()
  expect(StyleSheet.flatten(screen.getByTestId('journal-new').props.style).minHeight).toBeGreaterThanOrEqual(44)
})

test('Progress: Walks comes first, above Money kept and Time back; no second Money kept label over Add money estimate; Appearance has a clear title, no System hero', async () => {
  await renderApp('light')
  await tab('You')
  await press('you-progress')
  const labels = screen.getAllByText(/^(Walks|Trackers|Money kept)$/).map((n) => [].concat(n.props.children).join(''))
  expect(labels.indexOf('Walks')).toBe(0)
  expect(labels.filter((l) => l === 'Money kept').length).toBe(2) // the section label and the toggle row title only
  expect(screen.getByText('Add money estimate')).toBeTruthy()
  await press('you-back')
  await press('you-appearance')
  expect(screen.getByRole('header', { name: 'Appearance and lock' })).toBeTruthy()
  expect(screen.queryByTestId('appearance-hero')).toBeNull()
  expect(screen.queryByText('appearance')).toBeNull()
  expect(screen.getByTestId('theme')).toBeTruthy()
})

test('Progress Money kept: no caption over the total under the heading; the total reads "Money kept, $X" to VoiceOver', async () => {
  const { within } = require('@testing-library/react-native')
  await renderApp('light', { ...habitsSeed(), ...onboardedProfile({ timeBack: { hoursPerTime: 1, moneyPerTime: 12 } }) })
  await tab('You')
  await press('you-progress')
  const total = screen.getByTestId('kept-total')
  expect(total.props.accessibilityLabel).toMatch(/^Money kept, \$[\d,]+/)
  expect(within(screen.getByTestId('kept-money')).queryByText('Money kept')).toBeNull()
})

describe('bottom padding audit: every tab screen and You section clears the tab bar and the raised button', () => {
  const { bottomSpace } = require('../ui/layout.js')
  const want = bottomSpace(0) // tab bar + safe area (0 in tests) + 24
  const pads = (id) => StyleSheet.flatten(screen.getByTestId(id).props.contentContainerStyle).paddingBottom
  test.each([['Home', 'home'], ['Community', 'community'], ['Track', 'log']])('%s', async (name, id) => {
    await renderApp('light')
    await tab(name)
    expect(pads(id)).toBe(want)
  })
  test('Track → Journal', async () => {
    await renderApp('light')
    await tab('Track'); await press('track-journal')
    expect(pads('journal')).toBe(want)
  })
  test.each(SECTION_ORDER)('You → %s', async (id) => {
    await renderApp('light')
    await tab('You')
    expect(pads('you')).toBe(want)
    await press(`you-${id}`)
    expect(pads('you')).toBe(want)
  })
  test('no ScrollView in src hard-codes its bottom padding; they use the layout helpers', () => {
    const fs = require('fs'); const path = require('path')
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    const bad = walk(path.join(__dirname, '..')).filter((f) => f.endsWith('.jsx') && !f.includes('test'))
      .flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => /<ScrollView[^>]*contentContainerStyle=\{\{[^}]*paddingBottom: \d/.test(l)).map((l) => `${path.basename(f)}: ${l.trim().slice(0, 80)}`))
    expect(bad).toEqual([])
  })
})
