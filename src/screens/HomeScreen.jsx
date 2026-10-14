import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { dismissNudge, hasAnyData, loadBackupMeta, shouldNudge } from '../lib/backup.js'
import { bannerDismissed, dismissBanner, isCalm, recentlySaved } from '../lib/calm.js'
import { todayISO } from '../lib/cleanTime.js'
import { undoableReset } from '../lib/homeIdeas.js'
import { cleanDays, heroHabit, loadRange, saveRange, shortDate } from '../lib/homeStats.js'
import { loadMilestones, ringLabel, ringSegment, saveMilestones, syncMilestones } from '../lib/milestones.js'
import { identityLine, loadProfile } from '../lib/profile.js'
import { loadWalks } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { WaveIcon } from '../ui/Icons.jsx'
import { Notice } from '../ui/Row.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'
import { HeroPager } from './home/HeroPager.jsx'
import { MilestoneSheet } from './home/Milestones.jsx'
import { NeverZero } from './home/NeverZero.jsx'
import { WalksCard } from './home/WalksCard.jsx'
import { ResetToast, useTrackerEditor } from './Trackers.jsx'

// Home (the PWA's HomeTab): date + Edit, identity line, undo-reset banners, the Ride it out bar, the
// two-page hero (ring + daily line / clean time + milestone cards), Never zero, Your walks, the calm
// backup nudge, and one milestone sheet per new milestone.
export function HomeScreen({ now, clock = Date.now, onRide, liveWalk, onResume, onOpenBackup }) {
  const storage = useStorage()
  const { c } = useTheme()
  const today = todayISO(new Date(now))
  const [walks] = useState(() => loadWalks(storage).walks)
  const [profile] = useState(() => loadProfile(storage))
  const [milestones, setMilestones] = useState(() => loadMilestones(storage))
  const storeMilestones = (next) => { saveMilestones(next, storage); setMilestones(next) }
  const editor = useTrackerEditor({ today, now: clock, onOpenBackup, onMilestones: storeMilestones })
  const { habits, notice, setNotice, sheet, setSheet } = editor
  const [range, setRange] = useState(() => loadRange(storage))
  const [celebrations, setCelebrations] = useState([])
  // The backup reminder waits 30 minutes after a stressful moment (Ride it out, a walk, a reset).
  const [showNudge, setShowNudge] = useState(() => isCalm(now, storage) && shouldNudge(loadBackupMeta(storage), hasAnyData(storage), now))
  const [highlight] = useState(() => recentlySaved(now, storage))
  const [, setTick] = useState(0)

  useEffect(() => {
    const result = syncMilestones(loadMilestones(storage), habits, today)
    if (!result.changed) return
    saveMilestones(result.data, storage)
    setMilestones(result.data)
    if (result.celebrate.length > 0) setCelebrations((q) => [...q, ...result.celebrate])
  }, [habits, today, storage])

  const hero = heroHabit(habits)
  const days = cleanDays(hero, today)
  const segment = ringSegment(days)
  const label = ringLabel(days)
  const since = hero ? `${hero.startDate > today ? 'starts' : 'since'} ${shortDate(hero.startDate, today)}` : ''
  const firstWalk = walks.reduce((min, w) => (w.startedAt < min ? w.startedAt : min), '9999')
  const allSince = [hero?.startDate, firstWalk === '9999' ? null : todayISO(new Date(firstWalk))].filter(Boolean).sort()[0] || today
  const celebration = celebrations[0]
  const celebrated = celebration && habits.find((h) => h.id === celebration.habitId)
  const dateLine = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const identity = identityLine(profile)

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }} testID="home">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T font="medium" size={15} color={c.muted} style={{ flex: 1 }}>{dateLine}</T>
        <Pressable onPress={() => setSheet({ mode: 'manage' })} accessibilityRole="button" accessibilityLabel="Edit trackers" testID="home-edit"
          style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
          <T font="semibold" size={16} color={c.accent}>Edit</T>
        </Pressable>
      </View>
      {identity ? <T font="serifItalic" size={19} color={c.title} testID="identity-line">{identity}</T> : null}

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
        accessibilityLabel={liveWalk ? 'Back to your walk. Your walk is still going.' : 'Ride it out. Walk, breathe, or just log it.'}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: c.action, opacity: pressed ? 0.9 : 1 })}>
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
        <HeroPager hero={hero} days={days} since={since} segment={segment} label={label} milestones={milestones} today={today} profile={profile} now={now} />
      ) : (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }} testID="home-empty">
          <T accessibilityRole="header" font="serif" size={28} color={c.title}>Every day counts</T>
          <T size={16} color={c.text} style={{ textAlign: 'center' }}>Add your start date to begin counting.</T>
          <Button label="Add your start date" onPress={() => setSheet({ mode: 'add' })} testID="add-start-date" style={{ alignSelf: 'stretch' }} />
          <Button kind="quiet" label="Restore from a backup" onPress={onOpenBackup} testID="empty-restore" />
        </View>
      )}

      {hero ? <NeverZero hero={hero} walks={walks} today={today} highlight={highlight} /> : null}
      {hero || walks.length > 0 ? (
        <WalksCard walks={walks} range={range} onRange={(id) => { setRange(id); saveRange(id, storage) }} streak={hero ? days : null} now={now} since={allSince} />
      ) : null}

      {showNudge ? (
        <View testID="backup-nudge" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.sand, borderRadius: 14, paddingLeft: 14 }}>
          <T size={14} color={c.text} style={{ flex: 1, paddingVertical: 10 }}>Your data lives only on this phone. It’s been a while since your last backup.</T>
          <Pressable onPress={onOpenBackup} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
            <T font="bold" size={14} color={c.title}>Back up</T>
          </Pressable>
          <Pressable onPress={() => { dismissNudge(now, storage); setShowNudge(false) }} accessibilityRole="button" accessibilityLabel="Dismiss backup reminder"
            style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <T size={16} color={c.mutedSand}>✕</T>
          </Pressable>
        </View>
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
      <T font="semibold" size={16} color={c.title}>New count started{showName ? ` · ${habit.name}` : ''}</T>
      <T size={14} color={c.text}>Changed your mind? Undo puts back your start date ({shortDate(prev, today)}). Free, until {time} {day}.</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button kind="secondary" label="Undo reset" onPress={onUndo} testID="undo-banner-undo" style={{ flex: 1 }} />
        <Button kind="quiet" label="Dismiss" onPress={onDismiss} testID="undo-banner-dismiss" />
      </View>
    </View>
  )
}
