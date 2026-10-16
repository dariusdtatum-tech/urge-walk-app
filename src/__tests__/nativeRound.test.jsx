import { fireEvent, render, screen, within } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { applyBackup, validateBackup } from '../lib/backup.js'
import { loadProfile } from '../lib/profile.js'
import { RIDE_TIP } from '../ui/TabBar.jsx'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0, youEl, YOU_SECTION_OF } from './helpers.js'

const renderApp = async (opts = {}) => {
  const storage = opts.storage ?? memoryStorage({ ...habitsSeed(), ...onboardedProfile() })
  const device = opts.device ?? stubDevice()
  await render(<AppRoot storage={storage} device={device} clock={fakeClock()} />)
  return { storage, device }
}
const press = async (id) => fireEvent.press(YOU_SECTION_OF[id] ? await youEl(screen, fireEvent, id) : screen.getByTestId(id))
async function toStep3() {
  await press('ob-begin')
  await press('ob-adult')
  await press('ob-next')
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers() })

describe('tabs: Home · Track (Log | Journal) · Ride it out · Community · You', () => {
  it('Track switches between Log and Journal', async () => {
    await renderApp()
    await fireEvent.press(screen.getByRole('tab', { name: 'Track' }))
    expect(screen.getByRole('tab', { name: 'Track' }).props.accessibilityState.selected).toBe(true)
    expect(screen.getAllByText('Track').length).toBe(2) // the title and the tab
    expect(screen.getByTestId('track-log').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('log-empty')).toBeTruthy()
    await press('track-journal')
    expect(screen.getByTestId('journal')).toBeTruthy()
    expect(screen.getByTestId('track-journal').props.accessibilityState.checked).toBe(true)
  })
  it('haptics: Light on tap, Medium on hold, Success on save; none on undo', async () => {
    const { device } = await renderApp()
    await press('ride-button')
    expect(device.calls.tap).toBe(1)
    await press('ride-log')
    await press('log-save')
    expect(device.calls.done).toBe(1)
    await press('toast-undo')
    expect(device.calls.done).toBe(1)
    await fireEvent(screen.getByTestId('ride-button'), 'longPress')
    expect(device.calls.press).toBe(1)
  })
})

describe('Community (before launch)', () => {
  it('Coming soon, 18+ rules, a local notify switch and today’s line. No feed, no network', async () => {
    const { storage, device } = await renderApp()
    await fireEvent.press(screen.getByRole('tab', { name: 'Community' }))
    expect(screen.getByTestId('community-soon')).toHaveTextContent(/Coming soon/)
    expect(screen.getByTestId('community-18')).toHaveTextContent('18+ only')
    const rules = screen.getByTestId('community-rules')
    expect(rules).toHaveTextContent(/Adults only \(18\+\)/)
    expect(rules).toHaveTextContent(/Sobriety-focused/)
    expect(rules).toHaveTextContent(/Zero tolerance for predatory behavior/)
    expect(screen.getByTestId('community-line')).toHaveTextContent(/Today’s line/)
    expect(screen.queryByTestId('community-feed')).toBeNull()
    expect(screen.getByTestId('community-notify').props.value).toBe(false)
    await fireEvent(screen.getByTestId('community-notify'), 'valueChange', true)
    expect(JSON.parse(storage.getItem('urgewalk.v1.communityNotify')).on).toBe(true)
    expect(device.calls.urls).toEqual([])
    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }))
    await fireEvent.press(screen.getByRole('tab', { name: 'Community' }))
    expect(screen.getByTestId('community-notify').props.value).toBe(true)
  })
})

describe('Onboarding: riding out and more of', () => {
  it('riding out is grouped and searchable', async () => {
    await renderApp({ storage: memoryStorage() })
    await toStep3()
    expect(within(screen.getByTestId('riding-group-substances')).getByTestId('pick-Benzos')).toBeTruthy()
    expect(within(screen.getByTestId('riding-group-behaviors')).getByTestId('pick-Doomscrolling')).toBeTruthy()
    expect(screen.getByTestId('riding-other')).toBeTruthy()
    await fireEvent.changeText(screen.getByTestId('riding-search'), 'kra')
    expect(screen.getByTestId('pick-Kratom')).toBeTruthy()
    expect(screen.queryByTestId('pick-Alcohol')).toBeNull()
    expect(screen.queryByTestId('riding-group-behaviors')).toBeNull()
    await press('pick-Kratom')
    expect(screen.getByTestId('ob-next')).toHaveTextContent('Continue · 1 selected')
  })
  it('no self-harm preset anywhere in the riding list or its search; picking things never opens a sheet', async () => {
    const { RIDING_GROUPS } = require('../lib/profile.js')
    expect(RIDING_GROUPS.flatMap((g) => g.items).join(' ')).not.toMatch(/self[- ]?harm/i)
    await renderApp({ storage: memoryStorage() })
    await toStep3()
    expect(screen.queryByText(/self[- ]?harm/i)).toBeNull()
    await fireEvent.changeText(screen.getByTestId('riding-search'), 'self')
    expect(screen.queryByText(/self[- ]?harm/i)).toBeNull()
    expect(screen.queryByTestId('crisis-sheet')).toBeNull()
  })
  it('a tracker someone already named "Self-harm urges" still loads, as their own name', async () => {
    await renderApp({ storage: memoryStorage({ ...onboardedProfile(), 'urgewalk.v1.habits': JSON.stringify({ habits: [{ id: 'h1', name: 'Self-harm urges', startDate: '2030-05-01' }] }) }) })
    expect(screen.getByTestId('home-title')).toHaveTextContent(/Self-harm urges/)
    expect(screen.getByTestId('hero-days')).toBeTruthy()
  })
  it('More of title: a hair space keeps the ? clear of the f, and screen readers hear the plain title', async () => {
    await renderApp({ storage: memoryStorage() })
    await toStep3()
    await press('pick-Alcohol')
    await press('ob-next'); await press('ob-skip'); await press('ob-skip')
    const t = screen.getByTestId('ob-title')
    expect(t.props.children).toBe('What do you want more of\u200A?')
    expect(t.props.accessibilityLabel).toBe('What do you want more of?')
    expect(screen.getByRole('header', { name: 'What do you want more of?' })).toBeTruthy()
  })
  it('more of is grouped Body / Mind / Life / Your own, saved, then the Ride it out tip shows once', async () => {
    const { storage } = await renderApp({ storage: memoryStorage() })
    await toStep3()
    await press('pick-Alcohol')
    await press('ob-next')
    await press('ob-skip') // date
    await press('ob-skip') // before
    for (const g of ['body', 'mind', 'life']) expect(screen.getByTestId(`improve-group-${g}`)).toBeTruthy()
    await press('improve-sleep')
    await press('improve-calm')
    await press('improve-family')
    await press('improve-own-add')
    await fireEvent.changeText(screen.getByTestId('improve-own'), 'Early mornings')
    expect(screen.getByTestId('ob-improve-count')).toHaveTextContent('4 selected')
    expect(screen.getByTestId('ob-next')).toHaveTextContent('Continue · 4 selected')
    await press('ob-next')
    for (let i = 0; i < 4; i += 1) await press('ob-skip')
    expect(screen.getByTestId('recap-7')).toHaveTextContent(/Sleep · Calm · Time with family · Early mornings/)
    await press('ob-finish')
    expect(loadProfile(storage)).toMatchObject({ improve: ['sleep', 'calm', 'family'], improveOwn: 'Early mornings' })
    expect(screen.getByTestId('ride-coachmark')).toHaveTextContent(RIDE_TIP, { exact: false })
    await press('coachmark-scrim') // tapping anywhere dismisses
    expect(screen.queryByTestId('ride-coachmark')).toBeNull()
    expect(JSON.parse(storage.getItem('urgewalk.v1.longPressTipSeen')).coachmarkDone).toBe(true)
  })
})

describe('backup format 1 still works', () => {
  it('old "more of" answers in a PWA file map to the new chips and show in You', async () => {
    const file = {
      app: 'urge-walk', format: 1, exportedAt: '2030-05-01T12:00:00.000Z',
      data: { habits: [{ id: 'h1', name: 'Habit A', startDate: '2030-01-01' }], walks: [], journal: [],
        profile: { version: 1, onboardedAt: '2030-01-10T14:00:00.000Z', adultConfirmed: true, improve: ['proud', 'relationships', 'health'] } },
    }
    const storage = memoryStorage()
    const v = validateBackup(JSON.stringify(file))
    expect(v.ok).toBe(true)
    applyBackup(v.backup, storage)
    expect(loadProfile(storage).improve).toEqual(['confidence', 'family', 'energy'])
    await renderApp({ storage })
    await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
    await press('answers-toggle')
    expect(screen.getByTestId('answer-improve')).toHaveTextContent(/Confidence · Time with family · Energy/)
  })
})
