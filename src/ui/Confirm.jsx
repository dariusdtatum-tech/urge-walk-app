import { View } from 'react-native'
import { Button } from './Button.jsx'
import { T } from './Text.jsx'
import { space, type, useTheme } from './theme.js'

// A small "Are you sure?" card over a dimmed screen. The safe choice comes first.
export function Confirm({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true }) {
  const { c } = useTheme()
  return (
    <View testID="confirm" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View accessibilityViewIsModal accessibilityRole="alert" style={{ backgroundColor: c.surface, borderRadius: 20, padding: space.screen, gap: 12, width: '100%', maxWidth: 380 }}>
        <T accessibilityRole="header" font="serif" size={24} color={c.title}>{title}</T>
        <T size={type.body} color={c.text}>{message}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          <Button kind="secondary" label={cancelLabel} onPress={onCancel} style={{ flexGrow: 1 }} testID="confirm-cancel" />
          <Button label={confirmLabel} onPress={onConfirm} style={{ flexGrow: 1, backgroundColor: danger ? c.danger : c.action }}
            textColor={danger ? c.onDanger : c.onAction} testID="confirm-ok" />
        </View>
      </View>
    </View>
  )
}
