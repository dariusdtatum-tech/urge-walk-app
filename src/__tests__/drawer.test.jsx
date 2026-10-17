// Option C: the tracker drawer, the five-item Home, the Your why sheet, Reach out after "Didn't",
// and You as six rows. Neutral test data only.
import { readFileSync } from 'fs'
import { join } from 'path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { ACTIVE_TRACKER_KEY } from '../lib/activeTracker.js'
import { todayISO } from '../lib/cleanTime.js'
import { HOME_ITEMS } from '../screens/HomeScreen.jsx'
import { dayCount, swipeCloses } from '../screens/home/TrackerDrawer.jsx'
import { DAY, fakeClock, habitsSeed, iso, memoryStorage, onboardedProfile, stubDevice, T0, drawerPref } from './helpers.js'

const twoHabits = (extra = []) => ({ 'urgewalk.v1.habits': JSON.stringify({ habits: [
  { id: 'h1', name: 'Habit A', startDate: '2029-12-02' }, { id: 'h2', name: 'Something else', startDate: '2030-05-10' }, ...extra] }) })
const reasonsSeed = (texts) => ({ 'urgewalk.v1.reasons': JSON.stringify({ version: 1, reasons: texts.map((text, i) => ({ id: `r${i}`, kind: 'text', text, at: '2030-01-01T00:00:00.000Z' })), next: 0, lock: false }) })
const walk = (daysAgo, result = 'yes') => {
  const at = iso(T0 - daysAgo * DAY)
  return { id: `w${daysAgo}${result}`, kind: 'logged', startedAt: at, endedAt: at, mode: 'open', plannedMinutes: null, actualSeconds: 0, endedEarly: false, result, note: '' }
}
const renderApp = async (seed = habitsSeed()) => {
  const storage = memoryStorage({ ...onboardedProfile(), ...drawerPref(), ...seed })
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
  it('one tracker: the title is the tracker name with a chevron (it reads as a picker), and it still opens the drawer', async () => {
    await renderApp()
    expect(screen.getByTestId('home-title')).toHaveTextContent('Habit A')
    expect(screen.getByTestId('home-title-caret', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.queryByTestId('home-edit')).toBeNull() // the small Edit link left Home
    await press('home-title')
    expect(screen.getByTestId('drawer')).toBeTruthy()
    expect(screen.getByTestId('drawer-tracker-h1')).toHaveTextContent('Habit A163 days')
  })

  it('two or more trackers: the chevron shows, the drawer lists names and day counts only, with a check on the active one', async () => {
    await renderApp(twoHabits())
    expect(screen.getByTestId('home-title-caret', { includeHiddenElements: true })).toBeTruthy()
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

  it('drawer has a Trackers header with a 44pt close; the selected row is one solid action fill plus a check, the same in both modes', async () => {
    const { StyleSheet } = require('react-native')
    const { palettes } = require('../ui/palette.js')
    await renderApp(twoHabits())
    await press('home-title')
    expect(within(screen.getByTestId('drawer-header')).getByText('Trackers')).toBeTruthy()
    const close = StyleSheet.flatten(screen.getByTestId('drawer-close').props.style)
    expect(close.minHeight).toBeGreaterThanOrEqual(44); expect(close.minWidth).toBeGreaterThanOrEqual(44)
    const panel = StyleSheet.flatten(screen.getByTestId('drawer').props.style)
    expect(panel).toMatchObject({ position: 'absolute', left: 0, overflow: 'hidden' })
    const st = (id) => { const p = screen.getByTestId(id).props.style; return StyleSheet.flatten(typeof p === 'function' ? p({ pressed: false }) : p) }
    expect(st('drawer-tracker-h1').backgroundColor).toBe(palettes.light.action)
    expect(st('drawer-tracker-h2').backgroundColor).toBe(palettes.light.card)
    expect(st('drawer-tracker-h1').borderWidth).toBe(st('drawer-tracker-h2').borderWidth)
    await press('drawer-close')
    expect(screen.queryByTestId('drawer')).toBeNull()
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
    expect(rows[0].props.testID).toBe('drawer-close') // the header close, then content
    expect(rows[1].props.testID).toBe('drawer-reach')
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
    for (const f of ['screens/home/TrackerDrawer.jsx', 'screens/home/KeptCard.jsx', 'screens/HomeScreen.jsx']) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
      expect([f, src.match(/premium|upgrade|subscri|paywall|unlock|free trial|\bpro\b/i)?.[0] ?? null]).toEqual([f, null])
    }
  })

  it('dayCount is plain: 1 day, N days, or starts soon', () => {
    expect(dayCount(0)).toBe('0 days'); expect(dayCount(1)).toBe('1 day'); expect(dayCount(12)).toBe('12 days'); expect(dayCount(-3)).toBe('Starts soon')
  })
})

describe('fuller Home: title, ring + milestones, at most five cards, the hold hint', () => {
  it('cards come in HOME_CARDS order and never more than five; Money kept shows once it is set up', async () => {
    const walks = { 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks: [walk(0), walk(1), walk(1, 'no'), walk(2), walk(3)] }) }
    const seed = { ...habitsSeed(), ...onboardedProfile({ timeBack: { hoursPerTime: 1, moneyPerTime: 10 }, before: { daysPerWeek: 7, timesPerDay: 1 } }), ...walks,
      'urgewalk.v1.backupMeta': JSON.stringify({ lastBackupAt: iso(T0 - 30 * DAY) }), 'urgewalk.v1.firstWeek': JSON.stringify({ done: true }) }
    await renderApp(seed)
    expect(HOME_ITEMS).toEqual(['home-title', 'hero', 'home-cards', 'hold-hint'])
    for (const id of HOME_ITEMS) expect([id, Boolean(screen.queryByTestId(id))]).toEqual([id, true])
    const { HOME_CARDS, MAX_HOME_CARDS } = require('../screens/home/HomeCards.jsx')
    expect(HOME_CARDS).toEqual(['why-card', 'checkin-card', 'week-card', 'urgemap-card', 'money-card'])
    expect(HOME_CARDS.length).toBeLessThanOrEqual(MAX_HOME_CARDS)
    const shown = screen.getByTestId('home-cards').children.map((k) => k.props?.testID).filter(Boolean)
    expect(shown.length).toBeLessThanOrEqual(MAX_HOME_CARDS)
    expect(shown).toEqual(HOME_CARDS.filter((id) => shown.includes(id))) // order holds
    expect(shown).toEqual(['checkin-card', 'week-card', 'urgemap-card', 'money-card']) // no reason → no why card
    for (const id of ['pattern-card', 'walks-card', 'never-zero', 'backup-nudge', 'home-edit', 'home-reach']) expect([id, screen.queryByTestId(id)]).toEqual([id, null])
    expect(screen.queryByText(/988/)).toBeNull() // 988 is not a Home card
    await tab('Track')
    expect(screen.getByTestId('walks-card')).toBeTruthy()
    expect(screen.getByTestId('never-zero')).toBeTruthy()
    expect(screen.getByTestId('pattern-card')).toBeTruthy()
  })

  it('keeps 5 tabs; Ride it out is the raised center tab button only (no second trigger on Home)', async () => {
    await renderApp()
    for (const id of ['tab-home', 'tab-track', 'tab-you', 'ride-button']) expect(screen.getByTestId(id)).toBeTruthy()
    expect(screen.queryByTestId('tab-community')).toBeNull()
    expect(screen.queryByTestId('ride-bar')).toBeNull()
  })
})

describe('Home has no Your why line, quote or Add a habit; money and time live in You → Progress', () => {
  it('no old why line, quote or Add a habit; the why card shows the saved reason only (not the setup answer when a saved one exists)', async () => {
    await renderApp({ ...habitsSeed(), ...reasonsSeed(['First thing']), ...onboardedProfile({ why: 'A quiet example why', timeBack: { hoursPerTime: 1, moneyPerTime: 10 }, before: { daysPerWeek: 7, timesPerDay: 1 } }) })
    for (const id of ['why-line', 'why-open', 'why-add-habit', 'kept-card']) expect([id, screen.queryByTestId(id)]).toEqual([id, null])
    expect(screen.queryByText(/Add a reason|Add a habit|A quiet example why|Today ·/i)).toBeNull()
    expect(screen.getByTestId('money-card')).toBeTruthy()
  })
  it('Money kept stays off Home until it is set up', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ before: { daysPerWeek: 7, timesPerDay: 1 } }) })
    expect(screen.queryByTestId('money-card')).toBeNull()
  })

  it('Add tracker stays reachable from the drawer', async () => {
    await renderApp()
    await press('home-title'); await press('drawer-add')
    expect(screen.getByTestId('habit-sheet')).toBeTruthy()
  })

  it('Progress with money set: money kept, the goal and time back', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ timeBack: { hoursPerTime: 1, moneyPerTime: 10 }, before: { daysPerWeek: 7, timesPerDay: 1 } }),
      'urgewalk.v1.moneyGoal': JSON.stringify({ version: 1, name: 'A goal', target: 100 }) })
    await tab('You')
    expect(screen.getByTestId('you-progress')).toHaveTextContent(/Habit A · 163 days · \$\d[\d,]* kept/)
    await press('you-progress')
    expect(screen.getByTestId('kept-total').props.accessibilityLabel).toMatch(/^Money kept, \$/)
    expect(screen.getByTestId('kept-goal')).toHaveTextContent(/A goal · \$100/)
    expect(screen.getByTestId('time-back')).toBeTruthy()
    expect(screen.getByTestId('money-toggle').props.value).toBe(true)
  })

  it('Progress with nothing set: no money card, no time back, just the money switch (off)', async () => {
    await renderApp()
    await tab('You')
    expect(screen.getByTestId('you-progress')).not.toHaveTextContent(/kept/)
    await press('you-progress')
    expect(screen.queryByTestId('kept-money')).toBeNull() // no total yet, only the Add money estimate button
    expect(screen.getByTestId('kept-money-edit')).toHaveTextContent('Add money estimate')
    expect(screen.queryByTestId('time-back')).toBeNull()
    expect(screen.getByTestId('money-toggle').props.value).toBe(false)
  })

  it('time back without money: time back shows, money stays hidden', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ before: { daysPerWeek: 7, timesPerDay: 1 } }) })
    await tab('You'); await press('you-progress')
    expect(screen.getByTestId('tb-hours')).toBeTruthy()
    expect(screen.queryByTestId('kept-money')).toBeNull()
  })
})

describe('edge swipe opens the drawer', () => {
  const H = require('../screens/HomeScreen.jsx')
  it('intent: clearly sideways and rightward only', () => {
    expect(H.edgeIntent(20, 3)).toBe(true)
    expect(H.edgeIntent(20, 15)).toBe(false) // mostly vertical: Home keeps scrolling
    expect(H.edgeIntent(-30, 0)).toBe(false)
    expect(H.edgeIntent(5, 0)).toBe(false)
  })
  it('opens past about a third of the panel or on a quick flick; otherwise snaps back', () => {
    expect(H.edgeOpens(130, 0, 340)).toBe(true)
    expect(H.edgeOpens(40, 0.9, 340)).toBe(true)
    expect(H.edgeOpens(60, 0.1, 340)).toBe(false)
  })
  it('a narrow strip on the left edge only, inside the side padding, and only on Home', async () => {
    await renderApp()
    const zone = screen.getByTestId('home-edge', { includeHiddenElements: true })
    const st = require('react-native').StyleSheet.flatten(zone.props.style)
    expect(st.left).toBe(0)
    expect(st.width).toBe(H.EDGE_ZONE)
    expect(H.EDGE_ZONE).toBeLessThanOrEqual(20)
    expect(typeof zone.props.onMoveShouldSetResponder).toBe('function')
    // It sits on the side padding, so it covers no control: Ride it out starts to its right.
    expect(H.EDGE_ZONE).toBeLessThanOrEqual(require('../ui/theme.js').space.screen)
    await tab('Track')
    expect(screen.queryByTestId('home-edge', { includeHiddenElements: true })).toBeNull()
    await tab('You')
    expect(screen.queryByTestId('home-edge', { includeHiddenElements: true })).toBeNull()
  })
  it('the strip goes away while the drawer is open', async () => {
    await renderApp()
    await press('home-title')
    expect(screen.queryByTestId('home-edge', { includeHiddenElements: true })).toBeNull()
  })
  it('VoiceOver: the title has an "Open trackers" action', async () => {
    await renderApp()
    const title = screen.getByTestId('home-title')
    expect(title.props.accessibilityActions).toEqual(expect.arrayContaining([{ name: 'openTrackers', label: 'Open trackers' }]))
    await fireEvent(title, 'accessibilityAction', { nativeEvent: { actionName: 'openTrackers' } })
    expect(screen.getByTestId('drawer')).toBeTruthy()
  })
  it('opening from a swipe continues from where the finger left the panel', async () => {
    const rn = require('react-native')
    jest.spyOn(rn.AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    const { render: r } = require('@testing-library/react-native')
    const { TrackerDrawer } = require('../screens/home/TrackerDrawer.jsx')
    const { StorageContext } = require('../ui/StorageContext.js')
    const noop = () => {}
    await r(<StorageContext.Provider value={memoryStorage()}><TrackerDrawer fromX={-120} habits={[]} activeId={null} today={today} onSelect={noop} onEdit={noop} onManage={noop} onAdd={noop} onReachOut={noop} onBackup={noop} onClose={noop} /></StorageContext.Provider>)
    const st = rn.StyleSheet.flatten(screen.getByTestId('drawer').props.style)
    expect(st.transform).toEqual([{ translateX: -120 }])
    jest.restoreAllMocks()
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

describe('ring pager swipe, and how it shares Home with the edge swipe', () => {
  const W = () => screen.getByTestId('hero-pager').props.snapToInterval
  const layoutAndScroll = async (x) => {
    await fireEvent.scroll(screen.getByTestId('hero-pager'), { nativeEvent: { contentOffset: { x, y: 0 }, contentSize: { width: W() * 3, height: 200 }, layoutMeasurement: { width: W(), height: 200 } } })
  }
  const pageLabel = () => screen.getByTestId('hero-tabs').props.accessibilityLabel
  it('snaps to pages, one direction per drag, and the dots follow while dragging', async () => {
    await renderApp()
    const pager = screen.getByTestId('hero-pager')
    expect(pager.props.horizontal).toBe(true)
    expect(pager.props.directionalLockEnabled).toBe(true)
    expect(pager.props.pagingEnabled).toBe(true)
    // ONLY the ring swipes: the pager is ring-sized, and the milestone pair and cards sit outside it.
    expect(W()).toBeLessThan(300)
    expect(within(screen.getByTestId('hero-pager')).queryByTestId('milestone-cards')).toBeNull()
    expect(within(screen.getByTestId('hero-pager')).queryByTestId('home-cards')).toBeNull()
    await layoutAndScroll(W())
    expect(pageLabel()).toBe('Clean time, page 2 of 2')
    await layoutAndScroll(W() * 0.3) // dragging back past halfway shows page 1 again
    expect(pageLabel()).toBe('Clean time, page 1 of 2')
  })

  it('VoiceOver: swipe up/down on the dots moves between pages', async () => {
    await renderApp()
    await fireEvent(screen.getByTestId('hero-tabs'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
    expect(pageLabel()).toBe('Clean time, page 2 of 2')
    await fireEvent(screen.getByTestId('hero-tabs'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
    expect(pageLabel()).toBe('Clean time, page 2 of 2') // clamps
    await fireEvent(screen.getByTestId('hero-tabs'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } })
    expect(pageLabel()).toBe('Clean time, page 1 of 2')
  })

  it('three pages when the time-back estimate is set: days, days + hours ("163d …h"), Time back hours', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ before: { daysPerWeek: 7, timesPerDay: 1 } }) })
    expect(pageLabel()).toBe('Clean time, page 1 of 3')
    expect(screen.getByTestId('clean-time-value', { includeHiddenElements: true })).toHaveTextContent(/^163d \d+h$/)
    expect(screen.getByTestId('ring-timeback-hours', { includeHiddenElements: true })).toHaveTextContent('160')
    await press('pager-dot-2')
    expect(pageLabel()).toBe('Clean time, page 3 of 3')
  })

  it('two pages without time back, and nothing milestone-related inside any ring page', async () => {
    await renderApp()
    expect(pageLabel()).toBe('Clean time, page 1 of 2')
    expect(screen.queryByTestId('ring-timeback', { includeHiddenElements: true })).toBeNull()
    const pager = screen.getByTestId('hero-pager')
    expect(within(pager).queryByText(/milestone|days to|months|reached/i, { includeHiddenElements: true })).toBeNull()
    expect(screen.getByTestId('ms-last')).toHaveTextContent(/Last milestone90 daysreached/)
    expect(screen.getByTestId('ms-next')).toHaveTextContent(/Next6 monthsin 17 days/)
    expect(screen.queryByTestId('ring-label')).toBeNull() // the old "X days to …" line is gone
  })

  it('pageAt clamps to the two pages', () => {
    const { pageAt } = require('../screens/home/HeroPager.jsx')
    expect([pageAt(0, 300), pageAt(140, 300), pageAt(160, 300), pageAt(900, 300), pageAt(-50, 300)]).toEqual([0, 0, 1, 1, 0])
    expect([pageAt(900, 300, 3), pageAt(2000, 300, 3)]).toEqual([2, 2])
  })

  it('split: the edge strip owns drags that start in it, the ring pager is inset beyond it, vertical scroll can take the strip back', async () => {
    const H = require('../screens/HomeScreen.jsx')
    const { StyleSheet } = require('react-native')
    await renderApp()
    // 1. Geometry: the strip covers only the side padding; Home's content (and so the pager) starts after it.
    const pad = StyleSheet.flatten(screen.getByTestId('home').props.contentContainerStyle).padding
    expect(H.EDGE_ZONE).toBeLessThanOrEqual(pad)
    // 2. The strip is drawn on top of the scroll view (a later sibling), so a touch that starts in it reaches it first...
    const edge = screen.getByTestId('home-edge', { includeHiddenElements: true })
    const kids = edge.parent.children.map((k) => k.props?.testID)
    expect(kids.indexOf('home-edge')).toBeGreaterThan(kids.indexOf('home'))
    // ...and claims it at the start.
    const evt = { nativeEvent: { touches: [{}], changedTouches: [{}], timestamp: 0 }, touchHistory: { touchBank: [], numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 0 } }
    expect(edge.props.onStartShouldSetResponder(evt)).toBe(true)
    // 3. Until the drag is clearly sideways, it lets Home's vertical scroll take the touch.
    expect(edge.props.onResponderTerminationRequest(evt)).toBe(true)
    expect(H.edgeIntent(4, 30)).toBe(false) // a vertical drag never opens the drawer
    // 4. Inside the ring, sideways drags belong to the pager (direction-locked), not the drawer.
    expect(screen.getByTestId('hero-pager').props.directionalLockEnabled).toBe(true)
    expect(H.edgeIntent(-60, 2)).toBe(false) // swiping left to go back a page never opens the drawer
  })
})

describe('your reason on Home', () => {
  const R = (list, lock = false) => ({ 'urgewalk.v1.reasons': JSON.stringify({ version: 1, reasons: list, next: 0, lock }) })
  const txt = (id, text, at) => ({ id, kind: 'text', text, at })
  it('no reasons: nothing, and no empty prompt; the page dots stand alone with no card around them', async () => {
    await renderApp()
    expect(screen.queryByTestId('home-reason')).toBeNull()
    expect(screen.queryByText(/reason/i)).toBeNull()
    expect(screen.queryByTestId('why-card')).toBeNull()
    expect(screen.getByTestId('hero-tabs')).toBeTruthy()
  })
  it('regression: a "Your why" answer saved in setup shows in the card even with no reasons in the list', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ why: 'Setup words' }) })
    expect(within(screen.getByTestId('why-card')).getByTestId('home-reason-text')).toHaveTextContent('“Setup words”')
    expect(screen.getByTestId('why-card')).toHaveTextContent(/^Your why/)
    expect(within(screen.getByTestId('why-card')).queryByTestId('hero-tabs')).toBeNull() // no dots inside
  })
  it('regression: a saved reason wins over the setup answer and shows in the card', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ why: 'Setup words' }), ...R([txt('a', 'Saved words', '2030-01-01T00:00:00.000Z')]) })
    expect(within(screen.getByTestId('why-card')).getByTestId('home-reason-text')).toHaveTextContent('“Saved words”')
  })
  it('locked reasons hide the setup answer on Home too', async () => {
    await renderApp({ ...habitsSeed(), ...onboardedProfile({ why: 'Setup words' }), ...R([], true) })
    expect(screen.queryByTestId('home-reason')).toBeNull()
    expect(screen.queryByTestId('why-card')).toBeNull()
  })
  it('shows the most recently added reason, fixed (not rotating, no "Today"), as the first card', async () => {
    await renderApp({ ...habitsSeed(), ...R([txt('a', 'Older words', '2030-01-01T00:00:00.000Z'), txt('b', 'Newest words', '2030-04-01T00:00:00.000Z'), txt('c', 'Middle words', '2030-02-01T00:00:00.000Z')]) })
    expect(screen.getByTestId('home-reason-text')).toHaveTextContent('“Newest words”')
    expect(screen.queryByText(/Today/)).toBeNull()
    expect(screen.getByTestId('home-cards').children[0].props.testID).toBe('why-card')
    expect(within(screen.getByTestId('hero-ring')).queryByText(/days to|milestone/)).toBeNull()
  })
  it('the same reason on another day', async () => {
    const seed = { ...habitsSeed(), ...R([txt('a', 'One', '2030-01-01T00:00:00.000Z'), txt('b', 'Two', '2030-03-01T00:00:00.000Z')]) }
    await render(<AppRoot storage={memoryStorage({ ...onboardedProfile(), ...seed })} device={stubDevice()} clock={fakeClock(T0 + 3 * DAY)} scheme="light" />)
    expect(screen.getByTestId('home-reason-text')).toHaveTextContent('“Two”')
  })
  it('a photo shows as a small rounded thumbnail', async () => {
    await renderApp({ ...habitsSeed(), ...R([{ id: 'p', kind: 'photo', text: '', uri: 'file:///docs/reasons/p.jpg', at: '2030-04-01T00:00:00.000Z' }]) })
    const img = screen.getByTestId('home-reason-photo')
    expect(img.props.source).toEqual({ uri: 'file:///docs/reasons/p.jpg' })
    expect(require('react-native').StyleSheet.flatten(img.props.style)).toMatchObject({ width: 64, height: 64, borderRadius: 14 })
  })
  it('a voice note is a quiet play row', async () => {
    const { device } = await renderApp({ ...habitsSeed(), ...R([{ id: 'v', kind: 'voice', text: '', uri: 'file:///docs/reasons/v.m4a', durationMs: 12000, at: '2030-04-01T00:00:00.000Z' }]) })
    expect(screen.getByTestId('home-reason-voice')).toHaveTextContent('Your voice note · 0:12')
    await press('home-reason-play')
    expect(device.calls.played).toEqual(['file:///docs/reasons/v.m4a'])
  })
  it('locked with Face ID: nothing on Home', async () => {
    await renderApp({ ...habitsSeed(), ...R([txt('a', 'Private words', '2030-01-01T00:00:00.000Z')], true) })
    expect(screen.queryByTestId('home-reason')).toBeNull()
    expect(screen.queryByText(/Private words/)).toBeNull()
  })
  it('tapping it opens You → Your why', async () => {
    await renderApp({ ...habitsSeed(), ...R([txt('a', 'Some words', '2030-01-01T00:00:00.000Z')]) })
    await press('home-reason-open')
    expect(screen.getByTestId('you-back')).toBeTruthy()
    expect(screen.getByTestId('reasons-row')).toBeTruthy()
  })
  it('the Home limit still holds: the reason is the first of the (at most five) cards', async () => {
    await renderApp({ ...habitsSeed(), ...R([txt('a', 'Some words', '2030-01-01T00:00:00.000Z')]) })
    expect(HOME_ITEMS).toEqual(['home-title', 'hero', 'home-cards', 'hold-hint'])
    expect(within(screen.getByTestId('home-cards')).getByTestId('home-reason')).toBeTruthy()
  })
})
