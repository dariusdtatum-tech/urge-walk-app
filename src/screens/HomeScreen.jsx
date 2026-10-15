import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, View } from 'react-native'
import { bannerDismissed, dismissBanner } from '../lib/calm.js'
import { todayISO } from '../lib/cleanTime.js'
import { undoableReset } from '../lib/homeIdeas.js'
import { cleanDays, shortDate } from '../lib/homeStats.js'
import { loadMilestones, ringLabel, ringSegment, saveMilestones, syncMilestones } from '../lib/milestones.js'
import { identityLine, loadProfile } from '../lib/profile.js'
import { loadWalks } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { WaveIcon } from '../ui/Icons.jsx'
import { Notice } from '../ui/Row.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { radius, size as sz, space, type, useTheme } from '../ui/theme.js'
import { HeroPager } from './home/HeroPager.jsx'
import { MilestoneSheet } from './home/Milestones.jsx'
import { CheckInCard } from './CheckInSheet.jsx'
import { FirstWeekCard } from './home/FirstWeekCard.jsx'
import { TrackerDrawer } from './home/TrackerDrawer.jsx'
import { WhyLine, YourWhySheet } from './home/YourWhy.jsx'
import { ReachOut } from './ReachOut.jsx'
import { ReasonsSheet } from './Reasons.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { ResetToast, useTrackerEditor } from './Trackers.jsx'

// Home holds at most five things (Option C, written down in docs and enforced by a test):
//   1. the title, which is the tracker switcher (opens the left drawer)
//   2. Ride it out
//   3. the ring (two-page hero with the daily line / clean time + milestone cards)
//   4. the "Your why" area: the why line and "+ Add a habit" while there's one tracker
//   5. check-in
// Short-lived helpers (undo-reset banners, notices, the first-week card) come and go; anything new
// must replace one of the five or live in the drawer, Track or You.
export const HOME_ITEMS = ['home-title', 'ride-bar', 'hero', 'why-line', 'checkin-card']
export function HomeScreen({ now, clock = Date.now, onRide, liveWalk, onResume, onOpenBackup, onCheckIn = () => {}, onFirstWeek = () => {}, onOpenYou = () => {} }) {
  const storage = useStorage()
  const { c } = useTheme()
  const today = todayISO(new Date(now))
  const [walks] = useState(() => loadWalks(storage).walks)
  const [profile] = useState(() => loadProfile(storage))
  const [milestones, setMilestones] = useState(() => loadMilestones(storage))
  const storeMilestones = (next) => { saveMilestones(next, storage); setMilestones(next) }
  const editor = useTrackerEditor({ today, now: clock, onOpenBackup, onMilestones: storeMilestones })
  const { habits, notice, setNotice, sheet, setSheet, hero, activeId, setActive } = editor
  const [celebrations, setCelebrations] = useState([])
  const [drawer, setDrawer] = useState(false)
  const [panel, setPanel] = useState(null) // 'why' | 'reasons' | 'reach'
  const [, setTick] = useState(0)
  const titleRef = useRef(null)
  // Closing the drawer puts screen-reader focus back on the title that opened it.
  const closeDrawer = (then) => {
    setDrawer(false)
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
  const label = ringLabel(days)
  const since = hero ? `${hero.startDate > today ? 'starts' : 'since'} ${shortDate(hero.startDate, today)}` : ''
  const celebration = celebrations[0]
  const celebrated = celebration && habits.find((h) => h.id === celebration.habitId)
  const dateLine = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const identity = identityLine(profile)

  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: space.section }} testID="home">
      <View style={{ gap: 2 }}>
        <T font="medium" size={15} color={c.muted}>{dateLine}</T>
        <Pressable ref={titleRef} onPress={() => setDrawer(true)} testID="home-title" accessibilityRole="button"
          accessibilityLabel={hero ? `${hero.name}. ${habits.length > 1 ? 'Switch or edit trackers' : 'Your trackers'}` : 'Your trackers'}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} numberOfLines={2} style={{ flexShrink: 1 }}>{hero ? hero.name : 'Home'}</T>
          {habits.length > 1 ? <T size={20} color={c.title} testID="home-title-caret" accessibilityElementsHidden importantForAccessibility="no">▾</T> : null}
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

      <Pressable onPress={liveWalk ? onResume : onRide} accessibilityRole="button" testID="ride-bar"
        accessibilityLabel={liveWalk ? 'Back to your walk. Your walk is still going.' : 'Ride it out. Walk, breathe, ground, or just log it.'}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: sz.rideBar, paddingHorizontal: space.rowX, paddingVertical: space.rowY, borderRadius: radius.card, backgroundColor: c.action, opacity: pressed ? 0.9 : 1 })}>
        <View style={{ width: sz.rideBarIcon, height: sz.rideBarIcon, borderRadius: sz.rideBarIcon / 2, borderWidth: 1.5, borderColor: c.onActionSoft, alignItems: 'center', justifyContent: 'center' }}>
          <WaveIcon color={c.onAction} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <T font="bold" size={type.rideBar} color={c.onAction}>{liveWalk ? 'Back to your walk' : 'Ride it out'}</T>
          <T size={type.rideBarSub} color={c.onActionSoft}>{liveWalk ? 'Your walk is still going.' : 'Walk, breathe, ground, or just log it.'}</T>
        </View>
        <T size={22} color={c.onAction} accessibilityElementsHidden importantForAccessibility="no">›</T>
      </Pressable>

      {hero ? (
        <HeroPager hero={hero} days={days} since={since} segment={segment} label={label} milestones={milestones} today={today} profile={profile} now={now} />
      ) : (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }} testID="home-empty">
          <T accessibilityRole="header" font="serif" size={28} color={c.title}>Every day counts</T>
          <T size={type.body} color={c.text} style={{ textAlign: 'center' }}>Add your start date to begin counting.</T>
          <Button label="Add your start date" onPress={() => setSheet({ mode: 'add' })} testID="add-start-date" style={{ alignSelf: 'stretch' }} />
          <Button kind="quiet" label="Restore from a backup" onPress={onOpenBackup} testID="empty-restore" />
        </View>
      )}

      {hero ? (
        <WhyLine today={today} onOpen={() => setPanel('why')} onAddHabit={habits.length === 1 ? () => setSheet({ mode: 'add' }) : null} />
      ) : null}
      <FirstWeekCard now={now} onStep={(id) => (id === 'start' ? setSheet({ mode: 'add' }) : onFirstWeek(id))} />
      <CheckInCard today={today} onOpen={onCheckIn} />

      {drawer ? (
        <TrackerDrawer habits={habits} activeId={activeId} today={today} now={now} onClose={() => closeDrawer()}
          onSelect={(id) => closeDrawer(() => setActive(id))}
          onEdit={(habit) => closeDrawer(() => setSheet({ mode: 'edit', habit, from: 'manage' }))}
          onManage={() => closeDrawer(() => setSheet({ mode: 'manage' }))}
          onAdd={() => closeDrawer(() => setSheet({ mode: 'add' }))}
          onReachOut={() => closeDrawer(() => setPanel('reach'))}
          onBackup={() => closeDrawer(onOpenBackup)} />
      ) : null}
      {panel === 'why' ? (
        <YourWhySheet profile={profile} hero={hero} walks={walks} today={today} onClose={() => setPanel(null)}
          onEditReasons={() => setPanel('reasons')} onSettings={() => { setPanel(null); onOpenYou('why') }} />
      ) : null}
      {panel === 'reasons' ? <ReasonsSheet onClose={() => setPanel('why')} /> : null}
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
