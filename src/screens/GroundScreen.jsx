import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { GROUND, GROUND_LINES, groundProgress } from '../lib/ground.js'
import { Button } from '../ui/Button.jsx'
import { CheckIn } from '../ui/CheckIn.jsx'
import { Field } from '../ui/Field.jsx'
import { T } from '../ui/Text.jsx'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'
import { HeaderButton } from '../ui/Sheet.jsx'
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
  const sense = item.note ? GROUND.steps.findIndex((st) => st.sense === item.id) + 1 : i === 0 ? 0 : GROUND.steps.length
  const [head, ...restParts] = splitFirstSentence(item.line)
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.screen, gap: space.section }} keyboardShouldPersistTaps="handled" testID="ground">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} style={{ flex: 1 }}>{GROUND.title}</T>
          <SenseDots done={sense} />
          <HeaderButton label="✕" accessibilityLabel="Close. Nothing saved" onPress={onCancel} testID="ground-close" />
        </View>
        <T size={type.footnote} color={c.muted} testID="ground-progress" style={{ textAlign: 'center' }}>{item.note ? groundProgress(sense) : ' '}</T>
        <Pressable onPress={next} accessibilityRole="button" accessibilityHint="Tap to continue" testID="ground-line"
          style={{ flexGrow: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: radius.card, padding: space.card }}>
          {!item.note ? <Pebble /> : null}
          <View accessible accessibilityLabel={item.line} accessibilityLiveRegion="polite" testID="ground-text" style={{ alignItems: 'center', gap: 8 }}>
            <T font={item.note ? 'serif' : 'serifItalic'} size={item.note ? 30 : 28} color={c.title} style={{ textAlign: 'center' }}>{head}</T>
            {restParts.length ? <T size={type.bodyLg} color={c.text} style={{ textAlign: 'center' }}>{restParts.join(' ')}</T> : null}
          </View>
          {item.hint ? <T size={type.body} color={c.text} style={{ textAlign: 'center' }}>{item.hint}</T> : null}
        </Pressable>
        {item.note ? (
          <View style={{ gap: 6 }}>
            <Field key={item.id} label={GROUND.notePlaceholder} value={words[item.id] ?? ''} onChangeText={(t) => setWords({ ...words, [item.id]: t })}
              maxLength={80} testID="ground-note" />
            <T size={type.caption} color={c.muted}>{GROUND.noteHelp}</T>
          </View>
        ) : null}
        <Button label={i === 0 ? 'Begin 5-senses check-in' : i >= last ? 'Done' : 'Next'} onPress={next} testID="ground-next" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {i > 0 ? <Button kind="secondary" label="Finish early" onPress={() => setEnd({ endedAt: clock(), completed: false })} testID="ground-finish" /> : null}
          <Button kind="quiet" label="Cancel · nothing saved" textColor={c.muted} onPress={onCancel} testID="ground-cancel" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// "Let's come back to right here." | "Five small steps, …": the first sentence is the heading.
export function splitFirstSentence(line) {
  const m = line.match(/^(.+?[.!?])\s+(.+)$/)
  return m ? [m[1], m[2]] : [line]
}

// 5 · 4 · 3 · 2 · 1: one dot per sense, filled once you've reached it.
function SenseDots({ done }) {
  const { c } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`${done} of 5 senses`} testID="ground-dots">
      {[5, 4, 3, 2, 1].map((n, k) => (
        <View key={n} testID={`ground-dot-${n}`} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k < done ? c.accent : 'transparent', borderWidth: 1.5, borderColor: k < done ? c.accent : c.cellEdge }} />
      ))}
    </View>
  )
}

// A quiet focal point: a pebble resting in sea-glass ripples. Decorative.
function Pebble() {
  const { c } = useTheme()
  return (
    <Svg width={180} height={110} viewBox="0 0 180 110" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="ground-pebble">
      <Ellipse cx={90} cy={74} rx={84} ry={26} fill="none" stroke={c.ringB} strokeWidth={1.5} opacity={0.45} />
      <Ellipse cx={90} cy={74} rx={62} ry={19} fill="none" stroke={c.ringB} strokeWidth={1.5} opacity={0.7} />
      <Ellipse cx={90} cy={74} rx={40} ry={12} fill="none" stroke={c.ringB} strokeWidth={2} />
      <Path d="M58 70 C58 48 78 38 94 40 C114 42 124 56 120 68 C116 80 70 82 58 70 Z" fill={c.sand} stroke={c.cellEdge} strokeWidth={1.5} />
      <Circle cx={84} cy={52} r={4} fill={c.surface} opacity={0.8} />
    </Svg>
  )
}
