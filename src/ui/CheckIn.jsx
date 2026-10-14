import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { MAX_NOTE_LENGTH } from '../lib/walkStorage.js'
import { Button } from './Button.jsx'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

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

// After a walk or a minute of breathing.
export function CheckIn({ heading, sub, onSave, onSkip }) {
  const { c } = useTheme()
  const [result, setResult] = useState(null)
  const [note, setNote] = useState('')
  return (
    <View style={{ gap: 16 }} testID="check-in">
      <T accessibilityRole="header" font="serif" size={30} color={c.title}>{heading}</T>
      <T size={16} color={c.text}>{sub}</T>
      <T font="semibold" size={16} color={c.title}>Did the urge pass?</T>
      <OutcomePicker value={result} onChange={setResult} />
      <NoteField value={note} onChange={setNote} label="Anything you want to remember? (optional)" placeholder="What helped, what you noticed…" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" label="Skip" onPress={onSkip} style={{ flex: 1 }} testID="skip" />
        <Button label="Save" onPress={() => onSave({ result, note })} style={{ flex: 1 }} testID="save" />
      </View>
    </View>
  )
}
