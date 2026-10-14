import { Pressable, View } from 'react-native'
import { parseISODate } from '../lib/cleanTime.js'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')
const dim = (y, m) => new Date(y, m, 0).getDate()

// Month / Day / Year, each a column with − and + (and VoiceOver "adjustable" swipe up/down).
// Pure React Native, so it looks and works the same on iPhone, Android, web and in tests.
// Never goes past `max` (today: a clean count can't start in the future) or before `min`.
export function clampISO(y, m, d, min, max) {
  const iso = `${y}-${pad(m)}-${pad(Math.min(d, dim(y, m)))}`
  if (max && iso > max) return max
  if (min && iso < min) return min
  return iso
}

export function DatePicker({ value, onChange, max, min = '1900-01-01', testID = 'date' }) {
  const { c } = useTheme()
  const p = parseISODate(value) || parseISODate(max)
  const cols = [
    { id: 'month', label: 'Month', text: MONTHS[p.m - 1], step: (n) => { const t = new Date(p.y, p.m - 1 + n, 1); return clampISO(t.getFullYear(), t.getMonth() + 1, p.d, min, max) } },
    { id: 'day', label: 'Day', text: String(p.d), step: (n) => { const t = new Date(p.y, p.m - 1, p.d + n); return clampISO(t.getFullYear(), t.getMonth() + 1, t.getDate(), min, max) } },
    { id: 'year', label: 'Year', text: String(p.y), step: (n) => clampISO(p.y + n, p.m, p.d, min, max) },
  ]
  return (
    <View style={{ flexDirection: 'row', gap: 8 }} testID={testID}>
      {cols.map((col) => {
        const less = col.step(-1)
        const more = col.step(1)
        const canLess = less !== value
        const canMore = more !== value
        const btn = (dir, to, ok) => (
          <Pressable onPress={() => ok && onChange(to)} disabled={!ok} accessibilityRole="button"
            accessibilityLabel={`${dir === -1 ? 'Earlier' : 'Later'} ${col.label.toLowerCase()}`} testID={`${testID}-${col.id}-${dir === -1 ? 'less' : 'more'}`}
            accessibilityState={{ disabled: !ok }}
            style={{ minHeight: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', opacity: ok ? 1 : 0.35 }}>
            <T font="bold" size={20} color={c.title}>{dir === -1 ? '−' : '+'}</T>
          </Pressable>
        )
        return (
          <View key={col.id} style={{ flex: col.id === 'month' ? 1.6 : 1, alignItems: 'center', backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
            {btn(1, more, canMore)}
            <View accessible accessibilityRole="adjustable" accessibilityLabel={col.label} accessibilityValue={{ text: col.text }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => { const to = e.nativeEvent.actionName === 'increment' ? more : less; if (to !== value) onChange(to) }}
              style={{ paddingVertical: 6, alignItems: 'center' }}>
              <T size={12} color={c.muted}>{col.label}</T>
              <T font="semibold" size={18} color={c.title} testID={`${testID}-${col.id}`} numberOfLines={1}>{col.text}</T>
            </View>
            {btn(-1, less, canLess)}
          </View>
        )
      })}
    </View>
  )
}
