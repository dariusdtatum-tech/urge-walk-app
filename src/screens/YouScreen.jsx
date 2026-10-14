import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { THEMES } from '../lib/appearance.js'
import { backupFilename, buildBackup, clearAllData, lastBackupLabel, loadBackupMeta } from '../lib/backup.js'
import { todayISO } from '../lib/cleanTime.js'
import { DEFAULT_HOURS_PER_TIME, timeBack } from '../lib/homeIdeas.js'
import { heroHabit, shortDate } from '../lib/homeStats.js'
import { earnedList, loadMilestones, saveMilestones } from '../lib/milestones.js'
import {
  emptyProfile, identityLine, IMPORTANCE, improveLabels, labelFor, loadProfile, saveProfile, SUPPORT, supportValid,
} from '../lib/profile.js'
import { DEFAULT_REMINDER, loadReminder, reminderLabel, saveReminder, stepReminder } from '../lib/checkin.js'
import { clearPendingFollowUp, loadFollowUpEnabled, saveFollowUpEnabled } from '../lib/followUp.js'
import { CUSTOM_MAX, CUSTOM_MIN, WALK_OPTIONS, clampCustomMinutes } from '../lib/walkTimer.js'
import { lengthLabel, loadWalkPrefs, saveWalkPrefs } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { Field } from '../ui/Field.jsx'
import { Card, GroupTitle, Notice, Row, ToggleRow } from '../ui/Row.jsx'
import { Seg } from '../ui/Seg.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { Stepper } from '../ui/Stepper.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'
import { MilestonesList } from './home/Milestones.jsx'
import { BeforeSteppers, IdentityStep, ImportanceStep, ImproveStep, SupportStep, WhyStep } from './onboarding/Steps.jsx'
import { ResetToast, useTrackerEditor } from './Trackers.jsx'

import { CRISIS, CrisisSheet } from './Crisis.jsx'
import { ContactsSheet, ReachOut } from './ReachOut.jsx'
import { ReasonsSheet } from './Reasons.jsx'
import { MoneySheet } from './MoneySheet.jsx'
import { fmtMoney, loadGoal, moneyOn, moneyPerTime } from '../lib/money.js'
import { loadReasons } from '../lib/reasons.js'
import { MAX_CONTACTS, loadContacts } from '../lib/contacts.js'

export { CRISIS }
export const LEGAL_LINKS = [
  { label: 'Privacy policy', url: 'https://dariusdtatum-tech.github.io/urgewalk/privacy.html' },
  { label: 'Terms', url: 'https://dariusdtatum-tech.github.io/urgewalk/terms.html' },
  { label: 'Support', url: 'https://dariusdtatum-tech.github.io/urgewalk/support.html' },
]
const ANSWER_TITLES = { before: 'Before you started', improve: 'What you want more of', importance: 'How important right now', identity: 'I see myself as', support: 'Who’s with you', why: 'Your why' }

function answers(p) {
  const before = [
    p.before.daysPerWeek != null && `${p.before.daysPerWeek} ${p.before.daysPerWeek === 1 ? 'day' : 'days'} a week`,
    p.before.timesPerDay != null && `${p.before.timesPerDay === 7 ? '7+' : p.before.timesPerDay} ${p.before.timesPerDay === 1 ? 'time' : 'times'} a day`,
  ].filter(Boolean).join(' · ')
  return [
    { field: 'before', title: 'Before you started', value: before },
    { field: 'improve', title: 'More of', value: improveLabels(p).join(' · ') },
    { field: 'importance', title: 'Right now', value: IMPORTANCE.find((o) => o.id === p.importance)?.recap ?? '' },
    { field: 'identity', title: 'I see myself as', value: identityLine(p) },
    { field: 'support', title: 'Who’s with you', value: p.support ? labelFor(SUPPORT, p.support) + (p.support === 'trusted' ? ` · ${p.trustedName}` : '') : '' },
    { field: 'why', title: 'Your why', value: p.why ? `“${p.why}”` : '' },
  ]
}

// You: help now, trackers + milestones, walk length, time back, your answers + Redo setup,
// Appearance, Backup & restore, a safe Reset, and the Privacy / Terms / Support links.
export function YouScreen({ now, clock = Date.now, theme, onTheme, onOpenBackup, onRedo, onErased }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const today = todayISO(new Date(now))
  const [milestones, setMilestones] = useState(() => loadMilestones(storage))
  const editor = useTrackerEditor({ today, now: clock, onOpenBackup, onMilestones: (next) => { saveMilestones(next, storage); setMilestones(next) } })
  const { habits, notice, setNotice, sheet, setSheet } = editor
  const [prefs, setPrefs] = useState(() => loadWalkPrefs(storage))
  const [showLengths, setShowLengths] = useState(false)
  const [profile, setProfile] = useState(() => loadProfile(storage) || emptyProfile())
  const [answer, setAnswer] = useState(null)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showCrisis, setShowCrisis] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [showReasons, setShowReasons] = useState(false)
  const [showMoney, setShowMoney] = useState(false)
  const reasonCount = loadReasons(storage).length
  const [contactsVer, setContactsVer] = useState(0)
  const people = loadContacts(storage)
  const [followUpOn, setFollowUpOn] = useState(() => loadFollowUpEnabled(storage))
  const [reminder, setReminder] = useState(() => loadReminder(storage))
  const changeReminder = (r) => { saveReminder(r, storage); setReminder(r); device.syncCheckinReminder(r) }
  const [reset, setReset] = useState(null) // null | 'confirm' | 'saved?' | 'notSaved'
  const hero = heroHabit(habits)
  const earned = hero ? earnedList(milestones, hero.id).length : 0

  const list = answers(profile)

  function changeProfile(changes) {
    const next = { ...profile, ...changes }
    saveProfile(next, storage)
    setProfile(loadProfile(storage) || next)
  }
  function changePrefs(next) { setPrefs(next); saveWalkPrefs(next, storage) }

  // Reset: save a backup file first. The share sheet can't tell us whether the file was really saved,
  // so we ask, and nothing is erased unless the person says so.
  async function startReset() {
    const t = clock()
    try {
      const outcome = await device.shareBackup(JSON.stringify(buildBackup(storage, t), null, 2), backupFilename(t))
      if (outcome) setReset('saved?')
    } catch {
      setReset('notSaved')
    }
  }
  function eraseAll() {
    setReset(null)
    clearAllData(storage)
    device.deleteAllReasonFiles()
    onErased()
  }

  let overlay = null
  if (reset === 'confirm') {
    overlay = (
      <Confirm title="Reset Urge Walk?" confirmLabel="Save backup and reset" cancelLabel="Keep my data"
        message="First we’ll save a backup file. Then everything Urge Walk keeps on this phone is erased and setup starts again. If the backup isn’t saved, nothing is erased."
        onCancel={() => setReset(null)} onConfirm={() => { setReset(null); startReset() }} />
    )
  } else if (reset === 'saved?') {
    overlay = (
      <Confirm title="Did the backup file save?" confirmLabel="Yes, erase everything" cancelLabel="Keep my data"
        message="Only erase if you saved the file (for example in Files or iCloud Drive). Your counts, walks and journal can only come back from that file."
        onCancel={() => { setReset(null); setNotice('Nothing was erased.') }} onConfirm={eraseAll} />
    )
  } else if (reset === 'notSaved') {
    overlay = (
      <Confirm title="Backup not saved" confirmLabel="Erase without backup" cancelLabel="Keep my data"
        message="The backup file wasn’t saved, so nothing has been erased. You can erase without a backup, but your counts, walks and journal can’t be brought back."
        onCancel={() => { setReset(null); setNotice('Nothing was erased.') }} onConfirm={eraseAll} />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 10 }} testID="you">
        <T accessibilityRole="header" font="serif" size={34} color={c.title}>You</T>
        <Notice text={notice} onDismiss={() => setNotice('')} />
        <ResetToast editor={editor} />

        <GroupTitle>Help now</GroupTitle>
        <Row title="Crisis resources" sub="988, SAMHSA helpline, 911" testID="crisis-row" onPress={() => setShowCrisis(true)} />
        <Card><ReachOut key={contactsVer} testID="you-reach" title={null} onSetup={() => setShowContacts(true)} /></Card>
        <Row title="Trusted contacts" sub={people.length ? people.map((p) => p.name).join(' · ') : `Up to ${MAX_CONTACTS} people and a message ready to go`} testID="contacts-row" onPress={() => setShowContacts(true)} />

        <GroupTitle>Your recovery</GroupTitle>
        <Row title="Trackers" sub={habits.length === 0 ? 'Add the date you started' : habits.map((h) => h.name).join(' · ')} testID="trackers-row" onPress={() => setSheet({ mode: 'manage' })} />
        <Row title="Your reasons" sub={reasonCount ? `${reasonCount} saved · one shows when you ride it out` : 'A photo, a voice note, or a few words'} testID="reasons-row" onPress={() => setShowReasons(true)} />
        {hero ? <Row title="Milestones" sub={`${earned === 1 ? '1 earned' : `${earned} earned`} · ${hero.name}`} testID="milestones-row" onPress={() => setSheet({ mode: 'milestones' })} /> : null}
        <Row title="Walk length" sub={`${lengthLabel(prefs)} · for Walk`} testID="walk-length" chevron={showLengths ? '⌃' : '›'} onPress={() => setShowLengths(!showLengths)} />
        {showLengths ? <WalkLengthPicker prefs={prefs} onChange={changePrefs} /> : null}
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
        <ToggleRow title="Money kept" sub={moneyOn(profile) ? `${fmtMoney(moneyPerTime(profile))} each time${loadGoal(storage)?.name ? ` · toward ${loadGoal(storage).name}` : ''}` : 'Off. A private running total, if it helps.'}
          value={moneyOn(profile)} testID="money-toggle" onChange={(on) => (on ? setShowMoney(true) : changeProfile({ timeBack: { ...(profile.timeBack || { hoursPerTime: 1 }), moneyPerTime: null } }))} />
        {moneyOn(profile) ? <Row title="Money kept settings" sub="Amount and goal" testID="money-row" onPress={() => setShowMoney(true)} /> : null}
        <TimeBackCard profile={profile} hero={hero} today={today} onChange={changeProfile} />

        <GroupTitle>About you</GroupTitle>
        <Row title="Your answers" sub={`${list.filter((a) => a.value).length} of ${list.length} answered`} testID="answers-toggle" chevron={showAnswers ? '⌃' : '›'} onPress={() => setShowAnswers(!showAnswers)} />
        {showAnswers ? list.map((a) => <Row key={a.field} title={a.title} sub={a.value || 'Not set'} subMuted={!a.value} testID={`answer-${a.field}`} onPress={() => setAnswer(a.field)} />) : null}
        <Row title="Redo setup" testID="redo-setup" onPress={onRedo}
          sub={`Go through the questions again${profile.onboardedAt && !profile.skipped ? ` · last done ${shortDate(profile.onboardedAt.slice(0, 10), today)}` : ''}`} />

        <GroupTitle>Appearance</GroupTitle>
        <Seg items={THEMES} value={theme} onChange={onTheme} label="Appearance" testID="theme" />

        <GroupTitle>Your data</GroupTitle>
        <Row title="Backup & restore" sub={lastBackupLabel(loadBackupMeta(storage), now)} testID="backup-row" onPress={onOpenBackup} />
        <Row title="Reset app" sub="Saves a backup file first, then starts fresh" testID="reset-app" danger onPress={() => setReset('confirm')} />

        <GroupTitle>About</GroupTitle>
        <T size={14} color={c.muted}>No ads. No tracking. No account. For now, everything stays on this phone.</T>
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
      </ScrollView>

      {sheet?.mode === 'milestones' && hero ? <MilestonesList data={milestones} habit={hero} today={today} onClose={() => setSheet(null)} /> : null}
      {editor.sheets}
      {showMoney ? <MoneySheet profile={profile} onClose={() => setShowMoney(false)} onSave={(v) => { changeProfile({ timeBack: { ...(profile.timeBack || { hoursPerTime: 1 }), moneyPerTime: v } }); setShowMoney(false) }} /> : null}
      {showReasons ? <ReasonsSheet onClose={() => setShowReasons(false)} /> : null}
      {showContacts ? <ContactsSheet onClose={() => { setShowContacts(false); setContactsVer((v) => v + 1) }} /> : null}
      {showCrisis ? <CrisisSheet onClose={() => setShowCrisis(false)} /> : null}
      {answer ? (
        <AnswerSheet field={answer} profile={profile} onClose={() => setAnswer(null)}
          onSave={(changes) => { changeProfile(changes); setAnswer(null) }} />
      ) : null}
      {overlay}
    </View>
  )
}


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
      <T size={16} color={c.muted}>about <T font="serif" size={34} color={c.title} testID="tb-hours">{tb.hours.toLocaleString()}</T> <T size={16} color={c.text}>hours</T></T>
      {tb.money != null ? <T size={16} color={c.muted}>and about <T font="serif" size={30} color={c.title} testID="tb-money">${tb.money.toLocaleString()}</T> <T size={16} color={c.text}>kept</T></T> : null}
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

// Edit one setup answer from You (same editors as setup). Saves only on Save.
function AnswerSheet({ field, profile, onSave, onClose }) {
  const [value, setValue] = useState(() => {
    if (field === 'before') return { ...profile.before }
    if (field === 'improve') return { improve: profile.improve, improveOwn: profile.improveOwn || '' }
    if (field === 'support') return { support: profile.support, trustedName: profile.trustedName, trustedPhone: profile.trustedPhone }
    return profile[field]
  })
  const ok = field !== 'support' || supportValid(value)
  function save() {
    if (field === 'before') onSave({ before: value })
    else if (field === 'improve') onSave(value)
    else if (field === 'support') onSave(value.support === 'trusted' ? value : { ...value, trustedName: '', trustedPhone: '' })
    else onSave({ [field]: value })
  }
  let editor
  if (field === 'before') {
    editor = (
      <>
        <BeforeSteppers value={value} onChange={setValue} prefix="ans" />
        <Button kind="quiet" label="Clear" onPress={() => setValue({ daysPerWeek: null, timesPerDay: null })} />
      </>
    )
  } else if (field === 'improve') editor = <ImproveStep value={value.improve} own={value.improveOwn} onChange={(improve) => setValue({ ...value, improve })} onOwn={(improveOwn) => setValue({ ...value, improveOwn })} />
  else if (field === 'importance') editor = <ImportanceStep value={value} onChange={setValue} />
  else if (field === 'identity') editor = <IdentityStep value={value} onChange={setValue} />
  else if (field === 'support') editor = <SupportStep value={value} onChange={setValue} />
  else editor = <WhyStep value={value} onChange={setValue} />
  return (
    <Sheet title={ANSWER_TITLES[field]} onClose={onClose} testID="answer-sheet">
      {editor}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
        <Button label="Save" disabled={!ok} onPress={save} style={{ flex: 1 }} testID="answer-save" />
      </View>
    </Sheet>
  )
}
