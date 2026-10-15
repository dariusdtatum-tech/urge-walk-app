import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { AppRoot } from '../AppRoot.jsx'
import { buildBackup } from '../lib/backup.js'
import { BREATHE_LINES } from '../lib/encouragement.js'
import { loadActiveWalk, loadWalks } from '../lib/walkStorage.js'
import { createSqliteStorage } from '../storage/sqliteStorage.js'
import { openTestDatabase } from '../storage/sqlJsShim.js'
import { MAX_SCALE } from '../ui/theme.js'
import { fakeClock, habitsSeed, memoryStorage, stubDevice, T0 } from './helpers.js'

const renderApp = async (opts = {}) => {
  const storage = opts.storage ?? memoryStorage(habitsSeed())
  const device = opts.device ?? stubDevice()
  const clock = opts.clock ?? fakeClock()
  await render(<AppRoot storage={storage} device={device} clock={clock} scheme={opts.scheme ?? 'light'} />)
  return { storage, device, clock }
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers() })

describe('Home', () => {
  it('shows the Ride it out bar, the day ring and the next milestone', async () => {
    await renderApp()
    expect(screen.getByTestId('ride-bar')).toBeTruthy()
    expect(screen.getByTestId('hero-days').props.children).toBe('163')
    expect(screen.getByLabelText('163 days clean')).toBeTruthy()
    expect(screen.getByText(/to 6 months/)).toBeTruthy()
  })
  it('empty state (set up, no tracker): one sentence, add a start date, or restore', async () => {
    const storage = memoryStorage({ 'urgewalk.v1.profile': JSON.stringify({ version: 1, onboardedAt: '2030-05-01T12:00:00.000Z', skipped: false }) })
    await renderApp({ storage })
    expect(screen.getByText('Add your start date to begin counting.')).toBeTruthy()
    expect(screen.getByTestId('empty-restore')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('add-start-date'))
    await fireEvent.changeText(screen.getByTestId('habit-name'), 'Habit B')
    await fireEvent.press(screen.getByTestId('habit-save'))
    expect(screen.getByTestId('hero-days').props.children).toBe('0')
    expect(JSON.parse(storage.getItem('urgewalk.v1.habits')).habits[0].name).toBe('Habit B')
  })
  it('Home · Track · Ride it out · Community · You, all labelled', async () => {
    await renderApp()
    for (const t of ['Home', 'Track', 'Community', 'You']) expect(screen.getByRole('tab', { name: t })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ride it out' })).toBeTruthy()
  })
})

describe('Ride it out sheet', () => {
  it('Walk / Breathe / Just log it, and the tip names the Ride it out button', async () => {
    await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    expect(screen.getByTestId('ride-walk')).toBeTruthy()
    expect(screen.getByTestId('ride-breathe')).toBeTruthy()
    expect(screen.getByTestId('ride-log')).toBeTruthy()
    const tip = screen.getByTestId('ride-tip').props.children
    expect(tip).toMatch(/Ride it out button/)
    expect(tip).not.toMatch(/wave/i)
  })
  it('Just log it: Passed by default, can pick Didn’t, saves with Undo', async () => {
    const { storage } = await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-log'))
    expect(screen.getByTestId('log-result-yes').props.accessibilityState.checked).toBe(true)
    await fireEvent.press(screen.getByTestId('log-result-no'))
    await fireEvent.press(screen.getByTestId('log-save'))
    expect(loadWalks(storage).walks.map((w) => [w.kind, w.result])).toEqual([['logged', 'no']])
    expect(screen.getByText('Saved. An honest log still counts.')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('toast-undo'))
    expect(loadWalks(storage).walks).toHaveLength(0)
  })
  it('Back with a typed note asks first; Discard returns to the choices (sheet stays open)', async () => {
    await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-log'))
    await fireEvent.changeText(screen.getByTestId('note'), 'a note')
    await fireEvent.press(screen.getByTestId('log-back'))
    expect(screen.getByText('Discard this note?')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(screen.getByTestId('ride-walk')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('ride-log'))
    expect(screen.getByTestId('note').props.value).toBe('')
  })
  it('closing with a typed note asks; Discard closes the sheet', async () => {
    await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-log'))
    await fireEvent.changeText(screen.getByTestId('note'), 'a note')
    await fireEvent.press(screen.getByTestId('ride-backdrop'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(screen.queryByTestId('ride-sheet')).toBeNull()
  })
})

describe('Walk', () => {
  it('Walk starts a timed walk at the remembered length and schedules the end alert', async () => {
    const { device, storage } = await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-walk'))
    expect(screen.getByTestId('walk-live')).toBeTruthy()
    expect(screen.getByTestId('countdown').props.children).toBe('10:00')
    const w = loadActiveWalk(storage)
    expect(w.plannedMinutes).toBe(10)
    expect(device.calls.alerts.at(-1).walk.id).toBe(w.id)
  })
  it('pause / resume / +5 min re-sync the alert; cancel asks and saves nothing', async () => {
    const { device, storage } = await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-walk'))
    const n = device.calls.alerts.length
    await fireEvent.press(screen.getByTestId('pause'))
    expect(device.calls.alerts.at(-1).walk.pausedAt).not.toBeNull()
    await fireEvent.press(screen.getByTestId('resume'))
    await fireEvent.press(screen.getByTestId('extend'))
    expect(device.calls.alerts.length).toBe(n + 3)
    expect(device.calls.alerts.at(-1).walk.plannedMinutes).toBe(15)
    await fireEvent.press(screen.getByTestId('walk-cancel'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(loadActiveWalk(storage)).toBeNull()
    expect(loadWalks(storage).walks).toHaveLength(0)
    expect(device.calls.alerts.at(-1).walk).toBeNull()
  })
  it('holding the Ride it out button starts a walk with a tip that names the button, then a pointer tip on Home', async () => {
    const { clock } = await renderApp()
    await fireEvent(screen.getByTestId('ride-button'), 'longPress')
    const tip = screen.getByTestId('longpress-tip')
    expect(tip).toBeTruthy()
    expect(screen.getByText(/holding the Ride it out button/)).toBeTruthy()
    expect(screen.queryByText(/wave/i)).toBeNull()
    await fireEvent.press(screen.getByTestId('finish'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    await fireEvent.press(screen.getByTestId('skip'))
    expect(screen.getByTestId('ride-coachmark')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('coachmark-ok'))
    expect(screen.queryByTestId('ride-coachmark')).toBeNull()
    expect(clock()).toBe(T0)
  })
  it('the time running out finishes the walk on its own', async () => {
    const { clock, device } = await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-walk'))
    clock.advance(10 * 60 * 1000 + 500)
    await act(async () => { jest.advanceTimersByTime(300) })
    expect(screen.getByTestId('walk-finish')).toBeTruthy()
    expect(device.calls.done).toBe(1)
    // the scheduled time-up alert is cleared: the last sync sees the finished walk
    expect(device.calls.alerts.at(-1).walk.endedAt).toBeTruthy()
  })
})

describe('a walk saved on the phone goes into the backup (SQLite)', () => {
  it('walk → check-in → Save → buildBackup has it, format 1', async () => {
    jest.useRealTimers()
    const storage = createSqliteStorage(await openTestDatabase())
    storage.setItem('urgewalk.v1.habits', habitsSeed()['urgewalk.v1.habits'])
    jest.useFakeTimers(); jest.setSystemTime(T0)
    const clock = fakeClock()
    await renderApp({ storage, clock })
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-walk'))
    clock.advance(4 * 60 * 1000)
    await fireEvent.press(screen.getByTestId('finish'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    await fireEvent.press(screen.getByTestId('outcome-yes'))
    await fireEvent.changeText(screen.getByTestId('note'), 'Test note')
    await fireEvent.press(screen.getByTestId('save'))
    const backup = buildBackup(storage, clock())
    expect(backup).toMatchObject({ app: 'urge-walk', format: 1 })
    expect(backup.data.walks).toHaveLength(1)
    expect(backup.data.walks[0]).toMatchObject({ kind: 'walk', plannedMinutes: 10, actualSeconds: 240, endedEarly: true, result: 'yes', note: 'Test note' })
    expect(loadActiveWalk(storage)).toBeNull()
  })
})

describe('Breathe', () => {
  const open = async (opts) => {
    const r = await renderApp(opts)
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-breathe'))
    return r
  }
  const at = async (clock, ms) => { clock.advance(ms); await act(async () => { jest.advanceTimersByTime(250) }) }
  it('in → hold → out, with a haptic only when the breath turns', async () => {
    const { clock, device } = await open()
    expect(screen.getByTestId('breathe-word').props.children).toBe('Breathe in')
    const first = device.calls.breathTurn
    expect(first).toBe(1)
    await at(clock, 4500)
    expect(screen.getByTestId('breathe-word').props.children).toBe('Hold')
    expect(device.calls.breathTurn).toBe(first)
    await at(clock, 2000)
    expect(screen.getByTestId('breathe-word').props.children).toBe('Hold')
    expect(device.calls.breathTurn).toBe(first)
    await at(clock, 1000)
    expect(screen.getByTestId('breathe-word').props.children).toBe('Breathe out')
    expect(device.calls.breathTurn).toBe(first + 1)
  })
  it('its lines are breath-only: never walking or motion words', async () => {
    await open()
    const line = screen.getByTestId('breathe-line').props.children
    expect(BREATHE_LINES).toContain(line)
    for (const l of BREATHE_LINES) expect(l).not.toMatch(/walk|step|mov|keep going|pace/i)
  })
  it('Finish early goes to the check-in and saves a breathe record; Cancel saves nothing', async () => {
    const { clock, storage } = await open()
    await at(clock, 2000)
    await fireEvent.press(screen.getByTestId('breathe-finish'))
    await fireEvent.press(screen.getByTestId('outcome-kinda'))
    await fireEvent.press(screen.getByTestId('save'))
    expect(loadWalks(storage).walks.map((w) => [w.kind, w.result])).toEqual([['breathe', 'kinda']])
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-breathe'))
    await fireEvent.press(screen.getByTestId('breathe-cancel'))
    expect(loadWalks(storage).walks).toHaveLength(1)
    expect(screen.getByTestId('home')).toBeTruthy()
  })
})

describe('Ground', () => {
  const open = async (opts) => {
    const r = await renderApp(opts)
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-ground'))
    return r
  }
  it('is a third Ride it out choice, silent and text-only', async () => {
    await renderApp()
    await fireEvent.press(screen.getByTestId('ride-button'))
    expect(screen.getByTestId('ride-ground')).toBeTruthy()
    expect(screen.getByLabelText('Ground. 5 senses, silent')).toBeTruthy()
  })
  it('one line at a time, tap to continue, notes optional and never saved; logs a ground record', async () => {
    const { clock, storage, device } = await open()
    const seen = [screen.getByTestId('ground-text').props.children]
    expect(screen.queryByTestId('ground-note')).toBeNull()
    await fireEvent.press(screen.getByTestId('ground-line')) // tapping the line itself continues
    seen.push(screen.getByTestId('ground-text').props.children)
    expect(screen.getByTestId('ground-progress')).toHaveTextContent('1 of 5')
    await fireEvent.changeText(screen.getByTestId('ground-note'), 'lamp')
    for (let i = 0; i < 5; i++) { clock.advance(20000); await fireEvent.press(screen.getByTestId('ground-next')); if (screen.queryByTestId('ground-text')) seen.push(screen.getByTestId('ground-text').props.children) }
    expect(seen).toEqual([
      'Let’s notice what’s around you, one sense at a time. Tap to continue.',
      'Name 5 things you can see.', 'Name 4 things you can feel.', 'Name 3 things you can hear.',
      'Name 2 things you can smell.', 'Name 1 thing you can taste.', 'You’re here. Take your time.',
    ])
    for (const l of seen) expect(l).not.toMatch(/walk|step|mov|keep going|pace/i)
    expect(screen.getByTestId('ground-next')).toHaveTextContent('Done')
    await fireEvent.press(screen.getByTestId('ground-next'))
    expect(screen.getByTestId('ground-done')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('outcome-yes'))
    await fireEvent.press(screen.getByTestId('save'))
    const [w] = loadWalks(storage).walks
    expect(w).toMatchObject({ kind: 'ground', result: 'yes', endedEarly: false, actualSeconds: 100 })
    expect(JSON.stringify(w)).not.toMatch(/lamp/)
    expect(device.calls.followUps).toEqual([w.id])
    expect(screen.getByTestId('home')).toBeTruthy()
  })
  it('Finish early saves an ended-early ground; Cancel saves nothing', async () => {
    const { storage } = await open()
    await fireEvent.press(screen.getByTestId('ground-next'))
    await fireEvent.press(screen.getByTestId('ground-finish'))
    await fireEvent.press(screen.getByTestId('skip'))
    expect(loadWalks(storage).walks.map((w) => [w.kind, w.endedEarly])).toEqual([['ground', true]])
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-ground'))
    await fireEvent.press(screen.getByTestId('ground-cancel'))
    expect(loadWalks(storage).walks).toHaveLength(1)
  })
})

describe('Design Check (dev only)', () => {
  it('opens from a long-press on the version in You, with Light and Night, largest text and Reduce Motion', async () => {
    await renderApp()
    await fireEvent.press(screen.getByRole('tab', { name: 'You' }))
    const v = screen.getByTestId('app-version')
    expect(screen.getByText('Version 1.0.0')).toBeTruthy()
    await fireEvent(v, 'longPress')
    expect(screen.getByTestId('design-check')).toBeTruthy()
    expect(screen.getByTestId('design-Light')).toBeTruthy()
    expect(screen.getByTestId('design-Night')).toBeTruthy()
    expect(screen.getAllByText('Reduce Motion: off')).toHaveLength(2)
    await fireEvent(screen.getByTestId('design-still'), 'valueChange', true)
    expect(screen.getAllByText('Reduce Motion: on')).toHaveLength(2)
    await fireEvent(screen.getByTestId('design-big'), 'valueChange', true)
    expect(StyleSheet.flatten(screen.getAllByText('Primary button')[0].props.style).fontSize).toBe(30) // 15 × 2x cap
    await fireEvent.press(screen.getByTestId('design-done'))
    expect(screen.queryByTestId('design-check')).toBeNull()
  })
})

describe('Dynamic Type', () => {
  it('ring text is capped; other text may grow to 2x', async () => {
    await renderApp()
    expect(screen.getByTestId('hero-days').props.maxFontSizeMultiplier).toBe(MAX_SCALE.ring)
    expect(MAX_SCALE.ring).toBeLessThanOrEqual(1.3)
    expect(screen.getByText('17 days').props.maxFontSizeMultiplier).toBe(2)
    for (const el of screen.getAllByText('Ride it out', { exact: true })) expect(el.props.maxFontSizeMultiplier).toBeLessThanOrEqual(2)
    expect(screen.getByText(/^since /).props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.3)
  })
})
