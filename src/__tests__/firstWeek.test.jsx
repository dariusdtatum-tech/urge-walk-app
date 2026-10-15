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
  it('seven dots; today’s step deep-links to its feature', async () => {
    await renderApp(daysIn(3))
    expect(screen.getByTestId('first-week')).toBeTruthy()
    expect(screen.getByLabelText('Day 4 of 7. 1 of 7 steps done.')).toBeTruthy()
    expect(screen.getByTestId('first-week-dot-start-done', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByTestId('first-week-dot-walk-later', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByTestId('first-week-step-reason')).toHaveTextContent(/Add one reason.*Optional\./)
    await fireEvent.press(screen.getByTestId('first-week-go'))
    expect(screen.getByTestId('reasons-sheet')).toBeTruthy()
  })
  it('Skip, then Breathe opens Breathe; contact opens Trusted contacts', async () => {
    await renderApp(daysIn(3))
    await fireEvent.press(screen.getByTestId('first-week-skip'))
    expect(screen.getByTestId('first-week-dot-reason-skipped', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByTestId('first-week-step-breathe')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('first-week-go'))
    expect(screen.getByTestId('breathe')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('breathe-cancel'))
    await fireEvent.press(screen.getByTestId('first-week-skip'))
    await fireEvent.press(screen.getByTestId('first-week-go'))
    expect(screen.getByTestId('contacts-sheet')).toBeTruthy()
  })
  it('the walk step starts a 5-minute walk', async () => {
    const storage = daysIn(5)
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
