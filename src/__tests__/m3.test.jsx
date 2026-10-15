import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppRoot } from '../AppRoot.jsx'
import { buildBackup } from '../lib/backup.js'
import { loadJournal } from '../lib/journal.js'
import { loadProfile } from '../lib/profile.js'
import { buildLoggedRecord, buildBreatheRecord, loadWalks } from '../lib/walkStorage.js'
import { clampISO } from '../ui/DatePicker.jsx'
import { DAY, fakeClock, habitsSeed, iso, memoryStorage, onboardedProfile, stubDevice, T0, youEl } from './helpers.js'

const renderApp = async (opts = {}) => {
  const storage = opts.storage ?? memoryStorage(habitsSeed())
  const device = opts.device ?? stubDevice()
  const clock = opts.clock ?? fakeClock()
  await render(<AppRoot storage={storage} device={device} clock={clock} scheme={opts.scheme ?? 'system'} />)
  return { storage, device, clock }
}
// Log and Journal live in the Track tab behind a Log | Journal switch.
async function tab(name) {
  if (name === 'Log' || name === 'Journal') {
    await fireEvent.press(screen.getByRole('tab', { name: 'Track' }))
    return fireEvent.press(screen.getByTestId(`track-${name.toLowerCase()}`))
  }
  return fireEvent.press(screen.getByRole('tab', { name }))
}
const walksSeed = (list) => ({ 'urgewalk.v1.walks': JSON.stringify({ version: 1, walks: list }) })
const logged = (daysAgo, result, note = '', id = `w${daysAgo}${result}`) => buildLoggedRecord({ id, at: T0 - daysAgo * DAY, note, result })

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(T0) })
afterEach(() => { jest.useRealTimers() })

describe('Home extras', () => {
  it('identity line, daily line, never-zero, and the clean-time page with milestone cards', async () => {
    const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile({ identity: 'waves', why: 'For a quiet morning' }) })
    await renderApp({ storage })
    expect(screen.getByTestId('identity-line').props.children).toBe('Someone riding it out, wave by wave')
    expect(screen.getByTestId('daily-line')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('pager-dot-1'))
    expect(screen.getByTestId('clean-time-value').props.accessibilityLabel).toMatch(/^163 days/)
    expect(screen.getByTestId('ms-last')).toHaveTextContent(/90 days|3 months/i)
    expect(screen.getByTestId('ms-next')).toHaveTextContent(/6 months/i)
    expect(screen.queryByTestId('nz-clean')).toBeNull() // Never zero lives on Track → Log now
    await tab('Log')
    expect(screen.getByTestId('nz-clean')).toHaveTextContent('30 of 30')
  })

  it('a newly reached milestone shows one calm sheet, once', async () => {
    const seed = { ...habitsSeed('2030-05-07'), 'urgewalk.v1.milestones': JSON.stringify({ version: 1, trackers: { h1: { earned: {}, seen: [] } } }) }
    const { storage } = await renderApp({ storage: memoryStorage(seed) })
    expect(screen.getByTestId('milestone-sheet')).toHaveTextContent(/7 days clean/)
    await fireEvent.press(screen.getByTestId('milestone-done'))
    expect(screen.queryByTestId('milestone-sheet')).toBeNull()
    expect(JSON.parse(storage.getItem('urgewalk.v1.milestones')).trackers.h1.seen).toContain(7)
  })

  it('Start a new count: kept list, then the 24h undo banner puts the date back', async () => {
    const { storage } = await renderApp()
    await fireEvent.press(screen.getByTestId('home-title'))
    await fireEvent.press(screen.getByTestId('home-edit'))
    await fireEvent.press(screen.getByTestId('edit-0'))
    await fireEvent.press(screen.getByTestId('start-new-count'))
    expect(screen.getByTestId('reset-sheet')).toHaveTextContent(/Walks, journal and milestones stay/)
    await fireEvent.press(screen.getByTestId('reset-go'))
    expect(screen.getByTestId('hero-days').props.children).toBe('0')
    expect(screen.getByTestId('undo-banner')).toHaveTextContent(/Free, until/)
    await fireEvent.press(screen.getByTestId('undo-banner-undo'))
    expect(screen.getByTestId('hero-days').props.children).toBe('163')
    expect(JSON.parse(storage.getItem('urgewalk.v1.habits')).habits[0].startDate).toBe('2029-12-02')
  })

  it('no backup nudge on Home; the drawer bottom row shows where data lives and opens Backup', async () => {
    const seed = { ...habitsSeed(), 'urgewalk.v1.backupMeta': JSON.stringify({ lastBackupAt: iso(T0 - 20 * DAY) }) }
    await renderApp({ storage: memoryStorage(seed) })
    expect(screen.queryByTestId('backup-nudge')).toBeNull()
    await fireEvent.press(screen.getByTestId('home-title'))
    expect(screen.getByTestId('drawer-backup')).toHaveTextContent('On this phone only · Last backup 20 days agoBack up')
    await fireEvent.press(screen.getByTestId('drawer-backup'))
    expect(screen.queryByTestId('drawer')).toBeNull()
    expect(screen.getByTestId('backup')).toBeTruthy()
  })
})

describe('Your walks card (Week / Month / All time) with the calm Week total', () => {
  it('Week shows one total of days with an urge passed, no run brackets; Month and All time switch the card only', async () => {
    const seed = { ...habitsSeed(), ...walksSeed([logged(0, 'yes'), logged(1, 'yes'), logged(2, 'yes'), logged(4, 'no')]) }
    const { storage } = await renderApp({ storage: memoryStorage(seed) })
    expect(screen.queryByTestId('walks-card')).toBeNull() // moved off Home (five-item limit)
    await tab('Log')
    expect(screen.queryByTestId('day-run')).toBeNull()
    expect(screen.getByTestId('week-passed-days')).toHaveTextContent('3days with an urge passed')
    expect(screen.getByTestId('week-passed-days').props.accessibilityLabel).toBe('3 days with an urge passed this week')
    expect(screen.getByTestId('chip-passed')).toHaveTextContent(/^3/)
    expect(screen.getByTestId('chip-streak')).toHaveTextContent(/163/)
    await fireEvent.press(screen.getByTestId('range-month'))
    expect(screen.queryByTestId('week-passed-days')).toBeNull()
    expect(screen.getByText('3-day avg · urges ridden out')).toBeTruthy()
    expect(JSON.parse(storage.getItem('urgewalk.v1.homePrefs')).walksRange).toBe('month')
    await fireEvent.press(screen.getByTestId('range-all'))
    await tab('Home')
    expect(screen.getByTestId('hero-days').props.children).toBe('163') // the ring never changes with the range
  })
})

describe('Log', () => {
  it('empty: one line and a Ride it out button', async () => {
    await renderApp()
    await tab('Log')
    expect(screen.getByTestId('log-empty')).toHaveTextContent(/Urges you ride out will show up here/)
    await fireEvent.press(screen.getByTestId('log-ride'))
    expect(screen.getByTestId('ride-sheet')).toBeTruthy()
  })

  it('summary, this week, history; edit an entry; delete asks first', async () => {
    const seed = { ...habitsSeed(), ...walksSeed([logged(0, 'yes', 'Called a friend', 'a'), logged(1, 'kinda', '', 'b')]) }
    const { storage } = await renderApp({ storage: memoryStorage(seed) })
    await tab('Log')
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2 urges ridden out')
    expect(screen.getAllByTestId('day-ring')).toHaveLength(7)
    expect(screen.getAllByTestId('log-entry')).toHaveLength(2)
    await fireEvent.press(screen.getAllByTestId('log-entry')[1])
    await fireEvent.press(screen.getByTestId('detail-outcome-yes'))
    await fireEvent.changeText(screen.getByTestId('detail-note'), 'Edited note')
    await fireEvent.press(screen.getByTestId('detail-save'))
    expect(loadWalks(storage).walks.find((w) => w.id === 'b')).toMatchObject({ result: 'yes', note: 'Edited note' })
    await fireEvent.press(screen.getAllByTestId('log-entry')[0])
    await fireEvent.press(screen.getByTestId('detail-delete'))
    expect(screen.getByText('Delete this entry?')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(loadWalks(storage).walks.map((w) => w.id)).toEqual(['b'])
  })
})

describe('Journal', () => {
  it('write an entry (autosaved draft), search it, edit it, delete it', async () => {
    const { storage } = await renderApp()
    await tab('Journal')
    await fireEvent.press(screen.getByTestId('journal-new'))
    expect(screen.queryByRole('tab', { name: 'Home' })).toBeNull() // tab bar hides while writing
    await fireEvent.changeText(screen.getByTestId('editor-title'), 'Low tide')
    await fireEvent.changeText(screen.getByTestId('editor-body'), 'Walked to the pier and back.')
    await fireEvent.press(screen.getByTestId('mood-good'))
    expect(screen.getByTestId('draft-status').props.children).toBe('Draft saved on this phone')
    expect(JSON.parse(storage.getItem('urgewalk.v1.journalDraft')).title).toBe('Low tide')
    await fireEvent.press(screen.getByTestId('editor-done'))
    expect(loadJournal(storage).entries).toHaveLength(1)
    expect(storage.getItem('urgewalk.v1.journalDraft')).toBeNull()
    await fireEvent.changeText(screen.getByTestId('journal-search'), 'pier')
    expect(screen.getAllByTestId('journal-item')).toHaveLength(1)
    await fireEvent.changeText(screen.getByTestId('journal-search'), 'mountain')
    expect(screen.getByTestId('no-results')).toBeTruthy()
    await fireEvent.changeText(screen.getByTestId('journal-search'), '')
    await fireEvent.press(screen.getAllByTestId('journal-item')[0])
    await fireEvent.press(screen.getByTestId('editor-delete'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(loadJournal(storage).entries).toHaveLength(0)
  })

  it('an unfinished draft comes back; discarding asks first', async () => {
    const seed = { ...habitsSeed(), 'urgewalk.v1.journalDraft': JSON.stringify({ entryId: null, startedAt: iso(T0), title: 'Half', body: 'written', mood: null }) }
    await renderApp({ storage: memoryStorage(seed) })
    await tab('Journal')
    expect(screen.getByTestId('draft-status').props.children).toBe('Draft restored')
    await fireEvent.press(screen.getByTestId('editor-close'))
    expect(screen.getByText('Discard this entry?')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('confirm-cancel'))
    expect(screen.getByTestId('journal-editor')).toBeTruthy()
  })

  it('a walk note shows in the Journal and opens that walk in the Log', async () => {
    const seed = { ...habitsSeed(), ...walksSeed([logged(0, 'yes', 'Sea air helped', 'n1')]) }
    await renderApp({ storage: memoryStorage(seed) })
    await tab('Journal')
    expect(screen.getByText('🌊 Urge note')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('journal-item'))
    expect(screen.getByTestId('walk-detail')).toBeTruthy()
    expect(screen.getByTestId('detail-note').props.value).toBe('Sea air helped')
  })
})

describe('You', () => {
  it('Appearance: Dark is remembered and recolours the app', async () => {
    const { storage } = await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'theme-dark')))
    expect(storage.getItem('urgewalk.v1.theme')).toBe('dark')
    expect((await youEl(screen, fireEvent, 'theme-dark')).props.accessibilityState.checked).toBe(true)
    await fireEvent.press((await youEl(screen, fireEvent, 'theme-system')))
    expect(storage.getItem('urgewalk.v1.theme')).toBeNull()
  })

  it('your answers: edit one in a sheet; the why then shows on Ride it out', async () => {
    const { storage } = await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'answers-toggle')))
    await fireEvent.press(screen.getByTestId('answer-why'))
    await fireEvent.changeText(screen.getByTestId('why'), 'Clear head')
    await fireEvent.press(screen.getByTestId('answer-save'))
    expect(loadProfile(storage).why).toBe('Clear head')
    await fireEvent.press(screen.getByTestId('ride-button'))
    expect(screen.getByTestId('ride-why')).toHaveTextContent('“Clear head”')
  })

  it('time back + money estimate, from the setup answers', async () => {
    const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile({ before: { daysPerWeek: 7, timesPerDay: 1 } }) })
    await renderApp({ storage })
    await tab('You')
    expect((await youEl(screen, fireEvent, 'tb-hours'))).toHaveTextContent('160') // 163 days ≈ 23.3 weeks × 7 × 1 × 1h, rounded to 10
    await fireEvent.press((await youEl(screen, fireEvent, 'tb-money-edit')))
    await fireEvent.changeText(screen.getByTestId('adjust-money'), '12')
    await fireEvent.press(screen.getByTestId('adjust-save'))
    expect((await youEl(screen, fireEvent, 'tb-money'))).toHaveTextContent('$1,960')
  })

  it('crisis lines, trusted contact, and Privacy / Terms / Support open outside the app', async () => {
    const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile({ support: 'trusted', trustedName: 'Sam', trustedPhone: '(555) 123-4567' }) })
    const { device } = await renderApp({ storage })
    await tab('You')
    await fireEvent.press(await youEl(screen, fireEvent, 'you-reach-text-0'))
    await fireEvent.press((await youEl(screen, fireEvent, 'legal-0')))
    await fireEvent.press((await youEl(screen, fireEvent, 'legal-1')))
    await fireEvent.press((await youEl(screen, fireEvent, 'legal-2')))
    await fireEvent.press((await youEl(screen, fireEvent, 'crisis-row')))
    await fireEvent.press(screen.getByTestId('crisis-link-tel:988'))
    expect(device.calls.texts).toHaveLength(1)
    expect(device.calls.texts[0].phone).toBe('5551234567')
    expect(device.calls.urls).toEqual([
      'https://dariusdtatum-tech.github.io/urgewalk/privacy.html',
      'https://dariusdtatum-tech.github.io/urgewalk/terms.html',
      'https://dariusdtatum-tech.github.io/urgewalk/support.html',
      'tel:988',
    ])
  })

  it('walk length: Custom with a stepper, used by Walk', async () => {
    const { storage } = await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'walk-length')))
    await fireEvent.press(screen.getByTestId('length-custom'))
    await fireEvent.press(screen.getByTestId('custom-minutes-more'))
    expect(JSON.parse(storage.getItem('urgewalk.v1.walkPrefs'))).toMatchObject({ choice: 'custom', customMinutes: 21 })
  })
})

describe('Backup & restore (format 1)', () => {
  it('Export hands the format-1 file to the share sheet and records the time', async () => {
    const { device, storage } = await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'backup-row')))
    await fireEvent.press(screen.getByTestId('export'))
    expect(device.calls.shared).toHaveLength(1)
    expect(device.calls.shared[0].filename).toBe('urge-walk-backup-2030-05-14.json')
    expect(JSON.parse(device.calls.shared[0].text)).toMatchObject({ app: 'urge-walk', format: 1 })
    expect(screen.getByTestId('last-backup')).toHaveTextContent(/^Last backup: May 14, 2030/)
    expect(JSON.parse(storage.getItem('urgewalk.v1.backupMeta')).lastBackupAt).toBeTruthy()
  })

  it('Import shows what is inside, asks, replaces, and can be undone', async () => {
    const other = memoryStorage({ ...habitsSeed('2030-01-01'), ...walksSeed([logged(3, 'yes', 'from the file', 'f1')]) })
    const text = JSON.stringify(buildBackup(other, T0 - DAY))
    const { storage } = await renderApp({ device: stubDevice({ file: { size: text.length, text } }) })
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'backup-row')))
    await fireEvent.press(screen.getByTestId('import'))
    expect(screen.getByText('Replace everything on this phone?')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(screen.getByTestId('backup-msg')).toHaveTextContent(/^Backup restored/)
    expect(loadWalks(storage).walks.map((w) => w.id)).toEqual(['f1'])
    await fireEvent.press(screen.getByTestId('undo-import'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(loadWalks(storage).walks).toHaveLength(0)
  })

  it('a file that is not a backup is refused and nothing changes', async () => {
    const { storage } = await renderApp({ device: stubDevice({ file: { size: 10, text: '{"hello":1}' } }) })
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'backup-row')))
    await fireEvent.press(screen.getByTestId('import'))
    expect(screen.getByTestId('backup-msg')).toHaveTextContent('This file isn’t an Urge Walk backup.')
    expect(JSON.parse(storage.getItem('urgewalk.v1.habits')).habits).toHaveLength(1)
  })
})

describe('Reset (safe)', () => {
  it('nothing is erased unless the person confirms the file was saved', async () => {
    const { storage, device } = await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'reset-app')))
    await fireEvent.press(screen.getByTestId('confirm-ok')) // Save backup and reset
    expect(device.calls.shared).toHaveLength(1)
    expect(screen.getByText('Did the backup file save?')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('confirm-cancel')) // Keep my data
    expect(screen.getByText('Nothing was erased.')).toBeTruthy()
    expect(storage.getItem('urgewalk.v1.habits')).not.toBeNull()
  })

  it('confirmed: everything is erased and setup starts again', async () => {
    const { storage } = await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'reset-app')))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    await fireEvent.press(screen.getByTestId('confirm-ok')) // Yes, erase everything
    expect([...storage._map.keys()].filter((k) => k.startsWith('urgewalk.'))).toEqual([])
    expect(screen.getByTestId('ob-begin')).toBeTruthy()
  })

  it('share failed: asks plainly before erasing without a backup', async () => {
    const { storage } = await renderApp({ device: stubDevice({ share: new Error('no') }) })
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'reset-app')))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(screen.getByText('Backup not saved')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('confirm-cancel'))
    expect(storage.getItem('urgewalk.v1.habits')).not.toBeNull()
  })
})

describe('Onboarding (first run) and the date picker', () => {
  it('walks all 11 screens to the recap and saves on Let’s walk', async () => {
    const { storage } = await renderApp({ storage: memoryStorage() })
    await fireEvent.press(screen.getByTestId('ob-begin'))
    expect(screen.getByTestId('ob-next').props.accessibilityState.disabled).toBe(true) // 18+ first
    await fireEvent.press(screen.getByTestId('ob-adult'))
    await fireEvent.press(screen.getByTestId('ob-next'))
    await fireEvent.press(screen.getByTestId('pick-Gaming'))
    await fireEvent.changeText(screen.getByTestId('riding-search'), 'Late-night snacks')
    await fireEvent.press(screen.getByTestId('riding-add'))
    await fireEvent.press(screen.getByTestId('ob-next'))
    // 04 date: back 10 days with the Day column; never past today
    expect(screen.getByTestId('ob-date-day-more').props.accessibilityState.disabled).toBe(true)
    for (let i = 0; i < 10; i += 1) await fireEvent.press(screen.getByTestId('ob-date-day-less'))
    expect(screen.getByTestId('ob-days')).toHaveTextContent('That’s 10 days.')
    await fireEvent.press(screen.getByTestId('ob-next'))
    await fireEvent.press(screen.getByTestId('ob-dpw-more'))
    await fireEvent.press(screen.getByTestId('ob-tpd-more'))
    await fireEvent.press(screen.getByTestId('ob-next'))
    await fireEvent.press(screen.getByTestId('improve-calm'))
    await fireEvent.press(screen.getByTestId('ob-next'))
    await fireEvent.press(screen.getByTestId('importance-very'))
    await fireEvent.press(screen.getByTestId('ob-next'))
    await fireEvent.press(screen.getByTestId('ob-skip')) // identity
    await fireEvent.press(screen.getByTestId('support-private'))
    await fireEvent.press(screen.getByTestId('ob-next'))
    await fireEvent.changeText(screen.getByTestId('why'), 'Steady days')
    await fireEvent.press(screen.getByTestId('ob-next'))
    expect(screen.getByTestId('ob-progress').props.accessibilityValue).toEqual({ min: 1, max: 11, now: 11 })
    expect(screen.getByTestId('recap-3')).toHaveTextContent(/Gaming, Late-night snacks/)
    expect(screen.getByTestId('recap-9')).toHaveTextContent(/Not set/)
    await fireEvent.press(screen.getByTestId('ob-finish'))
    const habits = JSON.parse(storage.getItem('urgewalk.v1.habits')).habits
    expect(habits.map((h) => [h.name, h.startDate])).toEqual([['Gaming', '2030-05-04'], ['Late-night snacks', '2030-05-04']])
    expect(loadProfile(storage)).toMatchObject({ improve: ['calm'], importance: 'very', support: 'private', why: 'Steady days', before: { daysPerWeek: 1, timesPerDay: 1 } })
    expect(screen.getByTestId('hero-days').props.children).toBe('10')
  })

  it('Restore from a backup on the first screen goes straight Home', async () => {
    const other = memoryStorage({ ...habitsSeed(), ...onboardedProfile() })
    const text = JSON.stringify(buildBackup(other, T0))
    await renderApp({ storage: memoryStorage(), device: stubDevice({ file: { size: text.length, text } }) })
    await fireEvent.press(screen.getByTestId('ob-restore'))
    await fireEvent.press(screen.getByTestId('import'))
    await fireEvent.press(screen.getByTestId('confirm-ok'))
    expect(screen.getByTestId('hero-days').props.children).toBe('163')
  })

  it('Redo setup from You keeps existing trackers and Back returns to You', async () => {
    await renderApp()
    await tab('You')
    await fireEvent.press((await youEl(screen, fireEvent, 'redo-setup')))
    expect(screen.getByLabelText('Setup step 2')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('ob-back'))
    expect(screen.getByTestId('you')).toBeTruthy()
  })

  it('date clamp: never after today, never before the minimum, month ends handled', () => {
    expect(clampISO(2030, 5, 20, '1900-01-01', '2030-05-14')).toBe('2030-05-14')
    expect(clampISO(2030, 2, 31, '1900-01-01', '2030-05-14')).toBe('2030-02-28')
    expect(clampISO(2029, 1, 1, '2029-06-01', '2030-05-14')).toBe('2029-06-01')
  })
})

describe('rules', () => {
  it('no paywall, ads, accounts or sign-in anywhere in You', async () => {
    await renderApp()
    await tab('You')
    const grab = () => screen.getAllByText(/./).map((n) => [].concat(n.props.children).join('')).join(' | ')
    let text = grab()
    for (const id of ['support', 'why', 'progress', 'reminders', 'appearance', 'data']) {
      await fireEvent.press(screen.getByTestId(`you-${id}`)); text += grab(); await fireEvent.press(screen.getByTestId('you-back'))
    }
    expect(text).toMatch(/No ads\. No tracking\. No account\./)
    expect(text).not.toMatch(/premium|subscri|upgrade|sign in|sign up|log in|purchase|streak restore|unlock|trial/i)
  })
  it('breathe still has no motion words with a why set', async () => {
    const storage = memoryStorage({ ...habitsSeed(), ...onboardedProfile({ why: 'Calm' }) })
    await renderApp({ storage })
    await fireEvent.press(screen.getByTestId('ride-button'))
    await fireEvent.press(screen.getByTestId('ride-breathe'))
    const words = screen.getAllByText(/./).map((n) => [].concat(n.props.children).join('')).join(' ')
    expect(screen.getByTestId('breathe-line').props.children).not.toMatch(/walk|step|mov|pace/i)
    expect(words).not.toMatch(/\bwalk/i)
    await act(async () => {})
  })
})
