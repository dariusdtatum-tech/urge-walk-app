// Tracker switcher. Default: a bottom sheet (TrackerSheet). The left drawer (Option C) stays behind
// You → Appearance and lock → Tracker switcher: Drawer. Both share DrawerBody.
// Top: Reach out. Middle: your trackers (your own names and day counts, a check on the one Home shows),
// Edit and + Add tracker. Bottom: one honest status row about where your data lives.
// Never holds Ride it out, and never shows Premium, Plus, upgrades or prices (tests enforce this).
import { useEffect, useRef } from 'react'
import { Animated, Modal, PanResponder, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { lastBackupLabel, loadBackupMeta } from '../../lib/backup.js'
import { cleanDays } from '../../lib/homeStats.js'
import { HeartIcon } from '../../ui/Icons.jsx'
import { useReducedMotion } from '../../ui/motion.js'
import { HeaderButton } from '../../ui/Sheet.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { radius, size as sz, space, type, useTheme } from '../../ui/theme.js'
import { Check } from '../onboarding/Steps.jsx'

export const DRAWER_MAX_WIDTH = 340
export const drawerWidth = (screenW) => Math.min(DRAWER_MAX_WIDTH, Math.round(screenW * 0.86))
const SWIPE_CLOSE = 60

// A swipe back toward the left edge closes: far enough, or a quick flick.
export const swipeCloses = (dx, vx = 0) => dx < -SWIPE_CLOSE || vx < -0.5

export const dayCount = (days) => (days < 0 ? 'Starts soon' : `${days} ${days === 1 ? 'day' : 'days'}`)

export function TrackerDrawer({ habits, activeId, today, now = Date.now(), onSelect, onEdit, onManage, onAdd, onReachOut, onBackup, onClose, fromX = null }) {
  const { c } = useTheme()
  const storage = useStorage()
  const reduced = useReducedMotion()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const panelW = drawerWidth(width)
  // fromX: where an edge swipe left the panel, so opening continues from under the finger.
  const x = useRef(new Animated.Value(reduced ? 0 : Math.max(-panelW, Math.min(0, fromX ?? -panelW)))).current
  const fade = useRef(new Animated.Value(fromX != null && !reduced ? 1 : 0)).current

  useEffect(() => {
    if (reduced) x.setValue(0) // Reduce Motion: no slide, the panel just fades in where it sits
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      reduced ? null : Animated.timing(x, { toValue: 0, duration: 240, useNativeDriver: true }),
    ].filter(Boolean)).start()
  }, [fade, x, reduced])

  // Swipe the panel back toward the left edge to close. Follows the finger; snaps back if it was a small drag.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => { if (!reduced) x.setValue(Math.min(0, g.dx)) },
    onPanResponderRelease: (_, g) => {
      if (swipeCloses(g.dx, g.vx)) onClose()
      else Animated.timing(x, { toValue: 0, duration: 150, useNativeDriver: true }).start()
    },
  })).current

  const backup = lastBackupLabel(loadBackupMeta(storage), now)

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} testID="drawer-modal">
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close trackers" testID="drawer-backdrop" />
        </Animated.View>
        <Animated.View {...pan.panHandlers} testID="drawer" accessibilityViewIsModal
          style={{ width: panelW, backgroundColor: c.sand, borderTopRightRadius: radius.card, borderBottomRightRadius: radius.card,
            paddingTop: insets.top + 24, paddingBottom: insets.bottom + 12, opacity: reduced ? fade : 1, transform: [{ translateX: x }] }}>
          <DrawerBody habits={habits} activeId={activeId} today={today} backup={backup} onSelect={onSelect} onEdit={onEdit} onManage={onManage} onAdd={onAdd} onReachOut={onReachOut} onBackup={onBackup} />
        </Animated.View>
      </View>
    </Modal>
  )
}

// The drawer's contents. `peek` renders the same panel as a non-interactive picture that follows the
// finger during an edge swipe on Home (no handlers, no test IDs, hidden from screen readers).
function DrawerBody({ habits, activeId, today, backup, onSelect, onEdit, onManage, onAdd, onReachOut, onBackup, peek = false }) {
  const { c } = useTheme()
  const tid = (id) => (peek ? undefined : id)
  return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, gap: 10, flexGrow: 1 }}>
        <DrawerRow testID={tid("drawer-reach")} title="Reach out" sub="988 and your trusted people" onPress={onReachOut} badge />

        <T accessibilityRole="header" font="bold" size={13} color={c.mutedSand} style={{ letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 }}>Your trackers</T>
        {habits.map((h) => {
          const on = h.id === activeId
          const days = cleanDays(h, today)
          return (
            <Pressable key={h.id} onPress={() => onSelect(h.id)} onLongPress={() => onEdit(h)} testID={tid(`drawer-tracker-${h.id}`)}
              accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${h.name}, ${dayCount(days)}${on ? ', on Home' : ''}`} accessibilityHint="Shows this tracker on Home. Long press to edit."
              style={({ pressed }) => ({ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.rowX, paddingVertical: space.rowY,
                backgroundColor: c.card, borderRadius: radius.row, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ flex: 1, gap: 2 }}>
                <T font="semibold" size={type.rowTitle} color={c.title} numberOfLines={2}>{h.name}</T>
                <T size={14} color={c.muted} testID={tid(`drawer-days-${h.id}`)}>{dayCount(days)}</T>
              </View>
              {on ? (
                <View testID={tid(`drawer-check-${h.id}`)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center' }}>
                  <Check color={c.onAction} />
                </View>
              ) : null}
            </Pressable>
          )
        })}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PillButton testID={tid("drawer-add")} label="+ Add tracker" onPress={onAdd} />
          {habits.length ? <PillButton testID={tid("home-edit")} label="Edit trackers" onPress={onManage} /> : null}
        </View>

        <View style={{ flex: 1, paddingTop: 16 }} />
        <Pressable onPress={onBackup} testID={tid("drawer-backup")} accessibilityRole="button" accessibilityLabel={`On this phone only. ${backup}. Back up`}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
          <T size={14} color={c.mutedSand} style={{ flex: 1 }}>On this phone only · {backup}</T>
          <View style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: c.title, alignItems: 'center', justifyContent: 'center' }}>
            <T font="semibold" size={14} color={c.title}>Back up</T>
          </View>
        </Pressable>
      </ScrollView>
  )
}

// Edge-swipe preview: the panel at `x` (an Animated value from -width to 0) over a dim that deepens with it.
export function DrawerPeek({ x, width, habits, activeId, today, now = Date.now() }) {
  const { c } = useTheme()
  const storage = useStorage()
  const insets = useSafeAreaInsets()
  const backup = lastBackupLabel(loadBackupMeta(storage), now)
  const dim = x.interpolate({ inputRange: [-width, 0], outputRange: [0, 1], extrapolate: 'clamp' })
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="drawer-peek"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay, opacity: dim }} />
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width, backgroundColor: c.sand, borderTopRightRadius: radius.card, borderBottomRightRadius: radius.card,
        paddingTop: insets.top + 24, paddingBottom: insets.bottom + 12, transform: [{ translateX: x }] }}>
        <DrawerBody peek habits={habits} activeId={activeId} today={today} backup={backup} onSelect={() => {}} onEdit={() => {}} onManage={() => {}} onAdd={() => {}} onReachOut={() => {}} onBackup={() => {}} />
      </Animated.View>
    </View>
  )
}

function DrawerRow({ title, sub, onPress, testID, badge = false }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => ({ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.rowX, paddingVertical: space.rowY, backgroundColor: c.card, borderRadius: radius.row, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.85 : 1 })}>
      {badge ? (
        <View testID={testID ? `${testID}-badge` : undefined} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.sand, borderWidth: 1, borderColor: c.cellEdge, alignItems: 'center', justifyContent: 'center' }}>
          <HeartIcon color={c.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={type.rowTitle} color={c.title}>{title}</T>
        <T size={14} color={c.muted}>{sub}</T>
      </View>
    </Pressable>
  )
}

// 48pt pill: + Add tracker / Edit trackers sit side by side.
export const PILL_HEIGHT = 48
function PillButton({ label, onPress, testID }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, minHeight: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2, borderWidth: 1.5, borderColor: c.title, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, opacity: pressed ? 0.85 : 1 })}>
      <T font="semibold" size={type.body} color={c.title}>{label}</T>
    </Pressable>
  )
}

// The default switcher: a bottom sheet with a grabber and a 44x44 close button over the same body.
export function TrackerSheet({ habits, activeId, today, now = Date.now(), onSelect, onEdit, onManage, onAdd, onReachOut, onBackup, onClose }) {
  const { c } = useTheme()
  const storage = useStorage()
  const reduced = useReducedMotion()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const backup = lastBackupLabel(loadBackupMeta(storage), now)
  return (
    <Modal visible transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={onClose} testID="tracker-sheet-modal">
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }} onPress={onClose}
          accessibilityRole="button" accessibilityLabel="Close trackers" testID="tracker-sheet-backdrop" />
        <View testID="tracker-sheet" accessibilityViewIsModal
          style={{ backgroundColor: c.sand, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: Math.round(height - Math.max(insets.top, 24) - 16), paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.grab }} testID="tracker-sheet-grabber" />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.screen, paddingRight: 8 }}>
            <T accessibilityRole="header" font="serif" size={type.sheetTitle} color={c.title} style={{ flex: 1 }}>Trackers</T>
            <HeaderButton label="✕" accessibilityLabel="Close trackers" onPress={onClose} testID="tracker-sheet-close" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <DrawerBody habits={habits} activeId={activeId} today={today} backup={backup} onSelect={onSelect} onEdit={onEdit} onManage={onManage} onAdd={onAdd} onReachOut={onReachOut} onBackup={onBackup} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
