// "Your why" on Home: one quiet line under the ring (a reason picked by the date), and the half sheet
// it opens: every reason, then one card with money kept (only when money is set), time back, and
// the one optional savings goal. Home stays at five things; this is a sheet, not a drawer.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { dayNumber, timeBack } from '../../lib/homeIdeas.js'
import { fmtMoney, goalProgress, loadGoal, moneyKept } from '../../lib/money.js'
import { loadReasons } from '../../lib/reasons.js'
import { Card } from '../../ui/Row.jsx'
import { HeaderButton, Sheet } from '../../ui/Sheet.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'

const reasonText = (r) => r.text || (r.kind === 'photo' ? 'A photo' : 'A voice note')

// Same reason all day, a different one tomorrow. Text reasons first; photo or voice only when that's all there is.
export function reasonOfDay(reasons, today) {
  const pool = reasons.filter((r) => r.text).length ? reasons.filter((r) => r.text) : reasons
  if (!pool.length) return null
  return pool[((dayNumber(today) % pool.length) + pool.length) % pool.length]
}

export function WhyLine({ today, onOpen, onAddHabit = null }) {
  const storage = useStorage()
  const { c } = useTheme()
  const [reason] = useState(() => reasonOfDay(loadReasons(storage), today))
  return (
    <View style={{ gap: 4, alignItems: 'center' }} testID="why-line">
      <Pressable onPress={onOpen} testID="why-open" accessibilityRole="button"
        accessibilityLabel={reason ? `Your why: ${reasonText(reason)}` : 'Your why. Add the reasons that matter to you.'} accessibilityHint="Opens your reasons, time back and money kept"
        style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }}>
        <T size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Your why</T>
        <T font={reason ? 'serifItalic' : 'semibold'} size={reason ? 20 : type.body} color={reason ? c.title : c.accent} style={{ textAlign: 'center' }} numberOfLines={3} testID="why-text">
          {reason ? `“${reasonText(reason)}”` : 'Add a reason ›'}
        </T>
      </Pressable>
      {onAddHabit ? (
        <Pressable onPress={onAddHabit} testID="why-add-habit" accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
          <T font="semibold" size={15} color={c.accent}>+ Add a habit</T>
        </Pressable>
      ) : null}
    </View>
  )
}

export function YourWhySheet({ profile, hero, walks, today, onEditReasons, onSettings, onClose }) {
  const storage = useStorage()
  const { c } = useTheme()
  const [reasons] = useState(() => loadReasons(storage))
  const kept = moneyKept(profile, hero, walks, today)
  const tb = timeBack(profile, hero, today)
  const goal = kept ? loadGoal(storage) : null
  const prog = goal ? goalProgress(goal, kept.total) : null
  return (
    <Sheet onClose={onClose} title="Your why" testID="why-sheet" right={<HeaderButton label="Done" onPress={onClose} testID="why-done" />}>
      {reasons.length ? (
        <View style={{ gap: 8 }} testID="why-reasons">
          {reasons.map((r, i) => (
            <T key={r.id} font="serifItalic" size={19} color={c.title} testID={`why-reason-${i}`}>“{reasonText(r)}”</T>
          ))}
        </View>
      ) : (
        <T size={type.body} color={c.text} testID="why-empty">Write down what matters to you. It shows up here and while you ride out an urge.</T>
      )}
      <Pressable onPress={onEditReasons} testID="why-edit-reasons" accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
        <T font="semibold" size={type.body} color={c.accent}>{reasons.length ? 'Edit reasons' : 'Add a reason'}</T>
      </Pressable>

      {kept || tb ? (
        <Card testID="why-card" style={{ gap: 8 }}>
          {kept ? (
            <View testID="why-money" style={{ gap: 2 }}>
              <T size={13} color={c.muted}>Money kept</T>
              <T font="serif" size={28} color={c.title}>{fmtMoney(kept.total)}</T>
              <T size={13} color={c.muted}>
                {kept.basis === 'estimate' ? `An estimate at ${fmtMoney(kept.perTime)} each time.` : `${kept.passed} ${kept.passed === 1 ? 'urge' : 'urges'} that passed × ${fmtMoney(kept.perTime)}.`}
              </T>
            </View>
          ) : null}
          {tb ? (
            <View testID="why-time" style={{ gap: 2 }}>
              <T size={13} color={c.muted}>Time back</T>
              <T size={type.body} color={c.text}>About <T font="semibold" color={c.title}>{tb.hours} {tb.hours === 1 ? 'hour' : 'hours'}</T> back so far.</T>
            </View>
          ) : null}
          {goal?.name || prog ? (
            <View style={{ gap: 6 }} testID="why-goal">
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
      ) : null}
      <Pressable onPress={onSettings} testID="why-settings" accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
        <T size={15} color={c.accent}>Money, time back and goal settings</T>
      </Pressable>
    </Sheet>
  )
}
