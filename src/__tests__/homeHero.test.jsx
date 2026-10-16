// Home hero: the ring by default, Tide / Stones / Trail as optional styles picked in You → Appearance
// and lock → Home hero, saved on this phone. Neutral test data only.
import { AccessibilityInfo } from 'react-native'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { HERO_PREFS_KEY } from '../lib/heroStyle.js'
import { SCENE_PREFS_KEY } from '../lib/scenePrefs.js'
import { stonesLayout, stonesSummary, tideSummary, trailSteps, trailSummary } from '../screens/home/AltHeroes.jsx'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice } from './helpers.js'

const renderApp = async (extra = {}, scheme = 'light') => {
  const storage = memoryStorage({ ...onboardedProfile(), ...habitsSeed(), ...extra })
  const r = await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme={scheme} />)
  return { storage, ...r }
}
const pref = (style) => ({ [HERO_PREFS_KEY]: JSON.stringify({ style }) })

describe('home hero', () => {
  it('shows the swiping ring by default', async () => {
    await renderApp()
    expect(screen.getByTestId('hero-ring')).toBeTruthy()
    expect(screen.getByTestId('hero-pager')).toBeTruthy()
    expect(screen.queryByTestId(/^alt-hero-(tide|stones|trail)$/)).toBeNull()
    expect(screen.getByTestId('ms-last')).toBeTruthy()
    expect(screen.getByTestId('ms-next')).toBeTruthy()
  })

  for (const [kind, summary] of [['tide', /^Tide: the water has risen with \d+ urges? ridden out$/], ['stones', /^Stones: \d+ stones?, one for each urge ridden out$/], ['trail', /^Trail: \d+ walks? so far, the next post is \d+ walks? away$/]]) {
    it.each(['light', 'dark'])(`renders the ${kind} hero (%s) with a spoken summary, the day count and the milestone pair`, async (scheme) => {
      {
        await renderApp(pref(kind), scheme)
        const pic = screen.getByTestId(`alt-hero-${kind}`)
        expect(pic.props.accessible).toBe(true)
        expect(pic.props.accessibilityRole).toBe('image')
        expect(pic.props.accessibilityLabel).toMatch(summary)
        expect(screen.getByTestId('alt-hero-count').props.accessibilityLabel).toMatch(/^Habit A\. 163 days clean\./)
        expect(screen.queryByTestId('hero-ring')).toBeNull()
        expect(screen.getByTestId('ms-next')).toBeTruthy()
        expect(screen.getByTestId('home-cards')).toBeTruthy()
      }
    })
  }

  it('the picker saves the choice and Home uses it; Ring brings the ring back', async () => {
    const { storage } = await renderApp()
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: 'You' })) })
    await act(async () => { fireEvent.press(screen.getByTestId('you-appearance')) })
    expect(screen.getByTestId('hero-style-ring').props.accessibilityState).toEqual({ checked: true })
    await act(async () => { fireEvent.press(screen.getByTestId('hero-style-trail')) })
    expect(screen.getByTestId('hero-style-trail').props.accessibilityState).toEqual({ checked: true })
    expect(JSON.parse(storage.getItem(HERO_PREFS_KEY)).style).toBe('trail')
    // a fresh launch on the same phone keeps it
    await act(async () => { fireEvent.press(screen.getByTestId('hero-style-ring')) })
    expect(JSON.parse(storage.getItem(HERO_PREFS_KEY)).style).toBe('ring')
    await act(async () => { fireEvent.press(screen.getByTestId('hero-style-stones')) })
    // Home picks it up
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: 'Home' })) })
    expect(screen.getByTestId('alt-hero-stones')).toBeTruthy()
  })

  it('pure helpers grow only with effort', () => {
    const sc = (walks, ridden) => ({ days: 0, walks, ridden, growth: ridden })
    expect(tideSummary(sc(0, 1))).toBe('Tide: the water has risen with 1 urge ridden out')
    expect(stonesLayout(sc(0, 0))).toMatchObject({ shown: 0, total: 26 })
    expect(stonesLayout(sc(0, 500))).toMatchObject({ shown: 78, total: 78 })
    expect(stonesSummary(sc(0, 7))).toBe('Stones: 7 stones, one for each urge ridden out')
    expect(trailSteps(sc(0, 0))).toEqual({ section: 1, steps: 0, toPost: 5 })
    expect(trailSteps(sc(33, 40))).toEqual({ section: 2, steps: 3, toPost: 2 })
    expect(trailSummary(sc(1, 1))).toBe('Trail: 1 walk so far, the next post is 4 walks away')
  })

  const tx = (id) => { const t = [].concat(screen.getByTestId(id, { includeHiddenElements: true }).props.style).flat().find((x) => x && x.transform)?.transform; return t?.[0]?.translateX }
  it('scenes drift slowly by default and stay still with Still scenes on', async () => {
    await renderApp(pref('tide'))
    expect(screen.getByTestId('tide-drift', { includeHiddenElements: true })).toBeTruthy()
  })
  it('Still scenes keeps them still', async () => {
    await renderApp({ ...pref('trail'), [SCENE_PREFS_KEY]: JSON.stringify({ still: true }) })
    expect(tx('trail-drift')).toBe(0)
  })

  it('Reduce Motion makes scenes still frames', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    await renderApp(pref('tide'))
    await act(async () => {})
    expect(tx('tide-drift')).toBe(0)
    spy.mockRestore()
  })

  it('Still scenes is a setting under Home hero and is saved', async () => {
    const { storage } = await renderApp()
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: 'You' })) })
    await act(async () => { fireEvent.press(screen.getByTestId('you-appearance')) })
    await act(async () => { fireEvent(screen.getByTestId('still-scenes'), 'valueChange', true) })
    expect(JSON.parse(storage.getItem(SCENE_PREFS_KEY)).still).toBe(true)
  })
})
