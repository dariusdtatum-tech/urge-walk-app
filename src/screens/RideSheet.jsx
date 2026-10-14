import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STACK_FONT_SCALE, useReducedMotion } from '../ui/motion.js'
import { loadProfile, trustedContact } from '../lib/profile.js'
import { lengthLabel, loadWalkPrefs } from '../lib/walkStorage.js'
import { useDevice } from '../ui/DeviceContext.js'
import { Button } from '../ui/Button.jsx'
import { NoteField, OutcomePicker } from '../ui/CheckIn.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { PathIcon, WaveIcon } from '../ui/Icons.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'

// "Ride it out": Walk (remembered length) or Breathe (1 min), plus a full-width "Just log it".
// A typed note is never thrown away without asking: Back → Discard returns to the choices,
// closing → Discard closes the sheet.
export function RideSheet({ visible, onWalk, onBreathe, onLog, onClose }) {
  const storage = useStorage()
  const { c } = useTheme()
  const reduced = useReducedMotion()
  const insets = useSafeAreaInsets()
  const stack = useWindowDimensions().fontScale > STACK_FONT_SCALE
  const [logging, setLogging] = useState(false)
  const [note, setNote] = useState('')
  const [result, setResult] = useState('yes')
  const [askDiscard, setAskDiscard] = useState(null) // 'back' | 'close' | null
  const device = useDevice()
  const walkLabel = lengthLabel(loadWalkPrefs(storage))
  const profile = visible ? loadProfile(storage) : null
  const why = profile?.why ?? ''
  const contact = trustedContact(profile)

  const reset = () => { setLogging(false); setNote(''); setResult('yes'); setAskDiscard(null) }
  const close = () => { if (logging && note.trim()) setAskDiscard('close'); else { reset(); onClose() } }
  const back = () => { if (note.trim()) setAskDiscard('back'); else setLogging(false) }

  return (
    <Modal visible={visible} transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
          onPress={close} accessibilityLabel="Close" accessibilityRole="button" testID="ride-backdrop" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View testID="ride-sheet" accessibilityViewIsModal style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 34 + insets.bottom, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.grab }} />
              <T accessibilityRole="header" font="serif" size={30} color={c.title}>Ride it out</T>
              {why && !logging ? <T font="serifItalic" size={19} color={c.title} testID="ride-why">“{why}”</T> : null}
              {!logging ? (
                <>
                  <View style={{ flexDirection: stack ? 'column' : 'row', gap: 12 }} testID="ride-tiles">
                    <Pressable onPress={onWalk} testID="ride-walk" accessibilityRole="button" accessibilityLabel={`Walk, ${walkLabel}. Starts now`}
                      style={{ flex: 1, minHeight: 120, borderRadius: 18, backgroundColor: c.action, padding: 16, justifyContent: 'space-between' }}>
                      <PathIcon color={c.onAction} />
                      <View>
                        <T font="bold" size={20} color={c.onAction}>Walk</T>
                        <T size={14} color={c.onActionSoft}>{walkLabel}</T>
                      </View>
                    </Pressable>
                    <Pressable onPress={onBreathe} testID="ride-breathe" accessibilityRole="button" accessibilityLabel="Breathe for 1 minute"
                      style={{ flex: 1, minHeight: 120, borderRadius: 18, backgroundColor: c.tileAlt, padding: 16, justifyContent: 'space-between' }}>
                      <WaveIcon color={c.onTileAlt} size={30} />
                      <View>
                        <T font="bold" size={20} color={c.onTileAlt}>Breathe</T>
                        <T size={14} color={c.onTileAlt}>1 min</T>
                      </View>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setLogging(true)} testID="ride-log" accessibilityRole="button"
                    accessibilityLabel="Just log it. I already rode it out"
                    style={{ minHeight: 56, borderRadius: 16, backgroundColor: c.sand, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' }}>
                    <T font="bold" size={17} color={c.title}>Just log it</T>
                    <T size={14} color={c.text}>I already rode it out</T>
                  </Pressable>
                  {contact ? (
                    <Button kind="secondary" label={`Text ${contact.name}`} onPress={() => device.openURL(contact.href)} testID="ride-text" />
                  ) : null}
                  <T size={14} color={c.muted} testID="ride-tip">Tip: hold the Ride it out button to start a walk right away.</T>
                </>
              ) : (
                <View style={{ gap: 14 }} testID="ride-log-form">
                  <T size={16} color={c.text}>An urge from just now, logged as it went.</T>
                  <T font="semibold" size={16} color={c.title}>Did the urge pass?</T>
                  <OutcomePicker value={result} onChange={(v) => setResult(v ?? 'yes')} testID="log-result" />
                  <NoteField value={note} onChange={setNote} />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Button kind="secondary" label="Back" onPress={back} style={{ flex: 1 }} testID="log-back" />
                    <Button label="Save" onPress={() => { onLog(note, result); reset() }} style={{ flex: 1 }} testID="log-save" />
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
