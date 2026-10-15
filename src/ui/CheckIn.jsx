import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { MAX_NOTE_LENGTH } from '../lib/walkStorage.js'
import { MAX_TAGS, TAG_GROUPS } from '../lib/urgeMap.js'
import { Button } from './Button.jsx'
import { T } from './Text.jsx'
import { space, type, useTheme } from './theme.js'
import { ReachOut } from '../screens/ReachOut.jsx'

export const OUTCOMES = [{ id: 'yes', label: 'Passed' }, { id: 'kinda', label: 'Kinda' }, { id: 'no', label: 'Didn’t' }]

// "Did the urge pass?" with three equal choices.
export function OutcomePicker({ value, onChange, testID = 'outcome' }) {
  const { c } = useTheme()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Did the urge pass?" testID={testID}
      style={{ flexDirection: 'row', backgroundColor: c.seg, borderRadius: 14, padding: 4, gap: 4 }}>
      {OUTCOMES.map((o) => {
        const on = value === o.id
        return (
          <Pressable key={o.id} onPress={() => onChange(on ? null : o.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            testID={`${testID}-${o.id}`}
            style={{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.action : 'transparent' }}>
            <T font="semibold" size={15} color={on ? c.onAction : c.mutedSand}>{o.label}</T>
          </Pressable>
        )
      })}
    </View>
  )
}

export function NoteField({ value, onChange, label = 'Note (optional)', placeholder = 'What helped?' }) {
  const { c, fonts } = useTheme()
  return (
    <View style={{ gap: 6 }}>
      <T font="medium" size={14} color={c.muted}>{label}</T>
      <TextInput value={value} onChangeText={onChange} maxLength={MAX_NOTE_LENGTH} multiline placeholder={placeholder}
        placeholderTextColor={c.muted} accessibilityLabel={label} testID="note" maxFontSizeMultiplier={2}
        style={{ minHeight: 72, borderWidth: 1, borderColor: c.fieldBorder, borderRadius: 12, padding: 12, color: c.text, fontFamily: fonts.body, fontSize: 16, textAlignVertical: 'top', backgroundColor: c.card }} />
    </View>
  )
}

// Optional one-tap context for the Urge Map. Folded away until asked for; up to 4 tags.
export function TagPicker({ value, onChange, testID = 'tags' }) {
  const { c } = useTheme()
  const [open, setOpen] = useState(value.length > 0)
  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" testID={`${testID}-open`} style={{ minHeight: 44, justifyContent: 'center' }}>
        <T font="semibold" size={15} color={c.title}>+ Add context (optional)</T>
      </Pressable>
    )
  }
  const toggle = (id) => onChange(value.includes(id) ? value.filter((t) => t !== id) : value.length >= MAX_TAGS ? value : [...value, id])
  return (
    <View style={{ gap: 8 }} testID={testID}>
      <T font="medium" size={14} color={c.muted}>Context (optional, up to {MAX_TAGS})</T>
      {TAG_GROUPS.map((g) => (
        <View key={g.id} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }} accessibilityLabel={g.label}>
          <T size={13} color={c.muted} style={{ width: 54 }}>{g.label}</T>
          {g.tags.map((t) => {
            const on = value.includes(t.id)
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`${testID}-${t.id}`}
                style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? c.action : c.card, borderWidth: 1, borderColor: on ? c.action : c.fieldBorder }}>
                <T font="semibold" size={14} color={on ? c.onAction : c.title}>{t.label}</T>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// After a walk or a minute of breathing.
export function CheckIn({ heading, sub, onSave, onSkip }) {
  const { c } = useTheme()
  const [result, setResult] = useState(null)
  const [note, setNote] = useState('')
  const [tags, setTags] = useState([])
  return (
    <View style={{ gap: space.section }} testID="check-in">
      <T accessibilityRole="header" font="serif" size={type.rideSheetTitle} color={c.title}>{heading}</T>
      <T size={type.body} color={c.text}>{sub}</T>
      <T font="semibold" size={type.body} color={c.title}>Did the urge pass?</T>
      <OutcomePicker value={result} onChange={setResult} />
      {result === 'no' ? <DidntReachOut /> : null}
      <NoteField value={note} onChange={setNote} label="Anything you want to remember? (optional)" placeholder="What helped, what you noticed…" />
      <TagPicker value={tags} onChange={setTags} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" label="Skip" onPress={onSkip} style={{ flex: 1 }} testID="skip" />
        <Button label="Save" onPress={() => onSave({ result, note, tags })} style={{ flex: 1 }} testID="save" />
      </View>
    </View>
  )
}

// Shown right after "Didn't": no judgment, just help one tap away (988 and your trusted people).
export function DidntReachOut({ testID = 'didnt-reach' }) {
  const { c } = useTheme()
  return (
    <View style={{ gap: 8 }} testID={testID} accessibilityLiveRegion="polite">
      <T size={type.body} color={c.text}>That’s okay. It still counts that you checked in. If you want someone with you right now:</T>
      <ReachOut testID={`${testID}-list`} title="" />
    </View>
  )
}
