import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, ScrollView, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import { BREATH, breathPhase } from '../lib/breathe.js'
import { BREATHE_LINES } from '../lib/encouragement.js'
import { loadProfile } from '../lib/profile.js'
import { BREATHE_SECONDS } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { CheckIn } from '../ui/CheckIn.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { ReasonCard } from './Reasons.jsx'
import { useGoalLine } from './home/MoneyCard.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { MAX_SCALE, space, type, useTheme } from '../ui/theme.js'

export const PHASE_WORDS = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' }
const ORB = 220
const SMALL = 0.577

function KeepAwake() {
  useKeepAwake('urgewalk-breathe')
  return null
}

// One minute of guided breathing: in 4s, hold 3s, out 6s. A light haptic when the breath turns
// (in / out), never on the hold. Its own breath-only lines. Then the same check-in as a walk.
export function BreatheScreen({ onSave, onCancel, clock = Date.now }) {
  const storage = useStorage()
  const goalLine = useGoalLine()
  const device = useDevice()
  const { c } = useTheme()
  const [startedAt] = useState(clock)
  const [now, setNow] = useState(startedAt)
  const [endedAt, setEndedAt] = useState(null)
  const [why] = useState(() => loadProfile(storage)?.why ?? '')
  const [offset] = useState(() => Math.floor(Math.random() * BREATHE_LINES.length))
  const [still, setStill] = useState(false)
  const scale = useRef(new Animated.Value(SMALL)).current
  const elapsed = (endedAt ?? now) - startedAt
  const phase = breathPhase(elapsed)
  const left = Math.max(0, Math.ceil((BREATHE_SECONDS * 1000 - elapsed) / 1000))

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setStill(!!v)).catch(() => {}) }, [])
  useEffect(() => {
    if (endedAt != null) return undefined
    const t = setInterval(() => setNow(clock()), 200)
    return () => clearInterval(t)
  }, [endedAt, clock])
  useEffect(() => {
    if (endedAt == null && elapsed >= BREATHE_SECONDS * 1000) {
      setEndedAt(startedAt + BREATHE_SECONDS * 1000)
      device.done()
    }
  }, [elapsed, endedAt, startedAt, device])
  useEffect(() => {
    if (endedAt != null) return
    if (phase !== 'hold') device.breathTurn()
    if (still || phase === 'hold') return
    Animated.timing(scale, {
      toValue: phase === 'in' ? 1 : SMALL,
      duration: phase === 'in' ? BREATH.inMs : BREATH.outMs,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start()
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (endedAt != null) {
    const secs = Math.round((endedAt - startedAt) / 1000)
    return (
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingTop: 32 }} testID="breathe-done">
        <CheckIn heading="Nice. That one passed a little." sub={`You breathed for ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}.`}
          onSave={({ result, note, tags }) => onSave({ startedAt, endedAt, result, note, tags })}
          onSkip={() => onSave({ startedAt, endedAt, result: null, note: '' })} />
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1, padding: space.screen, alignItems: 'center' }} testID="breathe">
      {endedAt == null && <KeepAwake />}
      <ReasonCard testID="breathe-reason" extra={goalLine} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.section }}>
        <View style={{ width: ORB, height: ORB, alignItems: 'center', justifyContent: 'center' }}
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={{ position: 'absolute', width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 1.5, borderColor: c.breatheLine }} />
          <Animated.View testID="breathe-orb" style={{
            width: ORB, height: ORB, borderRadius: ORB / 2, backgroundColor: c.breathePearlC, borderWidth: 2, borderColor: c.breatheRim,
            transform: [{ scale: still ? 0.8 : scale }],
          }} />
        </View>
        <T font="serif" size={40} color={c.title} testID="breathe-word" accessibilityLiveRegion="polite">{PHASE_WORDS[phase]}</T>
        {why ? <T font="serifItalic" size={18} color={c.title} style={{ textAlign: 'center' }}>“{why}”</T> : null}
        <T font="serif" size={22} max={MAX_SCALE.ringSmall} color={c.mutedSand} accessibilityLabel={`${left} seconds left`} testID="breathe-count">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </T>
      </View>
      <T size={type.body} color={c.text} style={{ textAlign: 'center', marginBottom: 12 }} testID="breathe-line">
        {BREATHE_LINES[(offset + Math.floor(elapsed / 20000)) % BREATHE_LINES.length]}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
        <Button kind="secondary" label="Finish early" onPress={() => setEndedAt(clock())} testID="breathe-finish" />
        <Button kind="quiet" label="Cancel · nothing saved" textColor={c.muted} onPress={onCancel} testID="breathe-cancel" />
      </View>
    </View>
  )
}
