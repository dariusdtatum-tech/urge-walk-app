// The goal line shown with a reason on Walk and Breathe. (Money kept itself lives in Home's Your why sheet.)
import { useState } from 'react'
import { todayISO } from '../../lib/cleanTime.js'
import { heroHabit } from '../../lib/homeStats.js'
import { loadProfile } from '../../lib/profile.js'
import { loadHabits } from '../../lib/storage.js'
import { loadWalks } from '../../lib/walkStorage.js'
import { fmtMoney, loadGoal, moneyKept } from '../../lib/money.js'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'

// The small goal line with a reason on Walk and Breathe: only when money is on and a goal is named.
export function useGoalLine(now = Date.now()) {
  const storage = useStorage()
  const { c } = useTheme()
  const [line] = useState(() => {
    const goal = loadGoal(storage)
    if (!goal?.name) return null
    const kept = moneyKept(loadProfile(storage), heroHabit(loadHabits(storage).habits), loadWalks(storage).walks, todayISO(new Date(now)))
    return kept ? `${goal.name} · ${fmtMoney(kept.total)} kept` : null
  })
  return line ? <T size={15} color={c.text} testID="reason-goal">{line}</T> : null
}
