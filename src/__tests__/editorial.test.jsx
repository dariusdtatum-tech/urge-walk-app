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
    expect(screen.getAllByTestId(/-hero$/).length).toBe(1)
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
