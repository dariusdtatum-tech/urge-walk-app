// Reset with App lock ON (Darius's iPhone, Oct 16). The iOS share sheet makes the app 'inactive'.
// With the lock on, 'inactive' used to mount LockCover, a full-screen native Modal, on top of the
// share sheet: iOS can't present it there, the share never completes, and Reset stays stuck.
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Alert, AppState } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice, youEl } from './helpers.js'

const lockedOn = () => memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.appLock': JSON.stringify({ enabled: true }) })
function spyAppState() {
  const handlers = new Set()
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, f) => { handlers.add(f); return { remove() { handlers.delete(f) } } })
  return (st) => handlers.forEach((f) => f(st))
}
// Native alerts: answer each Alert.alert with the button whose text matches, in order.
function answerAlerts(...answers) {
  const seen = []
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    seen.push(title)
    const want = answers.shift()
    const b = buttons.find((x) => x.text === want)
    if (!b) throw new Error(`no button ${want} in ${title}`)
    setTimeout(() => b.onPress?.(), 0)
  })
  return seen
}
afterEach(() => jest.restoreAllMocks())

async function openApp(device, storage = lockedOn()) {
  await render(<AppRoot storage={storage} device={device} clock={fakeClock()} scheme="light" />)
  await act(async () => {}) // cold-start unlock
  return storage
}
const tapReset = async () => {
  await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
  await fireEvent.press(await youEl(screen, fireEvent, 'reset-app'))
  await act(async () => { await new Promise((r) => setTimeout(r, 5)) })
}

test('App lock ON: the share sheet (app inactive) never mounts the lock Modal, and Reset reaches onboarding', async () => {
  const emit = spyAppState()
  let coverDuringShare = null
  const device = stubDevice()
  device.saveResetBackup = async (text) => {
    device.calls.shared.push({ text })
    emit('inactive') // share sheet up
    await new Promise((r) => setTimeout(r, 0)) // let React render what 'inactive' does
    coverDuringShare = screen.queryByTestId('lock-cover', { includeHiddenElements: true })
    emit('active') // share sheet closed
    return { uri: 'file:///docs/Backups/b.json', shared: 'shared' }
  }
  const seen = answerAlerts('Save backup and reset', 'Erase and start again')
  const storage = await openApp(device)
  await tapReset()
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
  expect(seen).toEqual(['Reset Urge Walk?', 'Backup saved'])
  expect(coverDuringShare).toBeNull()
  expect([...storage._map.keys()].filter((k) => k.startsWith('urgewalk.'))).toEqual([])
  expect(screen.getByTestId('ob-begin')).toBeTruthy()
})

test('a real trip to the background still covers and locks', async () => {
  const emit = spyAppState()
  const device = stubDevice()
  await openApp(device)
  await act(async () => { emit('inactive') })
  expect(screen.getByTestId('lock-cover')).toBeTruthy() // app switcher: privacy cover
  await act(async () => { emit('background') })
  expect(screen.getByTestId('lock-cover')).toBeTruthy()
  const before = device.calls.appAuths
  await act(async () => { emit('active') })
  expect(device.calls.appAuths).toBe(before + 1) // back from the background: asks for Face ID again
})

test('Keep my data: nothing saved or erased, and Reset opens again right away', async () => {
  const seen = answerAlerts('Keep my data', 'Keep my data')
  const device = stubDevice()
  const storage = await openApp(device, memoryStorage({ ...habitsSeed(), ...onboardedProfile() }))
  await tapReset()
  expect(device.calls.shared).toHaveLength(0)
  await fireEvent.press(screen.getByTestId('reset-app'))
  await act(async () => { await new Promise((r) => setTimeout(r, 5)) })
  expect(seen).toEqual(['Reset Urge Walk?', 'Reset Urge Walk?'])
  expect(storage.getItem('urgewalk.v1.habits')).not.toBeNull()
})

test('backup fails: nothing erased, a calm alert, a visible status line with the error, and Reset still works after', async () => {
  const seen = answerAlerts('Save backup and reset', 'Keep my data', 'Keep my data')
  const storage = await openApp(stubDevice({ resetSave: new Error('disk full') }), memoryStorage({ ...habitsSeed(), ...onboardedProfile() }))
  await tapReset()
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
  expect(seen).toEqual(['Reset Urge Walk?', 'Backup not saved'])
  expect(storage.getItem('urgewalk.v1.habits')).not.toBeNull()
  expect(screen.getByTestId('reset-status')).toHaveTextContent(/Nothing was erased.*disk full/)
  await fireEvent.press(screen.getByTestId('reset-app'))
  await act(async () => { await new Promise((r) => setTimeout(r, 5)) })
  expect(seen.at(-1)).toBe('Reset Urge Walk?')
})

test('a share that never returns does not leave Reset stuck: tapping Reset again asks again', async () => {
  const seen = answerAlerts('Save backup and reset', 'Keep my data')
  const device = stubDevice()
  device.saveResetBackup = () => new Promise(() => {}) // hangs forever
  await openApp(device, memoryStorage({ ...habitsSeed(), ...onboardedProfile() }))
  await tapReset()
  expect(screen.getByTestId('reset-status')).toHaveTextContent(/Saving a backup/)
  await fireEvent.press(screen.getByTestId('reset-app'))
  await act(async () => { await new Promise((r) => setTimeout(r, 5)) })
  expect(seen).toEqual(['Reset Urge Walk?', 'Reset Urge Walk?'])
})
