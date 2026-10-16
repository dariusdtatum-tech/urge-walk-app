import { act, fireEvent, render, screen, within } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { sheetMaxHeight } from '../screens/RideSheet.jsx'
import { avgChip } from '../screens/home/WalksCard.jsx'
import { drawerPref, fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0, youEl } from './helpers.js'
import { PILL_HEIGHT } from '../screens/home/TrackerDrawer.jsx'

const renderApp = async (extra = {}, scheme = 'light') => {
  const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile(), ...extra })
  await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme={scheme} />)
  return storage
}
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

describe('Ride it out sheet', () => {
  test('caps its height from the window (not a % of its own wrapper) so the footer tip is reachable', async () => {
    await renderApp()
    await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
    const st = StyleSheet.flatten(screen.getByTestId('ride-sheet').props.style)
    expect(typeof st.maxHeight).toBe('number')
    expect(screen.getByTestId('ride-tip')).toBeTruthy()
  })
  test('sheetMaxHeight leaves room for the top inset', () => {
    expect(sheetMaxHeight(844, 47)).toBe(844 - 47 - 16)
    expect(sheetMaxHeight(844, 0)).toBe(844 - 24 - 16)
  })
})

describe('Your walks', () => {
  test('avgChip: minutes, singular, and an empty dash', async () => {
    expect(avgChip(450)).toMatchObject({ n: 8, label: 'Avg walk', sub: 'minutes', a11y: 'Average walk 8 minutes' })
    expect(avgChip(20)).toMatchObject({ n: 1, sub: 'minute' })
    expect(avgChip(null)).toMatchObject({ n: '–', label: 'Avg walk' })
  })
})

const two = { 'urgewalk.v1.habits': JSON.stringify({ habits: [{ id: 'h1', name: 'Habit A', startDate: '2029-12-02' }, { id: 'h2', name: 'Habit B', startDate: '2030-04-01' }] }) }
const tab = async (name) => { await act(async () => { fireEvent.press(screen.getByTestId(`tab-${name}`)) }) }

describe('tracker switcher: bottom sheet by default, drawer behind the setting', () => {
  test('title tap opens the sheet: grabber, 44x44 close, 48pt side-by-side pills, Reach out badge first, Back up pill', async () => {
    await renderApp(two)
    await act(async () => { fireEvent.press(screen.getByTestId('home-title')) })
    expect(screen.getByTestId('tracker-sheet')).toBeTruthy()
    expect(screen.queryByTestId('drawer')).toBeNull()
    expect(screen.getByTestId('tracker-sheet-grabber')).toBeTruthy()
    const x = StyleSheet.flatten(screen.getByTestId('tracker-sheet-close').props.style)
    expect(x.minHeight).toBeGreaterThanOrEqual(44); expect(x.minWidth).toBeGreaterThanOrEqual(44)
    for (const id of ['drawer-add', 'home-edit']) {
      const st = StyleSheet.flatten(screen.getByTestId(id).props.style)
      expect(st.minHeight).toBe(PILL_HEIGHT); expect(st.flex).toBe(1)
    }
    expect(PILL_HEIGHT).toBe(48)
    expect(screen.getByTestId('drawer-reach-badge')).toBeTruthy()
    expect(screen.getByTestId('drawer-reach')).toHaveTextContent(/988/)
    await act(async () => { fireEvent.press(screen.getByTestId('drawer-tracker-h2')) })
    expect(screen.queryByTestId('tracker-sheet')).toBeNull()
    expect(screen.getByTestId('home-title')).toHaveTextContent(/Habit B/)
  })
  test('the X and the backdrop close it; the a11y action opens it too', async () => {
    await renderApp(two)
    await act(async () => { fireEvent.press(screen.getByTestId('home-title')) })
    await act(async () => { fireEvent.press(screen.getByTestId('tracker-sheet-close')) })
    expect(screen.queryByTestId('tracker-sheet')).toBeNull()
    await act(async () => { fireEvent(screen.getByTestId('home-title'), 'accessibilityAction', { nativeEvent: { actionName: 'openTrackers' } }) })
    await act(async () => { fireEvent.press(screen.getByTestId('tracker-sheet-backdrop', { includeHiddenElements: true })) })
    expect(screen.queryByTestId('tracker-sheet')).toBeNull()
  })
  test('You > Appearance and lock: Tracker switcher Drawer / Sheet, default Sheet, persisted', async () => {
    const storage = await renderApp(two)
    await tab('you')
    expect((await youEl(screen, fireEvent, 'switcher-setting'))).toHaveTextContent(/Tracker switcher/)
    expect(screen.getByTestId('switcher-sheet').props.accessibilityState).toMatchObject({ checked: true })
    await act(async () => { fireEvent.press(screen.getByTestId('switcher-drawer')) })
    expect(JSON.parse(storage.getItem('urgewalk.v1.switcherPrefs'))).toEqual({ style: 'drawer' })
  })
  test('with Drawer picked, the title opens the drawer', async () => {
    await renderApp({ ...two, ...drawerPref() })
    await act(async () => { fireEvent.press(screen.getByTestId('home-title')) })
    expect(screen.getByTestId('drawer')).toBeTruthy()
    expect(screen.queryByTestId('tracker-sheet')).toBeNull()
  })
})

describe('Ride it out sheet extras', () => {
  test('44x44 close, the reason in a sand pill, and the 988 row above the tip', async () => {
    await renderApp(onboardedProfile({ why: 'Clear head' }))
    await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
    const x = StyleSheet.flatten(screen.getByTestId('ride-close').props.style)
    expect(x.minHeight).toBeGreaterThanOrEqual(44); expect(x.minWidth).toBeGreaterThanOrEqual(44)
    expect(screen.getByTestId('ride-why-pill')).toHaveTextContent('“Clear head”')
    expect(screen.getByTestId('ride-reach-988')).toHaveTextContent(/988 Lifeline/)
    await act(async () => { fireEvent.press(screen.getByTestId('ride-close')) })
    expect(screen.queryByTestId('ride-tip')).toBeNull()
  })
})

describe('top inset', () => {
  test('phones use the system safe area; the web preview simulates the 59pt Dynamic Island', () => {
    const { topInset, DYNAMIC_ISLAND_TOP } = require('../AppRoot.jsx')
    expect(DYNAMIC_ISLAND_TOP).toBe(59)
    expect(topInset(47, 'ios')).toBe(47)
    expect(topInset(59, 'ios')).toBe(59)
    expect(topInset(0, 'web')).toBe(59)
  })
})

describe('Track > Your walks range', () => {
  test('a compact right-aligned pill (Week / Month / All): 36pt drawn, 44pt hit area, segments never shrink', async () => {
    await renderApp()
    await tab('track')
    const st = StyleSheet.flatten(screen.getByTestId('range').props.style)
    expect(st.alignSelf).toBe('flex-end')
    expect(screen.getByTestId('range-all')).toHaveTextContent('All')
    expect(screen.getByTestId('range-all').props.accessibilityLabel).toBe('All time')
    // 36pt pill with a 44pt hit area; segments never shrink (the squashed Week/Month/All fix).
    for (const id of ['range-week', 'range-month', 'range-all']) {
      const seg = screen.getByTestId(id)
      const st = StyleSheet.flatten(seg.props.style)
      expect(st).toMatchObject({ minHeight: 36, flexShrink: 0, minWidth: 56 })
      expect(st.minHeight + seg.props.hitSlop.top + seg.props.hitSlop.bottom).toBe(44)
    }
    expect(StyleSheet.flatten(screen.getByTestId('range').props.style).flexShrink).toBe(0)
    expect(screen.getByTestId('chip-avg')).toHaveTextContent(/Avg walk/)
    expect(screen.queryByText(/Streak/)).toBeNull()
  })
})

describe('Onboarding welcome', () => {
  test('true-circle scene (slice, not none), warmer light sun, a path, the words below the scene, and no brand mark (brand work on hold)', async () => {
    await render(<AppRoot storage={memoryStorage()} device={stubDevice()} clock={fakeClock()} scheme="light" />)
    const scene = screen.getByTestId('ob-scene', { includeHiddenElements: true })
    expect(scene.props.preserveAspectRatio).not.toBe('none')
    expect(screen.getByTestId('ob-sun', { includeHiddenElements: true }).props.fill.payload).toBe(0xffdec29b) // #dec29b
    const path = screen.getByTestId('ob-path', { includeHiddenElements: true })
    expect(path.props.stroke).toBeFalsy() // flat and borderless
    expect(path.props.fill.payload).toBe(0xfff1ebe0) // flat sand, no alpha
    expect(JSON.stringify(screen.toJSON())).not.toContain('obFade') // no fade-out gradient
    // the restore link is navy (palette token), not deep sea or sea glass
    expect(StyleSheet.flatten(within(screen.getByTestId('ob-restore')).getByText('Restore from a backup').props.style).color).toBe('#24395c')
    expect(screen.getByTestId('ob-words')).toHaveTextContent(/You’re here\./)
    expect(screen.queryByLabelText('Evenfaring')).toBeNull(); expect(screen.queryByTestId('ob-emblem')).toBeNull(); expect(screen.queryByText(/evenfaring/i)).toBeNull()
  })
})

describe('fuller Home cards', () => {
  test('weekNumbers: every urge kind counts as ridden out; walks and their minutes; only the last 7 days', () => {
    const { weekNumbers } = require('../screens/home/HomeCards.jsx')
    const at = (d) => new Date(T0 - d * 86400000).toISOString()
    const walks = [
      { startedAt: at(0), kind: 'walk', actualSeconds: 600 }, { startedAt: at(2), kind: 'walk', actualSeconds: 300 },
      { startedAt: at(1), kind: 'breathe', actualSeconds: 60 }, { startedAt: at(3), kind: 'logged' }, { startedAt: at(9), kind: 'walk', actualSeconds: 900 },
    ]
    expect(weekNumbers(walks, '2030-05-14')).toEqual({ ridden: 4, walked: 2, minutes: 15 })
  })
  test('Urge Map preview: 7 dots, one line, and See Track opens Track', async () => {
    await renderApp()
    expect(screen.getByTestId('urgemap-strip').props.accessibilityLabel.split(',').length).toBe(7)
    expect(screen.getByTestId('urgemap-line')).toHaveTextContent('Nothing logged this week yet.')
    expect(StyleSheet.flatten(screen.getByTestId('urgemap-see-track').props.style).minHeight).toBe(44)
    await act(async () => { fireEvent.press(screen.getByTestId('urgemap-see-track')) })
    expect(screen.getByTestId('track-insights')).toBeTruthy()
  })
})
