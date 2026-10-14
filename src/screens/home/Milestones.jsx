import { View } from 'react-native'
import { shortDate } from '../../lib/homeStats.js'
import { milestoneName, milestoneRows, milestoneShort } from '../../lib/milestones.js'
import { Button } from '../../ui/Button.jsx'
import { HeaderButton, Sheet } from '../../ui/Sheet.jsx'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'

export function Badge({ label, earned, big = false }) {
  const { c } = useTheme()
  const size = big ? 96 : 40
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: earned ? c.tileAlt : 'transparent', borderWidth: earned ? 0 : 1.5, borderStyle: earned ? 'solid' : 'dashed', borderColor: c.fieldBorder }}>
      <T font="bold" size={big ? 26 : 12} max={1.3} color={earned ? c.onTileAlt : c.mutedSand}>{label}</T>
    </View>
  )
}

// Reaching a milestone: one calm sheet, once per milestone per tracker.
export function MilestoneSheet({ milestone, habitName, showName, onDone }) {
  const { c } = useTheme()
  return (
    <Sheet onClose={onDone} testID="milestone-sheet">
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Badge label={milestoneShort(milestone)} earned big />
        {showName ? <T font="bold" size={13} color={c.accent} style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>{habitName}</T> : null}
        <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} style={{ textAlign: 'center' }}>{milestoneName(milestone)}</T>
        <T size={type.body} color={c.text}>{milestone.toLocaleString()} days clean</T>
        <T font="serifItalic" size={20} color={c.title}>That’s yours.</T>
      </View>
      <Button label="Done" onPress={onDone} testID="milestone-done" />
    </Sheet>
  )
}

// Every milestone with the date it was earned (or how far away it is).
export function MilestonesList({ data, habit, today, onClose }) {
  const { c } = useTheme()
  const rows = milestoneRows(data, habit, today)
  return (
    <Sheet title="Milestones" onClose={onClose} testID="milestones-list" right={<HeaderButton label="Done" onPress={onClose} />}>
      <T size={15} color={c.muted}>{habit.name}. Earned milestones stay yours, even after a reset.</T>
      {rows.map((r) => (
        <View key={r.milestone} testID="milestone-item" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
          accessible accessibilityLabel={`${r.name}: ${r.date ? `earned ${shortDate(r.date, today)}` : r.inDays ? `in ${r.inDays} days` : 'not yet'}`}>
          <Badge label={milestoneShort(r.milestone)} earned={Boolean(r.date)} />
          <T font="semibold" size={type.body} color={c.title} style={{ flex: 1 }}>{r.name}</T>
          <T size={14} color={r.date ? c.accent : c.muted}>
            {r.date ? `Earned ${shortDate(r.date, today)}` : r.inDays ? `In ${r.inDays} ${r.inDays === 1 ? 'day' : 'days'}` : 'Not yet'}
          </T>
        </View>
      ))}
    </Sheet>
  )
}
