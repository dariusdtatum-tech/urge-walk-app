import { loadNotifyPrefs } from '../lib/notifyBudget.js'
import { useSessionBottomSpace } from '../ui/layout.js'
import { useEffect, useState } from 'react'
import { AppState, ScrollView, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import { encouragementLines } from '../lib/encouragement.js'
import { loadContacts } from '../lib/contacts.js'
import { cancelFollowUpFor } from '../lib/followUp.js'
import { loadProfile } from '../lib/profile.js'
import { Sheet } from '../ui/Sheet.jsx'
import { ReachOut } from './ReachOut.jsx'
import { SceneBackdrop } from './home/SceneBackdrop.jsx'
import { ReasonCard } from './Reasons.jsx'
import { useGoalLine } from './home/MoneyCard.jsx'
import { SAVED_MESSAGES } from '../lib/walkMessages.js'
import { appendWalk, loadActiveWalk, saveActiveWalk } from '../lib/walkStorage.js'
import {
  EXTEND_MINUTES, buildWalkRecord, canExtend, elapsedMs, extendWalk, finishWalk, formatClock, formatElapsed,
  isEnded, isOpen, isPaused, isTimeUp, messageIndex, pauseWalk, progress, remainingMs, resumeWalk,
} from '../lib/walkTimer.js'
import { Button } from '../ui/Button.jsx'
import { CheckIn } from '../ui/CheckIn.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { WaveIcon } from '../ui/Icons.jsx'
import { Ring } from '../ui/Ring.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { MAX_SCALE, size as sz, space, type, useTheme } from '../ui/theme.js'

function KeepAwake() {
  useKeepAwake('urgewalk-walk')
  return null
}

// The live walk (focus mode, no tab bar) → the check-in. Saved on every change, so closing the app
// never loses it; time comes from timestamps. A timed walk also schedules a local notification for its end.
export function WalkScreen({ onSaved, onExit, longPressTip = false, clock = Date.now }) {
  const storage = useStorage()
  const goalLine = useGoalLine(clock())
  const device = useDevice()
  const { c } = useTheme()
  const sb = useSessionBottomSpace()
  const [walk, setWalk] = useState(() => loadActiveWalk(storage))
  const [now, setNow] = useState(clock)
  const [tip, setTip] = useState(longPressTip)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [reach, setReach] = useState(false)
  const [{ lines, why, contact }] = useState(() => { const p = loadProfile(storage); return { lines: encouragementLines(p?.improve), why: p?.why ?? '', contact: loadContacts(storage)[0] ?? null } })
  const walking = walk != null && !isEnded(walk) && !isPaused(walk)

  // The time's-up alert can be switched off in You > Notifications; the on-screen timer still works.
  const syncAlert = (w, t) => device.syncWalkAlert(loadNotifyPrefs(storage).walkAlert ? w : null, t)

  function commit(next) {
    saveActiveWalk(next, storage)
    setWalk(next)
    syncAlert(next, clock())
  }

  useEffect(() => { syncAlert(walk, clock()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!walking) return undefined
    const t = setInterval(() => setNow(clock()), 250)
    const sub = AppState.addEventListener('change', () => setNow(clock()))
    return () => { clearInterval(t); sub.remove() }
  }, [walking, clock])

  useEffect(() => {
    if (walk && isTimeUp(walk, now)) {
      const done = finishWalk(walk, now)
      saveActiveWalk(done, storage)
      setWalk(done)
      syncAlert(done, now) // clears the scheduled time-up alert (the walk is over)
      device.done()
    }
  }, [walk, now, storage, device])

  useEffect(() => { if (!walk) onExit() }, [walk, onExit])
  if (!walk) return null

  if (isEnded(walk)) {
    const walked = formatElapsed(elapsedMs(walk, walk.endedAt))
    let heading = 'You did it.'
    if (isOpen(walk)) heading = 'Nice walk.'
    else if (walk.endedEarly) heading = 'You took a break from the urge.'
    const save = ({ result, note, tags }, skipped = false) => {
      const record = buildWalkRecord(walk, skipped ? {} : { result, note, tags })
      appendWalk(record, storage)
      saveActiveWalk(null, storage)
      onSaved(SAVED_MESSAGES[skipped || !result ? 'skip' : result], record)
    }
    return (
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingTop: 32, paddingBottom: sb }} testID="walk-finish">
        <CheckIn heading={heading} sub={`You walked for ${walked}.`} onSave={(v) => save(v)} onSkip={() => save({}, true)} />
      </ScrollView>
    )
  }

  const paused = isPaused(walk)
  const open = isOpen(walk)
  const time = open ? formatElapsed(elapsedMs(walk, now)) : formatClock(remainingMs(walk, now))
  const label = paused ? 'Paused' : open ? 'walked so far' : 'left in your walk'
  return (
    <View style={{ flex: 1 }} testID="walk-live">
      <SceneBackdrop />
      {walking && <KeepAwake />}
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingTop: 28, paddingBottom: sb, alignItems: 'center', gap: 18, flexGrow: 1 }}>
        <ReasonCard testID="walk-reason" extra={goalLine} />
        {tip && (
          <View testID="longpress-tip" accessibilityRole="alert" style={{ alignSelf: 'stretch', backgroundColor: c.sand, borderRadius: 16, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center' }}>
                <WaveIcon color={c.onAction} size={20} />
              </View>
              <T size={15} color={c.text} style={{ flex: 1 }}>
                <T font="bold" size={15} color={c.title}>Walk started by holding the Ride it out button. </T>
                Tap that button instead to choose Walk, Breathe, Ground or Just log it.
              </T>
            </View>
            <Button kind="primary" label="Got it" onPress={() => setTip(false)} style={{ alignSelf: 'flex-end' }} testID="tip-ok" />
          </View>
        )}
        <Ring size={252} stroke={12} value={progress(walk, now)} testID="walk-ring">
          <T font="serif" size={70} max={MAX_SCALE.ring} color={c.title} testID="countdown" style={{ fontVariant: ["lining-nums", "tabular-nums"] }}>{time}</T>
          <T size={type.body} max={MAX_SCALE.ringSmall} color={c.muted}>{label}</T>
          <T font="bold" size={12} max={MAX_SCALE.ringSmall} color={c.accent} style={{ letterSpacing: 2 }}>{open ? 'OPEN' : `${walk.plannedMinutes} MIN`}</T>
        </Ring>
        {why ? <T font="serifItalic" size={20} color={c.title} style={{ textAlign: 'center' }}>“{why}”</T> : null}
        <T font="serifItalic" size={18} color={c.text} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{lines[messageIndex(walk, now, lines.length)]}</T>
        <View style={{ flex: 1 }} />
        <Button label="Finish walk" onPress={() => setConfirmFinish(true)} style={{ alignSelf: 'stretch', minHeight: sz.row }} testID="finish" />
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
          {paused
            ? <Button kind="quiet" label="Resume" onPress={() => { const t = clock(); setNow(t); commit(resumeWalk(walk, t)) }} testID="resume" />
            : <Button kind="quiet" label="Pause" onPress={() => commit(pauseWalk(walk, clock()))} testID="pause" />}
          {!open && (
            <Button kind="secondary" label={`+${EXTEND_MINUTES} min`} accessibilityLabel={`Add ${EXTEND_MINUTES} minutes`}
              onPress={() => canExtend(walk) && commit(extendWalk(walk))} testID="extend" />
          )}
        </View>
        <Button kind="quiet" label={contact ? `Reach out · ${contact.name}` : 'Reach out'} onPress={() => setReach(true)} testID="walk-reach-open" />
        <View style={{ alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: c.border, marginTop: 20, paddingTop: 8, alignItems: 'center' }}>
          <Button kind="quiet" label="Cancel walk · nothing saved" textColor={c.muted} onPress={() => setConfirmCancel(true)} testID="walk-cancel" />
        </View>
      </ScrollView>
      {confirmFinish && (
        <Confirm title={open ? 'Finish your walk?' : 'Finish your walk now?'} danger={false}
          message={open ? `You walked for ${time}. Ready to check in?` : `You walked for ${formatElapsed(elapsedMs(walk, now))}. That’s okay. Any time you spent walking counts.`}
          confirmLabel="Finish" cancelLabel="Keep walking"
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => { setConfirmFinish(false); commit(finishWalk(walk, clock(), { early: true })) }} />
      )}
      {confirmCancel && (
        <Confirm title="Cancel this walk?" message="Nothing will be saved. You can start again any time."
          confirmLabel="Cancel walk" cancelLabel="Keep walking"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => { setConfirmCancel(false); if (cancelFollowUpFor(walk.id, storage)) device.cancelFollowUp(); commit(null) }} />
      )}
      {reach ? <Sheet title="Reach out" onClose={() => setReach(false)} testID="walk-reach-sheet"><ReachOut testID="walk-reach" title={null} /></Sheet> : null}
    </View>
  )
}
