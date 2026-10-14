import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { loadWalks } from '../lib/walkStorage.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, T0 } from './helpers.js'

const renderApp = async (opts = {}) => {
  const storage = opts.storage ?? memoryStorage({ ...habitsSeed(), ...onboardedProfile() })
  const device = opts.device ?? stubDevice()
  const clock = opts.clock ?? fakeClock()
  await render(<AppRoot storage={storage} device={device} clock={clock} />)
  return { storage, device, clock }
}
const press = (id) => fireEvent.press(screen.getByTestId(id))
const tab = (name) => fireEvent.press(screen.getByRole('tab', { name }))
async function logUrge() {
  await press('ride-button')
  await press('ride-log')
  await press('log-save')
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

describe('idea 6: how did it go? follow-up', () => {
  it('each urge gets one follow-up, keyed to its entry', async () => {
    const { storage, device } = await renderApp()
    await logUrge()
    await logUrge()
    const ids = loadWalks(storage).walks.map((w) => w.id)
    expect(device.calls.followUps).toEqual(ids)
  })
  it('leaving partway through a walk schedules it once; saving later doesn’t add a second', async () => {
    const handlers = new Set()
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, f) => { handlers.add(f); return { remove() { handlers.delete(f) } } })
    const onChange = (st) => handlers.forEach((f) => f(st))
    const { device, storage, clock } = await renderApp()
    await press('ride-button')
    await press('ride-walk')
    await act(async () => { onChange('background') })
    expect(device.calls.followUps).toHaveLength(1)
    await act(async () => { onChange('active') })
    await act(async () => { onChange('background') })
    expect(device.calls.followUps).toHaveLength(1)
    clock.advance(60 * 60 * 1000)
    await act(async () => { jest.advanceTimersByTime(1100) })
    await press('save')
    expect(device.calls.followUps).toEqual([loadWalks(storage).walks[0].id])
  })
  it('tapping the notification opens a calm sheet; the answer is saved to that entry', async () => {
    const { storage, device } = await renderApp()
    await logUrge()
    const id = loadWalks(storage).walks[0].id
    await act(async () => { device.emitFollowUp({ urgeId: id, action: 'open' }) })
    expect(screen.getByTestId('followup-sheet')).toHaveTextContent(/How’s it going/)
    await press('followup-passed')
    expect(loadWalks(storage).walks[0].followUp).toBe('passed')
    expect(screen.queryByTestId('followup-sheet')).toBeNull()
  })
  it('“Still tough” (action button) reopens Ride it out; “Skip” just records it', async () => {
    const { storage, device } = await renderApp()
    await logUrge()
    const id = loadWalks(storage).walks[0].id
    await act(async () => { device.emitFollowUp({ urgeId: id, action: 'tough' }) })
    expect(loadWalks(storage).walks[0].followUp).toBe('tough')
    expect(screen.getByTestId('ride-walk')).toBeTruthy()
    await act(async () => { device.emitFollowUp({ urgeId: id, action: 'skip' }) })
    expect(loadWalks(storage).walks[0].followUp).toBe('skip')
  })
  it('can be switched off in You (cancels anything pending)', async () => {
    const { device } = await renderApp()
    await tab('You')
    expect(screen.getByTestId('followup-toggle').props.value).toBe(true)
    await fireEvent(screen.getByTestId('followup-toggle'), 'valueChange', false)
    expect(device.calls.followUpCancels).toBe(1)
    await tab('Home')
    await logUrge()
    expect(device.calls.followUps).toEqual([])
  })
})

describe('idea 9: daily check-in', () => {
  it('from Home: Steady + one word + a 3-second hold, then the daily line; Home shows one quiet line', async () => {
    const { storage, device } = await renderApp()
    await press('checkin-card')
    expect(screen.getByTestId('checkin-save').props.accessibilityState.disabled).toBe(true)
    await press('mood-steady')
    await fireEvent.changeText(screen.getByTestId('checkin-word'), 'grateful today')
    // letting go before 3 seconds does nothing
    await fireEvent(screen.getByTestId('checkin-hold'), 'pressIn')
    await act(async () => { jest.advanceTimersByTime(2500) })
    await fireEvent(screen.getByTestId('checkin-hold'), 'pressOut')
    expect(screen.getByTestId('checkin-hold').props.accessibilityLabel).toBe('Hold to commit to today. Hold for 3 seconds.')
    expect(device.calls.tap).toBe(0)
    await fireEvent(screen.getByTestId('checkin-hold'), 'pressIn')
    await act(async () => { jest.advanceTimersByTime(3100) })
    expect(screen.getByTestId('checkin-hold').props.accessibilityLabel).toBe('Committed to today')
    expect(device.calls.tap).toBe(1) // one light haptic
    await press('checkin-save')
    expect(screen.getByTestId('checkin-line')).toHaveTextContent(/Today’s line/)
    await press('checkin-close')
    const day = JSON.parse(storage.getItem('urgewalk.v1.checkins')).days['2030-05-14']
    expect(day).toMatchObject({ mood: 'steady', word: 'grateful', committed: true })
    expect(screen.queryByTestId('checkin-card')).toBeNull()
    expect(screen.getByTestId('checkin-done')).toHaveTextContent('Checked in today · Steady · grateful · committed')
  })
  it('the hold has a screen-reader action instead of a timed press', async () => {
    await renderApp()
    await press('checkin-card')
    await fireEvent(screen.getByTestId('checkin-hold'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })
    expect(screen.getByTestId('checkin-hold').props.accessibilityLabel).toBe('Committed to today')
  })
  it('Rough quietly offers Ride it out right away (and keeps the check-in)', async () => {
    const { storage } = await renderApp()
    await press('checkin-card')
    expect(screen.queryByTestId('checkin-rough')).toBeNull()
    await press('mood-rough')
    expect(screen.getByTestId('checkin-rough')).toHaveTextContent(/Want to ride it out now/)
    await press('checkin-ride')
    expect(screen.getByTestId('ride-walk')).toBeTruthy()
    expect(JSON.parse(storage.getItem('urgewalk.v1.checkins')).days['2030-05-14'].mood).toBe('rough')
  })
  it('missed days show nothing: no streak, no gap, no red', async () => {
    const seed = { ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.checkins': JSON.stringify({ version: 1, days: { '2030-05-10': { mood: 'steady', at: 1 } } }) }
    await renderApp({ storage: memoryStorage(seed) })
    expect(screen.getByTestId('checkin-card')).toHaveTextContent(/Daily check-in/)
    expect(screen.queryByText(/missed|check-in streak|broke|days in a row/i)).toBeNull()
  })
  it('optional daily reminder in You (off by default, 15-minute steps); tapping it opens the check-in', async () => {
    const { device } = await renderApp()
    await tab('You')
    expect(screen.getByTestId('checkin-reminder').props.value).toBe(false)
    await fireEvent(screen.getByTestId('checkin-reminder'), 'valueChange', true)
    await press('checkin-time-more')
    expect(device.calls.reminders).toEqual([{ hour: 8, minute: 30 }, { hour: 8, minute: 45 }])
    await fireEvent(screen.getByTestId('checkin-reminder'), 'valueChange', false)
    expect(device.calls.reminders.at(-1)).toBe(null)
    await act(async () => { device.emitCheckinReminder() })
    expect(screen.getByTestId('checkin-sheet')).toBeTruthy()
  })
})

describe('idea 18: trusted contacts', () => {
  test('988 row is always visible in Ride it out, even with no contacts', async () => {
    const { device } = await renderApp()
    await press('ride-button')
    expect(screen.getByTestId('ride-reach-988')).toBeTruthy()
    await press('ride-reach-988-call')
    expect(device.calls.urls).toContain('tel:988')
    expect(device.calls.texts).toHaveLength(0)
  })

  test('add up to 3 people; Text opens the composer with the message, nothing auto-sends', async () => {
    const picked = { name: 'Alex Test', phone: '5550001111' }
    const { device } = await renderApp({ device: stubDevice({ picked }) })
    await tab('You')
    await press('contacts-row')
    await press('contact-pick')
    expect(screen.getByTestId('contact-name').props.value).toBe('Alex Test')
    await press('contact-save')
    await press('contact-add')
    await fireEvent.changeText(screen.getByTestId('contact-name'), 'Jo')
    await fireEvent.changeText(screen.getByTestId('contact-phone'), '12')
    await press('contact-save')
    expect(screen.getByTestId('contact-error')).toBeTruthy()
    await fireEvent.changeText(screen.getByTestId('contact-phone'), '555 000 2222')
    await press('contact-save')
    await press('message-1')
    expect(screen.getByTestId('contact-1')).toBeTruthy()
    await press('contact-add')
    await fireEvent.changeText(screen.getByTestId('contact-name'), 'Kim')
    await fireEvent.changeText(screen.getByTestId('contact-phone'), '5550003333')
    await press('contact-save')
    expect(screen.queryByTestId('contact-pick')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }))
    expect(device.calls.texts).toHaveLength(0)
    await press('you-reach-text-0')
    expect(device.calls.texts).toHaveLength(1)
    expect(device.calls.texts[0].phone).toBe('5550001111')
    expect(device.calls.texts[0].message.length).toBeGreaterThan(0)
    await press('you-reach-call-1')
    expect(device.calls.urls).toContain('tel:5550002222')
  })

  test('remove a contact', async () => {
    await renderApp({ storage: memoryStorage({ ...habitsSeed(), ...onboardedProfile({ support: 'trusted', trustedName: 'Sam', trustedPhone: '5551234567' }) }) })
    await tab('You')
    await press('contacts-row')
    await press('contact-remove-0')
    expect(screen.queryByTestId('contact-0')).toBeNull()
  })
})
