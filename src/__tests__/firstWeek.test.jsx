import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { loadActiveWalk } from '../lib/walkStorage.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0 } from './helpers.js'

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers() })
const DAY = 86400000
const daysIn = (n) => memoryStorage({ ...habitsSeed(), ...onboardedProfile({ onboardedAt: new Date(T0 - n * DAY).toISOString() }) })
const renderApp = async (storage, device = stubDevice()) => { await render(<AppRoot storage={storage} device={device} clock={fakeClock()} />); return { storage, device } }

describe('first-week shoreline path', () => {
  it('existing users (setup more than a week ago) never see it', async () => {
    await renderApp(memoryStorage({ ...habitsSeed(), ...onboardedProfile() }))
    expect(screen.queryByTestId('first-week')).toBeNull()
    expect(screen.queryByTestId('first-week-complete')).toBeNull()
  })
  it('six dots; today’s step deep-links to its feature; no reason step', async () => {
    await renderApp(daysIn(3))
    expect(screen.getByTestId('first-week')).toBeTruthy()
    expect(screen.getByLabelText('Day 4 of 7. 1 of 6 steps done.')).toBeTruthy()
    expect(screen.queryByTestId('first-week-dot-reason-open', { includeHiddenElements: true })).toBeNull()
    expect(screen.queryByText(/Add one reason/)).toBeNull()
    expect(screen.getByTestId('first-week-dot-start-done', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByTestId('first-week-dot-map-later', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByTestId('first-week-step-breathe')).toHaveTextContent(/Try Breathe once.*Optional\./)
    await fireEvent.press(screen.getByTestId('first-week-go'))
    expect(screen.getByTestId('breathe')).toBeTruthy()
  })
  it('Skip Breathe, then contact opens Trusted contacts', async () => {
    await renderApp(daysIn(3))
    await fireEvent.press(screen.getByTestId('first-week-skip'))
    expect(screen.getByTestId('first-week-dot-breathe-skipped', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByTestId('first-week-step-contact')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('first-week-go'))
    expect(screen.getByTestId('contacts-sheet')).toBeTruthy()
  })
  it('the walk step starts a 5-minute walk', async () => {
    const storage = daysIn(5) // 'reason' below is an old ID from the seven-step path
    storage.setItem('urgewalk.v1.firstWeek', JSON.stringify({ shown: true, skipped: ['reason', 'breathe', 'contact'] }))
    await renderApp(storage)
    expect(screen.getByTestId('first-week-step-walk')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('first-week-go'))
    expect(loadActiveWalk(storage).plannedMinutes).toBe(5)
  })
  it('after day 7: one calm complete note, then gone for good', async () => {
    const storage = daysIn(8)
    storage.setItem('urgewalk.v1.firstWeek', JSON.stringify({ shown: true, skipped: [] }))
    await renderApp(storage)
    expect(screen.getByTestId('first-week-complete')).toHaveTextContent(/Your setup is complete/)
    await act(async () => { fireEvent.press(screen.getByTestId('first-week-ok')) })
    expect(screen.queryByTestId('first-week-complete')).toBeNull()
  })
})
