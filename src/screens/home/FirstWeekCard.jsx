import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { loadCheckins } from '../../lib/checkin.js'
import { loadContacts } from '../../lib/contacts.js'
import { doneSteps, firstWeekView, loadFirstWeek, saveFirstWeek, skipStep } from '../../lib/firstWeek.js'
import { loadProfile } from '../../lib/profile.js'
import { loadReasons } from '../../lib/reasons.js'
import { loadHabits } from '../../lib/storage.js'
import { loadWalks } from '../../lib/walkStorage.js'
import { Card, PrimaryButton, QuietLink } from '../../ui/kit.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { space, type, useTheme } from '../../ui/theme.js'

const DOT = 14

// Seven dots along a shoreline: filled = done, ring = open, faint = a later day. Skipped looks like
// open-but-settled (a soft dash), never red.
function Shoreline({ dots, day }) {
  const { c } = useTheme()
  const done = dots.filter((d) => d.status === 'done').length
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Day ${day + 1} of 7. ${done} of 7 steps done.`} testID="first-week-dots"
      style={{ height: DOT + 8, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: DOT / 2, right: DOT / 2, height: 2, borderRadius: 1, backgroundColor: c.chartTrack }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {dots.map((d) => (
          <View key={d.id} testID={`first-week-dot-${d.id}-${d.status}`} style={{
            width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2,
            borderColor: d.status === 'later' ? c.chartTrack : c.chartBar,
            backgroundColor: d.status === 'done' ? c.chartBar : d.status === 'skipped' ? c.chartTrack : c.card,
          }} />
        ))}
      </View>
    </View>
  )
}

export function FirstWeekCard({ now, onStep }) {
  const storage = useStorage()
  const { c } = useTheme()
  const [, setTick] = useState(0)
  const fw = loadFirstWeek(storage)
  const done = doneSteps({ habits: loadHabits(storage).habits, reasons: loadReasons(storage), contacts: loadContacts(storage), walks: loadWalks(storage).walks, checkins: loadCheckins(storage), fw })
  const view = firstWeekView({ onboardedAt: loadProfile(storage)?.onboardedAt, now, done, fw })
  useEffect(() => { if (view.mode === 'path' && !fw.shown) saveFirstWeek({ shown: true }, storage) }, [view.mode, fw.shown, storage])

  if (view.mode === 'complete') {
    return (
      <Card testID="first-week-complete" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T size={type.body} color={c.text} style={{ flex: 1 }}>Your setup is complete. Everything stays right where it is.</T>
        <QuietLink label="OK" accessibilityRole="button" testID="first-week-ok" onPress={() => { saveFirstWeek({ completeDismissed: true }, storage); setTick((t) => t + 1) }} />
      </Card>
    )
  }
  if (view.mode !== 'path') return null
  const { step } = view
  return (
    <Card testID="first-week">
      <T accessibilityRole="header" font="semibold" size={type.rowTitle} color={c.title}>Your first week</T>
      <Shoreline dots={view.dots} day={view.day} />
      {step ? (
        <View style={{ gap: space.cardGap }} testID={`first-week-step-${step.id}`}>
          <T font="semibold" size={type.body} color={c.title}>{step.title}</T>
          <T size={type.rowSub} color={c.textSoft}>{step.sub} Optional.</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PrimaryButton label="Go" onPress={() => { if (step.id === 'map') saveFirstWeek({ seenMap: true }, storage); onStep(step.id) }} testID="first-week-go" accessibilityLabel={`${step.title}. Go`} />
            <QuietLink label="Skip" accessibilityRole="button" testID="first-week-skip" onPress={() => { skipStep(step.id, storage); setTick((t) => t + 1) }} />
          </View>
        </View>
      ) : (
        <T size={type.rowSub} color={c.textSoft} testID="first-week-rest">That’s today’s step. A new one opens tomorrow.</T>
      )}
    </Card>
  )
}
