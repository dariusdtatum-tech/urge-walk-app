// You → Money kept. Off by default. "$ each time" is the same value Time back uses.
import { useState } from 'react'
import { View } from 'react-native'
import { MAX_GOAL_NAME, loadGoal, moneyPerTime, saveGoal } from '../lib/money.js'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'

// onSave(moneyPerTime | null) updates the profile; the goal is saved here.
export function MoneySheet({ profile, onSave, onClose }) {
  const storage = useStorage()
  const { c } = useTheme()
  const per = moneyPerTime(profile)
  const goal = loadGoal(storage)
  const [money, setMoney] = useState(per == null ? '' : String(per))
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal?.target ? String(goal.target) : '')
  const m = Number(money)
  const moneyOk = money.trim() !== '' && Number.isFinite(m) && m > 0 && m <= 100000
  const t = Number(target)
  const targetOk = target.trim() === '' || (Number.isFinite(t) && t > 0)
  return (
    <Sheet title="Money kept" onClose={onClose} testID="money-sheet">
      <T size={15} color={c.text}>Optional, and only on this phone. About how much did one time cost? Home then shows a running total, and an urge that passed adds a small “kept” line.</T>
      <Field label="Dollars each time" value={money} onChangeText={setMoney} keyboardType="decimal-pad" placeholder="e.g. 12" testID="money-amount" />
      <Field label="Going toward (optional)" value={name} onChangeText={setName} maxLength={MAX_GOAL_NAME} placeholder="e.g. Car fund" testID="money-goal-name" />
      <Field label="Goal amount (optional)" value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="e.g. 2000" testID="money-goal-target" invalid={!targetOk} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" label={per == null ? 'Cancel' : 'Turn off'} onPress={() => (per == null ? onClose() : onSave(null))} style={{ flex: 1 }} testID="money-off" />
        <Button label="Save" disabled={!moneyOk || !targetOk} style={{ flex: 1 }} testID="money-save"
          onPress={() => { saveGoal({ name, target: target.trim() ? t : null }, storage); onSave(Math.round(m * 100) / 100) }} />
      </View>
    </Sheet>
  )
}
