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

describe('idea 5: your reasons', () => {
  const withReasons = (reasons, lock = false) => memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.reasons': JSON.stringify({ version: 1, reasons, next: 0, lock }) })
  const r = (id, text) => ({ id, kind: 'text', text, at: '2030-01-01T00:00:00.000Z' })

  test('nothing shows on Breathe when there are no reasons', async () => {
    await renderApp()
    await press('ride-button'); await press('ride-breathe')
    expect(screen.queryByTestId('breathe-reason')).toBeNull()
  })

  test('one reason shows on Breathe, a different one next time; Hide skips it', async () => {
    const storage = withReasons([r('a', 'First reason'), r('b', 'Second reason')])
    await renderApp({ storage })
    await press('ride-button'); await press('ride-breathe')
    expect(screen.getByTestId('breathe-reason-text')).toHaveTextContent(/First reason/)
    await press('breathe-reason-hide')
    expect(screen.queryByTestId('breathe-reason')).toBeNull()
    expect(JSON.parse(storage.getItem('urgewalk.v1.reasons')).next).toBe(1)
  })

  test('locked: covered until unlocked', async () => {
    const device = stubDevice()
    await renderApp({ storage: withReasons([r('a', 'Hidden reason')], true), device })
    await press('ride-button'); await press('ride-walk')
    expect(screen.queryByTestId('walk-reason-text')).toBeNull()
    await press('walk-reason-unlock')
    expect(device.calls.unlocks).toBe(1)
    expect(screen.getByTestId('walk-reason-text')).toHaveTextContent(/Hidden reason/)
  })

  test('add words, a photo and a voice note in You; remove deletes the file', async () => {
    const device = stubDevice({ photo: 'file:///docs/reasons/p.jpg', voice: { uri: 'file:///docs/reasons/v.m4a', durationMs: 12000 } })
    const { storage } = await renderApp({ device })
    await tab('You')
    await press('reasons-row')
    await press('reason-write')
    await press('reason-save')
    expect(screen.getByTestId('reason-note')).toHaveTextContent(/few words/)
    await fireEvent.changeText(screen.getByTestId('reason-text'), 'Mornings with a clear head')
    await press('reason-save')
    await press('reason-photo')
    await press('reason-record')
    await press('reason-stop')
    expect(screen.getByTestId('reason-1-photo')).toBeTruthy()
    await press('reason-2-play')
    expect(device.calls.played).toEqual(['file:///docs/reasons/v.m4a'])
    await press('reason-remove-1')
    expect(device.calls.deleted).toEqual(['file:///docs/reasons/p.jpg'])
    await fireEvent(screen.getByTestId('reasons-lock'), 'valueChange', true)
    expect(JSON.parse(storage.getItem('urgewalk.v1.reasons'))).toMatchObject({ lock: true, reasons: [{ kind: 'text' }, { kind: 'voice' }] })
  })
})

describe('idea 4: money kept', () => {
  test('off by default: no card, no kept line', async () => {
    await renderApp()
    expect(screen.queryByTestId('money-card')).toBeNull()
    await logUrge()
    expect(screen.getByTestId('toast')).not.toHaveTextContent(/kept/)
    await tab('You')
    expect(screen.getByTestId('money-toggle').props.value).toBe(false)
  })

  test('turn on with a goal; Home total; a passed urge adds a kept line; turn off hides it', async () => {
    const { storage } = await renderApp()
    await tab('You')
    await fireEvent(screen.getByTestId('money-toggle'), 'valueChange', true)
    await fireEvent.changeText(screen.getByTestId('money-amount'), '12')
    await fireEvent.changeText(screen.getByTestId('money-goal-name'), 'Car fund')
    await fireEvent.changeText(screen.getByTestId('money-goal-target'), '200')
    await press('money-save')
    expect(screen.getByTestId('money-toggle').props.value).toBe(true)
    expect(JSON.parse(storage.getItem('urgewalk.v1.profile')).timeBack.moneyPerTime).toBe(12)
    await tab('Home')
    await logUrge()
    const toast = screen.getByTestId('toast')
    const logged = loadWalks(storage).walks.at(-1)
    expect(logged.result).toBe('yes')
    expect(toast).toHaveTextContent(/\+\$12 kept/)
    await tab('You'); await tab('Home')
    expect(screen.getByTestId('money-card')).toBeTruthy()
    expect(screen.getByTestId('money-goal')).toHaveTextContent(/Car fund/)
    await tab('You')
    await fireEvent(screen.getByTestId('money-toggle'), 'valueChange', false)
    await tab('Home')
    expect(screen.queryByTestId('money-card')).toBeNull()
  })

  test('the goal shows with a reason on Breathe only when money is on', async () => {
    const reasons = JSON.stringify({ version: 1, reasons: [{ id: 'a', kind: 'text', text: 'A reason', at: '2030-01-01T00:00:00.000Z' }], next: 0, lock: false })
    const goal = JSON.stringify({ version: 1, name: 'Car fund', target: null })
    const on = memoryStorage({ ...habitsSeed(), ...onboardedProfile({ timeBack: { hoursPerTime: 1, moneyPerTime: 10 } }), 'urgewalk.v1.reasons': reasons, 'urgewalk.v1.moneyGoal': goal })
    await renderApp({ storage: on })
    await press('ride-button'); await press('ride-breathe')
    expect(screen.getByTestId('reason-goal')).toHaveTextContent(/Car fund · \$\d/)
  })

  test('money off: goal stays out of Breathe', async () => {
    const reasons = JSON.stringify({ version: 1, reasons: [{ id: 'a', kind: 'text', text: 'A reason', at: '2030-01-01T00:00:00.000Z' }], next: 0, lock: false })
    const off = memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.reasons': reasons, 'urgewalk.v1.moneyGoal': JSON.stringify({ version: 1, name: 'Car fund', target: null }) })
    await renderApp({ storage: off })
    await press('ride-button'); await press('ride-breathe')
    expect(screen.queryByTestId('reason-goal')).toBeNull()
  })
})

describe('idea 1: Urge Map', () => {
  const urge = (daysAgo, h, m, result = 'yes', tags) => {
    const d = new Date(T0 - daysAgo * 86400000); d.setHours(h, m, 0, 0)
    const iso = d.toISOString()
    return { id: `u${daysAgo}${h}${m}`, kind: 'logged', startedAt: iso, endedAt: iso, mode: 'open', plannedMinutes: null, actualSeconds: 0, endedEarly: false, result, note: '', ...(tags ? { tags } : {}) }
  }
  const seeded = (walks) => memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks }) })

  test('no pattern card until 3 urges in the week', async () => {
    await renderApp({ storage: seeded([urge(1, 20, 30), urge(2, 20, 45)]) })
    expect(screen.queryByTestId('pattern-card')).toBeNull()
  })

  test('one plain sentence, a heat strip, and an optional check-in suggestion', async () => {
    const device = stubDevice()
    const { storage } = await renderApp({ device, storage: seeded([urge(1, 20, 30, 'yes', ['stressed']), urge(2, 20, 45, 'kinda', ['stressed']), urge(3, 21, 0), urge(4, 9, 0, 'no')]) })
    expect(screen.getByTestId('pattern-sentence')).toHaveTextContent(/Most urges hit 8 to 10 PM.*“Stressed” came up most\. 2 of 4 passed\./)
    expect(screen.getByTestId('pattern-strip')).toBeTruthy()
    expect(screen.getByTestId('pattern-suggest')).toHaveTextContent(/7:45 PM/)
    await press('pattern-suggest-yes')
    expect(JSON.parse(storage.getItem('urgewalk.v1.checkinPrefs')).reminder).toEqual({ hour: 19, minute: 45 })
    expect(screen.getByTestId('pattern-set')).toBeTruthy()
  })

  test('Not now hides the suggestion', async () => {
    const { storage } = await renderApp({ storage: seeded([urge(1, 20, 30), urge(2, 20, 45), urge(3, 21, 0)]) })
    await press('pattern-suggest-no')
    expect(screen.queryByTestId('pattern-suggest')).toBeNull()
    expect(JSON.parse(storage.getItem('urgewalk.v1.patternPrefs')).suggestDismissedAt).toBeTruthy()
  })

  test('optional tags on Just log it are saved on the entry', async () => {
    const { storage } = await renderApp()
    await press('ride-button'); await press('ride-log')
    await press('log-tags-open')
    await press('log-tags-home'); await press('log-tags-bored'); await press('log-tags-home'); await press('log-tags-tired')
    await press('log-save')
    expect(loadWalks(storage).walks.at(-1).tags).toEqual(['bored', 'tired'])
  })

  test('no tags picked: the entry has no tags field', async () => {
    const { storage } = await renderApp()
    await logUrge()
    expect(loadWalks(storage).walks.at(-1)).not.toHaveProperty('tags')
  })
})

describe('phase 1 follow-ups', () => {
  test('follow-up is off for a new install', async () => {
    const storage = memoryStorage()
    await renderApp({ storage })
    expect(JSON.parse(storage.getItem('urgewalk.v1.followUpPrefs'))).toEqual({ enabled: false })
  })

  test('existing users keep the follow-up on; a saved choice is kept', async () => {
    const existing = memoryStorage({ ...habitsSeed(), ...onboardedProfile() })
    await renderApp({ storage: existing })
    await tab('You')
    expect(screen.getByTestId('followup-toggle').props.value).toBe(true)
  })

  test('a saved "off" stays off for existing users', async () => {
    const chose = memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.followUpPrefs': JSON.stringify({ enabled: false }) })
    await renderApp({ storage: chose })
    await tab('You')
    expect(screen.getByTestId('followup-toggle').props.value).toBe(false)
  })

  test('tags show quietly on urge entries in Track and survive editing the entry', async () => {
    const { storage } = await renderApp()
    await press('ride-button'); await press('ride-log')
    await press('log-tags-open'); await press('log-tags-home'); await press('log-tags-stressed')
    await press('log-save')
    await logUrge()
    await tab('Track')
    const tags = screen.getAllByTestId('log-entry-tags')
    expect(tags).toHaveLength(1)
    expect(tags[0]).toHaveTextContent('Home · Stressed')
    await fireEvent.press(screen.getAllByTestId('log-entry')[1])
    await press('detail-save')
    expect(loadWalks(storage).walks.find((w) => w.tags)?.tags).toEqual(['home', 'stressed'])
  })
})

describe('daily verse (You, opt-in)', () => {
  test('off by default: no card on You or Home', async () => {
    await renderApp()
    expect(screen.queryByTestId('daily-verse')).toBeNull()
    await tab('You')
    expect(screen.queryByTestId('daily-verse')).toBeNull()
    expect(screen.getByTestId('verse-toggle').props.value).toBe(false)
  })

  test('toggle on: card at the top of You with one combined label; never on Home or Ride it out', async () => {
    const { storage } = await renderApp()
    await tab('You')
    await fireEvent(screen.getByTestId('verse-toggle'), 'valueChange', true)
    const card = screen.getByTestId('daily-verse')
    const { verseFor, verseLabel, refLine } = require('../lib/verse.js')
    const v = verseFor(new Date(T0))
    expect(card.props.accessibilityLabel).toBe(verseLabel(v))
    expect(card.props.accessible).toBe(true)
    expect(screen.getByTestId('daily-verse-text')).toHaveTextContent(v.text)
    expect(screen.getByTestId('daily-verse-ref')).toHaveTextContent(refLine(v))
    expect(JSON.parse(storage.getItem('urgewalk.v1.versePrefs'))).toEqual({ enabled: true })
    await tab('Home')
    expect(screen.queryByTestId('daily-verse')).toBeNull()
    await press('ride-button')
    expect(screen.queryByTestId('daily-verse')).toBeNull()
  })

  test('toggle off hides it', async () => {
    await renderApp({ storage: memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.versePrefs': JSON.stringify({ enabled: true }) }) })
    await tab('You')
    expect(screen.getByTestId('daily-verse')).toBeTruthy()
    await fireEvent(screen.getByTestId('verse-toggle'), 'valueChange', false)
    expect(screen.queryByTestId('daily-verse')).toBeNull()
  })
})

describe('Gemini r5: follow-ups never outlive their urge', () => {
  const spyAppState = () => {
    const handlers = new Set()
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, f) => { handlers.add(f); return { remove() { handlers.delete(f) } } })
    return (st) => handlers.forEach((f) => f(st))
  }
  const pending = (storage) => JSON.parse(storage.getItem('urgewalk.v1.followUp') || '{}').pending ?? null

  test('toast Undo cancels the follow-up', async () => {
    const { device, storage } = await renderApp()
    await logUrge()
    expect(pending(storage)).not.toBeNull()
    await press('toast-undo')
    expect(device.calls.followUpCancels).toBe(1)
    expect(pending(storage)).toBeNull()
  })

  test('deleting the entry in Track cancels its follow-up', async () => {
    const { device, storage } = await renderApp()
    await logUrge()
    await tab('Track')
    await fireEvent.press(screen.getAllByTestId('log-entry')[0])
    await press('detail-delete')
    await press('confirm-ok')
    expect(device.calls.followUpCancels).toBe(1)
    expect(pending(storage)).toBeNull()
  })

  test('walk backgrounded then cancelled cancels its follow-up', async () => {
    const onChange = spyAppState()
    const { device, storage } = await renderApp()
    await press('ride-button'); await press('ride-walk')
    await act(async () => { onChange('background') })
    expect(device.calls.followUps).toHaveLength(1)
    await act(async () => { onChange('active') })
    await press('walk-cancel'); await press('confirm-ok')
    expect(device.calls.followUpCancels).toBe(1)
    expect(pending(storage)).toBeNull()
  })

  test('Breathe backgrounded then cancelled cancels its follow-up', async () => {
    const onChange = spyAppState()
    const { device, storage } = await renderApp()
    await press('ride-button'); await press('ride-breathe')
    await act(async () => { onChange('background') })
    expect(device.calls.followUps).toHaveLength(1)
    await act(async () => { onChange('active') })
    await press('breathe-cancel')
    expect(device.calls.followUpCancels).toBe(1)
    expect(pending(storage)).toBeNull()
  })

  test('the reasons lock label says where it applies', async () => {
    await renderApp()
    await tab('You'); await press('reasons-row')
    expect(screen.getByText('Stays covered on Walk and Breathe until you unlock it.')).toBeTruthy()
  })
})

describe('optional whole-app lock', () => {
  const lockedStorage = () => memoryStorage({ ...habitsSeed(), ...onboardedProfile(), 'urgewalk.v1.appLock': JSON.stringify({ enabled: true }) })
  const spyAppState = () => {
    const handlers = new Set()
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, f) => { handlers.add(f); return { remove() { handlers.delete(f) } } })
    return async (s) => { await act(async () => { handlers.forEach((f) => f(s)) }) }
  }

  test('off by default: no cover, no prompt', async () => {
    const { device } = await renderApp()
    expect(screen.queryByTestId('lock-cover')).toBeNull()
    expect(device.calls.appAuths).toBe(0)
    await tab('You')
    expect(screen.getByTestId('app-lock-toggle').props.value).toBe(false)
  })

  test('turning it on needs a successful check first', async () => {
    let result = { ok: false, reason: 'failed' }
    const device = stubDevice({ appAuth: () => result })
    const { storage } = await renderApp({ device })
    await tab('You')
    await act(async () => { fireEvent(screen.getByTestId('app-lock-toggle'), 'valueChange', true) })
    expect(screen.getByTestId('app-lock-note')).toHaveTextContent('That didn’t unlock. You can try again.')
    expect(screen.getByTestId('app-lock-toggle').props.value).toBe(false)
    expect(storage.getItem('urgewalk.v1.appLock')).toBeFalsy()
    result = { ok: false, reason: 'unavailable' }
    await act(async () => { fireEvent(screen.getByTestId('app-lock-toggle'), 'valueChange', true) })
    expect(screen.getByTestId('app-lock-note')).toHaveTextContent(/Set up Face ID or a passcode/)
    result = { ok: true }
    await act(async () => { fireEvent(screen.getByTestId('app-lock-toggle'), 'valueChange', true) })
    expect(screen.getByTestId('app-lock-toggle').props.value).toBe(true)
    expect(JSON.parse(storage.getItem('urgewalk.v1.appLock')).enabled).toBe(true)
    expect(screen.queryByTestId('lock-cover')).toBeNull()
    await act(async () => { fireEvent(screen.getByTestId('app-lock-toggle'), 'valueChange', false) })
    expect(JSON.parse(storage.getItem('urgewalk.v1.appLock')).enabled).toBe(false)
    expect(device.calls.appAuths).toBe(3)
  })

  test('cold start asks; a failed check keeps the cover with Unlock and 988', async () => {
    let result = { ok: false, reason: 'failed' }
    const device = stubDevice({ appAuth: () => result })
    await renderApp({ storage: lockedStorage(), device })
    await act(async () => {})
    expect(device.calls.appAuths).toBe(1)
    expect(screen.getByTestId('lock-cover')).toBeTruthy()
    expect(screen.getByTestId('lock-error')).toHaveTextContent('That didn’t unlock. You can try again.')
    expect(screen.getByTestId('lock-988')).toHaveTextContent(/988/)
    await press('lock-988-call')
    expect(device.calls.urls).toContain('tel:988')
    await press('lock-988-text')
    expect(device.calls.urls).toContain('sms:988')
    result = { ok: true }
    await act(async () => { fireEvent.press(screen.getByTestId('lock-unlock')) })
    expect(screen.queryByTestId('lock-cover')).toBeNull()
  })

  test('background then active locks again and asks; inactive only hides', async () => {
    const send = spyAppState()
    const { device } = await renderApp({ storage: lockedStorage() })
    await act(async () => {})
    expect(screen.queryByTestId('lock-cover')).toBeNull()
    await send('inactive')
    expect(screen.getByTestId('lock-cover')).toBeTruthy()
    expect(screen.queryByTestId('lock-unlock')).toBeNull()
    expect(screen.getByTestId('lock-988')).toBeTruthy()
    await send('active')
    expect(screen.queryByTestId('lock-cover')).toBeNull()
    expect(device.calls.appAuths).toBe(1)
    await send('background')
    expect(screen.getByTestId('lock-cover')).toBeTruthy()
    await send('active')
    expect(device.calls.appAuths).toBe(2)
    expect(screen.queryByTestId('lock-cover')).toBeNull()
  })
})
