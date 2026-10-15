import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { GROUND, GROUND_LINES, groundProgress } from '../lib/ground.js'
import { Button } from '../ui/Button.jsx'
import { CheckIn } from '../ui/CheckIn.jsx'
import { Field } from '../ui/Field.jsx'
import { T } from '../ui/Text.jsx'
import { radius, space, type, useTheme } from '../ui/theme.js'

// Ground: silent, text-only 5-4-3-2-1. One line at a time; tap to continue. The optional words
// typed on each sense stay on screen only and are never saved. Then the same check-in as Breathe.
export function GroundScreen({ onSave, onCancel, clock = Date.now }) {
  const { c } = useTheme()
  const [startedAt] = useState(clock)
  const [i, setI] = useState(0)
  const [words, setWords] = useState({})
  const [end, setEnd] = useState(null) // { endedAt, completed }
  const last = GROUND_LINES.length - 1

  if (end) {
    const secs = Math.round((end.endedAt - startedAt) / 1000)
    const save = (result, note = '', tags = []) => onSave({ startedAt, endedAt: end.endedAt, result, note, tags, completed: end.completed })
    return (
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingTop: 32 }} testID="ground-done">
        <CheckIn heading="Nice. You stayed with it." sub={`You grounded for ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}.`}
          onSave={({ result, note, tags }) => save(result, note, tags)} onSkip={() => save(null)} />
      </ScrollView>
    )
  }

  const item = GROUND_LINES[i]
  const next = () => (i >= last ? setEnd({ endedAt: clock(), completed: true }) : setI(i + 1))
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.screen, gap: space.section }} keyboardShouldPersistTaps="handled" testID="ground">
        <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>{GROUND.title}</T>
        <T size={type.footnote} color={c.muted} testID="ground-progress">{item.note ? groundProgress(GROUND.steps.findIndex((s) => s.sense === item.id) + 1) : ' '}</T>
        <Pressable onPress={next} accessibilityRole="button" accessibilityHint="Tap to continue" testID="ground-line"
          style={{ flexGrow: 1, minHeight: 180, justifyContent: 'center', gap: 10, borderRadius: radius.card, padding: space.card }}>
          <T font="serif" size={28} color={c.title} accessibilityLiveRegion="polite" testID="ground-text">{item.line}</T>
          {item.hint ? <T size={type.body} color={c.text}>{item.hint}</T> : null}
        </Pressable>
        {item.note ? (
          <View style={{ gap: 6 }}>
            <Field key={item.id} label={GROUND.notePlaceholder} value={words[item.id] ?? ''} onChangeText={(t) => setWords({ ...words, [item.id]: t })}
              maxLength={80} testID="ground-note" />
            <T size={type.caption} color={c.muted}>{GROUND.noteHelp}</T>
          </View>
        ) : null}
        <Button label={i >= last ? 'Done' : 'Next'} onPress={next} testID="ground-next" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {i > 0 ? <Button kind="secondary" label="Finish early" onPress={() => setEnd({ endedAt: clock(), completed: false })} testID="ground-finish" /> : null}
          <Button kind="quiet" label="Cancel · nothing saved" textColor={c.muted} onPress={onCancel} testID="ground-cancel" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
