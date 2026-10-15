// Daily check-in, 30 seconds or less: Steady / Shaky / Rough, an optional one word, an optional
// 3-second hold to commit to today. Rough offers Ride it out right away. Ends with the daily line.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { COMMIT_HOLD_MS, MAX_WORD, MOODS, checkinFor, saveCheckIn } from '../lib/checkin.js'
import { todayISO } from '../lib/cleanTime.js'
import { dailyLine } from '../lib/homeIdeas.js'
import { loadProfile } from '../lib/profile.js'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { HoldButton } from '../ui/HoldButton.jsx'
import { Card } from '../ui/Row.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { size as sz, type, useTheme } from '../ui/theme.js'

export function CheckInSheet({ now, clock = Date.now, onClose, onRide, extra = null }) {
  const storage = useStorage()
  const { c } = useTheme()
  const today = todayISO(new Date(now))
  const [prev] = useState(() => checkinFor(storage, today))
  const [mood, setMood] = useState(prev?.mood ?? null)
  const [word, setWord] = useState(prev?.word ?? '')
  const [committed, setCommitted] = useState(prev?.committed === true)
  const [done, setDone] = useState(false)
  const [line] = useState(() => dailyLine(loadProfile(storage), today))

  function save() {
    saveCheckIn(today, { mood, word, committed }, storage, clock())
    setDone(true)
  }

  if (done) {
    return (
      <Sheet title="Thanks for checking in" onClose={onClose} testID="checkin-sheet">
        <Card testID="checkin-line">
          <T font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>Today’s line</T>
          <T font="serifItalic" size={22} color={c.title} style={{ textAlign: 'center' }}>“{line.text}”</T>
        </Card>
        {extra}
        <Button label="Close" onPress={onClose} testID="checkin-close" />
      </Sheet>
    )
  }

  return (
    <Sheet title="How are you today?" onClose={onClose} testID="checkin-sheet">
      <View accessibilityRole="radiogroup" accessibilityLabel="How are you today?" style={{ flexDirection: 'row', gap: 8 }}>
        {MOODS.map((m) => {
          const on = mood === m.id
          return (
            <Pressable key={m.id} onPress={() => setMood(m.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} testID={`mood-${m.id}`}
              style={{ flex: 1, minHeight: sz.row, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 0 : 1, borderColor: c.fieldBorder, backgroundColor: on ? c.action : c.card }}>
              <T font="semibold" size={type.body} color={on ? c.onAction : c.title}>{m.label}</T>
            </Pressable>
          )
        })}
      </View>
      {mood === 'rough' ? (
        <View testID="checkin-rough" style={{ backgroundColor: c.sand, borderRadius: 14, padding: 14, gap: 10 }}>
          <T size={15} color={c.text}>Thanks for saying so. Want to ride it out now?</T>
          <Button label="Ride it out" onPress={() => { if (mood) saveCheckIn(today, { mood, word, committed }, storage, clock()); onRide() }} testID="checkin-ride" />
        </View>
      ) : null}
      <Field label="One word (optional)" value={word} onChangeText={setWord} maxLength={MAX_WORD} placeholder="e.g. tired" testID="checkin-word" />
      <HoldButton label="Hold to commit to today" doneLabel="Committed to today" holdMs={COMMIT_HOLD_MS} done={committed} onDone={() => setCommitted(true)} testID="checkin-hold" />
      <T size={13} color={c.muted}>Optional. Skipping a day is fine. Nothing counts gaps.</T>
      <Button label="Done" disabled={!mood} onPress={save} testID="checkin-save" />
    </Sheet>
  )
}

// Home: a small card until today's check-in is done, then one quiet line. Missed days show nothing.
// flat (slim Home): no box of its own; it sits in the Home sand panel under Your why.
export function CheckInCard({ today, onOpen, flat = false }) {
  const storage = useStorage()
  const { c } = useTheme()
  const entry = checkinFor(storage, today)
  if (entry) {
    const label = MOODS.find((m) => m.id === entry.mood)?.label
    return (
      <Pressable onPress={onOpen} accessibilityRole="button" testID="checkin-done" style={{ minHeight: 44, justifyContent: 'center' }}>
        <T size={14} color={flat ? c.mutedSand : c.muted} style={{ textAlign: flat ? 'left' : 'center' }}>Checked in today · {label}{entry.word ? ` · ${entry.word}` : ''}{entry.committed ? ' · committed' : ''}</T>
      </Pressable>
    )
  }
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" testID="checkin-card"
      style={flat ? { minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }
        : { minHeight: sz.row, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T font="semibold" size={type.body} color={c.title}>Daily check-in</T>
        <T size={14} color={c.textSoft}>How are you today? About 30 seconds.</T>
      </View>
      <T size={20} color={flat ? c.mutedSand : c.muted} accessibilityElementsHidden importantForAccessibility="no">›</T>
    </Pressable>
  )
}
