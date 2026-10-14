import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { todayISO } from '../lib/cleanTime.js'
import { cleanDays, heroHabit, shortDate } from '../lib/homeStats.js'
import { ringLabel, ringSegment } from '../lib/milestones.js'
import { loadHabits, makeId, saveHabits } from '../lib/storage.js'
import { Button } from '../ui/Button.jsx'
import { WaveIcon } from '../ui/Icons.jsx'
import { Ring } from '../ui/Ring.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { MAX_SCALE, useTheme } from '../ui/theme.js'

// Home: the date, the Ride it out bar for everyone, then the day ring for the main tracker.
export function HomeScreen({ now, onRide, liveWalk, onResume }) {
  const storage = useStorage()
  const { c } = useTheme()
  const [habits, setHabits] = useState(() => loadHabits(storage).habits)
  const today = todayISO(new Date(now))
  const hero = heroHabit(habits)
  const days = cleanDays(hero, today)
  const seg = ringSegment(days)
  const label = ringLabel(days)
  const dateLine = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  function startToday() {
    const next = [{ id: makeId(), name: 'Day count', startDate: today }]
    saveHabits(next, storage)
    setHabits(loadHabits(storage).habits)
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }} testID="home">
      <T accessibilityRole="header" font="medium" size={15} color={c.muted}>{dateLine}</T>

      <Pressable
        onPress={liveWalk ? onResume : onRide}
        accessibilityRole="button"
        accessibilityLabel={liveWalk ? 'Back to your walk' : 'Ride it out. Walk, breathe, or just log it.'}
        testID="ride-bar"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: c.action, opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: c.onActionSoft, alignItems: 'center', justifyContent: 'center' }}>
          <WaveIcon color={c.onAction} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <T font="bold" size={17} color={c.onAction}>{liveWalk ? 'Back to your walk' : 'Ride it out'}</T>
          <T size={14} color={c.onActionSoft}>{liveWalk ? 'Your walk is still going.' : 'Walk, breathe, or just log it.'}</T>
        </View>
        <T size={22} color={c.onAction} accessibilityElementsHidden importantForAccessibility="no">›</T>
      </Pressable>

      {hero ? (
        <View style={{ alignItems: 'center', gap: 10 }} testID="hero">
          <Ring value={seg.progress} testID="hero-ring">
            <T font="bold" size={13} max={MAX_SCALE.ringSmall} color={c.accent} numberOfLines={1}
              style={{ letterSpacing: 2, textTransform: 'uppercase' }}>{hero.name}</T>
            <T font="serif" size={72} max={MAX_SCALE.ring} color={c.title} testID="hero-days"
              accessibilityLabel={`${days} ${days === 1 ? "day" : "days"} clean`} style={{ lineHeight: 76, fontVariant: ["lining-nums", "tabular-nums"] }}>{days}</T>
            <T font="serif" size={20} max={MAX_SCALE.ringSmall} color={c.title}>{days === 1 ? 'day clean' : 'days clean'}</T>
            <T size={12} max={MAX_SCALE.ringSmall} color={c.muted}>since {shortDate(hero.startDate, today)}</T>
          </Ring>
          <T size={15} color={c.muted} testID="ring-label">
            <T font="bold" size={15} color={c.title}>{label.lead}</T>{label.rest}
          </T>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }} testID="home-empty">
          <T accessibilityRole="header" font="serif" size={28} color={c.title}>Every day counts</T>
          <T size={16} color={c.text} style={{ textAlign: 'center' }}>Add your start date to begin counting.</T>
          <Button label="Start counting from today" onPress={startToday} testID="start-today" />
        </View>
      )}
    </ScrollView>
  )
}
