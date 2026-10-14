import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

// A bottom sheet: dimmed backdrop (tap to close), grab handle, title, scrolling body.
// `overlay` (e.g. a Confirm) is drawn above the sheet, inside the same modal.
export function Sheet({ onClose, title, testID, children, overlay = null, right = null }) {
  const { c } = useTheme()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
          onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" testID={testID ? `${testID}-backdrop` : undefined} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View testID={testID} accessibilityViewIsModal style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.grab }} />
              {title ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <T accessibilityRole="header" font="serif" size={28} color={c.title} style={{ flex: 1 }}>{title}</T>
                  {right}
                </View>
              ) : null}
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        {overlay}
      </View>
    </Modal>
  )
}

// A small text button for sheet headers ("Done", "✕"), still 44pt.
export function HeaderButton({ label, onPress, testID, accessibilityLabel }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
      <T font="semibold" size={16} color={c.accent}>{label}</T>
    </Pressable>
  )
}
