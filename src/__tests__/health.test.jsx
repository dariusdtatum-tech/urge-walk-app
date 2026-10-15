import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { CHECKIN_PREFS_KEY } from '../lib/checkin.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0, youEl } from './helpers.js'

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

describe('notification budget and preview', () => {
  const plain = () => memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.followUpPrefs': JSON.stringify({ enabled: true }) })
  it('You > Notifications previews the words with a switch each; switches stay in sync with You', async () => {
    const storage = plain()
    const device = stubDevice()
    await renderApp(storage, device)
    await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
    await fireEvent.press((await youEl(screen, fireEvent, 'notify-row')))
    expect(screen.getByTestId('notify-budget')).toHaveTextContent(/At most one a day.*none from 10 PM to 8 AM/)
    expect(screen.getByTestId('notify-followUp-preview')).toHaveTextContent(/Checking in.*How’s it going\?/)
    expect(screen.getByTestId('notify-walkAlert-preview')).toHaveTextContent(/Walk done/)
    expect(screen.queryByTestId('notify-checkin-preview')).toBeNull()
    await fireEvent(screen.getByTestId('notify-checkin-toggle'), 'valueChange', true)
    expect(screen.getByTestId('notify-checkin-preview')).toHaveTextContent(/Morning check-in/)
    expect(device.calls.reminders).toContainEqual({ hour: 8, minute: 30 })
    await fireEvent(screen.getByTestId('notify-followUp-toggle'), 'valueChange', false)
    await fireEvent(screen.getByTestId('notify-walkAlert-toggle'), 'valueChange', false)
    await fireEvent.press(screen.getByTestId('notify-sheet-backdrop'))
    expect((await youEl(screen, fireEvent, 'followup-toggle')).props.value).toBe(false)
    expect((await youEl(screen, fireEvent, 'checkin-reminder')).props.value).toBe(true)
  })
  it('no follow-up in quiet hours', async () => {
    const storage = plain()
    const device = stubDevice()
    await render(<AppRoot storage={storage} device={device} clock={fakeClock(T0 + 12 * 3600000)} />) // 22:00 New York
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-log'))
    await fireEvent.press(screen.getByTestId('log-save'))
    expect(device.calls.followUps).toEqual([])
  })
  it('walk timer alert switched off: a timed walk schedules no alert', async () => {
    const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.notifyPrefs': JSON.stringify({ walkAlert: false }) })
    const device = stubDevice()
    await renderApp(storage, device)
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-walk'))
    expect(device.calls.alerts.length).toBeGreaterThan(0)
    expect(device.calls.alerts.every((a) => a.walk === null)).toBe(true)
  })
})
