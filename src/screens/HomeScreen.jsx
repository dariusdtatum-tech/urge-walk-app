import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, findNodeHandle, PanResponder, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import { bannerDismissed, dismissBanner } from '../lib/calm.js'
import { todayISO } from '../lib/cleanTime.js'
import { undoableReset } from '../lib/homeIdeas.js'
import { cleanDays, shortDate } from '../lib/homeStats.js'
import { loadMilestones, ringSegment, saveMilestones, syncMilestones } from '../lib/milestones.js'
import { identityLine, loadProfile } from '../lib/profile.js'
import { Button } from '../ui/Button.jsx'
import { ChevronDownIcon, WaveIcon } from '../ui/Icons.jsx'
import { Notice } from '../ui/Row.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { radius, space, type, useTheme } from '../ui/theme.js'
import { HeroPager } from './home/HeroPager.jsx'
import { MilestoneSheet } from './home/Milestones.jsx'
import { FirstWeekCard } from './home/FirstWeekCard.jsx'
import { DrawerPeek, drawerWidth, TrackerDrawer, TrackerSheet } from './home/TrackerDrawer.jsx'
import { loadSwitcher } from '../lib/switcher.js'
import { HomePanel } from './home/HomeCards.jsx'
import { useHomeReason } from './Reasons.jsx'
import { useReducedMotion } from '../ui/motion.js'
import { ReachOut } from './ReachOut.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { ResetToast, useTrackerEditor } from './Trackers.jsx'

// Slim Home (Gemini review 2, approved Oct 15 2026; replaces the fuller Home; AGENTS.md + tests):
//   1. the title, a 44pt pill that is the tracker switcher (tap: bottom sheet by default, or the drawer
//      if picked in You → Appearance and lock; swiping in from the left edge always opens the drawer)
//   2. the hero: ONLY the ring swipes (days clean / days and hours / Time back when estimated), page dots
//      under it, then ONE hairline milestone row (Last left, Next right, a thin progress line, no boxes).
//   3. ONE flat sand panel: Your why (latest reason, setup fallback, hidden when locked) over the Daily
//      check-in row, split by a hairline. This week, Urge Map and Money kept stay in Track and You.
//   4. a quiet "Hold the center button for a quick walk" hint
// Ride it out is the raised center tab button only, always one tap. 988 is not a Home card. Short-lived
// helpers (undo-reset banners, notices, the first-week card) come and go.
// Edge swipe: a narrow strip along the left edge (the screen's side padding, so it never sits on top
// of Ride it out or any other control). It only takes over once the drag is clearly sideways and
// rightward, so vertical scrolling and the ring pager (which is inset from the edge) keep working.
export const EDGE_ZONE = space.screen
export const edgeIntent = (dx, dy) => dx > 8 && Math.abs(dx) > 2 * Math.abs(dy)
export const edgeOpens = (dx, vx, width) => dx > width * 0.35 || vx > 0.5
export const HOME_ITEMS = ['home-title', 'hero', 'home-cards', 'hold-hint']
export function HomeScreen({ now, clock = Date.now, onOpenTrack = () => {}, onRide, liveWalk, onResume, onOpenBackup, onCheckIn = () => {}, onFirstWeek = () => {}, onOpenYou = () => {} }) {
  const storage = useStorage()
  const { c } = useTheme()
  const today = todayISO(new Date(now))
  const [profile] = useState(() => loadProfile(storage))
  const reason = useHomeReason(profile)
  const [milestones, setMilestones] = useState(() => loadMilestones(storage))
  const storeMilestones = (next) => { saveMilestones(next, storage); setMilestones(next) }
  const editor = useTrackerEditor({ today, now: clock, onOpenBackup, onMilestones: storeMilestones })
  const { habits, notice, setNotice, sheet, setSheet, hero, activeId, setActive } = editor
  const [celebrations, setCelebrations] = useState([])
  const [drawer, setDrawer] = useState(null) // null | { fromX? }   (the drawer)
  const [trackerSheet, setTrackerSheet] = useState(false) // the bottom-sheet switcher (default)
  const [switcher] = useState(() => loadSwitcher(storage))
  // Title tap and the a11y action open whichever switcher You → Appearance and lock picked; the
  // left-edge swipe always opens the drawer (it's a drawer gesture).
  const openSwitcher = () => (switcher === 'drawer' ? setDrawer({}) : setTrackerSheet(true))
  const reduced = useReducedMotion()
  const { width: screenW } = useWindowDimensions()
  const panelW = drawerWidth(screenW)
  const [peeking, setPeeking] = useState(false)
  const peekX = useRef(new Animated.Value(-panelW)).current
  const live = useRef({ reduced, panelW, dx: 0, engaged: false })
  live.current.reduced = reduced; live.current.panelW = panelW
  // The strip claims touches that start in it (it sits on the side padding, so there's nothing to tap
  // underneath), but only acts once the drag is clearly sideways; until then it hands the touch to
  // Home's vertical scroll if that asks for it.
  const edge = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => edgeIntent(g.dx, g.dy),
    onPanResponderTerminationRequest: () => !live.current.engaged,
    onPanResponderGrant: () => { const L = live.current; L.dx = 0; L.engaged = false },
    onPanResponderMove: (_, g) => {
      const L = live.current
      if (!L.engaged) {
        if (!edgeIntent(g.dx, g.dy)) return
        L.engaged = true
        // Reduce Motion: no panel following the finger; the drawer just fades open.
        if (L.reduced) { setDrawer({}); return }
        peekX.setValue(-L.panelW); setPeeking(true)
      }
      if (L.reduced) return
      L.dx = Math.max(0, Math.min(L.panelW, g.dx))
      peekX.setValue(L.dx - L.panelW)
    },
    onPanResponderRelease: (_, g) => {
      const L = live.current
      if (!L.engaged || L.reduced) return
      L.engaged = false
      if (edgeOpens(g.dx, g.vx, L.panelW)) { setPeeking(false); setDrawer({ fromX: L.dx - L.panelW }) }
      else Animated.timing(peekX, { toValue: -L.panelW, duration: 150, useNativeDriver: true }).start(() => setPeeking(false))
    },
    onPanResponderTerminate: () => { live.current.engaged = false; setPeeking(false) },
  })).current
  const [panel, setPanel] = useState(null) // 'reach'
  const [, setTick] = useState(0)
  const titleRef = useRef(null)
  // Closing the drawer puts screen-reader focus back on the title that opened it.
  const closeDrawer = (then) => {
    setDrawer(null)
    setTrackerSheet(false)
    // After the modal is gone (iOS needs a beat), move VoiceOver / TalkBack focus back to the title.
    setTimeout(() => {
      const el = titleRef.current
      if (!el) return
      try {
        if (AccessibilityInfo.sendAccessibilityEvent) AccessibilityInfo.sendAccessibilityEvent(el, 'focus')
        else { const node = findNodeHandle(el); if (node) AccessibilityInfo.setAccessibilityFocus?.(node) }
      } catch { /* web: nothing to do */ }
    }, 350)
    if (typeof then === 'function') then()
  }

  useEffect(() => {
    const result = syncMilestones(loadMilestones(storage), habits, today)
    if (!result.changed) return
    saveMilestones(result.data, storage)
    setMilestones(result.data)
    if (result.celebrate.length > 0) setCelebrations((q) => [...q, ...result.celebrate])
  }, [habits, today, storage])

  const days = cleanDays(hero, today)
  const segment = ringSegment(days)
  const since = hero ? `${hero.startDate > today ? 'starts' : 'since'} ${shortDate(hero.startDate, today)}` : ''
  const celebration = celebrations[0]
  const celebrated = celebration && habits.find((h) => h.id === celebration.habitId)
  const dateLine = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const identity = identityLine(profile)

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: space.section }} testID="home">
      <View style={{ gap: 2 }}>
        <T font="medium" size={15} color={c.muted}>{dateLine}</T>
        <Pressable ref={titleRef} onPress={openSwitcher} testID="home-title" accessibilityRole="button"
          accessibilityActions={[{ name: 'activate' }, { name: 'openTrackers', label: 'Open trackers' }]} onAccessibilityAction={openSwitcher}
          accessibilityLabel={hero ? `${hero.name}. ${habits.length > 1 ? 'Switch or edit trackers' : 'Your trackers'}` : 'Your trackers'}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: -4, paddingLeft: 14, paddingRight: 12, borderRadius: 22, backgroundColor: c.sand }}>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} numberOfLines={2} style={{ flexShrink: 1 }}>{hero ? hero.name : 'Home'}</T>
          {/* A chevron so the chip reads as a picker (it opens the tracker switcher even with one tracker). */}
          <View testID="home-title-caret"><ChevronDownIcon color={c.title} size={12} /></View>
        </Pressable>
      </View>
      {identity ? <T font="serifItalic" size={type.identity} color={c.title} testID="identity-line">{identity}</T> : null}

      {habits.map((h) => {
        const u = undoableReset(h, now)
        if (!u || bannerDismissed(h.resets.at(-1).at, storage)) return null
        return (
          <UndoBanner key={h.id} habit={h} until={u.until} now={now} today={today} showName={habits.length > 1}
            onUndo={() => editor.undoLast(h.id)} onDismiss={() => { dismissBanner(h.resets.at(-1).at, storage); setTick((t) => t + 1) }} />
        )
      })}
      <Notice text={notice} onDismiss={() => setNotice('')} />
      <ResetToast editor={editor} />

      {/* Ride it out lives only on the raised center tab button (one trigger). While a walk is running,
          a slim bar here gets you back to it. */}
      {liveWalk ? (
        <Pressable onPress={onResume} accessibilityRole="button" testID="resume-bar" accessibilityLabel="Back to your walk. Your walk is still going."
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: space.rowX, paddingVertical: space.rowY, borderRadius: radius.card, backgroundColor: c.action, opacity: pressed ? 0.9 : 1 })}>
          <WaveIcon color={c.onAction} size={18} />
          <View style={{ flex: 1 }}>
            <T font="bold" size={type.rideBar} color={c.onAction}>Back to your walk</T>
            <T size={type.rideBarSub} color={c.onActionSoft}>Your walk is still going.</T>
          </View>
        </Pressable>
      ) : null}

      {hero ? (
        <HeroPager hero={hero} days={days} since={since} segment={segment} milestones={milestones} today={today} profile={profile} now={now} />
      ) : (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }} testID="home-empty">
          <T accessibilityRole="header" font="serif" size={28} color={c.title}>Every day counts</T>
          <T size={type.body} color={c.text} style={{ textAlign: 'center' }}>Add your start date to begin counting.</T>
          <Button label="Add your start date" onPress={() => setSheet({ mode: 'add' })} testID="add-start-date" style={{ alignSelf: 'stretch' }} />
          <Button kind="quiet" label="Restore from a backup" onPress={onOpenBackup} testID="empty-restore" />
        </View>
      )}

      <FirstWeekCard now={now} onStep={(id) => (id === 'start' ? setSheet({ mode: 'add' }) : onFirstWeek(id))} />
      {/* At most five cards, in HOME_CARDS order. */}
      <View testID="home-cards">
        <HomePanel reason={reason} onOpenWhy={() => onOpenYou('why')} today={today} onCheckIn={onCheckIn} />
      </View>
      {!liveWalk ? (
        <T size={13} color={c.muted} testID="hold-hint" style={{ textAlign: 'center', marginTop: 8 }}>Hold the center button for a quick walk</T>
      ) : null}

      {drawer || trackerSheet ? (() => {
        const Switcher = drawer ? TrackerDrawer : TrackerSheet
        return (
          <Switcher {...(drawer ? { fromX: drawer.fromX ?? null } : {})} habits={habits} activeId={activeId} today={today} now={now} onClose={() => closeDrawer()}
            onSelect={(id) => closeDrawer(() => setActive(id))}
            onEdit={(habit) => closeDrawer(() => setSheet({ mode: 'edit', habit, from: 'manage' }))}
            onManage={() => closeDrawer(() => setSheet({ mode: 'manage' }))}
            onAdd={() => closeDrawer(() => setSheet({ mode: 'add' }))}
            onReachOut={() => closeDrawer(() => setPanel('reach'))}
            onBackup={() => closeDrawer(onOpenBackup)} />
        )
      })() : null}
      {panel === 'reach' ? (
        <Sheet onClose={() => setPanel(null)} title="Reach out" testID="home-reach-sheet" right={<HeaderButton label="Done" onPress={() => setPanel(null)} testID="home-reach-done" />}>
          <ReachOut testID="home-reach" title="" onSetup={() => { setPanel(null); onOpenYou('contacts') }} />
        </Sheet>
      ) : null}

      {celebrated && !sheet ? (
        <MilestoneSheet milestone={celebration.milestone} habitName={celebrated.name} showName={habits.length > 1} onDone={() => setCelebrations((q) => q.slice(1))} />
      ) : null}
      {editor.sheets}
    </ScrollView>
    {peeking ? <DrawerPeek x={peekX} width={panelW} habits={habits} activeId={activeId} today={today} now={now} /> : null}
    {!drawer && !trackerSheet ? <View {...edge.panHandlers} testID="home-edge" accessibilityElementsHidden importantForAccessibility="no"
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: EDGE_ZONE }} /> : null}
    </View>
  )
}

// Shown on Home for the 24 hours after a reset: plain, free, no pressure.
function UndoBanner({ habit, until, now, today, showName, onUndo, onDismiss }) {
  const { c } = useTheme()
  const prev = habit.resets.at(-1).prevStartDate
  const time = new Date(until).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const day = todayISO(new Date(until)) === todayISO(new Date(now)) ? 'today' : 'tomorrow'
  return (
    <View testID="undo-banner" accessibilityLiveRegion="polite" style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, gap: 6 }}>
      <T font="semibold" size={type.body} color={c.title}>New count started{showName ? ` · ${habit.name}` : ''}</T>
      <T size={14} color={c.text}>Changed your mind? Undo puts back your start date ({shortDate(prev, today)}). Free, until {time} {day}.</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button kind="secondary" label="Undo reset" onPress={onUndo} testID="undo-banner-undo" style={{ flex: 1 }} />
        <Button kind="quiet" label="Dismiss" onPress={onDismiss} testID="undo-banner-dismiss" />
      </View>
    </View>
  )
}
