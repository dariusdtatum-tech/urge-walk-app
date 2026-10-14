import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { daysBetween, todayISO } from '../../lib/cleanTime.js'
import { shortDate } from '../../lib/homeStats.js'
import { backfillTracker, loadMilestones, saveMilestones } from '../../lib/milestones.js'
import {
  emptyProfile, identityLine, IMPORTANCE, improveLabels, labelFor, loadProfile, saveProfile, SUPPORT, supportValid, trackersFromPicks,
} from '../../lib/profile.js'
import { loadHabits, makeId, saveHabits } from '../../lib/storage.js'
import { Button } from '../../ui/Button.jsx'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { size as sz, type, useTheme } from '../../ui/theme.js'
import { CrisisSheet } from '../Crisis.jsx'
import { addContact } from '../../lib/contacts.js'
import { BeforeSteppers, Check, DateStep, IdentityStep, ImportanceStep, ImproveStep, RidingStep, SupportStep, WhyStep } from './Steps.jsx'

// Step ids kept stable for the recap (6 is gone: "times a day" sits on 5 with "days a week").
// 1 welcome · 2 privacy · 3 riding out · 4 date · 5 before · 7 more of · 8 importance · 9 identity · 10 support · 11 why · 12 recap
export const ORDER = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]
const nextStep = (s) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(s) + 1)]
const prevStep = (s) => ORDER[Math.max(0, ORDER.indexOf(s) - 1)]
const PRIVACY = [
  { id: 'account', title: 'No account needed', text: 'Nothing to sign up for in this version. No email, no password.' },
  { id: 'tracking', title: 'No tracking', text: 'No ads, no analytics, no location history.' },
  { id: 'file', title: 'Your backup, your file', text: 'Export or restore whenever you want.' },
]
const joinNames = (n) => (n.length <= 1 ? n[0] || '' : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`)

const SKY = {
  light: { a: '#f6efe3', b: '#efe5d3', sun: '#f3e3c6', w1: 'rgba(127,174,159,0.6)', w2: 'rgba(169,203,192,0.85)', w3: 'rgba(211,230,223,0.9)', foam: 'rgba(253,251,247,0.9)', w4: 'rgba(230,216,191,0.9)' },
  dark: { a: '#1b3152', b: '#0f1d33', sun: 'rgba(239,230,212,0.85)', w1: 'rgba(169,203,192,0.25)', w2: 'rgba(58,90,115,0.7)', w3: 'rgba(44,66,102,0.85)', foam: 'rgba(169,203,192,0.9)', w4: 'rgba(36,57,92,0.9)' },
}
// The welcome scene: sun (moon at night) over layered sea-glass waves.
function WelcomeScene() {
  const { c, scheme } = useTheme()
  const s = SKY[scheme]
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 520" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id="obSky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={s.a} /><Stop offset="1" stopColor={s.b} /></LinearGradient>
        <LinearGradient id="obFade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0.7" stopColor={c.bg} stopOpacity={0} /><Stop offset="1" stopColor={c.bg} stopOpacity={1} /></LinearGradient>
      </Defs>
      <Rect width="390" height="520" fill="url(#obSky)" />
      <Circle cx="270" cy="150" r="46" fill={s.sun} />
      <Path d="M0 250 C 80 238 160 262 240 248 C 300 238 350 252 390 244 L390 520 L0 520Z" fill={s.w1} />
      <Path d="M0 300 C 90 280 170 318 250 298 C 320 282 360 300 390 292 L390 520 L0 520Z" fill={s.w2} />
      <Path d="M0 352 C 100 334 180 372 260 352 C 330 336 365 352 390 346 L390 520 L0 520Z" fill={s.w3} />
      <Path d="M0 352 C 100 334 180 372 260 352 C 330 336 365 352 390 346" stroke={s.foam} strokeWidth={2} fill="none" />
      <Path d="M0 404 C 110 390 190 420 280 404 C 340 394 370 404 390 400 L390 520 L0 520Z" fill={s.w4} />
      <Rect width="390" height="520" fill="url(#obFade)" />
    </Svg>
  )
}

// Setup: 11 screens, one question each (the two "before" steppers share one), then the recap.
// mode 'new' (first run) or 'redo' (from You: answers prefilled, existing trackers kept, not duplicated).
// Nothing is saved until "Let’s walk".
export function Onboarding({ mode = 'new', now, onDone, onRestore, onCancel }) {
  const storage = useStorage()
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const today = todayISO(new Date(now))
  const [draft, setDraft] = useState(() => {
    const p = loadProfile(storage) || emptyProfile()
    const habits = loadHabits(storage).habits
    return {
      adult: p.adultConfirmed, picks: mode === 'redo' ? habits.map((h) => h.name) : [],
      startDate: mode === 'redo' && habits[0] ? habits[0].startDate : today,
      before: { daysPerWeek: p.before.daysPerWeek, timesPerDay: p.before.timesPerDay },
      improve: p.improve, improveOwn: p.improveOwn || '', importance: p.importance, identity: p.identity,
      support: { support: p.support, trustedName: p.trustedName, trustedPhone: p.trustedPhone },
      why: p.why, existing: habits.map((h) => h.name),
    }
  })
  const [step, setStep] = useState(mode === 'redo' ? 2 : 1)
  const [fromRecap, setFromRecap] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const set = (changes) => setDraft((d) => ({ ...d, ...changes }))
  const newPicks = draft.picks.filter((n) => !draft.existing.some((e) => e.toLowerCase() === n.toLowerCase()))

  const next = () => { setStep(fromRecap ? 12 : nextStep(step)); if (fromRecap) setFromRecap(false) }
  const back = () => {
    if (fromRecap) { setFromRecap(false); setStep(12); return }
    if (step === 1 || (mode === 'redo' && step === 2)) { onCancel?.(); return }
    setStep(prevStep(step))
  }
  const SKIP_RESET = {
    4: { startDate: today }, 5: { before: { daysPerWeek: null, timesPerDay: null } }, 7: { improve: [], improveOwn: '' },
    8: { importance: null }, 9: { identity: null }, 10: { support: { support: null, trustedName: '', trustedPhone: '' } }, 11: { why: '' },
  }
  const skip = () => { set(SKIP_RESET[step]); next() }
  const edit = (n) => { setFromRecap(true); setStep(n) }

  function finish() {
    const at = new Date(now).toISOString()
    const prev = loadProfile(storage) || emptyProfile()
    saveProfile({
      ...prev, onboardedAt: at, skipped: false, adultConfirmed: true, privacyAckAt: prev.privacyAckAt || at,
      before: draft.before, improve: draft.improve, improveOwn: draft.improveOwn, importance: draft.importance, identity: draft.identity, ...draft.support, why: draft.why,
    }, storage)
    // The trusted person from setup joins the trusted contacts list (no-op if already there).
    if (draft.support.support === 'trusted') addContact(storage, { name: draft.support.trustedName, phone: draft.support.trustedPhone })
    const habits = loadHabits(storage).habits
    const added = trackersFromPicks(draft.picks, draft.startDate, habits, makeId)
    if (added.length) {
      saveHabits([...habits, ...added], storage)
      let m = loadMilestones(storage)
      for (const h of added) m = backfillTracker(m, h, today) // passed milestones are earned quietly
      saveMilestones(m, storage)
    }
    onDone()
  }

  const days = Math.max(0, daysBetween(draft.startDate, today))
  const dateNote = mode === 'redo' && newPicks.length === 0
    ? 'Your trackers keep their own dates. Change them in You → Trackers.'
    : `One date for ${joinNames(mode === 'redo' ? newPicks : draft.picks) || 'everything you picked'}. You can change each later.`

  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }} testID="onboarding" accessibilityLabel="Setup step 1">
        <WelcomeScene />
        {mode === 'redo' ? <BackButton onPress={onCancel} top={insets.top} /> : null}
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 24, gap: 10 }}>
          <T accessibilityRole="header" font="serif" size={52} color={c.title}>You’re here.</T>
          <T font="serifItalic" size={24} color={c.title}>That’s the first step.</T>
          <T size={17} color={c.text}>Urge Walk helps you ride out urges, one walk at a time. Private, on your phone.</T>
        </View>
        <View style={{ padding: 24, paddingBottom: 24 + insets.bottom, gap: 6 }}>
          <Button label="Begin" onPress={() => setStep(2)} testID="ob-begin" />
          {mode === 'new' ? <Button kind="quiet" label="Restore from a backup" onPress={onRestore} testID="ob-restore" /> : null}
        </View>
      </View>
    )
  }

  const sup = draft.support.support
  const b = draft.before
  const before = [
    b.daysPerWeek != null && `${b.daysPerWeek} ${b.daysPerWeek === 1 ? 'day' : 'days'} a week`,
    b.timesPerDay != null && `${b.timesPerDay === 7 ? '7+' : b.timesPerDay} ${b.timesPerDay === 1 ? 'time' : 'times'} a day`,
  ].filter(Boolean).join(' · ')
  const recap = [
    { step: 3, k: 'Riding out', v: draft.picks.join(', ') },
    { step: 4, k: 'Clean since', v: `${shortDate(draft.startDate, '0000-01-01')} · ${days.toLocaleString()} ${days === 1 ? 'day' : 'days'}` },
    { step: 5, k: 'Before', v: before },
    { step: 7, k: 'More of', v: improveLabels({ improve: draft.improve, improveOwn: draft.improveOwn.trim() }).join(' · ') },
    { step: 8, k: 'Right now', v: IMPORTANCE.find((o) => o.id === draft.importance)?.recap ?? '' },
    { step: 9, k: 'I see myself as', v: identityLine({ identity: draft.identity }) },
    { step: 10, k: 'Who’s with you', v: sup ? labelFor(SUPPORT, sup) + (sup === 'trusted' ? ` · ${draft.support.trustedName.trim()}` : '') : '' },
    { step: 11, k: 'Your why', v: draft.why.trim() ? `“${draft.why.trim().replace(/[.!?]?$/, '.')}”` : '', why: true },
  ]

  const screens = {
    2: { title: 'For now, everything stays on this phone.', cta: 'Sounds good', ok: draft.adult, body: (
      <View style={{ gap: 14 }}>
        {PRIVACY.map((r) => (
          <View key={r.id} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.sand, alignItems: 'center', justifyContent: 'center' }}><Check color={c.title} /></View>
            <View style={{ flex: 1 }}>
              <T font="semibold" size={type.body} color={c.title}>{r.title}</T>
              <T size={15} color={c.text}>{r.text}</T>
            </View>
          </View>
        ))}
        <Pressable onPress={() => set({ adult: !draft.adult })} accessibilityRole="checkbox" accessibilityState={{ checked: draft.adult }} testID="ob-adult"
          style={{ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: draft.adult ? 2 : 1, borderColor: draft.adult ? c.title : c.fieldBorder, backgroundColor: c.card }}>
          <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: draft.adult ? 0 : 1.5, borderColor: c.fieldBorder, backgroundColor: draft.adult ? c.action : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {draft.adult ? <Check color={c.onAction} /> : null}
          </View>
          <T font="semibold" size={type.body} color={c.title}>I’m 18 or older</T>
        </Pressable>
        <T size={14} color={c.muted} testID="ob-disclaimer">Urge Walk is a habit tool, not medical treatment.</T>
      </View>
    ) },
    3: { title: 'What are you riding out?', sub: 'Pick as many as you like. You can change this any time.', ok: draft.picks.length > 0, cta: draft.picks.length ? `Continue · ${draft.picks.length} selected` : 'Continue',
      body: <RidingStep picks={draft.picks} onChange={(picks) => set({ picks })} onSelfHarm={() => setCrisis(true)} /> },
    4: { title: 'When did your clean days begin?', sub: dateNote,
      extra: <Button kind="quiet" label="Start today" onPress={() => set({ startDate: today })} testID="ob-start-today" />,
      body: <DateStep value={draft.startDate} today={today} onChange={(startDate) => set({ startDate })} /> },
    5: { title: 'Before you started, how often?', sub: 'Optional. A rough guess is fine. Helps show the time you’ve gained back.',
      body: <BeforeSteppers value={draft.before} onChange={(before) => set({ before })} /> },
    7: { cta: `Continue · ${draft.improve.length + (draft.improveOwn.trim() ? 1 : 0)} selected`, title: 'What do you want more of?', sub: 'Choose any that matter. We’ll reflect them back to you.',
      body: <ImproveStep value={draft.improve} onChange={(improve) => set({ improve })} own={draft.improveOwn} onOwn={(improveOwn) => set({ improveOwn })} /> },
    8: { title: 'How important is this to you right now?', sub: 'Be honest. It only changes how the app shows up for you.',
      body: <ImportanceStep value={draft.importance} onChange={(importance) => set({ importance })} /> },
    9: { title: 'I see myself as someone who is…', sub: 'Shown on your Home screen.',
      body: <IdentityStep value={draft.identity} onChange={(identity) => set({ identity })} /> },
    10: { title: 'Who’s with you?', sub: 'Riding it out is easier with company. Or not. Your call.', ok: supportValid(draft.support),
      body: <SupportStep value={draft.support} onChange={(support) => set({ support })} /> },
    11: { title: 'Why does this matter to you?', body: <WhyStep value={draft.why} onChange={(why) => set({ why })} /> },
  }
  const sc = step === 12 ? null : screens[step]
  const n = ORDER.indexOf(step) + 1

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} testID="onboarding" accessibilityLabel={`Setup step ${step}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8 }}>
        <BackButton onPress={back} />
        <View accessibilityRole="progressbar" accessibilityLabel="Setup progress" accessibilityValue={{ min: 1, max: ORDER.length, now: n }} testID="ob-progress"
          style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden' }}>
          <View style={{ width: `${(n / ORDER.length) * 100}%`, height: 6, backgroundColor: c.ringA }} />
        </View>
        {step >= 4 && step <= 11 ? (
          <Pressable onPress={skip} accessibilityRole="button" testID="ob-skip" style={{ minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center' }}>
            <T font="semibold" size={type.body} color={c.accent}>Skip</T>
          </Pressable>
        ) : <View style={{ width: 56 }} />}
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled" testID={`ob-step-${step}`}>
        <View style={{ gap: 8 }}>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>{step === 12 ? 'Look at what you just did.' : sc.title}</T>
          {step === 12 ? <T size={type.body} color={c.text}>Every answer is yours to change in You.</T> : sc.sub ? <T size={type.body} color={c.text}>{sc.sub}</T> : null}
        </View>
        {step === 12 ? (
          <View style={{ gap: 8 }}>
            {recap.map((r) => (
              <Pressable key={r.k} onPress={() => edit(r.step)} accessibilityRole="button" accessibilityLabel={`${r.k}: ${r.v || 'Not set'}. Edit`} testID={`recap-${r.step}`}
                style={{ minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: r.v ? c.action : 'transparent', borderWidth: r.v ? 0 : 1.5, borderColor: c.fieldBorder, alignItems: 'center', justifyContent: 'center' }}>
                  {r.v ? <Check color={c.onAction} size={12} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <T font="semibold" size={15} color={c.title}>{r.k}</T>
                  <T font={r.why && r.v ? 'serifItalic' : 'body'} size={r.why && r.v ? 18 : 15} color={r.v ? c.text : c.muted}>{r.v || 'Not set · tap to add'}</T>
                </View>
              </Pressable>
            ))}
          </View>
        ) : sc.body}
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 8, paddingBottom: 16 + insets.bottom, gap: 4 }}>
        {step === 12 ? (
          <Button label="Let’s walk" onPress={finish} testID="ob-finish" />
        ) : (
          <Button label={fromRecap ? 'Done' : sc.cta || 'Next'} onPress={next} disabled={sc.ok === false} testID="ob-next" />
        )}
        {sc?.extra ?? null}
      </View>
      {crisis ? <CrisisSheet onClose={() => setCrisis(false)} /> : null}
    </View>
  )
}

function BackButton({ onPress, top }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Back" testID="ob-back"
      style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, top != null ? { position: 'absolute', top: top + 8, left: 8, zIndex: 2 } : null]}>
      <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={c.title} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Pressable>
  )
}
