// The answer editors used by onboarding (one per screen) and by You → Your answers.
import { useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { daysBetween } from '../../lib/cleanTime.js'
import {
  communityAvailable, IDENTITY, IMPORTANCE, IMPROVE_GROUPS, MAX_IMPROVE_OWN, SELF_HARM, MAX_TRUSTED_NAME, MAX_WHY, RIDING_GROUPS, SUPPORT, validatePhone,
} from '../../lib/profile.js'
import { MAX_NAME_LENGTH } from '../../lib/storage.js'
import { DatePicker } from '../../ui/DatePicker.jsx'
import { Field } from '../../ui/Field.jsx'
import { Stepper } from '../../ui/Stepper.jsx'
import { T } from '../../ui/Text.jsx'
import { useTheme } from '../../ui/theme.js'

export function Check({ color, size = 14 }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12.5 10 17 19 7" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
}

const ICON_PATHS = {
  healthy: ['M12 3v18M5 10l7-7 7 7'],
  daybyday: ['M12 8v4l3 2', 'circle'],
  done: ['M5 12.5 10 17 19 7'],
  control: ['M4 12h6l2-6 2 12 2-6h4'],
  loved: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  waves: ['M3 17c3 0 4-6 7-6s4 8 7 8 3-4 4-4'],
}
function LineIcon({ id, color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      {ICON_PATHS[id].map((d) => (d === 'circle'
        ? <Circle key={d} cx={12} cy={12} r={8} stroke={color} strokeWidth={1.7} fill="none" />
        : <Path key={d} d={d} stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />))}
    </Svg>
  )
}

// A radio option card.
function Option({ selected, onSelect, title, hint, icon, testID }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onSelect} accessibilityRole="radio" accessibilityState={{ checked: selected }} testID={testID}
      style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: selected ? 2 : 1, borderColor: selected ? c.title : c.border, backgroundColor: c.card }}>
      {icon ? <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.sand, alignItems: 'center', justifyContent: 'center' }}><LineIcon id={icon} color={c.title} /></View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={16} color={c.title}>{title}</T>
        {hint ? <T size={14} color={c.muted}>{hint}</T> : null}
      </View>
      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: selected ? 0 : 1.5, borderColor: c.fieldBorder, backgroundColor: selected ? c.action : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <Check color={c.onAction} /> : null}
      </View>
    </Pressable>
  )
}

// A selectable chip (44pt tall, wraps at large text sizes).
export function Chip({ on, label, onPress, testID, dashed = false, role = 'checkbox' }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole={role} accessibilityState={role === 'checkbox' ? { checked: on } : undefined} testID={testID}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22,
        borderWidth: on ? 0 : 1, borderStyle: dashed ? 'dashed' : 'solid', borderColor: dashed ? c.title : c.fieldBorder, backgroundColor: on ? c.action : c.card }}>
      {on ? <Check color={c.onAction} /> : null}
      <T font="medium" size={15} color={on ? c.onAction : c.title}>{label}</T>
    </Pressable>
  )
}

function GroupLabel({ children }) {
  const { c } = useTheme()
  return <T accessibilityRole="header" font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{children}</T>
}

// 03 What are you riding out? Grouped and searchable, with your own entries.
// Picking "Self-harm urges" calls onSelfHarm straight away (setup opens the crisis resources).
export function RidingStep({ picks, onChange, onSelfHarm }) {
  const { c, fonts } = useTheme()
  const input = useRef(null)
  const [query, setQuery] = useState('')
  const q = query.trim()
  const toggle = (name) => {
    const on = picks.includes(name)
    onChange(on ? picks.filter((p) => p !== name) : [...picks, name])
    if (!on && name === SELF_HARM) onSelfHarm?.()
  }
  const known = RIDING_GROUPS.flatMap((g) => g.items)
  const custom = picks.filter((p) => !known.includes(p))
  const match = (name) => name.toLowerCase().includes(q.toLowerCase())
  const exact = [...known, ...picks].some((n) => n.toLowerCase() === q.toLowerCase())
  const groups = [...(custom.length ? [{ id: 'own', label: 'Your own', items: custom }] : []), ...RIDING_GROUPS]
    .map((g) => ({ ...g, items: g.items.filter(match) })).filter((g) => g.items.length)
  const add = () => { if (q && !exact) { onChange([...picks, q]); setQuery('') } }
  return (
    <View style={{ gap: 12 }}>
      <TextInput ref={input} value={query} onChangeText={setQuery} maxLength={MAX_NAME_LENGTH} placeholder="Search, or type your own" placeholderTextColor={c.muted}
        accessibilityLabel="Search, or type your own" testID="riding-search" onSubmitEditing={add} returnKeyType="done" maxFontSizeMultiplier={2}
        style={{ minHeight: 48, borderWidth: 1, borderColor: c.fieldBorder, borderRadius: 24, paddingHorizontal: 16, color: c.text, fontFamily: fonts.body, fontSize: 16, backgroundColor: c.card }} />
      {q && !exact ? (
        <Pressable onPress={add} accessibilityRole="button" testID="riding-add" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.title }}>
          <T font="semibold" size={16} color={c.title}>+ Add “{q}”</T>
        </Pressable>
      ) : null}
      {groups.map((g) => (
        <View key={g.id} style={{ gap: 8 }} testID={`riding-group-${g.id}`}>
          <GroupLabel>{g.label}</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {g.items.map((name) => <Chip key={name} on={picks.includes(name)} label={name} onPress={() => toggle(name)} testID={`pick-${name}`} />)}
          </View>
        </View>
      ))}
      {!q ? (
        <View style={{ gap: 8 }}>
          <GroupLabel>Other</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip role="button" label="Something else" onPress={() => input.current?.focus()} testID="riding-other" />
            <Chip role="button" dashed label="+ Add your own" onPress={() => input.current?.focus()} testID="riding-own" />
          </View>
        </View>
      ) : null}
    </View>
  )
}

// 04 Start date
export function DateStep({ value, onChange, today }) {
  const { c } = useTheme()
  const days = Math.max(0, daysBetween(value, today))
  return (
    <View style={{ gap: 14 }}>
      <DatePicker value={value} max={today} onChange={onChange} testID="ob-date" />
      <T size={17} color={c.text} testID="ob-days" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
        That’s <T font="bold" size={17} color={c.title}>{days.toLocaleString()} {days === 1 ? 'day' : 'days'}</T>.
      </T>
    </View>
  )
}

export function BeforeSteppers({ value, onChange, prefix = 'ob' }) {
  return (
    <View style={{ gap: 22 }}>
      <Stepper testID={`${prefix}-dpw`} value={value.daysPerWeek} min={0} max={7} unit="days a week" marks={['M', 'T', 'W', 'T', 'F', 'S', 'S']} onChange={(daysPerWeek) => onChange({ ...value, daysPerWeek })} />
      <Stepper testID={`${prefix}-tpd`} value={value.timesPerDay} min={1} max={7} unit="times a day" marks={['1', '2', '3', '4', '5', '6', '7+']} onChange={(timesPerDay) => onChange({ ...value, timesPerDay })} />
    </View>
  )
}

// 07 More of: chips grouped Body / Mind / Life, plus one of your own.
export function ImproveStep({ value, onChange, own = '', onOwn }) {
  const { c } = useTheme()
  const [adding, setAdding] = useState(false)
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  const count = value.length + (own.trim() ? 1 : 0)
  return (
    <View style={{ gap: 14 }}>
      {IMPROVE_GROUPS.map((g) => (
        <View key={g.id} style={{ gap: 8 }} testID={`improve-group-${g.id}`}>
          <GroupLabel>{g.label}</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {g.items.map((o) => <Chip key={o.id} on={value.includes(o.id)} label={o.label} onPress={() => toggle(o.id)} testID={`improve-${o.id}`} />)}
          </View>
        </View>
      ))}
      {onOwn ? (
        <View style={{ gap: 8 }}>
          <GroupLabel>Your own</GroupLabel>
          {adding || own ? (
            <Field label="Something else you want more of" value={own} onChangeText={onOwn} maxLength={MAX_IMPROVE_OWN} placeholder="e.g. Early mornings" testID="improve-own" autoFocus={adding} />
          ) : (
            <View style={{ flexDirection: 'row' }}><Chip role="button" dashed label="+ Add your own" onPress={() => setAdding(true)} testID="improve-own-add" /></View>
          )}
        </View>
      ) : null}
      <T size={14} color={c.muted} testID="ob-improve-count" accessibilityLiveRegion="polite">{count} selected</T>
    </View>
  )
}

export function ImportanceStep({ value, onChange }) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {IMPORTANCE.map((o) => <Option key={o.id} selected={value === o.id} onSelect={() => onChange(o.id)} title={o.label} hint={o.hint} testID={`importance-${o.id}`} />)}
    </View>
  )
}

export function IdentityStep({ value, onChange }) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {IDENTITY.map((o) => <Option key={o.id} selected={value === o.id} onSelect={() => onChange(o.id)} title={o.label} icon={o.id} testID={`identity-${o.id}`} />)}
    </View>
  )
}

// 10 Who's with you (+ trusted contact). Community only shows once it exists.
export function SupportStep({ value, onChange }) {
  const { c } = useTheme()
  const { support, trustedName, trustedPhone } = value
  const [touched, setTouched] = useState(false)
  const set = (changes) => onChange({ ...value, ...changes })
  const phoneBad = trustedPhone.trim() !== '' && validatePhone(trustedPhone) == null
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {SUPPORT.filter((o) => o.id !== 'community' || communityAvailable()).map((o) => (
        <View key={o.id} style={{ gap: 10 }}>
          <Option selected={support === o.id} onSelect={() => set({ support: o.id })} title={o.label} hint={o.hint} testID={`support-${o.id}`} />
          {o.id === 'trusted' && support === 'trusted' ? (
            <View style={{ gap: 10, paddingHorizontal: 4 }}>
              <Field label="Their name" value={trustedName} onChangeText={(t) => set({ trustedName: t })} maxLength={MAX_TRUSTED_NAME} placeholder="e.g. Sam" testID="trusted-name" />
              <Field label="Their phone number" value={trustedPhone} onChangeText={(t) => set({ trustedPhone: t })} maxLength={30} placeholder="(555) 123-4567"
                keyboardType="phone-pad" testID="trusted-phone" invalid={phoneBad && touched} onBlur={() => setTouched(true)} />
              {phoneBad && touched ? <T size={14} color={c.error} accessibilityRole="alert">That doesn’t look like a phone number.</T> : null}
              <T size={14} color={c.muted}>Only on this phone. You’ll see “Text {trustedName.trim() || 'them'}” when you ride one out.</T>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}

export function WhyStep({ value, onChange, autoFocus = false }) {
  const { c } = useTheme()
  return (
    <View style={{ gap: 8 }}>
      <Field value={value} onChangeText={onChange} multiline maxLength={MAX_WHY} placeholder="To be there for my kids…" testID="why" autoFocus={autoFocus} label="Why does this matter to you?" />
      <T size={14} color={c.muted}>You’ll see this when an urge hits.</T>
    </View>
  )
}
