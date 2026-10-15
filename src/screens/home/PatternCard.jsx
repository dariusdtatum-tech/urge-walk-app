// Your pattern (Home): one plain sentence about the last 7 days and a small heat strip by time of day.
// Computed on this phone from saved urges. Nothing shows until there are 3 urges in the week.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { loadReminder, reminderLabel, saveReminder } from '../../lib/checkin.js'
import { SLOTS, checkinSuggestion, dismissSuggestion, loadPatternPrefs, weeklyPattern } from '../../lib/urgeMap.js'
import { Button } from '../../ui/Button.jsx'
import { useDevice } from '../../ui/DeviceContext.js'
import { Card } from '../../ui/Row.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'

const AXIS = ['12a', '6a', '12p', '6p']

export function PatternCard({ walks, now }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const pattern = weeklyPattern(walks, now)
  const [suggest, setSuggest] = useState(() => checkinSuggestion(pattern, loadReminder(storage), loadPatternPrefs(storage), now))
  const [setAt, setSetAt] = useState(null)
  if (!pattern) return null
  const max = Math.max(1, ...pattern.slots)
  return (
    <Card testID="pattern-card" style={{ gap: 10 }}>
      <T accessibilityRole="header" font="semibold" size={17} color={c.title}>Your pattern this week</T>
      <T size={type.body} color={c.text} testID="pattern-sentence">{pattern.sentence}</T>
      <View accessible accessibilityLabel={`Urges by time of day: ${pattern.slots.map((n, i) => (n ? `${n} around ${i * 2}:00` : null)).filter(Boolean).join(', ')}`} testID="pattern-strip">
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {pattern.slots.map((n, i) => (
            <View key={i} style={{ flex: 1, height: 18, borderRadius: 4, backgroundColor: n ? c.action : c.sand, borderWidth: n ? 0 : 1, borderColor: c.cellEdge, opacity: n ? 0.25 + 0.75 * (n / max) : 1 }} testID={n ? undefined : 'pattern-empty'} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {AXIS.map((a) => <T key={a} size={12} color={c.muted} style={{ flex: 1 }}>{a}</T>)}
        </View>
      </View>
      {setAt ? <T size={14} color={c.textSoft} testID="pattern-set">Daily check-in set for {setAt}. You can change it in You.</T> : null}
      {suggest && !setAt ? (
        <View style={{ gap: 6 }} testID="pattern-suggest">
          <T size={15} color={c.text}>Want a check-in at {reminderLabel(suggest)}? It’s optional.</T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Button kind="secondary" label={`Set ${reminderLabel(suggest)}`} style={{ flex: 1 }} testID="pattern-suggest-yes"
              onPress={() => { saveReminder(suggest, storage); device.syncCheckinReminder(suggest); setSetAt(reminderLabel(suggest)); setSuggest(null) }} />
            <Pressable onPress={() => { dismissSuggestion(storage, now); setSuggest(null) }} accessibilityRole="button" testID="pattern-suggest-no"
              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
              <T font="semibold" size={15} color={c.textSoft}>Not now</T>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  )
}
