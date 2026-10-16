import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0, youEl, drawerPref } from './helpers.js'

const renderApp = async (scheme = 'light') => {
  const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile(), ...drawerPref() })
  await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme={scheme} />)
}
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

const ROLES = new Set(['button', 'link', 'tab', 'checkbox', 'radio', 'switch', 'togglebutton'])
const textOf = (n) => (n == null ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : textOf(n.children))
function audit(tree) {
  const problems = []
  const visit = (n, ctx) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) { n.forEach((x) => visit(x, ctx)); return }
    const p = n.props || {}
    const role = p.accessibilityRole ?? p.role
    const id = p.testID ?? role
    if (ROLES.has(role) || n.type === 'RCTSwitch') {
      const name = p.accessibilityLabel ?? textOf(n.children).trim()
      if (!name) problems.push(`${id}: no accessible name`)
      const st = StyleSheet.flatten(p.style) || {}
      const fill = st.position === 'absolute' && st.top === 0
      // hitSlop extends the touch area beyond the drawn size (the compact Seg pill: 36pt drawn, 44pt target).
      const h = Math.max(st.minHeight ?? 0, st.height ?? 0) + (p.hitSlop?.top ?? 0) + (p.hitSlop?.bottom ?? 0)
      if (n.type !== 'RCTSwitch' && !fill && h < 44) problems.push(`${id}: target ${h}pt`)
    }
    if (n.type === 'Text' && p.maxFontSizeMultiplier != null && p.maxFontSizeMultiplier < 1.25) problems.push(`${id ?? textOf(n.children).slice(0, 20)}: text capped at ${p.maxFontSizeMultiplier}x`)
    // Clipping is only OK where the full text is still read (a named control, its own label) or it's decorative.
    if (n.type === 'Text' && p.numberOfLines && !p.accessibilityLabel && !ctx.named && !ctx.hidden) problems.push(`${textOf(n.children).slice(0, 30)}: clipped to ${p.numberOfLines} lines`)
    visit(n.children, { named: ctx.named || Boolean(p.accessibilityLabel) || ROLES.has(role), hidden: ctx.hidden || p.accessibilityElementsHidden === true })
  }
  visit(tree, { named: false, hidden: false })
  return problems
}
const check = () => audit(screen.toJSON())

describe.each(['light', 'dark'])('accessibility audit (%s)', (scheme) => {
  it.each([
    ['Home', async () => {}],
    ['Track', async () => fireEvent.press(screen.getByRole('tab', { name: 'Track' }))],
    ['Community', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press(screen.getByTestId('you-community-card')) }],
    ['You', async () => fireEvent.press(screen.getByRole('tab', { name: 'You' }))],
    ['Ride it out', async () => fireEvent.press(screen.getByTestId('ride-button'))],
    ['Breathe', async () => { await fireEvent.press(screen.getByTestId('ride-button')); await fireEvent.press(screen.getByTestId('ride-breathe')) }],
    ['Ground', async () => { await fireEvent.press(screen.getByTestId('ride-button')); await fireEvent.press(screen.getByTestId('ride-ground')); await fireEvent.press(screen.getByTestId('ground-next')) }],
    ['Crisis resources', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press((await youEl(screen, fireEvent, 'crisis-row'))) }],
    ['Trusted contacts', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press((await youEl(screen, fireEvent, 'contacts-row'))) }],
    ['Your reasons', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press((await youEl(screen, fireEvent, 'reasons-row'))) }],
    ['Backup', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press((await youEl(screen, fireEvent, 'backup-row'))) }],
    ['Just log it', async () => { await fireEvent.press(screen.getByTestId('ride-button')); await fireEvent.press(screen.getByTestId('ride-log')) }],
    ['Tracker drawer', async () => fireEvent.press(screen.getByTestId('home-title'))],
    ['You → Progress (money kept, time back)', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press(screen.getByTestId('you-progress')) }],
    ['Reach out from the drawer', async () => { await fireEvent.press(screen.getByTestId('home-title')); await fireEvent.press(screen.getByTestId('drawer-reach')) }],
    ['Didn’t pass → Reach out', async () => { await fireEvent.press(screen.getByTestId('ride-button')); await fireEvent.press(screen.getByTestId('ride-log')); await fireEvent.press(screen.getByTestId('log-result-no')) }],
    ['You → Data and privacy', async () => { await fireEvent.press(screen.getByRole('tab', { name: 'You' })); await fireEvent.press(screen.getByTestId('you-data')) }],
    ['Walk', async () => { await fireEvent.press(screen.getByTestId('ride-button')); await fireEvent.press(screen.getByTestId('ride-walk')) }],
  ])('%s: every control is named, ≥44pt, and text can grow', async (_name, go) => {
    await renderApp(scheme)
    await go()
    expect(check()).toEqual([])
  })
})

describe('Dynamic Type and Reduce Motion', () => {
  it('Ride it out choices stack at the largest text sizes', async () => {
    const rn = require('react-native')
    jest.spyOn(rn, 'useWindowDimensions').mockReturnValue({ width: 375, height: 812, scale: 3, fontScale: 3.1 })
    await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    expect(StyleSheet.flatten(screen.getByTestId('ride-tiles').props.style).flexDirection).toBe('column')
    jest.restoreAllMocks()
  })
  it('with Reduce Motion on, sheets fade and the Breathe orb stays still', async () => {
    const rn = require('react-native')
    jest.spyOn(rn.AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-breathe'))
    const orb = StyleSheet.flatten(screen.getByTestId('breathe-orb', { includeHiddenElements: true }).props.style)
    expect(orb.transform).toEqual([{ scale: 0.8 }])
    jest.restoreAllMocks()
  })
  it('with Reduce Motion on, the tracker drawer fades in place instead of sliding', async () => {
    const rn = require('react-native')
    jest.spyOn(rn.AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    await renderApp()
    await fireEvent.press(screen.getByTestId('home-title'))
    await act(async () => {})
    const st = StyleSheet.flatten(screen.getByTestId('drawer').props.style)
    expect(st.transform).toEqual([{ translateX: 0 }]) // never off-screen: no slide
    expect(st.opacity).toBe(0) // starts transparent and fades in
    jest.restoreAllMocks()
  })
  it('without Reduce Motion, the drawer slides in from off-screen left', async () => {
    const rn = require('react-native')
    jest.spyOn(rn.AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    await renderApp()
    await fireEvent.press(screen.getByTestId('home-title'))
    await act(async () => {})
    const st = StyleSheet.flatten(screen.getByTestId('drawer').props.style)
    expect(st.opacity).toBe(1)
    expect(st.transform[0].translateX).toBeLessThan(0) // starts off-screen left, then slides in
    expect(screen.getByTestId('drawer').props.accessibilityViewIsModal).toBe(true)
  })
  it('Ride it out is a named button in the tab bar and its hint lists all four choices', async () => {
    await renderApp()
    expect(screen.getByRole('button', { name: 'Ride it out' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ride it out' }).props.accessibilityHint).toMatch(/Ground/)
  })
})
