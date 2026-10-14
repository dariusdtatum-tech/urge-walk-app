import { Pressable, View } from 'react-native'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

// − value + with a row of small marks (M T W T F S S, or 1…7+). value may be null ("–").
export function Stepper({ value, onChange, min, max, unit, marks, testID }) {
  const { c } = useTheme()
  const shown = value ?? null
  const plus = marks?.at(-1)?.endsWith('+')
  const label = shown == null ? 'not set' : shown === max && plus ? `${max}+` : String(shown)
  const b = (sign) => {
    const disabled = shown != null && (sign < 0 ? shown <= min : shown >= max)
    const to = shown == null ? (sign < 0 ? min : Math.max(min, 1)) : Math.min(max, Math.max(min, shown + sign))
    return (
      <Pressable onPress={() => !disabled && onChange(to)} disabled={disabled} accessibilityRole="button" accessibilityLabel={sign < 0 ? 'Less' : 'More'}
        accessibilityState={{ disabled }} testID={`${testID}-${sign < 0 ? 'less' : 'more'}`}
        style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: c.title, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
        <T font="bold" size={24} color={c.title}>{sign < 0 ? '−' : '+'}</T>
      </Pressable>
    )
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {b(-1)}
        <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${label} ${unit}`}>
          <T font="serif" size={44} color={c.title} testID={testID} style={{ fontVariant: ['lining-nums'] }}>{shown == null ? '–' : label}</T>
          <T size={14} color={c.muted}>{unit}</T>
        </View>
        {b(1)}
      </View>
      {marks ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {marks.map((m, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: shown != null && i < shown ? c.ringA : c.track }} />
              <T size={12} color={c.muted}>{m}</T>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
