// Money kept (You → Progress): the running total and the one optional savings goal. Hidden entirely
// until money is set. Time back sits right below it (TimeBackCard), hidden until setup says how often.
import { View } from 'react-native'
import { fmtMoney, goalProgress, loadGoal, moneyKept } from '../../lib/money.js'
import { Button } from '../../ui/Button.jsx'
import { Card } from '../../ui/Row.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'

// onEditMoney (You → Progress) adds a button for the $ estimate; the card shows even with money off then.
// flat (You → Progress): no box; it sits under the Money kept label as plain rows.
export function KeptCard({ profile, hero, walks, today, onEditMoney = null, flat = false }) {
  const storage = useStorage()
  const { c } = useTheme()
  const kept = moneyKept(profile, hero, walks, today)
  const goal = kept ? loadGoal(storage) : null
  const prog = goal ? goalProgress(goal, kept.total) : null
  const Box = flat ? View : Card
  return (
    <>
      {kept || onEditMoney ? (
        <Box testID="kept-card" style={{ gap: 8, ...(flat ? { paddingTop: 10 } : null) }}>
          {!kept && !flat ? <T size={13} color={c.muted}>Money kept</T> : null}
          {kept ? (
            <View testID="kept-money" style={{ gap: 2 }}>
              {!flat ? <T size={13} color={c.muted}>Money kept</T> : null}
              <T font="serif" size={28} color={c.title} style={{ fontVariant: ['lining-nums'] }} testID="kept-total"
                accessibilityLabel={`Money kept, ${fmtMoney(kept.total)}`}>{fmtMoney(kept.total)}</T>
              <T size={13} color={c.muted}>
                {kept.basis === 'estimate' ? `An estimate at ${fmtMoney(kept.perTime)} each time.` : `${kept.passed} ${kept.passed === 1 ? 'urge' : 'urges'} that passed × ${fmtMoney(kept.perTime)}.`}
              </T>
            </View>
          ) : null}
          {goal?.name || prog ? (
            <View style={{ gap: 6 }} testID="kept-goal">
              <T size={15} color={c.text}>Going toward{goal.name ? <T font="semibold" color={c.title}> {goal.name}</T> : ' your goal'}{prog ? ` · ${fmtMoney(goal.target)}` : ''}</T>
              {prog ? (
                <View accessible accessibilityRole="progressbar" accessibilityLabel={`${prog.pct} percent of your goal`} accessibilityValue={{ min: 0, max: 100, now: prog.pct }}
                  style={{ height: 8, borderRadius: 4, backgroundColor: c.sand, overflow: 'hidden' }}>
                  <View style={{ width: `${prog.pct}%`, height: 8, backgroundColor: c.action }} />
                </View>
              ) : null}
            </View>
          ) : null}
          {onEditMoney ? (
            <View style={{ flexDirection: 'row' }}>
              <Button kind="quiet" label={kept ? 'Change money estimate' : 'Add money estimate'} onPress={onEditMoney} testID="kept-money-edit" />
            </View>
          ) : null}
        </Box>
      ) : null}
    </>
  )
}
