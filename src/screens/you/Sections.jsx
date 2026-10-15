// You, split into six sections (Option C). Each is one row on You with a live status line; tapping it
// opens the section in place, with "‹ You" to go back. State lives in YouScreen and comes in as props.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import APP from '../../../app.json'
import { THEMES } from '../../lib/appearance.js'
import { lastBackupLabel, loadBackupMeta } from '../../lib/backup.js'
import { DEFAULT_REMINDER, reminderLabel, stepReminder } from '../../lib/checkin.js'
import { clearPendingFollowUp, saveFollowUpEnabled } from '../../lib/followUp.js'
import { DEFAULT_HOURS_PER_TIME, timeBack } from '../../lib/homeIdeas.js'
import { shortDate } from '../../lib/homeStats.js'
import { fmtMoney, loadGoal, moneyOn, moneyPerTime } from '../../lib/money.js'
import { saveVerseEnabled } from '../../lib/verse.js'
import { CUSTOM_MAX, CUSTOM_MIN, WALK_OPTIONS, clampCustomMinutes } from '../../lib/walkTimer.js'
import { lengthLabel } from '../../lib/walkStorage.js'
import { MAX_CONTACTS } from '../../lib/contacts.js'
import { Button } from '../../ui/Button.jsx'
import { Field } from '../../ui/Field.jsx'
import { KeptCard } from '../home/KeptCard.jsx'
import { Card, GroupTitle, Row, ToggleRow } from '../../ui/Row.jsx'
import { Seg } from '../../ui/Seg.jsx'
import { Sheet } from '../../ui/Sheet.jsx'
import { Stepper } from '../../ui/Stepper.jsx'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'
import { ReachOut } from '../ReachOut.jsx'

const APP_VERSION = APP.expo.version

export const LEGAL_LINKS = [
  { label: 'Privacy policy', url: 'https://dariusdtatum-tech.github.io/urgewalk/privacy.html' },
  { label: 'Terms', url: 'https://dariusdtatum-tech.github.io/urgewalk/terms.html' },
  { label: 'Support', url: 'https://dariusdtatum-tech.github.io/urgewalk/support.html' },
]

export const SECTION_ORDER = ['support', 'why', 'progress', 'reminders', 'appearance', 'data']
export const SECTION_TITLES = {
  support: 'Support', why: 'Your why', progress: 'Progress', reminders: 'Reminders and notifications',
  appearance: 'Appearance and lock', data: 'Data and privacy',
}

function SupportSection({ c, people, contactsVer, setShowCrisis, setShowContacts }) {
  return (
    <>
      <Row title="Crisis resources" sub="988, SAMHSA helpline, 911" testID="crisis-row" onPress={() => setShowCrisis(true)} />
      <Card><ReachOut key={contactsVer} testID="you-reach" title={null} onSetup={() => setShowContacts(true)} /></Card>
      <Row title="Trusted contacts" sub={people.length ? people.map((p) => p.name).join(' · ') : `Up to ${MAX_CONTACTS} people and a message ready to go`} testID="contacts-row" onPress={() => setShowContacts(true)} />
    </>
  )
}

function WhySection({ storage, profile, hero, today, reasonCount, setShowReasons, setShowMoney, changeProfile, list, showAnswers, setShowAnswers, setAnswer, onRedo }) {
  return (
    <>
      <Row title="Your reasons" sub={reasonCount ? `${reasonCount} saved · one shows when you ride it out` : 'A photo, a voice note, or a few words'} testID="reasons-row" onPress={() => setShowReasons(true)} />
      <GroupTitle>About you</GroupTitle>
      <Row title="Your answers" sub={`${list.filter((a) => a.value).length} of ${list.length} answered`} testID="answers-toggle" chevron={showAnswers ? '⌃' : '›'} onPress={() => setShowAnswers(!showAnswers)} />
      {showAnswers ? list.map((a) => <Row key={a.field} title={a.title} sub={a.value || 'Not set'} subMuted={!a.value} testID={`answer-${a.field}`} onPress={() => setAnswer(a.field)} />) : null}
      <Row title="Redo setup" testID="redo-setup" onPress={onRedo}
        sub={`Go through the questions again${profile.onboardedAt && !profile.skipped ? ` · last done ${shortDate(profile.onboardedAt.slice(0, 10), today)}` : ''}`} />
    </>
  )
}

function ProgressSection({ storage, profile, today, walks, changeProfile, setShowMoney, habits, hero, earned, setSheet, prefs, showLengths, setShowLengths, changePrefs }) {
  return (
    <>
      <Row title="Trackers" sub={habits.length === 0 ? 'Add the date you started' : habits.map((h) => h.name).join(' · ')} testID="trackers-row" onPress={() => setSheet({ mode: 'manage' })} />
      {hero ? <Row title="Milestones" sub={`${earned === 1 ? '1 earned' : `${earned} earned`} · ${hero.name}`} testID="milestones-row" onPress={() => setSheet({ mode: 'milestones' })} /> : null}
      <ToggleRow title="Money kept" sub={moneyOn(profile) ? `${fmtMoney(moneyPerTime(profile))} each time${loadGoal(storage)?.name ? ` · toward ${loadGoal(storage).name}` : ''}` : 'Off. A private running total, if it helps.'}
        value={moneyOn(profile)} testID="money-toggle" onChange={(on) => (on ? setShowMoney(true) : changeProfile({ timeBack: { ...(profile.timeBack || { hoursPerTime: 1 }), moneyPerTime: null } }))} />
      {moneyOn(profile) ? <Row title="Money kept settings" sub="Amount and goal" testID="money-row" onPress={() => setShowMoney(true)} /> : null}
      <KeptCard profile={profile} hero={hero} walks={walks} today={today} />
      <TimeBackCard profile={profile} hero={hero} today={today} onChange={changeProfile} />
      <Row title="Walk length" sub={`${lengthLabel(prefs)} · for Walk`} testID="walk-length" chevron={showLengths ? '⌃' : '›'} onPress={() => setShowLengths(!showLengths)} />
      {showLengths ? <WalkLengthPicker prefs={prefs} onChange={changePrefs} /> : null}
    </>
  )
}

function RemindersSection({ c, storage, device, followUpOn, setFollowUpOn, reminder, changeReminder, setShowNotify }) {
  return (
    <>
      <Row title="Notifications" sub="At most one a day. See what they’ll say." testID="notify-row" onPress={() => setShowNotify(true)} />
      <ToggleRow title="Check in after an urge" sub="One quiet notification about 30 minutes later. Never more than one per urge."
        value={followUpOn} testID="followup-toggle"
        onChange={(on) => { saveFollowUpEnabled(on, storage); setFollowUpOn(on); if (!on) { clearPendingFollowUp(storage); device.cancelFollowUp() } }} />
      <ToggleRow title="Daily check-in reminder" sub={reminder ? `Every day at ${reminderLabel(reminder)}` : 'Off. You can still check in from Home.'}
        value={!!reminder} testID="checkin-reminder" onChange={(on) => changeReminder(on ? DEFAULT_REMINDER : null)} />
      {reminder ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }} testID="checkin-time">
          <Button kind="secondary" label="−" accessibilityLabel="15 minutes earlier" onPress={() => changeReminder(stepReminder(reminder, -1))} testID="checkin-time-less" />
          <T font="semibold" size={18} color={c.title} style={{ minWidth: 96, textAlign: 'center' }} accessibilityLiveRegion="polite">{reminderLabel(reminder)}</T>
          <Button kind="secondary" label="+" accessibilityLabel="15 minutes later" onPress={() => changeReminder(stepReminder(reminder, 1))} testID="checkin-time-more" />
        </View>
      ) : null}
    </>
  )
}

function AppearanceSection({ c, storage, theme, onTheme, verseOn, setVerseOn, setVerseFade, appLock, appLockNote, changeAppLock }) {
  return (
    <>
      <Seg items={THEMES} value={theme} onChange={onTheme} label="Appearance" testID="theme" />
      <ToggleRow title="Daily verse" sub="One short verse a day on endurance and freedom." value={verseOn} testID="verse-toggle"
        onChange={(on) => { saveVerseEnabled(on, storage); setVerseFade(on); setVerseOn(on) }} />
      <ToggleRow title="App lock" sub={appLock ? 'Face ID or your passcode when you open Urge Walk. 988 stays one tap away.' : 'Off. Ask for Face ID or your passcode when you open Urge Walk.'}
        value={appLock} testID="app-lock-toggle" onChange={changeAppLock} />
      {appLockNote ? <T size={type.sub} color={c.textSoft} accessibilityRole="alert" testID="app-lock-note">{appLockNote}</T> : null}
    </>
  )
}

function DataSection({ c, storage, device, now, onOpenBackup, setReset, setShowFree, setDesignCheck }) {
  return (
    <>
      <Row title="Backup & restore" sub={lastBackupLabel(loadBackupMeta(storage), now)} testID="backup-row" onPress={onOpenBackup} />
      <Row title="Reset app" sub="Saves a backup file first, then starts fresh" testID="reset-app" danger onPress={() => setReset('confirm')} />
      <GroupTitle>Privacy</GroupTitle>
      <T size={14} color={c.muted}>No ads. No tracking. No account. For now, everything stays on this phone.</T>
      <Row title="Free forever" sub="What stays free, always" testID="free-row" onPress={() => setShowFree(true)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }} testID="legal-links">
        {LEGAL_LINKS.map((l, i) => (
          <View key={l.url} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {i > 0 ? <T size={14} color={c.muted} accessibilityElementsHidden>·</T> : null}
            <Pressable onPress={() => device.openURL(l.url)} accessibilityRole="link" testID={`legal-${i}`} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
              <T font="semibold" size={14} color={c.accent} style={{ textDecorationLine: 'underline' }}>{l.label}</T>
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable onLongPress={__DEV__ ? () => setDesignCheck(true) : undefined} delayLongPress={3000} testID="app-version"
        accessibilityLabel={`Version ${APP_VERSION}`} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <T size={type.footnote} color={c.muted}>Version {APP_VERSION}</T>
      </Pressable>
    </>
  )
}

export const SECTIONS = { support: SupportSection, why: WhySection, progress: ProgressSection, reminders: RemindersSection, appearance: AppearanceSection, data: DataSection }

// 5 · 10 · 15 · Custom (1–120) · Open. Remembered, and used by "Walk" in Ride it out.
function WalkLengthPicker({ prefs, onChange }) {
  const { c } = useTheme()
  const set = (changes) => onChange({ ...prefs, ...changes })
  const items = [
    ...WALK_OPTIONS.map((m) => ({ id: m, label: String(m), sub: 'min', a11y: `${m} minutes` })),
    { id: 'custom', label: 'Custom', sub: `${prefs.customMinutes} min`, a11y: 'Custom length' },
    { id: 'open', label: 'Open', sub: 'no timer', a11y: 'Open walk' },
  ]
  return (
    <Card testID="walk-options">
      <Seg items={items} value={prefs.choice} onChange={(choice) => set({ choice })} label="Walk length" testID="length" small />
      {prefs.choice === 'custom' ? (
        <Stepper value={prefs.customMinutes} min={CUSTOM_MIN} max={CUSTOM_MAX} unit="minutes" testID="custom-minutes"
          onChange={(v) => set({ customMinutes: clampCustomMinutes(v) })} />
      ) : null}
      {prefs.choice === 'open' ? <T size={14} color={c.muted}>No timer. Walk as long as you like, then tap Finish walk.</T> : null}
    </Card>
  )
}

const fmtHours = (h) => (h === 1 ? '1 hour' : `${h} hours`)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const HOUR_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12]

// Time back: an estimate from the setup answers. Hidden when days a week / times a day were skipped.
// Money is off until the person adds a $ per time.
function TimeBackCard({ profile, hero, today, onChange }) {
  const { c } = useTheme()
  const [adjust, setAdjust] = useState(null) // null | 'hours' | 'money'
  const tb = timeBack(profile, hero, today)
  if (!tb) return null
  const save = (v) => {
    const cur = profile.timeBack || { hoursPerTime: DEFAULT_HOURS_PER_TIME, moneyPerTime: null }
    onChange({ timeBack: adjust === 'hours' ? { ...cur, hoursPerTime: v } : { ...cur, moneyPerTime: v } })
    setAdjust(null)
  }
  return (
    <Card testID="time-back">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T accessibilityRole="header" font="semibold" size={17} color={c.title} style={{ flex: 1 }}>Time back</T>
        <T font="semibold" size={12} color={c.mutedSand} style={{ backgroundColor: c.sand, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>Estimate</T>
      </View>
      <T size={type.body} color={c.muted}>about <T font="serif" size={type.screenTitle} color={c.title} testID="tb-hours">{tb.hours.toLocaleString()}</T> <T size={type.body} color={c.text}>hours</T></T>
      {tb.money != null ? <T size={type.body} color={c.muted}>and about <T font="serif" size={type.rideSheetTitle} color={c.title} testID="tb-money">${tb.money.toLocaleString()}</T> <T size={type.body} color={c.text}>kept</T></T> : null}
      <T size={13} color={c.muted} testID="tb-formula">
        Since {shortDate(hero.startDate, '0000-01-01')}, based on what you told us: {plural(tb.daysPerWeek, 'day', 'days')} a week,{' '}
        {tb.timesPerDay === 7 ? '7+ times' : plural(tb.timesPerDay, 'time', 'times')} a day, about {fmtHours(tb.hoursPerTime)} each
        {tb.moneyPerTime != null ? ` and $${tb.moneyPerTime} each time` : ''}.
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button kind="quiet" label={tb.moneyPerTime == null ? 'Add money estimate' : 'Change money'} onPress={() => setAdjust('money')} testID="tb-money-edit" />
        <Button kind="quiet" label="Adjust" onPress={() => setAdjust('hours')} testID="tb-adjust" />
      </View>
      {adjust ? <AdjustSheet kind={adjust} value={adjust === 'hours' ? tb.hoursPerTime : tb.moneyPerTime} onSave={save} onClose={() => setAdjust(null)} /> : null}
    </Card>
  )
}

function AdjustSheet({ kind, value, onSave, onClose }) {
  const { c } = useTheme()
  const [hours, setHours] = useState(value ?? DEFAULT_HOURS_PER_TIME)
  const [money, setMoney] = useState(value == null ? '' : String(value))
  const m = Number(money)
  const moneyOk = money.trim() !== '' && Number.isFinite(m) && m > 0 && m <= 100000
  const i = Math.max(0, HOUR_STEPS.indexOf(hours))
  return (
    <Sheet title={kind === 'hours' ? 'About how long each time?' : 'Money estimate'} onClose={onClose} testID="adjust-sheet">
      {kind === 'hours' ? (
        <>
          <T size={15} color={c.muted}>A rough guess is fine. The default is 1 hour.</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button kind="secondary" label="−" accessibilityLabel="Less" disabled={i === 0} onPress={() => setHours(HOUR_STEPS[i - 1])} style={{ width: 56 }} testID="adjust-less" />
            <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${hours} ${hours === 1 ? 'hour' : 'hours'} each time`}>
              <T font="serif" size={44} color={c.title} testID="adjust-hours">{hours}</T>
              <T size={14} color={c.muted}>{hours === 1 ? 'hour' : 'hours'} each time</T>
            </View>
            <Button kind="secondary" label="+" accessibilityLabel="More" disabled={i === HOUR_STEPS.length - 1} onPress={() => setHours(HOUR_STEPS[i + 1])} style={{ width: 56 }} testID="adjust-more" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button kind="secondary" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Save" onPress={() => onSave(hours)} style={{ flex: 1 }} testID="adjust-save" />
          </View>
        </>
      ) : (
        <>
          <T size={15} color={c.muted}>Optional, and only on this phone. About how much did one time cost?</T>
          <Field label="Dollars per time" value={money} onChangeText={setMoney} keyboardType="decimal-pad" placeholder="e.g. 40" testID="adjust-money" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button kind="secondary" label={value == null ? 'Cancel' : 'Turn off'} onPress={() => (value == null ? onClose() : onSave(null))} style={{ flex: 1 }} />
            <Button label="Save" disabled={!moneyOk} onPress={() => onSave(Math.round(m * 100) / 100)} style={{ flex: 1 }} testID="adjust-save" />
          </View>
        </>
      )}
    </Sheet>
  )
}

