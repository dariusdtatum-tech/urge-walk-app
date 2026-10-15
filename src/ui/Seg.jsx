import { Pressable, View } from 'react-native'
import { T } from './Text.jsx'
import { MAX_SCALE, useTheme } from './theme.js'

// Segmented choice (Week / Month / All time, System / Light / Dark…). Each segment is 44pt.
// `compact`: a small right-aligned header pill (Track → Your walks range) that doesn't compete with the
// screen's own switcher. Its pill is 36pt tall with a 44pt hit area (hitSlop), and segments never shrink
// (flexShrink 0 plus a minimum width), so Week / Month / All can't squash into each other.
export function Seg({ items, value, onChange, label, testID, small = false, compact = false }) {
  const { c } = useTheme()
  // 4+ segments share one row: cap text growth like the tab bar so labels don't clip at 2x.
  const max = items.length >= 4 ? MAX_SCALE.tab : undefined
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}
      style={{ flexDirection: 'row', backgroundColor: c.seg, borderRadius: compact ? 24 : 14, padding: compact ? 2 : 4, gap: compact ? 2 : 4, alignSelf: compact ? 'flex-end' : 'stretch', flexShrink: compact ? 0 : 1 }}>
      {items.map((it) => {
        const on = value === it.id
        return (
          <Pressable key={String(it.id)} onPress={() => onChange(it.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            accessibilityLabel={it.a11y ?? it.label} testID={testID ? `${testID}-${it.id}` : undefined}
            hitSlop={compact ? { top: 4, bottom: 4 } : undefined}
            style={{ flex: compact ? 0 : 1, flexShrink: compact ? 0 : 1, minWidth: compact ? 56 : undefined, minHeight: compact ? 36 : 44, paddingHorizontal: compact ? 12 : 6, borderRadius: compact ? 22 : 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.action : 'transparent' }}>
            <T font="semibold" size={compact ? 13 : small ? 14 : 15} max={max} color={on ? c.onAction : c.mutedSand}>{it.label}</T>
            {it.sub ? <T size={12} max={max} color={on ? c.onActionSoft : c.mutedSand}>{it.sub}</T> : null}
          </Pressable>
        )
      })}
    </View>
  )
}
