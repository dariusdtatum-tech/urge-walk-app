import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { CHECKIN_PREFS_KEY } from '../lib/checkin.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0 } from './helpers.js'

jest.mock('../screens/CommunityScreen.jsx', () => ({
  CommunityScreen: () => { throw new Error('boom') },
}))

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
const withReminder = () => memoryStorage({ ...habitsSeed(), ...onboardedProfile(), [CHECKIN_PREFS_KEY]: JSON.stringify({ reminder: { hour: 20, minute: 0 } }) })
const renderApp = async (storage, device) => { await render(<AppRoot storage={storage} device={device} clock={fakeClock()} />); await act(async () => {}) }

describe('launch self-check', () => {
  it('a missing check-in reminder is rescheduled quietly, with no row', async () => {
    const device = stubDevice({ notif: { permission: 'granted', scheduled: [] } })
    await renderApp(withReminder(), device)
    expect(device.calls.reminders).toEqual([{ hour: 20, minute: 0 }])
    await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
    expect(screen.queryByTestId('health-notifications')).toBeNull()
  })
  it('all scheduled: nothing changes', async () => {
    const device = stubDevice({ notif: { permission: 'granted', scheduled: ['urgewalk-checkin'] } })
    await renderApp(withReminder(), device)
    expect(device.calls.reminders).toEqual([])
  })
  it('notifications off in Settings: one calm row in You that opens Settings; no alert', async () => {
    const device = stubDevice({ notif: { permission: 'denied', scheduled: [] } })
    await renderApp(withReminder(), device)
    expect(device.calls.alerts).toEqual([])
    await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
    expect(screen.getByTestId('health-notifications')).toHaveTextContent(/Reminders are off in Settings/)
    await fireEvent.press(screen.getByTestId('health-notifications'))
    expect(device.calls.settings).toBe(1)
  })
})

describe('error boundary', () => {
  it('a crashing screen shows a calm fallback; Ride it out still works; Go home recovers', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await renderApp(memoryStorage({ ...habitsSeed(), ...onboardedProfile() }), stubDevice())
    await fireEvent.press(screen.getByRole('tab', { name: 'Community' }))
    expect(screen.getByTestId('screen-error')).toHaveTextContent(/Something went wrong on this screen\.Your data is safe\.|Something went wrong on this screen\. ?Your data is safe\./)
    expect(screen.getByTestId('ride-button')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('screen-error-home'))
    expect(screen.getByTestId('home')).toBeTruthy()
  })
})
