import { fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Card, Chart, EmptyState, FeaturedPanel, HairlineRow, HairlineToggle, HeroStat, MoodDot, PrimaryButton, QuietLink, Row, RowGroup, SectionLabel, Sheet, StatPair, Tag, ToggleRow } from './kit.jsx'
import { palettes } from './palette.js'
import { PreviewFontScale, T } from './Text.jsx'
import { SchemeContext, type, size as sz } from './theme.js'

const noop = () => {}
const KIT = {
  Card: () => <Card><T>Body</T></Card>,
  Row: () => <Row title="Row" sub="Sub" onPress={noop} />,
  ToggleRow: () => <ToggleRow title="Toggle" sub="Sub" value onChange={noop} />,
  Tag: () => <Tag label="Tag" />,
  PlusTag: () => <Tag label="Plus" tone="plus" />,
  PrimaryButton: () => <PrimaryButton label="Go" onPress={noop} />,
  QuietLink: () => <QuietLink label="More" onPress={noop} />,
  EmptyState: () => <EmptyState title="Nothing yet" body="One calm sentence." actionLabel="Add one" onAction={noop} />,
  Chart: () => <Chart data={[{ label: 'A', value: 1 }, { label: 'B', value: 3 }]} summary="A 1, B 3" />,
  Sheet: () => <Sheet title="Sheet" onClose={noop}><T>Inside</T></Sheet>,
  HeroStat: () => <HeroStat value="163" label="days clean" sub="Habit A" />,
  SectionLabel: () => <SectionLabel>Trackers</SectionLabel>,
  HairlineRows: () => <RowGroup><HairlineRow title="Row" sub="Sub" onPress={noop} /><HairlineToggle title="Toggle" sub="Sub" value onChange={noop} /></RowGroup>,
  StatPair: () => <StatPair items={[{ value: '4', label: 'milestones earned' }, { value: '230', label: 'hours back' }]} />,
  FeaturedPanel: () => <FeaturedPanel><T>Featured</T></FeaturedPanel>,
}
const FONT_SIZES = new Set(Object.values(type).concat([20])) // 20 = the Row chevron
const colorsOf = (s) => new Set(Object.values(palettes[s]).map((v) => String(v).toLowerCase()))

function walk(node, fn) {
  if (!node) return
  if (Array.isArray(node)) { node.forEach((n) => walk(n, fn)); return }
  if (typeof node !== 'object') return
  fn(node)
  walk(node.children, fn)
}

describe.each(['light', 'dark'])('component kit in %s', (scheme) => {
  it.each(Object.keys(KIT))('%s matches its snapshot and uses only tokens and palette colours', async (name) => {
    const C = KIT[name]
    const r = await render(<SchemeContext.Provider value={scheme}><C /></SchemeContext.Provider>)
    const tree = r.toJSON()
    expect(tree).toMatchSnapshot()
    const palette = colorsOf(scheme)
    walk(tree, (n) => {
      const st = StyleSheet.flatten(n.props?.style) || {}
      if (st.fontSize != null) expect(FONT_SIZES).toContain(st.fontSize)
      for (const k of ['color', 'backgroundColor', 'borderColor']) {
        if (st[k] != null && st[k] !== 'transparent') expect(palette).toContain(String(st[k]).toLowerCase())
      }
      const fill = st.position === 'absolute' && st.top === 0 && st.bottom === 0 // a full-screen backdrop
      if (!fill && (n.props?.accessibilityRole === 'button' || n.props?.accessibilityRole === 'link')) {
        expect(Math.max(st.minHeight ?? 0, st.height ?? 0)).toBeGreaterThanOrEqual(sz.minTap)
      }
    })
  })
})

it('the Plus tag is sea glass with AA text; a plain tag is sand', async () => {
  await render(<><Tag label="Plus" tone="plus" testID="p" /><Tag label="Free" testID="f" /></>)
  expect(StyleSheet.flatten(screen.getByTestId('p').props.style).backgroundColor).toBe(palettes.light.plusBg)
  expect(StyleSheet.flatten(screen.getByTestId('f').props.style).backgroundColor).toBe(palettes.light.sand)
})

it('the Chart reads as one sentence', async () => {
  await render(<Chart data={[{ label: 'A', value: 2 }]} summary="Two on A" testID="ch" />)
  expect(screen.getByLabelText('Two on A')).toBeTruthy()
})

it('Design Check largest-text preview scales text up to each cap', async () => {
  await render(<PreviewFontScale.Provider value={3}><T testID="t" size={15}>Hi</T><T testID="s" font="serif" size={28}>Big</T></PreviewFontScale.Provider>)
  expect(StyleSheet.flatten(screen.getByTestId('t').props.style).fontSize).toBe(30) // body caps at 2x
  expect(StyleSheet.flatten(screen.getByTestId('s').props.style).fontSize).toBe(45) // big serif caps at 1.6x
})

it('QuietLink is pressable', async () => {
  const fn = jest.fn()
  await render(<QuietLink label="More" onPress={fn} />)
  await fireEvent.press(screen.getByRole('link', { name: 'More' }))
  expect(fn).toHaveBeenCalled()
})

test('MoodDot is flat: no stroke in either mode', async () => {
  for (const s of ['light', 'dark']) {
    const r = await render(<SchemeContext.Provider value={s}><MoodDot testID="d" fill={0.2} /></SchemeContext.Provider>)
    expect(StyleSheet.flatten(r.getByTestId('d', { includeHiddenElements: true }).props.style).borderWidth ?? 0).toBe(0)
    r.unmount()
  }
})
