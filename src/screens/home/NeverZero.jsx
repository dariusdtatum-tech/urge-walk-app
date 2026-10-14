import { View } from 'react-native'
import { cleanCount, last30, lifetimeRidden } from '../../lib/homeIdeas.js'
import { Card } from '../../ui/Row.jsx'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'

// Never zero: lifetime urges ridden out (never resets) and the last 30 days as dots.
// Clean days are filled sea-glass dots; other days a hollow outline. No red, no X.
export function NeverZero({ hero, walks, today, highlight = false }) {
  const { c } = useTheme()
  const days = last30(hero, today)
  const clean = cleanCount(days)
  const total = lifetimeRidden(walks)
  const col = (k, n, small, sub, testID, hl) => (
    <View style={{ flex: 1, gap: 2 }}>
      <T font="semibold" size={13} color={c.muted}>{k}</T>
      <T font="serif" size={type.screenTitle} color={hl ? c.accent : c.title} testID={testID} style={{ fontVariant: ['lining-nums'] }}>
        {n}{small ? <T size={15} color={c.muted}>{small}</T> : null}
      </T>
      <T size={13} color={c.muted}>{sub}</T>
    </View>
  )
  return (
    <Card testID="never-zero">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {col('Urges ridden out', total.toLocaleString(), null, 'lifetime · walks, breaths, logs', 'nz-lifetime', highlight)}
        {col('Last 30 days', clean, ' of 30', 'days clean', 'nz-clean')}
      </View>
      <View accessible accessibilityRole="image" accessibilityLabel={`${clean} of the last 30 days clean`}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {days.map((d) => (
          <View key={d.date} testID={d.clean ? 'nz-dot-on' : 'nz-dot'}
            style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.clean ? c.ringB : 'transparent', borderWidth: d.clean ? 0 : 1.5, borderColor: c.fieldBorder }} />
        ))}
      </View>
    </Card>
  )
}
