// Money kept (Home). Only when money is on in You; nothing at all otherwise.
import { useState } from 'react'
import { View } from 'react-native'
import { todayISO } from '../../lib/cleanTime.js'
import { heroHabit } from '../../lib/homeStats.js'
import { loadProfile } from '../../lib/profile.js'
import { loadHabits } from '../../lib/storage.js'
import { loadWalks } from '../../lib/walkStorage.js'
import { fmtMoney, goalProgress, loadGoal, moneyKept } from '../../lib/money.js'
import { Card } from '../../ui/Row.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'

export function MoneyCard({ profile, hero, walks, today, since }) {
  const storage = useStorage()
  const { c } = useTheme()
  const kept = moneyKept(profile, hero, walks, today)
  if (!kept) return null
  const goal = loadGoal(storage)
  const prog = goalProgress(goal, kept.total)
  return (
    <Card testID="money-card" style={{ gap: 6 }}>
      <T accessibilityRole="header" font="semibold" size={17} color={c.title}>Money kept</T>
      <T size={16} color={c.text} testID="money-total">
        <T font="serif" size={30} color={c.title}>{fmtMoney(kept.total)}</T> kept{since ? ` since ${since}` : ''}
      </T>
      <T size={13} color={c.muted}>
        {kept.basis === 'estimate' ? `An estimate at ${fmtMoney(kept.perTime)} each time.` : `${kept.passed} ${kept.passed === 1 ? 'urge' : 'urges'} that passed × ${fmtMoney(kept.perTime)}.`}
      </T>
      {goal?.name || prog ? (
        <View style={{ gap: 6, marginTop: 4 }} testID="money-goal">
          <T size={15} color={c.text}>Going toward{goal.name ? <T font="semibold" color={c.title}> {goal.name}</T> : ' your goal'}{prog ? ` · ${fmtMoney(goal.target)}` : ''}</T>
          {prog ? (
            <View accessible accessibilityRole="progressbar" accessibilityLabel={`${prog.pct} percent of your goal`} accessibilityValue={{ min: 0, max: 100, now: prog.pct }}
              style={{ height: 8, borderRadius: 4, backgroundColor: c.sand, overflow: 'hidden' }}>
              <View style={{ width: `${prog.pct}%`, height: 8, backgroundColor: c.action }} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  )
}

// The small goal line with a reason on Walk and Breathe: only when money is on and a goal is named.
export function useGoalLine() {
  const storage = useStorage()
  const { c } = useTheme()
  const [line] = useState(() => {
    const goal = loadGoal(storage)
    if (!goal?.name) return null
    const kept = moneyKept(loadProfile(storage), heroHabit(loadHabits(storage).habits), loadWalks(storage).walks, todayISO())
    return kept ? `${goal.name} · ${fmtMoney(kept.total)} kept` : null
  })
  return line ? <T size={15} color={c.text} testID="reason-goal">{line}</T> : null
}
