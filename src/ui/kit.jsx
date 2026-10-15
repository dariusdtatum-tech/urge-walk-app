// The component kit: every repeated piece, built on the tokens (tokens.js) and palette (palette.js).
// New screens use these instead of inline styles. The Design Check screen (dev only) shows them all,
// and kit.test.jsx snapshots them and fails on any off-token font size or off-palette colour.
import { Pressable, Switch, View } from 'react-native'
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

// ---------- Editorial lists (You sections, Track) ----------
// One hero stat on the background, small-caps section labels, rows divided by hairlines instead of
// boxes, an occasional two-up stat pair, and at most one flat featured panel per screen.

// The screen's one hero number, Cormorant italic, straight on the background (no card).
export function HeroStat({ value, label, sub, testID = 'hero-stat', accessibilityLabel }) {
  const { c } = useTheme()
  return (
    <View testID={testID} accessible accessibilityLabel={accessibilityLabel ?? [value, label, sub].filter(Boolean).join(' ')} style={{ gap: 2, paddingTop: 4, paddingBottom: 8 }}>
      <T font="serifItalic" size={type.heroStat} color={c.title} style={{ lineHeight: type.heroStat + 4, fontVariant: ['lining-nums'] }}>{value}</T>
      {label ? <T font="serifItalic" size={type.ringLabel} color={c.title}>{label}</T> : null}
      {sub ? <T size={type.sub} color={c.textSoft}>{sub}</T> : null}
    </View>
  )
}

// Small-caps section label: Plus Jakarta 11pt, tracked 0.08em. Deep sea in light, cream at 70% in dark.
export function SectionLabel({ children, testID }) {
  const { c } = useTheme()
  return (
    <T accessibilityRole="header" testID={testID} font="semibold" size={type.label} color={c.sectionLabel}
      style={{ letterSpacing: type.label * 0.08, textTransform: 'uppercase', marginTop: 18, marginBottom: 2 }}>{children}</T>
  )
}

// A group of hairline rows: a hairline above the first row, then one under each.
export function RowGroup({ children, testID }) {
  const { c } = useTheme()
  return <View testID={testID} style={{ borderTopWidth: 1, borderTopColor: c.hairline }}>{children}</View>
}

const lineRow = (c) => ({ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.hairline })

// A full-width row on the background: title, optional sub-line, chevron; a hairline below. 48pt tall.
export function HairlineRow({ title, sub, onPress, testID, danger = false, chevron = '›', subMuted = false, accessibilityRole = 'button', accessibilityHint }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole={accessibilityRole} accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ ...lineRow(c), opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={type.rowTitle} color={danger ? c.danger : c.title}>{title}</T>
        {sub ? <T size={type.rowSub} color={subMuted ? c.muted : c.textSoft}>{sub}</T> : null}
      </View>
      {chevron ? <T size={20} color={c.muted} accessibilityElementsHidden importantForAccessibility="no">{chevron}</T> : null}
    </Pressable>
  )
}

// The same row with an on/off switch.
export function HairlineToggle({ title, sub, value, onChange, testID }) {
  const { c } = useTheme()
  return (
    <View style={lineRow(c)}>
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={type.rowTitle} color={c.title}>{title}</T>
        {sub ? <T size={type.rowSub} color={c.textSoft}>{sub}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} testID={testID} accessibilityLabel={title}
        trackColor={{ true: c.action, false: c.switchOff }} thumbColor={value ? c.card : c.switchThumbOff} ios_backgroundColor={c.switchOff} />
    </View>
  )
}

// Two stats side by side, divided by a hairline: [{ value, label, testID }, { value, label, testID }].
export function StatPair({ items, testID = 'stat-pair' }) {
  const { c } = useTheme()
  return (
    <View testID={testID} style={{ flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.hairline }}>
      {items.map((it, i) => (
        <View key={it.label} testID={it.testID} accessible accessibilityLabel={`${it.value} ${it.label}`}
          style={{ flex: 1, gap: 2, paddingLeft: i ? 16 : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.hairline }}>
          <T font="serifItalic" size={type.statPair} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{it.value}</T>
          <T size={type.rowSub} color={c.textSoft}>{it.label}</T>
        </View>
      ))}
    </View>
  )
}

// The one featured block on a screen: a flat sand panel (#182b47 at night). No border, no shadow.
export function FeaturedPanel({ children, testID, style }) {
  const { c } = useTheme()
  return <View testID={testID} style={[{ backgroundColor: c.featured, borderRadius: radius.card, padding: space.card, gap: space.cardGap }, style]}>{children}</View>
}
