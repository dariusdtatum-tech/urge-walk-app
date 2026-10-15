import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STACK_FONT_SCALE, useReducedMotion } from '../ui/motion.js'
import { loadProfile } from '../lib/profile.js'
import { lengthLabel, loadWalkPrefs } from '../lib/walkStorage.js'
import { useDevice } from '../ui/DeviceContext.js'
import { Button } from '../ui/Button.jsx'
import { NoteField, OutcomePicker, TagPicker } from '../ui/CheckIn.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { LeafIcon, PathIcon, WaveIcon } from '../ui/Icons.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { ReachOut } from './ReachOut.jsx'
import { T } from '../ui/Text.jsx'
import { radius, size as sz, space, type, useTheme } from '../ui/theme.js'

// "Ride it out": Walk (remembered length), Breathe (1 min) or Ground (5 senses, silent), plus a full-width "Just log it".
// A typed note is never thrown away without asking: Back → Discard returns to the choices,
// closing → Discard closes the sheet.
export function RideSheet({ visible, onWalk, onBreathe, onGround, onLog, onClose }) {
  const storage = useStorage()
  const { c } = useTheme()
  const reduced = useReducedMotion()
  const insets = useSafeAreaInsets()
  const stack = useWindowDimensions().fontScale > STACK_FONT_SCALE
  const [logging, setLogging] = useState(false)
  const [tags, setTags] = useState([])
  const [note, setNote] = useState('')
  const [result, setResult] = useState('yes')
  const [askDiscard, setAskDiscard] = useState(null) // 'back' | 'close' | null
  const device = useDevice()
  const walkLabel = lengthLabel(loadWalkPrefs(storage))
  const profile = visible ? loadProfile(storage) : null
  const why = profile?.why ?? ''

  const reset = () => { setLogging(false); setNote(''); setTags([]); setResult('yes'); setAskDiscard(null) }
  const close = () => { if (logging && note.trim()) setAskDiscard('close'); else { reset(); onClose() } }
  const back = () => { if (note.trim()) setAskDiscard('back'); else setLogging(false) }

  return (
    <Modal visible={visible} transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
          onPress={close} accessibilityLabel="Close" accessibilityRole="button" testID="ride-backdrop" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View testID="ride-sheet" accessibilityViewIsModal style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
            <ScrollView contentContainerStyle={{ padding: space.sheet, paddingBottom: 34 + insets.bottom, gap: space.section }} keyboardShouldPersistTaps="handled">
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.grab }} />
              <T accessibilityRole="header" font="serif" size={type.rideSheetTitle} color={c.title}>Ride it out</T>
              {why && !logging ? <T font="serifItalic" size={type.why} color={c.title} testID="ride-why">“{why}”</T> : null}
              {!logging ? (
                <>
                  <View style={{ flexDirection: stack ? 'column' : 'row', gap: 12 }} testID="ride-tiles">
                    <Pressable onPress={onWalk} testID="ride-walk" accessibilityRole="button" accessibilityLabel={`Walk, ${walkLabel}. Starts now`}
                      style={{ flex: 1, minHeight: sz.rideTile, borderRadius: radius.card, backgroundColor: c.action, padding: space.card, justifyContent: 'space-between' }}>
                      <PathIcon color={c.onAction} />
                      <View>
                        <T font="bold" size={type.rideTile} color={c.onAction}>Walk</T>
                        <T size={14} color={c.onActionSoft}>{walkLabel}</T>
                      </View>
                    </Pressable>
                    <Pressable onPress={onBreathe} testID="ride-breathe" accessibilityRole="button" accessibilityLabel="Breathe for 1 minute"
                      style={{ flex: 1, minHeight: sz.rideTile, borderRadius: radius.card, backgroundColor: c.tileAlt, padding: space.card, justifyContent: 'space-between' }}>
                      <WaveIcon color={c.onTileAlt} size={type.rideTileIcon} />
                      <View>
                        <T font="bold" size={type.rideTile} color={c.onTileAlt}>Breathe</T>
                        <T size={14} color={c.onTileAlt}>1 min</T>
                      </View>
                    </Pressable>
                  </View>
                  <Pressable onPress={onGround} testID="ride-ground" accessibilityRole="button" accessibilityLabel="Ground. 5 senses, silent"
                    style={{ minHeight: sz.logIt, borderRadius: radius.row, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.fieldBorder, paddingHorizontal: space.rowX, paddingVertical: space.rowY, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <LeafIcon color={c.title} />
                    <View style={{ flex: 1 }}>
                      <T font="bold" size={type.bodyLg} color={c.title}>Ground</T>
                      <T size={14} color={c.text}>5 senses · silent, no sound</T>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => setLogging(true)} testID="ride-log" accessibilityRole="button"
                    accessibilityLabel="Just log it. I already rode it out"
                    style={{ minHeight: sz.logIt, borderRadius: radius.row, backgroundColor: c.sand, paddingHorizontal: space.rowX, paddingVertical: space.rowY, justifyContent: 'center' }}>
                    <T font="bold" size={type.bodyLg} color={c.title}>Just log it</T>
                    <T size={14} color={c.text}>I already rode it out</T>
                  </Pressable>
                  <ReachOut testID="ride-reach" />
                  <T size={14} color={c.muted} testID="ride-tip">Tip: hold the Ride it out button to start a walk right away.</T>
                </>
              ) : (
                <View style={{ gap: 14 }} testID="ride-log-form">
                  <T size={type.body} color={c.text}>An urge from just now, logged as it went.</T>
                  <T font="semibold" size={type.body} color={c.title}>Did the urge pass?</T>
                  <OutcomePicker value={result} onChange={(v) => setResult(v ?? 'yes')} testID="log-result" />
                  <NoteField value={note} onChange={setNote} />
                  <TagPicker value={tags} onChange={setTags} testID="log-tags" />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Button kind="secondary" label="Back" onPress={back} style={{ flex: 1 }} testID="log-back" />
                    <Button label="Save" onPress={() => { onLog(note, result, tags); reset() }} style={{ flex: 1 }} testID="log-save" />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        {askDiscard && (
          <Confirm title="Discard this note?" message="You typed a note that isn’t saved yet."
            confirmLabel="Discard note" cancelLabel="Keep editing"
            onCancel={() => setAskDiscard(null)}
            onConfirm={() => {
              const to = askDiscard
              setAskDiscard(null); setNote('')
              if (to === 'back') setLogging(false)
              else { reset(); onClose() }
            }} />
        )}
      </View>
    </Modal>
  )
}
