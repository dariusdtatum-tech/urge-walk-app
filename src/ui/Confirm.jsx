import { useEffect, useRef, useState } from 'react'
import { Modal, View } from 'react-native'
import { Button } from './Button.jsx'
import { T } from './Text.jsx'
import { space, type, useTheme } from './theme.js'

// How a Confirm closes. On iOS a Modal must be hidden (visible=false) and fully dismissed before its
// parent unmounts it or anything else (a share sheet, another Confirm) is presented. Unmounting it
// while it's still visible, or presenting over it as it fades, can leave a dead, untappable card on
// screen, which is the Reset bug from Oct 16. So a button press hides the card first and runs its
// action in onDismiss, with a fallback timer for platforms that don't send onDismiss.
// Component tests set fallbackMs to 0, which runs the action right after hiding.
export const confirmTiming = { fallbackMs: 400 }

// A small "Are you sure?" card over a dimmed screen. The safe choice comes first.
export function Confirm({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true }) {
  const { c } = useTheme()
  const [shown, setShown] = useState(true)
  const pending = useRef(/** @type {null | (() => void)} */ (null))
  const timer = useRef(/** @type {any} */ (null))
  useEffect(() => () => clearTimeout(timer.current), [])
  const flush = () => {
    clearTimeout(timer.current)
    const fn = pending.current
    pending.current = null
    fn?.()
  }
  const close = (fn) => {
    if (pending.current) return // one choice per card
    pending.current = fn ?? (() => {})
    setShown(false)
    if (confirmTiming.fallbackMs <= 0) flush()
    else timer.current = setTimeout(flush, confirmTiming.fallbackMs)
  }
  return (
    // A transparent Modal keeps Android TalkBack (and iOS VoiceOver) inside the card.
    <Modal transparent visible={shown} animationType="fade" onRequestClose={() => close(onCancel)} onDismiss={flush} statusBarTranslucent>
    <View testID="confirm" style={{ flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View accessibilityViewIsModal accessibilityRole="alert" style={{ backgroundColor: c.surface, borderRadius: 20, padding: space.screen, gap: 12, width: '100%', maxWidth: 380 }}>
        <T accessibilityRole="header" font="serif" size={24} color={c.title}>{title}</T>
        <T size={type.body} color={c.text}>{message}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          <Button kind="secondary" label={cancelLabel} onPress={() => close(onCancel)} style={{ flexGrow: 1 }} testID="confirm-cancel" />
          <Button label={confirmLabel} onPress={() => close(onConfirm)} style={{ flexGrow: 1, backgroundColor: danger ? c.danger : c.action }}
            textColor={danger ? c.onDanger : c.onAction} testID="confirm-ok" />
        </View>
      </View>
    </View>
    </Modal>
  )
}
