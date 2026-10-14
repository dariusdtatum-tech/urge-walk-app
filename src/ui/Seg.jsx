import { Pressable, View } from 'react-native'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

// Segmented choice (Week / Month / All time, System / Light / Dark…). Each segment is 44pt.
export function Seg({ items, value, onChange, label, testID, small = false }) {
  const { c } = useTheme()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}
      style={{ flexDirection: 'row', backgroundColor: c.seg, borderRadius: 14, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const on = value === it.id
        return (
          <Pressable key={String(it.id)} onPress={() => onChange(it.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            accessibilityLabel={it.a11y ?? it.label} testID={testID ? `${testID}-${it.id}` : undefined}
            style={{ flex: 1, minHeight: 44, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.action : 'transparent' }}>
            <T font="semibold" size={small ? 14 : 15} color={on ? c.onAction : c.mutedSand}>{it.label}</T>
            {it.sub ? <T size={12} color={on ? c.onActionSoft : c.mutedSand}>{it.sub}</T> : null}
          </Pressable>
        )
      })}
    </View>
  )
}
