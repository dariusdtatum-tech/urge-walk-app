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
