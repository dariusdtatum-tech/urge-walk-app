// Home hero: the ring by default, Tide / Stones / Trail as optional styles picked in You → Appearance
// and lock → Home hero, saved on this phone. Neutral test data only.
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { HERO_PREFS_KEY } from '../lib/heroStyle.js'
import { stonesLayout, stonesSummary, tideSummary, trailPosts, trailSummary } from '../screens/home/AltHeroes.jsx'
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

  for (const [kind, summary] of [['tide', /^Tide: \d+% of the way to .+, \d+ days to go$/], ['stones', /^Stones: 23 stones, one for each week clean/], ['trail', /^Trail: walking toward the .+ post, \d+ days away$/]]) {
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
    screen.unmount()
    // a fresh launch on the same phone keeps it
    await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme="light" />)
    expect(screen.getByTestId('alt-hero-stones')).toBeTruthy()
  })

  it('pure helpers stay sensible from day 0 past several years', () => {
    expect(tideSummary(0)).toMatch(/to 7 days, 7 days to go$/)
    expect(stonesLayout(0)).toMatchObject({ weeks: 0, total: 26 })
    expect(stonesLayout(400).total % 13).toBe(0)
    expect(stonesSummary(7)).toMatch(/^Stones: 1 stone,/)
    expect(trailPosts(0).posts).toEqual([0, 7])
    expect(trailPosts(163).posts).toEqual([0, 7, 30, 60, 90, 180])
    expect(trailPosts(1200).posts.length).toBe(7)
    expect(trailPosts(1200).next).toBe(1460)
    expect(trailSummary(1)).toMatch(/7 days post, 6 days away$/)
  })
})
