import { useState } from 'react'
import { useSessionBottomSpace } from '../ui/layout.js'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { GROUND, GROUND_LINES, groundProgress } from '../lib/ground.js'
import { Button } from '../ui/Button.jsx'
import { CheckIn } from '../ui/CheckIn.jsx'
import { Field } from '../ui/Field.jsx'
import { T } from '../ui/Text.jsx'
import Svg, { Ellipse, Path } from 'react-native-svg'
import { HeaderButton } from '../ui/Sheet.jsx'
import { radius, space, type, useTheme } from '../ui/theme.js'
import { SceneBackdrop } from './home/SceneBackdrop.jsx'

// Ground: silent, text-only 5-4-3-2-1. One line at a time; tap to continue. The optional words
// typed on each sense stay on screen only and are never saved. Then the same check-in as Breathe.
export function GroundScreen({ onSave, onCancel, clock = Date.now }) {
  const { c } = useTheme()
  const sb = useSessionBottomSpace()
  const [startedAt] = useState(clock)
  const [i, setI] = useState(0)
  const [words, setWords] = useState({})
  const [end, setEnd] = useState(null) // { endedAt, completed }
  const last = GROUND_LINES.length - 1

  if (end) {
    const secs = Math.round((end.endedAt - startedAt) / 1000)
    const save = (result, note = '', tags = []) => onSave({ startedAt, endedAt: end.endedAt, result, note, tags, completed: end.completed })
    return (
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingTop: 32, paddingBottom: sb }} testID="ground-done">
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
      <SceneBackdrop />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.screen, paddingBottom: sb, gap: space.section }} keyboardShouldPersistTaps="handled" testID="ground">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title} style={{ flex: 1 }}>{GROUND.title}</T>
          <SenseDots done={sense} />
          <HeaderButton label="✕" accessibilityLabel="Close. Nothing saved" onPress={onCancel} testID="ground-close" />
        </View>
        <T size={type.footnote} color={c.muted} testID="ground-progress">{item.note ? groundProgress(sense) : ' '}</T>
        <Pressable onPress={next} accessibilityRole="button" accessibilityHint="Tap to continue" testID="ground-line"
          style={{ flexGrow: 1, minHeight: 180, alignItems: 'stretch', justifyContent: 'center', gap: 14, borderRadius: radius.card, paddingVertical: space.card }}>
          {!item.note ? <View style={{ alignItems: 'center' }}><Stones /></View> : null}
          {/* Copy is left-aligned (DESIGN-RULES: no centered everything). */}
          <View accessible accessibilityLabel={item.line} accessibilityLiveRegion="polite" testID="ground-text" style={{ alignItems: 'flex-start', gap: 8 }}>
            <T font={item.note ? 'serif' : 'serifItalic'} size={item.note ? 30 : 28} color={c.title} style={{ textAlign: 'left' }}>{head}</T>
            {restParts.length ? <T size={type.bodyLg} color={c.text} style={{ textAlign: 'left', lineHeight: 24 }}>{restParts.join(' ')}</T> : null}
          </View>
          {item.hint ? <T size={type.body} color={c.text} style={{ textAlign: 'left' }}>{item.hint}</T> : null}
        </Pressable>
        {item.note ? (
          <View style={{ gap: 6 }}>
            <Field key={item.id} label={GROUND.notePlaceholder} value={words[item.id] ?? ''} onChangeText={(t) => setWords({ ...words, [item.id]: t })}
              maxLength={80} testID="ground-note" />
            <T size={type.caption} color={c.textSoft}>{GROUND.noteHelp}</T>
          </View>
        ) : null}
        <Button label={i === 0 ? 'Begin 5-senses check-in' : i >= last ? 'Done' : 'Next'} onPress={next} testID="ground-next" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {i > 0 ? <Button kind="secondary" label="Finish early" onPress={() => setEnd({ endedAt: clock(), completed: false })} testID="ground-finish" /> : null}
          <Button kind="quiet" label="Cancel · nothing saved" textColor={c.textSoft} onPress={onCancel} testID="ground-cancel" />
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

// 5 · 4 · 3 · 2 · 1: one dot per sense, filled once you've reached it. The first dot is filled from the
// start screen on, so it's clear you're at step one of five.
function SenseDots({ done }) {
  const { c } = useTheme()
  const filled = Math.max(1, done)
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={done ? `${done} of 5 senses` : 'Step 1 of 5'} testID="ground-dots">
      {[5, 4, 3, 2, 1].map((n, k) => (
        <View key={n} testID={`ground-dot-${n}`} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k < filled ? c.title : 'transparent', borderWidth: 1.5, borderColor: k < filled ? c.title : c.cellEdge }} />
      ))}
    </View>
  )
}

// A quiet focal point: three flat stones stacked off-center, with two open ripple arcs beside them.
// Flat fills only (no highlight, no shading, no rings around the base). Decorative.
export function Stones() {
  const { c } = useTheme()
  return (
    <Svg width={200} height={120} viewBox="0 0 200 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="ground-stones">
      <Path d="M14 100 C30 90 52 90 66 100" fill="none" stroke={c.ripple} strokeWidth={1.5} strokeLinecap="round" opacity={0.55} />
      <Path d="M4 110 C26 96 58 96 78 110" fill="none" stroke={c.ripple} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
      <Ellipse cx={132} cy={94} rx={46} ry={16} fill={c.stoneBase} />
      <Ellipse cx={110} cy={70} rx={38} ry={14} fill={c.stoneMid} />
      <Ellipse cx={116} cy={47} rx={24} ry={10} fill={c.stoneTop} />
    </Svg>
  )
}
