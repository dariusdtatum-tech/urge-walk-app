import { Pressable } from 'react-native'
import { T } from './Text.jsx'
import { radius, size as sz, type, useTheme } from './theme.js'

// Buttons are at least 48pt tall (44pt minimum target). kinds: primary (navy), secondary (outline), quiet (text), sand.
export function Button({ label, onPress, kind = 'primary', style, testID, accessibilityLabel, textColor, disabled = false }) {
  const { c } = useTheme()
  const bg = kind === 'primary' ? c.action : kind === 'sand' ? c.sand : 'transparent'
  const fg = textColor ?? (kind === 'primary' ? c.onAction : kind === 'quiet' ? c.accent : c.title)
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [{
        minHeight: sz.button, minWidth: sz.minTap, paddingHorizontal: 18, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, borderWidth: kind === 'secondary' ? 1.5 : 0, borderColor: c.title, opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      }, style]}
    >
      <T font="semibold" size={type.button} color={fg}>{label}</T>
    </Pressable>
  )
}
