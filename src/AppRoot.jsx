import { useCallback, useEffect, useRef, useState } from 'react'
import { useStorage as useStorageFromContext } from './ui/StorageContext.js'
import { AppState, Pressable, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { loadTheme, saveTheme } from './lib/appearance.js'
import { hasAnyData } from './lib/backup.js'
import { markSaved, markStress } from './lib/calm.js'
import { answerFollowUp, cancelFollowUpFor, claimFollowUp, settleFollowUpDefault } from './lib/followUp.js'
import { resolveOnboarding } from './lib/profile.js'
import { readObject, writeObject } from './lib/storage.js'
import { BREATHE_SAVED_MESSAGES, GROUND_SAVED_MESSAGES, LOGGED_SAVED_MESSAGE } from './lib/walkMessages.js'
import { startWalkNow } from './lib/walkStart.js'
import { makeId } from './lib/storage.js'
import { appendWalk, buildBreatheRecord, buildGroundRecord, buildLoggedRecord, loadActiveWalk, removeWalk } from './lib/walkStorage.js'
import { isEnded } from './lib/walkTimer.js'
import { withKept } from './lib/money.js'
import { loadProfile } from './lib/profile.js'
import { LOCK_ERRORS, loadAppLock, lockView } from './lib/appLock.js'
import { LockCover } from './screens/LockCover.jsx'
import { BreatheScreen } from './screens/BreatheScreen.jsx'
import { GroundScreen } from './screens/GroundScreen.jsx'
import { BackupScreen } from './screens/BackupScreen.jsx'
import { HomeScreen } from './screens/HomeScreen.jsx'
import { CommunityScreen } from './screens/CommunityScreen.jsx'
import { TrackScreen } from './screens/TrackScreen.jsx'
import { Onboarding } from './screens/onboarding/Onboarding.jsx'
import { CheckInSheet } from './screens/CheckInSheet.jsx'
import { FollowUpSheet } from './screens/FollowUpSheet.jsx'
import { RideSheet } from './screens/RideSheet.jsx'
import { WalkScreen } from './screens/WalkScreen.jsx'
import { YouScreen } from './screens/YouScreen.jsx'
import { DeviceContext, noopDevice, useDevice } from './ui/DeviceContext.js'
import { StorageContext } from './ui/StorageContext.js'
import { RideCoachmark, TabBar } from './ui/TabBar.jsx'
import { T } from './ui/Text.jsx'
import { SchemeContext, useTheme } from './ui/theme.js'

export const LP_TIP_KEY = 'urgewalk.v1.longPressTipSeen' // { at, coachmarkDone? }
const TOAST_MS = 6500

function Shell({ clock, theme, onTheme }) {
  const { c, scheme } = useTheme()
  const insets = useSafeAreaInsets()
  const storage = useStorageFromContext()
  const device = useDevice()
  const [tab, setTab] = useState('home')
  const [trackView, setTrackView] = useState('log') // Track: 'log' | 'journal'
  useState(() => settleFollowUpDefault(storage, hasAnyData(storage)))
  const [screen, setScreen] = useState(() => (loadActiveWalk(storage) ? 'walk' : 'tabs'))
  const [showRide, setShowRide] = useState(false)
  const [toast, setToast] = useState(null) // { text, undoId? }
  const [lpTip, setLpTip] = useState(false)
  const [coachmark, setCoachmark] = useState(false)
  const [dataVer, setDataVer] = useState(0)
  const [now, setNow] = useState(clock)
  // Setup: 'new' on first run (no data, no profile), 'redo' from You, or null. Existing users skip it.
  const [onboarding, setOnboarding] = useState(() => (resolveOnboarding({ hasData: hasAnyData(storage) }, storage, clock()) ? 'new' : null))
  const [obBackup, setObBackup] = useState(false)
  const [backup, setBackup] = useState(false) // the Backup screen, opened from Home or You
  const [journalEditing, setJournalEditing] = useState(false)
  const [focusWalkId, setFocusWalkId] = useState(null)
  const [checkIn, setCheckIn] = useState(false)
  // Optional app lock (off by default). Locks at cold start and when coming back from the background.
  const [lockOn, setLockOn] = useState(() => loadAppLock(storage))
  const [locked, setLocked] = useState(() => loadAppLock(storage))
  const [appState, setAppState] = useState('active')
  const [lockError, setLockError] = useState('')
  const lastAppState = useRef('active')
  const unlockApp = useCallback(async () => {
    const r = await device.authenticateApp()
    if (r?.ok) { setLocked(false); setLockError('') } else setLockError(LOCK_ERRORS[r?.reason] ?? LOCK_ERRORS.failed)
  }, [device])
  useEffect(() => { if (loadAppLock(storage)) unlockApp() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Only a real trip to the background re-locks (the Face ID prompt itself makes the app 'inactive').
    const sub = AppState.addEventListener?.('change', (st) => {
      const prev = lastAppState.current
      lastAppState.current = st
      setAppState(st)
      if (!loadAppLock(storage)) return
      if (st === 'background') setLocked(true)
      if (st === 'active' && prev === 'background') unlockApp()
    })
    return () => sub?.remove?.()
  }, [storage, unlockApp])
  const lock = lockView({ enabled: lockOn, locked, appState })
  const [followUpFor, setFollowUpFor] = useState(null) // urge id when the follow-up sheet is open
  const groundId = useRef(null) // the urge id for the Ground in progress
  const breatheId = useRef(null) // the urge id for the Breathe minute in progress
  const screenRef = useRef(screen)
  screenRef.current = screen

  useEffect(() => { const t = setInterval(() => setNow(clock()), 30_000); return () => clearInterval(t) }, [clock])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  // "How did it go?": one local notification ~30 min after an urge (max one per urge, switch in You).
  const followUp = useCallback((urgeId) => { if (claimFollowUp(urgeId, storage, clock())) device.scheduleFollowUp(urgeId) }, [storage, clock, device])
  // The urge is gone: drop its follow-up (and the scheduled notification if it was the pending one).
  const dropFollowUp = useCallback((urgeId) => { if (cancelFollowUpFor(urgeId, storage)) device.cancelFollowUp() }, [storage, device])
  // Leaving the app partway through a walk or Breathe counts as the end of Ride it out for this.
  useEffect(() => {
    const sub = AppState.addEventListener?.('change', (state) => {
      if (state === 'active') return
      if (screenRef.current === 'walk') { const live = loadActiveWalk(storage); if (live) followUp(live.id) }
      else if (screenRef.current === 'breathe' && breatheId.current) followUp(breatheId.current)
      else if (screenRef.current === 'ground' && groundId.current) followUp(groundId.current)
    })
    return () => sub?.remove?.()
  }, [storage, followUp])
  const applyFollowUp = useCallback((urgeId, action) => {
    setFollowUpFor(null)
    if (action === 'open') { setFollowUpFor(urgeId); return }
    answerFollowUp(urgeId, action, storage)
    setDataVer((v) => v + 1)
    if (action === 'tough') { setScreen((sc) => (sc === 'walk' || sc === 'breathe' || sc === 'ground' ? sc : 'tabs')); if (!loadActiveWalk(storage)) setShowRide(true) }
    else if (action === 'passed') setToast({ text: 'Glad it passed. Saved to that entry.' })
  }, [storage])
  useEffect(() => device.onCheckinReminder(() => { if (screenRef.current === 'tabs') setCheckIn(true) }), [device])
  useEffect(() => device.onFollowUp(({ urgeId, action }) => applyFollowUp(urgeId, action)), [device, applyFollowUp])

  const goTo = useCallback((t) => { setFocusWalkId(null); setBackup(false); setTab(t); setNow(clock()); setDataVer((v) => v + 1) }, [clock])
  const backHome = useCallback(() => { setScreen('tabs'); goTo('home') }, [goTo])
  const exitWalk = useCallback(() => setScreen((s) => (s === 'walk' ? 'tabs' : s)), [])

  function startWalk() {
    startWalkNow(storage, clock())
    markStress(clock(), storage)
    setToast(null); setShowRide(false); setScreen('walk')
  }
  function onRideHold() {
    const live = loadActiveWalk(storage)
    if (live && !isEnded(live)) { setScreen('walk'); return }
    device.press()
    if (!readObject(LP_TIP_KEY, storage)) { writeObject(LP_TIP_KEY, { at: clock() }, storage); setLpTip(true) }
    startWalk()
  }
  function onRide() {
    device.tap()
    if (loadActiveWalk(storage)) { setScreen('walk'); return }
    markStress(clock(), storage)
    setShowRide(true)
  }
  function onLog(note, result, tags) {
    const record = buildLoggedRecord({ at: clock(), note, result, tags })
    appendWalk(record, storage)
    markSaved(record.id, clock(), storage)
    setShowRide(false)
    device.done()
    followUp(record.id)
    setToast({ text: withKept(result === 'yes' ? LOGGED_SAVED_MESSAGE : 'Saved. An honest log still counts.', loadProfile(storage), result), undoId: record.id })
    setDataVer((v) => v + 1)
  }
  function onWalkSaved(text, record) {
    markSaved(null, clock(), storage)
    device.done()
    if (record) followUp(record.id)
    setToast({ text: withKept(text, loadProfile(storage), record?.result) })
    if (lpTip) { setLpTip(false); const seen = readObject(LP_TIP_KEY, storage); if (seen && !seen.coachmarkDone) setCoachmark(true) }
    backHome()
  }
  function onBreatheSaved({ startedAt, endedAt, result, note, tags }) {
    const record = buildBreatheRecord({ id: breatheId.current || makeId(), startedAt, endedAt, result, note, tags })
    appendWalk(record, storage)
    breatheId.current = null
    markSaved(null, clock(), storage)
    device.done()
    followUp(record.id)
    setToast({ text: withKept(BREATHE_SAVED_MESSAGES[result || 'skip'], loadProfile(storage), result) })
    backHome()
  }
  function onGroundSaved({ startedAt, endedAt, result, note, tags, completed }) {
    const record = buildGroundRecord({ id: groundId.current || makeId(), startedAt, endedAt, result, note, tags, completed })
    appendWalk(record, storage)
    groundId.current = null
    markSaved(null, clock(), storage)
    device.done()
    followUp(record.id)
    setToast({ text: withKept(GROUND_SAVED_MESSAGES[result || 'skip'], loadProfile(storage), result) })
    backHome()
  }
  function dismissCoachmark() {
    writeObject(LP_TIP_KEY, { ...(readObject(LP_TIP_KEY, storage) || {}), coachmarkDone: true }, storage)
    setCoachmark(false)
  }

  const openBackup = () => setBackup(true)

  // ---------- Setup ----------
  if (onboarding && obBackup) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {lock.cover ? <LockCover unlockable={lock.unlockable} error={lockError} onUnlock={unlockApp} /> : null}
        <BackupScreen clock={clock} backLabel="Back" onBack={() => setObBackup(false)}
          onRestored={(text) => {
            setObBackup(false)
            if (!resolveOnboarding({ hasData: hasAnyData(storage) }, storage, clock())) { setOnboarding(null); onTheme(loadTheme(storage)); setToast({ text }); goTo('home') }
          }} />
      </View>
    )
  }
  if (onboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {lock.cover ? <LockCover unlockable={lock.unlockable} error={lockError} onUnlock={unlockApp} /> : null}
        <Onboarding key={onboarding} mode={onboarding} now={clock()} onRestore={() => setObBackup(true)}
          onCancel={() => { setOnboarding(null); goTo('you') }}
          onDone={() => {
            // The Ride it out tip, once, right after first setup.
            const seen = readObject(LP_TIP_KEY, storage)
            if (onboarding === 'new' && !seen?.coachmarkDone) setCoachmark(true)
            setOnboarding(null); goTo('home')
          }} />
      </View>
    )
  }

  let body
  if (screen === 'walk') body = <WalkScreen clock={clock} longPressTip={lpTip} onSaved={onWalkSaved} onExit={exitWalk} />
  else if (screen === 'ground') body = <GroundScreen clock={clock} onSave={onGroundSaved} onCancel={() => { dropFollowUp(groundId.current); groundId.current = null; backHome() }} />
  else if (screen === 'breathe') body = <BreatheScreen clock={clock} onSave={onBreatheSaved} onCancel={() => { dropFollowUp(breatheId.current); breatheId.current = null; backHome() }} />
  else if (backup) body = <BackupScreen key={dataVer} clock={clock} backLabel={tab === 'you' ? 'You' : 'Home'} onBack={() => { setBackup(false); setDataVer((v) => v + 1) }} />
  else if (tab === 'home') body = <HomeScreen key={dataVer} now={now} clock={clock} onRide={onRide} liveWalk={!!loadActiveWalk(storage)} onResume={() => setScreen('walk')} onOpenBackup={openBackup} onCheckIn={() => setCheckIn(true)} />
  else if (tab === 'track') {
    body = (
      <TrackScreen key={dataVer} view={trackView} onView={(v) => { setTrackView(v); setFocusWalkId(null) }} now={now} clock={clock} onRide={onRide}
        focusWalkId={focusWalkId} onEditingChange={setJournalEditing}
        onOpenWalk={(id) => { setTrackView('log'); setFocusWalkId(id); setDataVer((v) => v + 1) }} />
    )
  } else if (tab === 'community') body = <CommunityScreen key={dataVer} now={now} clock={clock} />
  else {
    body = (
      <YouScreen key={dataVer} now={now} clock={clock} theme={theme} onTheme={onTheme} onOpenBackup={openBackup}
        onRedo={() => setOnboarding('redo')} onAppLock={setLockOn}
        onErased={() => { onTheme('system'); setToast(null); setScreen('tabs'); setTab('home'); setBackup(false); setOnboarding('new') }} />
    )
  }
  const showTabs = screen === 'tabs' && !(tab === 'track' && trackView === 'journal' && journalEditing && !backup)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{body}</View>
      {toast && screen === 'tabs' && (
        <View testID="toast" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: 100 + insets.bottom, backgroundColor: c.toastBg, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T size={15} color={c.toastText} style={{ flex: 1 }}>{toast.text}</T>
          {toast.undoId && (
            <Pressable accessibilityRole="button" testID="toast-undo" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
              onPress={() => { removeWalk(toast.undoId, storage); dropFollowUp(toast.undoId); setToast(null); setDataVer((v) => v + 1) }}>
              <T font="bold" size={15} color={c.toastAct}>Undo</T>
            </Pressable>
          )}
        </View>
      )}
      {showTabs && coachmark ? (
        <Pressable testID="coachmark-scrim" onPress={dismissCoachmark} accessible={false} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : null}
      {showTabs && (
        <View>
          {coachmark && <View style={{ position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 30 }}><RideCoachmark onDismiss={dismissCoachmark} /></View>}
          <TabBar active={backup ? null : tab} onTab={goTo} onRide={onRide} onRideHold={onRideHold} bottomInset={insets.bottom} />
        </View>
      )}
      <RideSheet visible={showRide} onWalk={startWalk} onBreathe={() => { markStress(clock(), storage); breatheId.current = makeId(); setToast(null); setShowRide(false); setScreen('breathe') }}
        onGround={() => { markStress(clock(), storage); groundId.current = makeId(); setToast(null); setShowRide(false); setScreen('ground') }}
        onLog={onLog} onClose={() => setShowRide(false)} />
      {checkIn && screen === 'tabs' ? (
        <CheckInSheet now={now} clock={clock} onClose={() => { setCheckIn(false); setDataVer((v) => v + 1) }}
          onRide={() => { setCheckIn(false); setDataVer((v) => v + 1); onRide() }} />
      ) : null}
      {followUpFor ? <FollowUpSheet onAnswer={(a) => applyFollowUp(followUpFor, a)} onClose={() => setFollowUpFor(null)} /> : null}
      {lock.cover ? <LockCover unlockable={lock.unlockable} error={lockError} onUnlock={unlockApp} /> : null}
    </View>
  )
}

// The whole app. storage / device / scheme / clock are injectable for tests and previews.
// scheme: 'system' follows the Appearance setting in You (System / Light / Dark); 'light' / 'dark' force it.
export function AppRoot({ storage, device = noopDevice, scheme = 'system', clock = Date.now }) {
  const [theme, setTheme] = useState(() => (scheme === 'light' || scheme === 'dark' ? scheme : loadTheme(storage)))
  const onTheme = useCallback((t) => setTheme(saveTheme(t, storage)), [storage])
  return (
    <SafeAreaProvider>
      <SchemeContext.Provider value={theme}>
        <StorageContext.Provider value={storage}>
          <DeviceContext.Provider value={device}>
            <Shell clock={clock} theme={theme} onTheme={onTheme} />
          </DeviceContext.Provider>
        </StorageContext.Provider>
      </SchemeContext.Provider>
    </SafeAreaProvider>
  )
}
