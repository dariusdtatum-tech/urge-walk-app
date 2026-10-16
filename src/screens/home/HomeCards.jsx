// Fuller Home cards, in this order and never more than five (HOME_CARDS; drawer.test enforces it):
//   your why · daily check-in · this week · Urge Map preview · money kept (only when set up).
// Each one hides itself when it has nothing honest to show (no reason, money not set).
import { Pressable, View } from 'react-native'
import { localDayKey, weekDays } from '../../lib/logStats.js'
import { fmtMoney, moneyKept } from '../../lib/money.js'
import { weeklyPattern } from '../../lib/urgeMap.js'
import { Card } from '../../ui/Row.jsx'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'
import { HomeReason } from '../Reasons.jsx'

export const HOME_CARDS = ['why-card', 'checkin-card', 'week-card', 'urgemap-card', 'money-card']
export const MAX_HOME_CARDS = 5

const Label = ({ children }) => { const { c } = useTheme(); return <T size={13} color={c.textSoft}>{children}</T> }

// (a) Your why: the quote only, with a small label.
export function WhyCard({ reason, onOpen }) {
  if (!reason) return null
  return (
    <Card testID="why-card" style={{ gap: 2 }}>
      <Label>Your why</Label>
      <HomeReason reason={reason} onOpen={onOpen} align="left" />
    </Card>
  )
}

// This week's numbers (pure, tested): urges ridden out (every kind) and walks with their minutes.
export function weekNumbers(walks, today) {
  const keys = new Set(weekDays([], today).map((d) => d.key))
  let ridden = 0; let walked = 0; let secs = 0
  for (const w of walks) {
    if (!keys.has(localDayKey(w.startedAt))) continue
    ridden += 1
    if (w.kind == null || w.kind === 'walk') { walked += 1; secs += w.actualSeconds > 0 ? w.actualSeconds : 0 }
  }
  return { ridden, walked, minutes: Math.round(secs / 60) }
}

// (c) This week.
export function WeekCard({ walks, today }) {
  const { c } = useTheme()
  const n = weekNumbers(walks, today)
  return (
    <Card testID="week-card" style={{ gap: 8 }}>
      <T accessibilityRole="header" font="semibold" size={type.body} color={c.title}>This week</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }} accessible accessibilityLabel={`${n.ridden} ${n.ridden === 1 ? 'urge' : 'urges'} ridden out this week`} testID="week-ridden">
          <T font="semibold" size={26} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{n.ridden}</T>
          <T size={13} color={c.textSoft}>urges ridden out</T>
        </View>
        <View style={{ flex: 1 }} accessible accessibilityLabel={`${n.walked} ${n.walked === 1 ? 'walk' : 'walks'}, ${n.minutes} minutes this week`} testID="week-walks">
          <T font="semibold" size={26} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{n.walked} <T size={type.body} color={c.title}>{n.walked === 1 ? 'walk' : 'walks'}</T></T>
          <T size={13} color={c.textSoft}>{n.minutes} min walked</T>
        </View>
      </View>
    </Card>
  )
}

// (d) Urge Map preview: last 7 days as dots (bigger = more urges), one line, and a link to Track. Free.
export function UrgeMapCard({ walks, today, now, onSeeTrack }) {
  const { c } = useTheme()
  const days = weekDays(walks, today)
  const max = Math.max(1, ...days.map((d) => d.count))
  const pattern = weeklyPattern(walks, now)
  const line = pattern ? pattern.sentence.split(/(?<=\.)\s/)[0] : days.some((d) => d.count) ? 'A few urges this week. You rode them out.' : 'Nothing logged this week yet.'
  return (
    <Card testID="urgemap-card" style={{ gap: 10 }}>
      <T accessibilityRole="header" font="semibold" size={type.body} color={c.title}>Urge Map</T>
      <View style={{ flexDirection: 'row' }} accessible accessibilityLabel={`Last 7 days: ${days.map((d) => `${d.label} ${d.count}`).join(', ')}`} testID="urgemap-strip">
        {days.map((d) => {
          const s = d.count ? 10 + Math.round(10 * (d.count / max)) : 6
          return (
            <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ height: 20, justifyContent: 'center' }}>
                <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: d.count ? c.ringB : 'transparent', borderWidth: d.count ? 0 : 1, borderColor: c.cellEdge }} />
              </View>
              <T size={12} color={d.isToday ? c.title : c.textSoft}>{d.label.slice(0, 1)}</T>
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T size={14} color={c.textSoft} style={{ flex: 1 }} testID="urgemap-line">{line}</T>
        <Pressable onPress={onSeeTrack} accessibilityRole="link" accessibilityLabel="See Track" testID="urgemap-see-track"
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingLeft: 8 }}>
          <T font="semibold" size={14} color={c.title}>See Track ›</T>
        </Pressable>
      </View>
    </Card>
  )
}

// (e) Money kept: only when the person set it up.
export function MoneyCard({ profile, hero, walks, today }) {
  const { c } = useTheme()
  const kept = hero ? moneyKept(profile, hero, walks, today) : null
  if (!kept) return null
  return (
    <Card testID="money-card" style={{ gap: 2 }}>
      <Label>Money kept</Label>
      <T font="semibold" size={26} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{fmtMoney(kept.total)} <T size={type.body} color={c.title}>kept</T></T>
    </Card>
  )
}
