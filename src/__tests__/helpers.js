// Shared test helpers (not a test file).
export function memoryStorage(seed = {}) {
  const m = new Map(Object.entries(seed))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null, get length() { return m.size }, _map: m,
  }
}
export const T0 = Date.parse('2030-05-14T14:00:00Z') // neutral test date (10:00 New York)
export const habitsSeed = (start = '2029-12-02') => ({ 'urgewalk.v1.habits': JSON.stringify({ habits: [{ id: 'h1', name: 'Habit A', startDate: start }] }) })
export function fakeClock(start = T0) {
  let t = start
  const clock = () => t
  clock.advance = (ms) => { t += ms }
  return clock
}
export function stubDevice({ resetSave = { uri: 'file:///docs/Backups/b.json', shared: 'shared' }, share = 'shared', file = null, picked = null, photo = null, voice = null, unlocked = true, appAuth = { ok: true }, notif = { permission: null, scheduled: null } } = {}) {
  const calls = { texts: [], reminders: [], followUps: [], followUpCancels: 0, tap: 0, press: 0, breathTurn: 0, breathTide: 0, done: 0, alerts: [], shared: [], urls: [], picks: 0, played: [], deleted: [], unlocks: 0, wiped: 0, appAuths: 0, settings: 0 }
  let followUpCb = null
  let checkinCb = null
  return {
    calls,
    scheduleFollowUp(urgeId) { calls.followUps.push(urgeId); return Promise.resolve(true) },
    cancelFollowUp() { calls.followUpCancels += 1; return Promise.resolve() },
    onFollowUp(cb) { followUpCb = cb; return () => { followUpCb = null } },
    emitFollowUp(r) { followUpCb?.(r) },
    textContact(phone, message) { calls.texts.push({ phone, message }); return Promise.resolve('composer') },
    pickContact() { return Promise.resolve(picked) },
    pickReasonPhoto() { return Promise.resolve({ uri: photo }) },
    startVoice() { return Promise.resolve(Boolean(voice)) },
    stopVoice() { return Promise.resolve(voice) },
    playVoice(uri) { calls.played.push(uri) },
    stopPlaying() {},
    deleteReasonFile(uri) { calls.deleted.push(uri) },
    deleteAllReasonFiles() { calls.wiped++ },
    notificationStatus() { return Promise.resolve(typeof notif === 'function' ? notif() : notif) },
    openSettings() { calls.settings++ },
    authenticateApp() { calls.appAuths++; return Promise.resolve(typeof appAuth === 'function' ? appAuth() : appAuth) },
    unlockReasons() { calls.unlocks++; return Promise.resolve(unlocked) },
    syncCheckinReminder(r) { calls.reminders.push(r); return Promise.resolve(true) },
    onCheckinReminder(cb) { checkinCb = cb; return () => { checkinCb = null } },
    emitCheckinReminder() { checkinCb?.() },
    shareBackup(text, filename) { calls.shared.push({ text, filename }); return share instanceof Error ? Promise.reject(share) : Promise.resolve(share) },
    saveResetBackup(text, filename) { calls.resetSaves = (calls.resetSaves ?? 0) + 1; calls.shared.push({ text, filename }); return resetSave instanceof Error ? Promise.reject(resetSave) : Promise.resolve(resetSave) },
    pickBackupFile() { calls.picks += 1; return Promise.resolve(file) },
    openURL(url) { calls.urls.push(url) },
    tap() { calls.tap += 1 }, press() { calls.press += 1 }, breathTurn() { calls.breathTurn += 1 }, breathTide() { calls.breathTide += 1 }, done() { calls.done += 1 },
    syncWalkAlert(walk, now) { calls.alerts.push({ walk, now }); return Promise.resolve(null) },
  }
}

export const onboardedProfile = (extra = {}) => ({ 'urgewalk.v1.profile': JSON.stringify({ version: 1, onboardedAt: '2030-05-01T12:00:00.000Z', skipped: false, adultConfirmed: true, ...extra }) })
export const iso = (ms) => new Date(ms).toISOString()
export const DAY = 86400000

// You is six rows (Option C). Tests reach a control inside a section with youEl(screen, fireEvent, testID):
// it opens the right section (going back first if another is open) and returns the element.
export const YOU_SECTION_OF = {
  'crisis-row': 'support', 'you-reach': 'support', 'you-reach-text-0': 'support', 'you-reach-call-0': 'support', 'contacts-row': 'support',
  'reasons-row': 'why', 'kept-card': 'progress', 'kept-money': 'progress', 'kept-goal': 'progress', 'money-toggle': 'progress', 'money-row': 'progress', 'time-back': 'progress', 'tb-hours': 'progress', 'tb-money': 'progress', 'tb-money-edit': 'progress', 'switcher-setting': 'appearance', 'switcher-drawer': 'appearance', 'switcher-sheet': 'appearance', 'kept-money-edit': 'progress', 'tb-adjust': 'progress', 'tb-formula': 'progress', 'answers-toggle': 'why', 'redo-setup': 'why',
  'trackers-row': 'progress', 'milestones-row': 'progress', 'walk-length': 'progress',
  'notify-row': 'reminders', 'followup-toggle': 'reminders', 'checkin-reminder': 'reminders', 'checkin-time-more': 'reminders', 'checkin-time-less': 'reminders',
  'theme-system': 'appearance', 'theme-light': 'appearance', 'theme-dark': 'appearance', 'verse-toggle': 'appearance', 'app-lock-toggle': 'appearance', 'app-lock-note': 'appearance',
  'backup-row': 'data', 'reset-app': 'data', 'free-row': 'data', 'legal-0': 'data', 'legal-1': 'data', 'legal-2': 'data', 'app-version': 'data', 'legal-links': 'data',
}
export async function youEl(screen, fireEvent, id) {
  const here = screen.queryByTestId(id)
  if (here) return here
  const section = YOU_SECTION_OF[id]
  if (!screen.queryByTestId(`you-${section}`) && screen.queryByTestId('you-back')) await fireEvent.press(screen.getByTestId('you-back'))
  await fireEvent.press(screen.getByTestId(`you-${section}`))
  return screen.getByTestId(id)
}

// The left drawer is behind You → Appearance and lock → Tracker switcher: Drawer (the sheet is the default).
export const drawerPref = () => ({ 'urgewalk.v1.switcherPrefs': JSON.stringify({ style: 'drawer' }) })
