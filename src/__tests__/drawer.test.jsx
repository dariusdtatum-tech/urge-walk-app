// Option C: the tracker drawer, the five-item Home, the Your why sheet, Reach out after "Didn't",
// and You as six rows. Neutral test data only.
import { readFileSync } from 'fs'
import { join } from 'path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { ACTIVE_TRACKER_KEY } from '../lib/activeTracker.js'
import { todayISO } from '../lib/cleanTime.js'
import { HOME_ITEMS } from '../screens/HomeScreen.jsx'
import { reasonOfDay } from '../screens/home/YourWhy.jsx'
import { dayCount, swipeCloses } from '../screens/home/TrackerDrawer.jsx'
import { DAY, fakeClock, habitsSeed, iso, memoryStorage, onboardedProfile, stubDevice, T0 } from './helpers.js'

const twoHabits = (extra = []) => ({ 'urgewalk.v1.habits': JSON.stringify({ habits: [
  { id: 'h1', name: 'Habit A', startDate: '2029-12-02' }, { id: 'h2', name: 'Something else', startDate: '2030-05-10' }, ...extra] }) })
const reasonsSeed = (texts) => ({ 'urgewalk.v1.reasons': JSON.stringify({ version: 1, reasons: texts.map((text, i) => ({ id: `r${i}`, kind: 'text', text, at: '2030-01-01T00:00:00.000Z' })), next: 0, lock: false }) })
const walk = (daysAgo, result = 'yes') => {
  const at = iso(T0 - daysAgo * DAY)
  return { id: `w${daysAgo}${result}`, kind: 'logged', startedAt: at, endedAt: at, mode: 'open', plannedMinutes: null, actualSeconds: 0, endedEarly: false, result, note: '' }
}
const renderApp = async (seed = habitsSeed()) => {
  const storage = memoryStorage({ ...onboardedProfile(), ...seed })
  const device = stubDevice()
  const clock = fakeClock()
  const r = await render(<AppRoot storage={storage} device={device} clock={clock} scheme="light" />)
  return { storage, device, clock, ...r }
}
const press = (id) => fireEvent.press(screen.getByTestId(id))
const tab = (name) => fireEvent.press(screen.getByRole('tab', { name }))
const allText = () => screen.getAllByText(/./, { includeHiddenElements: true }).map((n) => [].concat(n.props.children).filter((x) => typeof x === 'string' || typeof x === 'number').join('')).join(' | ')
const today = todayISO(new Date(T0))

describe('tracker title and drawer', () => {
  it('one tracker: the title is the tracker name, no ▾, and it still opens the drawer', async () => {
    await renderApp()
    expect(screen.getByTestId('home-title')).toHaveTextContent('Habit A')
    expect(screen.queryByTestId('home-title-caret', { includeHiddenElements: true })).toBeNull()
    expect(screen.queryByTestId('home-edit')).toBeNull() // the small Edit link left Home
    await press('home-title')
    expect(screen.getByTestId('drawer')).toBeTruthy()
    expect(screen.getByTestId('drawer-tracker-h1')).toHaveTextContent('Habit A163 days')
  })

  it('two or more trackers: ▾ shows, the drawer lists names and day counts only, with a check on the active one', async () => {
    await renderApp(twoHabits())
    expect(screen.getByTestId('home-title-caret', { includeHiddenElements: true })).toHaveTextContent('▾')
    expect(screen.getByTestId('home-title').props.accessibilityLabel).toBe('Habit A. Switch or edit trackers')
    await press('home-title')
    const a = screen.getByTestId('drawer-tracker-h1')
    const b = screen.getByTestId('drawer-tracker-h2')
    expect(a).toHaveTextContent('Habit A163 days')
    expect(b).toHaveTextContent('Something else4 days')
    expect(screen.getByTestId('drawer-check-h1')).toBeTruthy()
    expect(screen.queryByTestId('drawer-check-h2')).toBeNull()
    expect(a.props.accessibilityState).toEqual({ selected: true })
    expect(a.props.accessibilityLabel).toBe('Habit A, 163 days, on Home')
  })

  it('names are shown exactly as the person wrote them: no category words added', async () => {
    await renderApp(twoHabits([{ id: 'h3', name: 'mornings', startDate: '2030-05-14' }]))
    await press('home-title')
    expect(screen.getByTestId('drawer-tracker-h3')).toHaveTextContent('mornings0 days')
    const text = within(screen.getByTestId('drawer')).getAllByText(/./).map((n) => [].concat(n.props.children).join('')).join(' ')
    expect(text).not.toMatch(/-free|sober|clean from|addiction|recovery/i)
  })

  it('choosing a tracker closes the drawer, puts it on Home, and remembers it', async () => {
    const { storage } = await renderApp(twoHabits())
    await press('home-title')
    await press('drawer-tracker-h2')
    expect(screen.queryByTestId('drawer')).toBeNull()
    expect(screen.getByTestId('home-title')).toHaveTextContent(/^Something else/)
    expect(screen.getByTestId('hero-days').props.children).toBe('4')
    expect(JSON.parse(storage.getItem(ACTIVE_TRACKER_KEY)).id).toBe('h2')
    await press('home-title')
    expect(screen.getByTestId('drawer-check-h2')).toBeTruthy()
    await render(<AppRoot storage={storage} device={stubDevice()} clock={fakeClock()} scheme="light" />)
    expect(screen.getByTestId('home-title')).toHaveTextContent(/^Something else/)
  })

  it('a stored id that no longer exists falls back to the first tracker', async () => {
    await renderApp({ ...twoHabits(), [ACTIVE_TRACKER_KEY]: JSON.stringify({ id: 'gone' }) })
    expect(screen.getByTestId('home-title')).toHaveTextContent(/^Habit A/)
  })

  it('closes by tapping the dimmed area and by Back', async () => {
    await renderApp(twoHabits())
    await press('home-title')
    await fireEvent.press(screen.getByTestId('drawer-backdrop', { includeHiddenElements: true }))
    expect(screen.queryByTestId('drawer')).toBeNull()
    await press('home-title')
    await fireEvent(screen.getByTestId('drawer-modal'), 'requestClose')
    expect(screen.queryByTestId('drawer')).toBeNull()
  })

  it('closes on a swipe back toward the left edge, not on a small drag or a swipe right', async () => {
    expect(swipeCloses(-80)).toBe(true)
    expect(swipeCloses(-20, -0.9)).toBe(true) // a quick flick
    expect(swipeCloses(-30, -0.1)).toBe(false)
    expect(swipeCloses(120, 1)).toBe(false)
    await renderApp(twoHabits())
    await press('home-title')
    const panel = screen.getByTestId('drawer')
    expect(typeof panel.props.onMoveShouldSetResponder).toBe('function') // the panel owns the swipe
    expect(typeof panel.props.onResponderRelease).toBe('function')
  })

  it('focus goes back to the title when the drawer closes', async () => {
    const rn = require('react-native')
    const spy = jest.spyOn(rn.AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {})
    await renderApp(twoHabits())
    await press('home-title')
    await fireEvent.press(screen.getByTestId('drawer-backdrop', { includeHiddenElements: true }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.anything(), 'focus'))
    spy.mockRestore()
  })

  it('panel is a modal for screen readers (focus stays inside while open)', async () => {
    await renderApp()
    await press('home-title')
    expect(screen.getByTestId('drawer').props.accessibilityViewIsModal).toBe(true)
  })

  it('Reach out is the first row and opens 988 plus trusted people', async () => {
    const { device } = await renderApp()
    await press('home-title')
    const rows = within(screen.getByTestId('drawer')).getAllByRole('button')
    expect(rows[0].props.testID).toBe('drawer-reach')
    await press('drawer-reach')
    expect(screen.queryByTestId('drawer')).toBeNull()
    expect(screen.getByTestId('home-reach-988')).toBeTruthy()
    await press('home-reach-988-call')
    expect(device.calls.urls).toEqual(['tel:988'])
    await press('home-reach-done')
    expect(screen.queryByTestId('home-reach-sheet')).toBeNull()
  })

  it('+ Add tracker, Edit trackers and long-press edit open the tracker sheets', async () => {
    await renderApp(twoHabits())
    await press('home-title'); await press('drawer-add')
    expect(screen.getByTestId('habit-sheet')).toBeTruthy()
    expect(screen.queryByTestId('drawer')).toBeNull()
    await fireEvent(screen.getByTestId('habit-sheet-backdrop'), 'press')
    await press('home-title'); await press('home-edit')
    expect(screen.getByTestId('tracker-sheet')).toBeTruthy()
    await press('trackers-done')
    await press('home-title'); await fireEvent(screen.getByTestId('drawer-tracker-h2'), 'longPress')
    expect(screen.getByTestId('habit-name').props.value).toBe('Something else')
  })

  it('the bottom row is honest about where data lives and opens Backup', async () => {
    await renderApp()
    await press('home-title')
    expect(screen.getByTestId('drawer-backup')).toHaveTextContent('On this phone only · No backup yetBack up')
    await press('drawer-backup')
    expect(screen.getByTestId('backup')).toBeTruthy()
  })

  it('never holds Ride it out, Premium, Plus, upgrades or prices (render)', async () => {
    await renderApp(twoHabits())
    await press('home-title')
    const text = within(screen.getByTestId('drawer')).getAllByText(/./).map((n) => [].concat(n.props.children).join('')).join(' ')
    expect(text).not.toMatch(/premium|\bplus\b|upgrade|subscribe|unlock|trial|\bpro\b|\$\s?\d|ride it out/i)
    expect(within(screen.getByTestId('drawer')).queryByTestId('ride-bar')).toBeNull()
  })

  it('never holds Premium, Plus, upgrades or prices (source)', () => {
    for (const f of ['screens/home/TrackerDrawer.jsx', 'screens/home/YourWhy.jsx', 'screens/HomeScreen.jsx']) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
      expect([f, src.match(/premium|upgrade|subscri|paywall|unlock|free trial|\bpro\b/i)?.[0] ?? null]).toEqual([f, null])
    }
  })

  it('dayCount is plain: 1 day, N days, or starts soon', () => {
    expect(dayCount(0)).toBe('0 days'); expect(dayCount(1)).toBe('1 day'); expect(dayCount(12)).toBe('12 days'); expect(dayCount(-3)).toBe('Starts soon')
  })
})

describe('Home holds five things', () => {
  it('title, Ride it out, ring, Your why and check-in; the old cards live elsewhere even with lots of data', async () => {
    const walks = { 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks: [walk(0), walk(1), walk(1, 'no'), walk(2), walk(3)] }) }
    const seed = { ...habitsSeed(), ...onboardedProfile({ timeBack: { hoursPerTime: 1, moneyPerTime: 10 }, before: { daysPerWeek: 7, timesPerDay: 1 } }), ...walks,
      'urgewalk.v1.backupMeta': JSON.stringify({ lastBackupAt: iso(T0 - 30 * DAY) }), 'urgewalk.v1.firstWeek': JSON.stringify({ done: true }) }
    await renderApp(seed)
    expect(HOME_ITEMS).toHaveLength(5)
    for (const id of HOME_ITEMS) expect([id, Boolean(screen.queryByTestId(id))]).toEqual([id, true])
    for (const id of ['pattern-card', 'money-card', 'walks-card', 'never-zero', 'backup-nudge', 'home-edit']) expect([id, screen.queryByTestId(id)]).toEqual([id, null])
    await tab('Track')
    expect(screen.getByTestId('walks-card')).toBeTruthy()
    expect(screen.getByTestId('never-zero')).toBeTruthy()
    expect(screen.getByTestId('pattern-card')).toBeTruthy()
  })

  it('keeps 5 tabs, with Ride it out in the tab bar and on Home', async () => {
    await renderApp()
    for (const id of ['tab-home', 'tab-track', 'tab-community', 'tab-you', 'ride-button']) expect(screen.getByTestId(id)).toBeTruthy()
    expect(screen.getByTestId('ride-bar')).toBeTruthy()
  })
})

describe('Your why', () => {
  it('shows one reason picked by the date, the same all day', async () => {
    const texts = ['First thing', 'Second thing', 'Third thing']
    await renderApp({ ...habitsSeed(), ...reasonsSeed(texts) })
    const expected = reasonOfDay(texts.map((text, i) => ({ id: `r${i}`, kind: 'text', text })), today).text
    expect(screen.getByTestId('why-text')).toHaveTextContent(`“${expected}”`)
  })

  it('reasonOfDay rotates day by day and prefers written reasons', () => {
    const rs = [{ id: 'p', kind: 'photo', text: '' }, { id: 'a', kind: 'text', text: 'A' }, { id: 'b', kind: 'text', text: 'B' }]
    const seen = new Set([0, 1, 2, 3].map((d) => reasonOfDay(rs, todayISO(new Date(T0 + d * DAY))).id))
    expect([...seen].sort()).toEqual(['a', 'b'])
    expect(reasonOfDay([], today)).toBeNull()
    expect(reasonOfDay([{ id: 'p', kind: 'photo', text: '' }], today).id).toBe('p')
  })

  it('no reasons yet: a gentle "Add a reason" that still opens the sheet', async () => {
    await renderApp()
    expect(screen.getByTestId('why-text')).toHaveTextContent('Add a reason ›')
    await press('why-open')
    expect(screen.getByTestId('why-empty')).toBeTruthy()
    await press('why-edit-reasons')
    expect(screen.getByTestId('reasons-sheet')).toBeTruthy()
  })

  it('"+ Add a habit" shares the slot while there is one tracker, and goes away with two', async () => {
    await renderApp()
    await press('why-add-habit')
    expect(screen.getByTestId('habit-sheet')).toBeTruthy()
    await renderApp(twoHabits())
    expect(screen.getByTestId('why-line')).toBeTruthy()
    expect(screen.queryByTestId('why-add-habit')).toBeNull()
  })

  it('sheet without money: reasons and time back, no money and no goal', async () => {
    await renderApp({ ...habitsSeed(), ...reasonsSeed(['First thing', 'Second thing']), ...onboardedProfile({ before: { daysPerWeek: 7, timesPerDay: 1 } }),
      'urgewalk.v1.moneyGoal': JSON.stringify({ version: 1, name: 'A goal', target: 100 }) })
    await press('why-open')
    expect(screen.getByTestId('why-reason-0')).toHaveTextContent('“First thing”')
    expect(screen.getByTestId('why-reason-1')).toHaveTextContent('“Second thing”')
    expect(screen.getByTestId('why-time')).toHaveTextContent(/About 160 hours back so far/)
    expect(screen.queryByTestId('why-money')).toBeNull()
    expect(screen.queryByTestId('why-goal')).toBeNull()
  })

  it('sheet with money set: one card with money kept, time back and the goal', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ timeBack: { hoursPerTime: 1, moneyPerTime: 10 }, before: { daysPerWeek: 7, timesPerDay: 1 } }),
      'urgewalk.v1.moneyGoal': JSON.stringify({ version: 1, name: 'A goal', target: 100 }) })
    await press('why-open')
    const card = screen.getByTestId('why-card')
    expect(within(card).getByTestId('why-money')).toHaveTextContent(/Money kept\$/)
    expect(within(card).getByTestId('why-time')).toBeTruthy()
    expect(within(card).getByTestId('why-goal')).toHaveTextContent(/A goal · \$100/)
    expect(screen.getAllByTestId('why-card')).toHaveLength(1)
  })

  it('nothing set: no card at all, just the settings link, which opens You → Your why', async () => {
    await renderApp()
    await press('why-open')
    expect(screen.queryByTestId('why-card')).toBeNull()
    await press('why-settings')
    expect(screen.getByTestId('you-back')).toBeTruthy()
    expect(screen.getByTestId('money-toggle')).toBeTruthy()
  })
})

describe('Reach out after "Didn’t"', () => {
  it('Just log it: picking Didn’t shows 988 and trusted people; Passed does not', async () => {
    await renderApp()
    await press('ride-button'); await press('ride-log')
    expect(screen.queryByTestId('log-didnt-reach')).toBeNull()
    await press('log-result-no')
    expect(screen.getByTestId('log-didnt-reach')).toHaveTextContent(/That’s okay/)
    expect(screen.getByTestId('log-didnt-reach-list-988')).toBeTruthy()
    await press('log-result-yes')
    expect(screen.queryByTestId('log-didnt-reach')).toBeNull()
  })

  it('after a walk: Didn’t shows Reach out in the check-in', async () => {
    const { clock } = await renderApp()
    await press('ride-button'); await press('ride-walk')
    clock.advance(4 * 60 * 1000)
    await press('finish'); await press('confirm-ok')
    expect(screen.queryByTestId('didnt-reach')).toBeNull()
    await press('outcome-no')
    expect(screen.getByTestId('didnt-reach-list-988')).toBeTruthy()
  })

  it('after Breathe: Reach out appears and nothing mentions walking', async () => {
    await renderApp()
    await press('ride-button'); await press('ride-breathe')
    await press('breathe-finish')
    expect(screen.queryByTestId('didnt-reach')).toBeNull()
    await press('outcome-no')
    const t = within(screen.getByTestId('didnt-reach')).getAllByText(/./).map((n) => [].concat(n.props.children).join('')).join(' ')
    expect(t).toMatch(/988/)
    expect(t).not.toMatch(/walk|mov|stride|pace/i)
  })

  it('Ground check-in: Didn’t shows Reach out too', async () => {
    await renderApp()
    await press('ride-button'); await press('ride-ground')
    for (let i = 0; i < 8 && !screen.queryByTestId('ground-done'); i++) await press('ground-next')
    await press('outcome-no')
    expect(screen.getByTestId('didnt-reach-list-988')).toBeTruthy()
  })
})

describe('You as six rows', () => {
  it('six section rows with live status lines, then Your plan last', async () => {
    await renderApp({ ...twoHabits(), ...reasonsSeed(['First thing']) })
    await tab('You')
    const ids = ['support', 'why', 'progress', 'reminders', 'appearance', 'data']
    for (const id of ids) expect(screen.getByTestId(`you-${id}`)).toBeTruthy()
    expect(screen.getByTestId('you-support')).toHaveTextContent(/988 · No trusted contacts yet/)
    expect(screen.getByTestId('you-why')).toHaveTextContent(/1 reason/)
    expect(screen.getByTestId('you-progress')).toHaveTextContent(/Habit A · 163 days · 2 trackers/)
    expect(screen.getByTestId('you-data')).toHaveTextContent(/No backup yet/)
    expect(screen.getByTestId('you-plan')).toHaveTextContent(/Free\. Everything in Urge Walk is free to use\./)
    const order = screen.getAllByRole('button').map((b) => b.props.testID).filter((t) => t && /^you-(support|why|progress|reminders|appearance|data|plan)$/.test(t))
    expect(order).toEqual([...ids.map((i) => `you-${i}`), 'you-plan'])
  })

  it('Data and privacy holds backup, reset, the privacy note and legal links; back returns to the rows', async () => {
    await renderApp()
    await tab('You')
    await press('you-data')
    expect(screen.getByTestId('backup-row')).toBeTruthy()
    expect(screen.getByTestId('reset-app')).toBeTruthy()
    expect(allText()).toMatch(/No ads\. No tracking\. No account\./)
    expect(allText()).toMatch(/Privacy/)
    await press('you-back')
    expect(screen.getByTestId('you-data')).toBeTruthy()
  })

  it('status lines follow changes: a stored backup updates the Data row', async () => {
    await renderApp({ ...habitsSeed(), 'urgewalk.v1.backupMeta': JSON.stringify({ lastBackupAt: iso(T0 - 1 * DAY) }) })
    await tab('You')
    expect(screen.getByTestId('you-data')).toHaveTextContent(/Last backup yesterday/)
  })
})
