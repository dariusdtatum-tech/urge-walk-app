import { useCallback, useEffect, useState } from 'react'
import { useStorage as useStorageFromContext } from './ui/StorageContext.js'
import { Pressable, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { loadTheme, saveTheme } from './lib/appearance.js'
import { hasAnyData } from './lib/backup.js'
import { markSaved, markStress } from './lib/calm.js'
import { resolveOnboarding } from './lib/profile.js'
import { readObject, writeObject } from './lib/storage.js'
import { BREATHE_SAVED_MESSAGES, LOGGED_SAVED_MESSAGE } from './lib/walkMessages.js'
import { startWalkNow } from './lib/walkStart.js'
import { appendWalk, buildBreatheRecord, buildLoggedRecord, loadActiveWalk, removeWalk } from './lib/walkStorage.js'
import { isEnded } from './lib/walkTimer.js'
import { BreatheScreen } from './screens/BreatheScreen.jsx'
import { BackupScreen } from './screens/BackupScreen.jsx'
import { HomeScreen } from './screens/HomeScreen.jsx'
import { CommunityScreen } from './screens/CommunityScreen.jsx'
import { TrackScreen } from './screens/TrackScreen.jsx'
import { Onboarding } from './screens/onboarding/Onboarding.jsx'
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

  useEffect(() => { const t = setInterval(() => setNow(clock()), 30_000); return () => clearInterval(t) }, [clock])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  const goTo = useCallback((t) => { setFocusWalkId(null); setBackup(false); setTab(t); setNow(clock()); setDataVer((v) => v + 1) }, [clock])
  const backHome = useCallback(() => { setScreen('tabs'); goTo('home') }, [goTo])
  const exitWalk = useCallback(() => setScreen((s) => (s === 'walk' ? 'tabs' : s)), [])

  function startWalk() {
    startWalkNow(storage)
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
  function onLog(note, result) {
    const record = buildLoggedRecord({ at: clock(), note, result })
    appendWalk(record, storage)
    markSaved(record.id, clock(), storage)
    setShowRide(false)
    device.done()
    setToast({ text: result === 'yes' ? LOGGED_SAVED_MESSAGE : 'Saved. An honest log still counts.', undoId: record.id })
    setDataVer((v) => v + 1)
  }
  function onWalkSaved(text) {
    markSaved(null, clock(), storage)
    device.done()
    setToast({ text })
    if (lpTip) { setLpTip(false); const seen = readObject(LP_TIP_KEY, storage); if (seen && !seen.coachmarkDone) setCoachmark(true) }
    backHome()
  }
  function onBreatheSaved({ startedAt, endedAt, result, note }) {
    appendWalk(buildBreatheRecord({ startedAt, endedAt, result, note }), storage)
    markSaved(null, clock(), storage)
    device.done()
    setToast({ text: BREATHE_SAVED_MESSAGES[result || 'skip'] })
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
  else if (screen === 'breathe') body = <BreatheScreen clock={clock} onSave={onBreatheSaved} onCancel={backHome} />
  else if (backup) body = <BackupScreen key={dataVer} clock={clock} backLabel={tab === 'you' ? 'You' : 'Home'} onBack={() => { setBackup(false); setDataVer((v) => v + 1) }} />
  else if (tab === 'home') body = <HomeScreen key={dataVer} now={now} clock={clock} onRide={onRide} liveWalk={!!loadActiveWalk(storage)} onResume={() => setScreen('walk')} onOpenBackup={openBackup} />
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
        onRedo={() => setOnboarding('redo')}
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
              onPress={() => { removeWalk(toast.undoId, storage); setToast(null); setDataVer((v) => v + 1) }}>
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
      <RideSheet visible={showRide} onWalk={startWalk} onBreathe={() => { markStress(clock(), storage); setToast(null); setShowRide(false); setScreen('breathe') }}
        onLog={onLog} onClose={() => setShowRide(false)} />
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
