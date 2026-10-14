import { useCallback, useEffect, useState } from 'react'
import { useStorage as useStorageFromContext } from './ui/StorageContext.js'
import { Pressable, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { markSaved, markStress } from './lib/calm.js'
import { readObject, writeObject } from './lib/storage.js'
import { BREATHE_SAVED_MESSAGES, LOGGED_SAVED_MESSAGE } from './lib/walkMessages.js'
import { startWalkNow } from './lib/walkStart.js'
import { appendWalk, buildBreatheRecord, buildLoggedRecord, loadActiveWalk, removeWalk } from './lib/walkStorage.js'
import { isEnded } from './lib/walkTimer.js'
import { BreatheScreen } from './screens/BreatheScreen.jsx'
import { ComingSoon } from './screens/ComingSoon.jsx'
import { HomeScreen } from './screens/HomeScreen.jsx'
import { RideSheet } from './screens/RideSheet.jsx'
import { WalkScreen } from './screens/WalkScreen.jsx'
import { DeviceContext, noopDevice } from './ui/DeviceContext.js'
import { StorageContext } from './ui/StorageContext.js'
import { RideCoachmark, TabBar } from './ui/TabBar.jsx'
import { T } from './ui/Text.jsx'
import { SchemeContext, useTheme } from './ui/theme.js'

export const LP_TIP_KEY = 'urgewalk.v1.longPressTipSeen' // { at, coachmarkDone? }
const TOAST_MS = 6500

function Shell({ clock }) {
  const { c, scheme } = useTheme()
  const insets = useSafeAreaInsets()
  const storage = useStorageFromContext()
  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState(() => (loadActiveWalk(storage) ? 'walk' : 'tabs'))
  const [showRide, setShowRide] = useState(false)
  const [toast, setToast] = useState(null) // { text, undoId? }
  const [lpTip, setLpTip] = useState(false)
  const [coachmark, setCoachmark] = useState(false)
  const [dataVer, setDataVer] = useState(0)
  const [now, setNow] = useState(clock)

  useEffect(() => { const t = setInterval(() => setNow(clock()), 30_000); return () => clearInterval(t) }, [clock])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  const backHome = useCallback(() => { setScreen('tabs'); setTab('home'); setNow(clock()); setDataVer((v) => v + 1) }, [clock])
  const exitWalk = useCallback(() => setScreen((s) => (s === 'walk' ? 'tabs' : s)), [])

  function startWalk() {
    startWalkNow(storage)
    markStress(clock(), storage)
    setToast(null); setShowRide(false); setScreen('walk')
  }
  function onRideHold() {
    const live = loadActiveWalk(storage)
    if (live && !isEnded(live)) { setScreen('walk'); return }
    if (!readObject(LP_TIP_KEY, storage)) { writeObject(LP_TIP_KEY, { at: clock() }, storage); setLpTip(true) }
    startWalk()
  }
  function onRide() {
    if (loadActiveWalk(storage)) { setScreen('walk'); return }
    markStress(clock(), storage)
    setShowRide(true)
  }
  function onLog(note, result) {
    const record = buildLoggedRecord({ at: clock(), note, result })
    appendWalk(record, storage)
    markSaved(record.id, clock(), storage)
    setShowRide(false)
    setToast({ text: result === 'yes' ? LOGGED_SAVED_MESSAGE : 'Saved. An honest log still counts.', undoId: record.id })
    setDataVer((v) => v + 1)
  }
  function onWalkSaved(text) {
    markSaved(null, clock(), storage)
    setToast({ text })
    if (lpTip) { setLpTip(false); const seen = readObject(LP_TIP_KEY, storage); if (seen && !seen.coachmarkDone) setCoachmark(true) }
    backHome()
  }
  function onBreatheSaved({ startedAt, endedAt, result, note }) {
    appendWalk(buildBreatheRecord({ startedAt, endedAt, result, note }), storage)
    markSaved(null, clock(), storage)
    setToast({ text: BREATHE_SAVED_MESSAGES[result || 'skip'] })
    backHome()
  }
  function dismissCoachmark() {
    writeObject(LP_TIP_KEY, { ...(readObject(LP_TIP_KEY, storage) || {}), coachmarkDone: true }, storage)
    setCoachmark(false)
  }

  let body
  if (screen === 'walk') body = <WalkScreen clock={clock} longPressTip={lpTip} onSaved={onWalkSaved} onExit={exitWalk} />
  else if (screen === 'breathe') body = <BreatheScreen clock={clock} onSave={onBreatheSaved} onCancel={backHome} />
  else if (tab === 'home') body = <HomeScreen key={dataVer} now={now} onRide={onRide} liveWalk={!!loadActiveWalk(storage)} onResume={() => setScreen('walk')} />
  else if (tab === 'log') body = <ComingSoon title="Log" line="Your urges ridden out will show up here in the next update." />
  else if (tab === 'journal') body = <ComingSoon title="Journal" line="Journal entries come to the phone app in the next update." />
  else body = <ComingSoon title="You" line="Settings, backup and help come to the phone app in the next update." />

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
      {screen === 'tabs' && (
        <View>
          {coachmark && <View style={{ position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 30 }}><RideCoachmark onDismiss={dismissCoachmark} /></View>}
          <TabBar active={tab} onTab={setTab} onRide={onRide} onRideHold={onRideHold} bottomInset={insets.bottom} />
        </View>
      )}
      <RideSheet visible={showRide} onWalk={startWalk} onBreathe={() => { markStress(clock(), storage); setToast(null); setShowRide(false); setScreen('breathe') }}
        onLog={onLog} onClose={() => setShowRide(false)} />
    </View>
  )
}

// The whole app. storage / device / scheme / clock are injectable for tests and previews.
export function AppRoot({ storage, device = noopDevice, scheme = 'system', clock = Date.now }) {
  return (
    <SafeAreaProvider>
      <SchemeContext.Provider value={scheme}>
        <StorageContext.Provider value={storage}>
          <DeviceContext.Provider value={device}>
            <Shell clock={clock} />
          </DeviceContext.Provider>
        </StorageContext.Provider>
      </SchemeContext.Provider>
    </SafeAreaProvider>
  )
}
