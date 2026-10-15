// The component kit: every repeated piece, built on the tokens (tokens.js) and palette (palette.js).
// New screens use these instead of inline styles. The Design Check screen (dev only) shows them all,
// and kit.test.jsx snapshots them and fails on any off-token font size or off-palette colour.
import { Pressable, View } from 'react-native'
import { Button } from './Button.jsx'
import { T } from './Text.jsx'
import { radius, size as sz, space, type, useTheme } from './theme.js'

export { Card, Row, ToggleRow, GroupTitle } from './Row.jsx'
export { Sheet } from './Sheet.jsx'

// The main action on a screen (48pt+).
export function PrimaryButton({ label, onPress, testID, accessibilityLabel, disabled, style }) {
  return <Button kind="primary" label={label} onPress={onPress} testID={testID} accessibilityLabel={accessibilityLabel} disabled={disabled} style={style} />
}

// A quiet text link, still a 44pt target.
export function QuietLink({ label, onPress, testID, accessibilityRole = 'link' }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole={accessibilityRole} accessibilityLabel={label}
      style={{ minHeight: sz.minTap, minWidth: sz.minTap, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <T font="semibold" size={type.sub} color={c.accent} style={{ textDecorationLine: 'underline' }}>{label}</T>
    </Pressable>
  )
}

// A small label. tone 'plus' is the one sea-glass Premium tag; it never goes on a Free forever feature.
export function Tag({ label, tone = 'neutral', testID }) {
  const { c } = useTheme()
  const plus = tone === 'plus'
  return (
    <View testID={testID} style={{ alignSelf: 'flex-start', backgroundColor: plus ? c.plusBg : c.sand, borderRadius: radius.button, paddingHorizontal: 8, paddingVertical: 2 }}>
      <T font="semibold" size={type.caption} color={plus ? c.onPlus : c.mutedSand}>{label}</T>
    </View>
  )
}

// Nothing here yet: one calm sentence and at most one action.
export function EmptyState({ title, body, actionLabel, onAction, testID }) {
  const { c } = useTheme()
  return (
    <View testID={testID} style={{ alignItems: 'center', gap: space.cardGap, padding: space.card }}>
      <T font="serif" size={type.sheetTitle} color={c.title} style={{ textAlign: 'center' }} accessibilityRole="header">{title}</T>
      {body ? <T size={type.body} color={c.textSoft} style={{ textAlign: 'center' }}>{body}</T> : null}
      {actionLabel ? <QuietLink label={actionLabel} onPress={onAction} accessibilityRole="button" /> : null}
    </View>
  )
}

// A plain bar chart. Read aloud as one sentence (`summary`), bars are decorative.
export function Chart({ data, summary, height = 64, testID }) {
  const { c } = useTheme()
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={summary} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
        {data.map((d) => (
          <View key={d.key ?? d.label} style={{ flex: 1, height, justifyContent: 'flex-end', backgroundColor: c.chartTrack, borderRadius: 4 }}>
            <View style={{ height: Math.round((d.value / max) * height), backgroundColor: c.chartBar, borderRadius: 4 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {data.map((d) => <T key={d.key ?? d.label} size={type.caption} color={c.muted} style={{ flex: 1, textAlign: 'center' }}>{d.label}</T>)}
      </View>
    </View>
  )
}
