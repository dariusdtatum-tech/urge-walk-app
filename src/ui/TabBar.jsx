import { Pressable, View } from 'react-native'
import { HomeIcon, JournalIcon, LogIcon, WaveIcon, YouIcon } from './Icons.jsx'
import { T } from './Text.jsx'
import { MAX_SCALE, useTheme } from './theme.js'

export const LONG_PRESS_MS = 550
const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'log', label: 'Log', Icon: LogIcon },
  { id: 'ride' },
  { id: 'journal', label: 'Journal', Icon: JournalIcon },
  { id: 'you', label: 'You', Icon: YouIcon },
]

// Four tabs and the centre "Ride it out" button: tap = choose Walk / Breathe / Just log it,
// hold = start a walk right away.
export function TabBar({ active, onTab, onRide, onRideHold, bottomInset = 0 }) {
  const { c } = useTheme()
  return (
    <View accessibilityRole="tablist" style={{
      flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8 + bottomInset, paddingTop: 6,
      backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
    }}>
      {TABS.map((t) => t.id === 'ride' ? (
        <View key="ride" style={{ flex: 1, alignItems: 'center' }}>
          <Pressable
            testID="ride-button"
            onPress={onRide}
            onLongPress={onRideHold}
            delayLongPress={LONG_PRESS_MS}
            accessibilityRole="button"
            accessibilityLabel="Ride it out"
            accessibilityHint="Tap to choose Walk, Breathe or Just log it. Hold to start a walk right away."
            style={({ pressed }) => ({ alignItems: 'center', marginTop: -26, opacity: pressed ? 0.9 : 1 })}
          >
            <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.surface }}>
              <WaveIcon color={c.onAction} size={28} />
            </View>
            <T font="semibold" size={12} max={MAX_SCALE.tab} color={c.title}>Ride it out</T>
          </Pressable>
        </View>
      ) : (
        <Pressable key={t.id} onPress={() => onTab(t.id)} testID={`tab-${t.id}`}
          accessibilityRole="tab" accessibilityState={{ selected: active === t.id }} accessibilityLabel={t.label}
          style={{ flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', gap: 2 }}>
          <View style={{ height: 3, width: 22, borderRadius: 2, backgroundColor: active === t.id ? c.tabActive : 'transparent', marginBottom: 2 }} />
          <t.Icon color={active === t.id ? c.tabActive : c.muted} />
          <T font={active === t.id ? 'bold' : 'medium'} size={12} max={MAX_SCALE.tab} color={active === t.id ? c.tabActive : c.muted}>{t.label}</T>
        </Pressable>
      ))}
    </View>
  )
}

// One-time hint after the first walk started by holding: a bubble that points down at the button.
export function RideCoachmark({ onDismiss }) {
  const { c } = useTheme()
  return (
    <View testID="ride-coachmark" accessibilityRole="alert" style={{ position: 'absolute', left: 16, right: 16, bottom: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: c.action, borderRadius: 16, padding: 14, gap: 8, maxWidth: 360 }}>
        <T size={15} color={c.onAction}>
          <T font="bold" size={15} color={c.onAction}>Tip: the Ride it out button. </T>
          Tap it to choose Walk, Breathe or Just log it. Hold it to start a walk right away.
        </T>
        <Pressable onPress={onDismiss} accessibilityRole="button" testID="coachmark-ok"
          style={{ alignSelf: 'flex-end', minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.onAction, alignItems: 'center', justifyContent: 'center' }}>
          <T font="bold" size={15} color={c.action}>Got it</T>
        </Pressable>
      </View>
      {/* the pointer: a small triangle aimed at the centre button below */}
      <View accessibilityElementsHidden importantForAccessibility="no" style={{
        width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c.action,
      }} />
    </View>
  )
}
