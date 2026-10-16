import { useEffect } from 'react'
import { AccessibilityInfo, Pressable, View } from 'react-native'
import { CommunityIcon, HomeIcon, LogIcon, WaveIcon, YouIcon } from './Icons.jsx'
import { T } from './Text.jsx'
import { SHOW_COMMUNITY_TAB } from '../lib/features.js'
import { MAX_SCALE, size as sz, useTheme } from './theme.js'

export const LONG_PRESS_MS = 550
const ALL_TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'track', label: 'Track', Icon: LogIcon },
  { id: 'ride' },
  { id: 'community', label: 'Community', Icon: CommunityIcon },
  { id: 'you', label: 'You', Icon: YouIcon },
]
const TABS = ALL_TABS.filter((t) => t.id !== 'community' || SHOW_COMMUNITY_TAB)

// Home · Track · Ride it out · You (Community comes back with SHOW_COMMUNITY_TAB). The tabs and the centre "Ride it out" button: tap = choose Walk / Breathe / Ground / Just log it,
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
            accessibilityHint="Tap to choose Walk, Breathe, Ground or Just log it. Hold to start a walk right away."
            style={({ pressed }) => ({ alignItems: 'center', minHeight: sz.minTap, marginTop: -26, opacity: pressed ? 0.9 : 1 })}
          >
            <View style={{ width: sz.tabCenter, height: sz.tabCenter, borderRadius: sz.tabCenter / 2, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.surface }}>
              <WaveIcon color={c.onAction} size={sz.tabWave} />
            </View>
            <T font="semibold" size={12} max={MAX_SCALE.tab} color={c.title}>Ride it out</T>
          </Pressable>
        </View>
      ) : (
        <Pressable key={t.id} onPress={() => onTab(t.id)} testID={`tab-${t.id}`}
          accessibilityRole="tab" accessibilityState={{ selected: active === t.id }} accessibilityLabel={t.label}
          style={{ flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', gap: 2 }}>
          <View style={{ height: 3, width: 22, borderRadius: 2, backgroundColor: active === t.id ? c.dotActive : 'transparent', marginBottom: 2 }} />
          <t.Icon color={active === t.id ? c.tabActive : c.muted} />
          <T numberOfLines={1} font={active === t.id ? 'bold' : 'medium'} size={12} max={MAX_SCALE.tab} color={active === t.id ? c.tabActive : c.muted}>{t.label}</T>
        </Pressable>
      ))}
    </View>
  )
}

// One-time tip after setup (and after the first walk started by holding): a small callout above
// the tab bar, its arrow pointing down at the centre button. Tapping anywhere dismisses it.
// VoiceOver reads it once.
export const RIDE_TIP = 'Tap for Walk, Breathe, Ground or Just log it. Hold to start a walk.'
export function RideCoachmark({ onDismiss }) {
  const { c } = useTheme()
  useEffect(() => { AccessibilityInfo.announceForAccessibility?.(`Tip. ${RIDE_TIP}`) }, [])
  return (
    <Pressable testID="ride-coachmark" onPress={onDismiss} accessibilityRole="button" accessibilityLabel={`Tip: ${RIDE_TIP} Dismiss`}
      style={{ position: 'absolute', left: 16, right: 16, bottom: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: c.action, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, maxWidth: 320, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T size={15} color={c.onAction} style={{ flexShrink: 1 }}>{RIDE_TIP}</T>
        <View testID="coachmark-ok" style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T font="bold" size={15} color={c.onAction}>OK</T>
        </View>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no" style={{
        width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c.action,
      }} />
    </Pressable>
  )
}
