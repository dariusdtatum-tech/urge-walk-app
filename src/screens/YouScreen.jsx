import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { THEMES } from '../lib/appearance.js'
import { backupFilename, buildBackup, clearAllData, lastBackupLabel, loadBackupMeta } from '../lib/backup.js'
import { todayISO } from '../lib/cleanTime.js'
import { cleanDays } from '../lib/homeStats.js'
import { SECTION_ORDER, SECTION_TITLES, SECTIONS } from './you/Sections.jsx'
import { earnedList, loadMilestones, saveMilestones } from '../lib/milestones.js'
import { emptyProfile, identityLine, IMPORTANCE, improveLabels, labelFor, loadProfile, saveProfile, SUPPORT, supportValid } from '../lib/profile.js'
import { loadReminder, reminderLabel, saveReminder } from '../lib/checkin.js'
import { loadFollowUpEnabled } from '../lib/followUp.js'
import { loadWalkPrefs, saveWalkPrefs } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { Notice } from '../ui/Row.jsx'
import { HairlineRow as Row, HeroStat, RowGroup, SectionLabel } from '../ui/kit.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { space, type, useTheme } from '../ui/theme.js'
import { MilestonesList } from './home/Milestones.jsx'
import { BeforeSteppers, IdentityStep, ImportanceStep, ImproveStep, SupportStep, WhyStep } from './onboarding/Steps.jsx'
import { ResetToast, useTrackerEditor } from './Trackers.jsx'

import { CRISIS, CrisisSheet } from './Crisis.jsx'
import { ContactsSheet } from './ReachOut.jsx'
import { ReasonsSheet } from './Reasons.jsx'
import { LOCK_ERRORS, loadAppLock, saveAppLock } from '../lib/appLock.js'
import { DailyVerseCard } from './DailyVerse.jsx'
import { DesignCheck } from './DesignCheck.jsx'
import { FreeForeverSheet } from './FreeForever.jsx'
import { NotificationsSheet } from './NotificationsSheet.jsx'

import { loadVerseEnabled } from '../lib/verse.js'
import { MoneySheet } from './MoneySheet.jsx'

import { loadReasons } from '../lib/reasons.js'
import { loadWalks } from '../lib/walkStorage.js'
import { fmtMoney, moneyKept } from '../lib/money.js'
import { loadContacts } from '../lib/contacts.js'

export { CRISIS }
export { LEGAL_LINKS } from './you/Sections.jsx'
// You's six rows in three labelled groups (same order as SECTION_ORDER), plus Your plan.
const YOU_GROUPS = [
  { label: 'Help and reasons', ids: ['support', 'why'] },
  { label: 'Progress', ids: ['progress'] },
  { label: 'Settings', ids: ['reminders', 'appearance', 'data'], plan: true },
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
export function YouScreen({ now, clock = Date.now, theme, onTheme, onOpenBackup, onRedo, onErased, onAppLock = () => {}, health = [], open = null, initialSection = null }) {
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
  const [showContacts, setShowContacts] = useState(open === 'contacts')
  const [showReasons, setShowReasons] = useState(open === 'reasons')
  const [showMoney, setShowMoney] = useState(false)
  const [appLock, setAppLock] = useState(() => loadAppLock(storage))
  const [appLockNote, setAppLockNote] = useState('')
  const [designCheck, setDesignCheck] = useState(false)
  const [showFree, setShowFree] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  // Turning the lock on needs a successful Face ID / passcode check first; turning it off doesn't.
  async function changeAppLock(on) {
    setAppLockNote('')
    if (on) {
      const r = await device.authenticateApp()
      if (!r?.ok) { setAppLockNote(LOCK_ERRORS[r?.reason] ?? LOCK_ERRORS.failed); return }
    }
    saveAppLock(on, storage); setAppLock(on); onAppLock(on)
  }
  const [verseOn, setVerseOn] = useState(() => loadVerseEnabled(storage))
  const [verseFade, setVerseFade] = useState(false)
  const reasonCount = loadReasons(storage).length
  const [walks] = useState(() => loadWalks(storage).walks)
  const [contactsVer, setContactsVer] = useState(0)
  const people = loadContacts(storage)
  const [followUpOn, setFollowUpOn] = useState(() => loadFollowUpEnabled(storage))
  const [reminder, setReminder] = useState(() => loadReminder(storage))
  const changeReminder = (r) => { saveReminder(r, storage); setReminder(r); device.syncCheckinReminder(r) }
  const [reset, setReset] = useState(null) // null | 'confirm' | 'saved?' | 'notSaved'
  const hero = editor.hero
  const [section, setSection] = useState(open === 'reasons' ? 'why' : open === 'contacts' ? 'support' : SECTION_ORDER.includes(open) ? open : initialSection)
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

  const days = hero ? cleanDays(hero, today) : 0
  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? 'System'
  const kept = moneyKept(profile, hero, walks, today)
  // Live status lines for the six rows.
  const status = {
    support: `988 · ${people.length ? people.map((p) => p.name).join(' · ') : 'No trusted contacts yet'}`,
    why: reasonCount ? `${reasonCount} ${reasonCount === 1 ? 'reason' : 'reasons'}` : 'No reasons yet',
    progress: hero ? [`${hero.name} · ${days.toLocaleString()} ${days === 1 ? 'day' : 'days'}`, habits.length > 1 ? `${habits.length} trackers` : null, kept ? `${fmtMoney(kept.total)} kept` : null].filter(Boolean).join(' · ') : 'Add the date you started',
    reminders: `${reminder ? `Check-in ${reminderLabel(reminder)}` : 'Check-in reminder off'} · follow-up ${followUpOn ? 'on' : 'off'}`,
    appearance: [themeLabel, appLock ? 'App lock on' : null, verseOn ? 'Daily verse on' : null].filter(Boolean).join(' · '),
    data: lastBackupLabel(loadBackupMeta(storage), now),
  }
  const props = {
    walks, c, storage, device, today, now, profile, editor, habits, hero, earned, prefs, showLengths, setShowLengths, changePrefs,
    people, contactsVer, reasonCount, appLock, appLockNote, changeAppLock, followUpOn, setFollowUpOn, reminder, changeReminder,
    list, showAnswers, setShowAnswers, setAnswer, onRedo, theme, onTheme, verseOn, setVerseOn, setVerseFade, onOpenBackup,
    setShowCrisis, setShowContacts, setShowReasons, setShowMoney, setShowNotify, setShowFree, setReset, setDesignCheck, changeProfile, setSheet,
  }
  const Section = section ? SECTIONS[section] : null

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: 10 }} testID="you">
        {Section ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
            <HeaderButton label="‹ You" accessibilityLabel="Back to You" onPress={() => setSection(null)} testID="you-back" />
          </View>
        ) : null}
        <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>{Section ? SECTION_TITLES[section] : 'You'}</T>
        <Notice text={notice} onDismiss={() => setNotice('')} />
        {!Section && hero ? <HeroStat value={days.toLocaleString()} label={days === 1 ? 'day clean' : 'days clean'} sub={hero.name} testID="you-hero" /> : null}
        {!Section && health.length ? (
          <RowGroup testID="you-health">
            {health.map((h) => (
              <Row key={h.id} title={h.title} sub={h.action ? `${h.sub} ${h.action}.` : h.sub} testID={`health-${h.id}`}
                chevron={h.action ? '›' : ''} accessibilityRole={h.action ? 'button' : 'text'}
                onPress={h.action ? () => device.openSettings() : undefined} />
            ))}
          </RowGroup>
        ) : null}
        <ResetToast editor={editor} />
        {Section ? <Section {...props} /> : (
          <>
            {verseOn ? <DailyVerseCard date={new Date(now)} fadeIn={verseFade} /> : null}
            {YOU_GROUPS.map((g) => (
              <View key={g.label} style={{ gap: 0 }}>
                <SectionLabel>{g.label}</SectionLabel>
                <RowGroup>
                  {g.ids.map((id) => <Row key={id} title={SECTION_TITLES[id]} sub={status[id]} testID={`you-${id}`} onPress={() => setSection(id)} />)}
                  {g.plan ? <Row title="Your plan" sub="Free. Everything in Urge Walk is free to use." testID="you-plan" onPress={() => setShowFree(true)} /> : null}
                </RowGroup>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {showNotify ? <NotificationsSheet onClose={() => { setShowNotify(false); setFollowUpOn(loadFollowUpEnabled(storage)); setReminder(loadReminder(storage)) }} /> : null}
      {showFree ? <FreeForeverSheet onClose={() => setShowFree(false)} /> : null}
      {designCheck ? <DesignCheck onClose={() => setDesignCheck(false)} /> : null}

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
