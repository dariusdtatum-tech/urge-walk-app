// Your reasons: the card that fades in on Walk and Breathe after Ride it out, and the sheet in You
// where reasons are added. Everything stays on this phone and is never shown in a notification.
import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import {
  MAX_REASONS, MAX_REASON_TEXT, MAX_VOICE_MS, addReason, formatVoiceLength, loadReasonsData, removeReason, setReasonsLock, takeNextReason,
} from '../lib/reasons.js'
import { Button } from '../ui/Button.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { Field } from '../ui/Field.jsx'
import { useReducedMotion } from '../ui/motion.js'
import { Card, ToggleRow } from '../ui/Row.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'
import { SmallButton } from './ReachOut.jsx'

function ReasonBody({ reason, testID }) {
  const device = useDevice()
  const { c } = useTheme()
  if (reason.kind === 'photo') {
    return <Image source={{ uri: reason.uri }} accessible accessibilityLabel="A photo you saved" testID={`${testID}-photo`}
      style={{ width: '100%', height: 150, borderRadius: 12, backgroundColor: c.sand }} resizeMode="cover" />
  }
  if (reason.kind === 'voice') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SmallButton primary label="Play" accessibilityLabel={`Play your voice note, ${formatVoiceLength(reason.durationMs)}`} onPress={() => device.playVoice(reason.uri)} testID={`${testID}-play`} />
        <T size={15} color={c.textSoft}>Your voice note · {formatVoiceLength(reason.durationMs)}</T>
      </View>
    )
  }
  return <T size={17} color={c.title} style={{ fontStyle: 'italic' }} testID={`${testID}-text`}>“{reason.text}”</T>
}

// One reason, chosen when the screen opens (the next one next time). Nothing shows when there are none.
export function ReasonCard({ testID = 'reason', extra = null }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const reduced = useReducedMotion()
  const [{ reason, lock }] = useState(() => ({ reason: takeNextReason(storage), lock: loadReasonsData(storage).lock }))
  const [shown, setShown] = useState(!lock)
  const [hidden, setHidden] = useState(false)
  const fade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!reason || hidden) return
    fade.setValue(reduced ? 1 : 0)
    if (!reduced) Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }).start()
  }, [reason, hidden, shown, reduced, fade])
  useEffect(() => () => device.stopPlaying(), [device])
  if ((!reason && !extra) || hidden) return null
  return (
    <Animated.View style={{ opacity: fade, alignSelf: 'stretch' }} testID={testID}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T font="semibold" size={14} color={c.textSoft} style={{ flex: 1 }}>{reason ? 'One of your reasons' : 'Your goal'}</T>
          <Pressable onPress={() => { device.stopPlaying(); setHidden(true) }} accessibilityRole="button" accessibilityLabel="Hide this for now" testID={`${testID}-hide`}
            hitSlop={8} style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
            <T size={14} font="semibold" color={c.textSoft}>Hide</T>
          </Pressable>
        </View>
        {reason ? (shown ? <ReasonBody reason={reason} testID={testID} /> : (
          <Button kind="secondary" label="Show my reason" onPress={async () => { if (await device.unlockReasons()) setShown(true) }} testID={`${testID}-unlock`} />
        )) : null}
        {extra}
      </Card>
    </Animated.View>
  )
}

// You → Your reasons.
export function ReasonsSheet({ onClose }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const [data, setData] = useState(() => loadReasonsData(storage))
  const [writing, setWriting] = useState(false)
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [note, setNote] = useState('')
  const timer = useRef(null)
  const refresh = () => setData(loadReasonsData(storage))
  const full = data.reasons.length >= MAX_REASONS
  const save = (r) => { const res = addReason(storage, r); setNote(res.ok ? '' : res.error); refresh(); return res.ok }

  async function photo() {
    const r = await device.pickReasonPhoto()
    if (r?.denied) setNote('Photos are off for Urge Walk. You can turn them on in Settings.')
    else if (r?.uri) save({ kind: 'photo', uri: r.uri })
  }
  async function stopRecording() {
    clearTimeout(timer.current)
    setRecording(false)
    const r = await device.stopVoice()
    if (r?.uri) save({ kind: 'voice', uri: r.uri, durationMs: r.durationMs })
  }
  async function record() {
    if (!(await device.startVoice())) { setNote('The microphone is off for Urge Walk. You can turn it on in Settings.'); return }
    setNote(''); setRecording(true)
    timer.current = setTimeout(stopRecording, MAX_VOICE_MS)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const remove = (r) => { removeReason(storage, r.id); if (r.uri) device.deleteReasonFile(r.uri); refresh() }

  return (
    <Sheet title="Your reasons" onClose={onClose} testID="reasons-sheet" right={<HeaderButton label="Done" onPress={onClose} />}>
      <T size={15} color={c.text}>A photo, a short voice note, or a few words. One shows quietly at the top of Walk or Breathe when you ride it out. They stay on this phone and never appear in notifications.</T>
      {data.reasons.map((r, i) => (
        <Card key={r.id} testID={`reason-${i}`} style={{ gap: 8 }}>
          <ReasonBody reason={r} testID={`reason-${i}`} />
          <View style={{ alignItems: 'flex-end' }}>
            <SmallButton label="Remove" accessibilityLabel="Remove this reason" onPress={() => remove(r)} testID={`reason-remove-${i}`} />
          </View>
        </Card>
      ))}
      {full ? <T size={14} color={c.muted}>That’s {MAX_REASONS}, the most you can keep.</T> : null}
      {!full && writing ? (
        <Card style={{ gap: 10 }} testID="reason-form">
          <Field label="Your reason" value={text} onChangeText={setText} maxLength={MAX_REASON_TEXT} multiline placeholder="A few words for a hard minute" testID="reason-text" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button kind="secondary" label="Cancel" onPress={() => { setWriting(false); setText('') }} style={{ flex: 1 }} testID="reason-cancel" />
            <Button label="Save" onPress={() => { if (save({ kind: 'text', text })) { setWriting(false); setText('') } }} style={{ flex: 1 }} testID="reason-save" />
          </View>
        </Card>
      ) : null}
      {!full && !writing ? (
        <View style={{ gap: 8 }}>
          <Button label="Write a few words" onPress={() => setWriting(true)} testID="reason-write" />
          <Button kind="secondary" label="Add a photo" onPress={photo} testID="reason-photo" />
          {recording
            ? <Button kind="secondary" label="Stop and save" accessibilityLabel="Recording. Stop and save your voice note" onPress={stopRecording} testID="reason-stop" />
            : <Button kind="secondary" label="Record a voice note (up to 1 min)" onPress={record} testID="reason-record" />}
        </View>
      ) : null}
      {note ? <T size={14} color={c.error} accessibilityRole="alert" testID="reason-note">{note}</T> : null}
      <ToggleRow title="Lock with Face ID" sub="Stays covered on Walk and Breathe until you unlock it." value={data.lock} testID="reasons-lock"
        onChange={(on) => { setReasonsLock(storage, on); refresh() }} />
    </Sheet>
  )
}
