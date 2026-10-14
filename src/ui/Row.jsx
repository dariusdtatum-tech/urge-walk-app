import { Pressable, View } from 'react-native'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

// One settings row: title, optional sub-line, chevron. 56pt tall.
export function Row({ title, sub, onPress, testID, danger = false, chevron = '›', subMuted = false, accessibilityRole = 'button', accessibilityHint }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole={accessibilityRole} accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={16} color={danger ? c.danger : c.title}>{title}</T>
        {sub ? <T size={14} color={subMuted ? c.muted : c.textSoft}>{sub}</T> : null}
      </View>
      <T size={20} color={c.muted} accessibilityElementsHidden importantForAccessibility="no">{chevron}</T>
    </Pressable>
  )
}

export function GroupTitle({ children }) {
  const { c } = useTheme()
  return <T accessibilityRole="header" font="bold" size={13} color={c.muted} style={{ letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 10 }}>{children}</T>
}

export function Card({ children, style, testID }) {
  const { c } = useTheme()
  return <View testID={testID} style={[{ backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10 }, style]}>{children}</View>
}

export function Notice({ text, onDismiss }) {
  const { c } = useTheme()
  if (!text) return null
  return (
    <View accessibilityLiveRegion="polite" testID="notice" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.sand, borderRadius: 14, paddingLeft: 14 }}>
      <T size={15} color={c.text} style={{ flex: 1, paddingVertical: 10 }}>{text}</T>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <T size={16} color={c.mutedSand}>✕</T>
      </Pressable>
    </View>
  )
}
