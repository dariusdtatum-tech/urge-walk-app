// Coastal sound and scenes (relay #3): sound off by default, one toggle, a sound picker and a timer,
// sessions play the chosen sound, Home's sound button. The player is a fake; no audio in tests.
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { HERO_PREFS_KEY } from '../lib/heroStyle.js'
import { SCENE_PREFS_KEY } from '../lib/scenePrefs.js'
import { fakeClock, habitsSeed, memoryStorage, onboardedProfile, stubDevice } from './helpers.js'

function fakeAudio() {
  const log = []
  const make = jest.fn((id) => ({ play: () => log.push(`play:${id}`), pause: () => log.push('pause'), setVolume: () => {}, remove: () => log.push('remove') }))
  return { log, make }
}
const renderApp = async (extra = {}) => {
  const audio = fakeAudio()
  const storage = memoryStorage({ ...onboardedProfile(), ...habitsSeed(), ...extra })
  const device = { ...stubDevice(), makeAmbientPlayer: audio.make }
  const r = await render(<AppRoot storage={storage} device={device} clock={fakeClock()} scheme="light" />)
  return { storage, audio, ...r }
}
const prefs = (p) => ({ [SCENE_PREFS_KEY]: JSON.stringify(p) })
const openAppearance = async () => {
  await act(async () => { fireEvent.press(screen.getByRole('tab', { name: 'You' })) })
  await act(async () => { fireEvent.press(screen.getByTestId('you-appearance')) })
}

describe('coastal sound', () => {
  it('is off by default: no sound button, nothing plays in Breathe', async () => {
    const { audio } = await renderApp()
    expect(screen.queryByTestId('sound-button')).toBeNull()
    await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
    await act(async () => { fireEvent.press(screen.getByTestId('ride-breathe')) })
    expect(audio.make).not.toHaveBeenCalled()
  })

  it('one toggle turns it on; the sound picker and timer appear and are saved', async () => {
    const { storage } = await renderApp({ [HERO_PREFS_KEY]: JSON.stringify({ style: 'stones' }) })
    await openAppearance()
    expect(screen.queryByTestId('scene-sound-id')).toBeNull()
    expect(screen.getByText(/^Shore waves during Walk, Breathe and Ground/)).toBeTruthy()
    await act(async () => { fireEvent(screen.getByTestId('scene-sound'), 'valueChange', true) })
    await act(async () => { fireEvent.press(screen.getByTestId('scene-sound-id-rain')) })
    await act(async () => { fireEvent.press(screen.getByTestId('scene-timer-walk')) })
    expect(JSON.parse(storage.getItem(SCENE_PREFS_KEY))).toMatchObject({ sound: true, soundId: 'rain', timer: 'walk' })
    expect(screen.getByTestId('scene-timer-walk').props.accessibilityState).toEqual({ checked: true })
  })

  jest.setTimeout(15000)
  it('when on, Breathe plays the paired sound and leaving stops it', async () => {
    const { audio } = await renderApp({ ...prefs({ sound: true }), [HERO_PREFS_KEY]: JSON.stringify({ style: 'trail' }) })
    await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
    await act(async () => { fireEvent.press(screen.getByTestId('ride-breathe')) })
    expect(audio.log).toEqual(['play:wind'])
    await act(async () => { fireEvent.press(screen.getByTestId('breathe-cancel')) })
    await act(async () => { await new Promise((r) => setTimeout(r, 3300)) })
    expect(audio.log).toEqual(['play:wind', 'pause', 'remove'])
  })

  it('Home shows one sound button with the ring\'s soft rain', async () => {
    const { audio } = await renderApp(prefs({ sound: true }))
    const b = screen.getByTestId('sound-button')
    expect(b.props.accessibilityLabel).toBe('Play soft rain')
    await act(async () => { fireEvent.press(b) })
    expect(audio.log).toEqual(['play:rain'])
    expect(screen.getByTestId('sound-button').props.accessibilityLabel).toBe('Pause soft rain')
  })
})

const allText = () => screen.getAllByText(/./, { includeHiddenElements: true }).map((n) => [].concat(n.props.children).filter((x) => typeof x === 'string' || typeof x === 'number').join('')).join(' | ')
describe('Ride it out uses your scene', () => {
  for (const tool of ['breathe', 'ground', 'walk']) {
    it(`${tool} shows the dimmed scene behind it, hidden from VoiceOver`, async () => {
      await renderApp({ [HERO_PREFS_KEY]: JSON.stringify({ style: 'stones' }) })
      await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
      await act(async () => { fireEvent.press(screen.getByTestId(`ride-${tool}`)) })
      const b = screen.getByTestId('scene-backdrop', { includeHiddenElements: true })
      expect(b.props.accessibilityElementsHidden).toBe(true)
      expect(b.props.pointerEvents).toBe('none')
      expect([].concat(b.props.style).find((x) => x?.opacity)?.opacity).toBeLessThanOrEqual(0.3)
      expect(screen.queryByTestId('scene-backdrop')).toBeNull() // not in the accessibility tree
    })
  }
  it('Breathe text never mentions walking', async () => {
    await renderApp({ [HERO_PREFS_KEY]: JSON.stringify({ style: 'tide' }) })
    await act(async () => { fireEvent.press(screen.getByTestId('ride-button')) })
    await act(async () => { fireEvent.press(screen.getByTestId('ride-breathe')) })
    expect(screen.getByTestId('breathe')).toBeTruthy()
    expect(allText()).not.toMatch(/walk/i)
    const { BREATHE_LINES } = require('../lib/encouragement.js')
    for (const l of BREATHE_LINES) expect(l).not.toMatch(/walk/i)
  })
})
