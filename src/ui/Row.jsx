import { Pressable, Switch, View } from 'react-native'
import { T } from './Text.jsx'
import { radius, size as sz, space, type, useTheme } from './theme.js'

// One settings row: title, optional sub-line, chevron. 48pt tall (tap target ≥ 44).
export function Row({ title, sub, onPress, testID, danger = false, chevron = '›', subMuted = false, accessibilityRole = 'button', accessibilityHint }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole={accessibilityRole} accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.rowX, paddingVertical: space.rowY, backgroundColor: c.card, borderRadius: radius.row, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={type.rowTitle} color={danger ? c.danger : c.title}>{title}</T>
        {sub ? <T size={type.rowSub} color={subMuted ? c.muted : c.textSoft}>{sub}</T> : null}
      </View>
      <T size={20} color={c.muted} accessibilityElementsHidden importantForAccessibility="no">{chevron}</T>
    </Pressable>
  )
}

export function GroupTitle({ children }) {
  const { c } = useTheme()
  return <T accessibilityRole="header" font="bold" size={type.section} color={c.muted} style={{ letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 10 }}>{children}</T>
}

export function Card({ children, style, testID }) {
  const { c } = useTheme()
  return <View testID={testID} style={[{ backgroundColor: c.card, borderRadius: radius.card, borderWidth: 1, borderColor: c.border, padding: space.card, gap: space.cardGap }, style]}>{children}</View>
}

export function Notice({ text, onDismiss }) {
  const { c } = useTheme()
  if (!text) return null
  return (
    <View accessibilityLiveRegion="polite" testID="notice" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.sand, borderRadius: 14, paddingLeft: 14 }}>
      <T size={15} color={c.text} style={{ flex: 1, paddingVertical: 10 }}>{text}</T>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <T size={type.body} color={c.mutedSand}>✕</T>
      </Pressable>
    </View>
  )
}

// A row with an on/off switch (the whole row is the label).
export function ToggleRow({ title, sub, value, onChange, testID }) {
  const { c } = useTheme()
  return (
    <View style={{ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.rowX, paddingVertical: space.rowY, backgroundColor: c.card, borderRadius: radius.row, borderWidth: 1, borderColor: c.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={type.rowTitle} color={c.title}>{title}</T>
        {sub ? <T size={type.rowSub} color={c.textSoft}>{sub}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} testID={testID} accessibilityLabel={title}
        trackColor={{ true: c.action, false: c.switchOff }} thumbColor={value ? c.switchThumbOn : c.switchThumbOff} activeThumbColor={c.switchThumbOn} ios_backgroundColor={c.switchOff} />
    </View>
  )
}
