import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { markStress } from '../lib/calm.js'
import { breakdown, formatBreakdown, isValidISODate, todayISO } from '../lib/cleanTime.js'
import { resetTracker, undoReset, undoableReset } from '../lib/homeIdeas.js'
import { cleanDays, heroHabit, shortDate } from '../lib/homeStats.js'
import { loadActiveTrackerId, saveActiveTrackerId } from '../lib/activeTracker.js'
import { backfillTracker, earnedList, loadMilestones, milestoneShort, removeTracker } from '../lib/milestones.js'
import { loadHabits, makeId, MAX_NAME_LENGTH, saveHabits } from '../lib/storage.js'
import { loadWalks } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { DatePicker } from '../ui/DatePicker.jsx'
import { Field } from '../ui/Field.jsx'
import { Row } from '../ui/Row.jsx'
import { HeaderButton, Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { type, useTheme } from '../ui/theme.js'

const untilLabel = (until, today) =>
  `${new Date(until).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${todayISO(new Date(until)) === today ? 'today' : 'tomorrow'}`

// Editing trackers, shared by Home ("Edit") and You, so both behave the same (the PWA's useTrackerEditor):
// list → add / edit / delete, a kind "Start a new count" with a free 24h undo, milestones kept on a reset.
export function useTrackerEditor({ today, now, onOpenBackup, onMilestones }) {
  const storage = useStorage()
  const [initial] = useState(() => loadHabits(storage))
  const [habits, setHabits] = useState(initial.habits)
  const [activeId, setActiveId] = useState(() => loadActiveTrackerId(storage))
  const setActive = (id) => { saveActiveTrackerId(id, storage); setActiveId(id) }
  const hero = heroHabit(habits, activeId)
  const [notice, setNotice] = useState(initial.recovered ? 'Some saved data was damaged and couldn’t be read. A backup was kept on this phone.' : '')
  const [sheet, setSheet] = useState(null) // { mode: 'manage' | 'add' | 'edit' | 'reset' | 'milestones', habit?, from? }
  const [undo, setUndo] = useState(null) // { habitId } for the short "History kept." toast
  useEffect(() => {
    if (!undo) return undefined
    const t = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(t)
  }, [undo])

  function update(next) {
    setHabits(next)
    if (!saveHabits(next, storage)) setNotice('Couldn’t save on this phone.')
  }
  const back = () => setSheet(sheet?.from === 'manage' ? { mode: 'manage' } : null)

  function handleSave(values) {
    if (sheet.mode === 'add') {
      update([...habits, { id: makeId(), ...values }])
    } else {
      const habit = { ...sheet.habit, ...values }
      if (values.startDate !== sheet.habit.startDate) {
        delete habit.startedAt
        onMilestones(backfillTracker(loadMilestones(storage), habit, today))
      }
      update(habits.map((h) => (h.id === sheet.habit.id ? habit : h)))
    }
    back()
  }
  function handleDelete() {
    onMilestones(removeTracker(loadMilestones(storage), sheet.habit.id))
    update(habits.filter((h) => h.id !== sheet.habit.id))
    back()
  }
  function handleReset(startDate) {
    const habit = habits.find((h) => h.id === sheet.habit.id)
    markStress(now(), storage)
    update(habits.map((h) => (h.id === habit.id ? resetTracker(habit, startDate, now()) : h)))
    setSheet(null)
    setUndo({ habitId: habit.id })
  }
  function handleUndo() {
    update(habits.map((h) => (h.id === undo.habitId ? undoReset(h) : h)))
    setUndo(null)
  }
  function undoLast(id) {
    update(habits.map((h) => (h.id === id && undoableReset(h, now()) ? undoReset(h) : h)))
    setUndo(null)
  }
  function handleUndoLast() {
    undoLast(sheet.habit.id)
    back()
  }

  const current = sheet?.habit ? habits.find((h) => h.id === sheet.habit.id) ?? sheet.habit : null
  const sheets = (
    <>
      {sheet?.mode === 'manage' && (
        <TrackerSheet habits={habits} today={today}
          onEdit={(habit) => setSheet({ mode: 'edit', habit, from: 'manage' })}
          onAdd={() => setSheet({ mode: 'add', from: 'manage' })}
          activeId={hero?.id} onMakePrimary={setActive}
          onOpenBackup={() => { setSheet(null); onOpenBackup() }}
          onClose={() => setSheet(null)} />
      )}
      {(sheet?.mode === 'add' || sheet?.mode === 'edit') && (
        <HabitSheet key={sheet.mode === 'edit' ? sheet.habit.id : 'new'} habit={sheet.mode === 'edit' ? current : null} today={today}
          onSave={handleSave} onDelete={handleDelete}
          onReset={() => setSheet({ mode: 'reset', habit: current, from: sheet.from })}
          undoable={sheet.mode === 'edit' ? undoableReset(current, now()) : null} onUndoReset={handleUndoLast} onClose={back} />
      )}
      {sheet?.mode === 'reset' && (
        <ResetSheet habit={current} milestones={loadMilestones(storage)} lifetime={loadWalks(storage).walks.length} today={today}
          onConfirm={handleReset} onClose={() => setSheet({ mode: 'edit', habit: current, from: sheet.from })} />
      )}
    </>
  )
  return { habits, hero, activeId: hero?.id ?? null, setActive, notice, setNotice, sheet, setSheet, sheets, undo, handleUndo, undoLast }
}

// "Edit" on Home / "Trackers" in You: every tracker, which one is on Home, add another, and Backup.
function TrackerSheet({ habits, today, activeId, onEdit, onAdd, onMakePrimary, onOpenBackup, onClose }) {
  const { c } = useTheme()
  return (
    <Sheet title="Your trackers" onClose={onClose} testID="tracker-sheet" right={<HeaderButton label="Done" onPress={onClose} testID="trackers-done" />}>
      {habits.length === 0 ? (
        <T size={15} color={c.muted}>No trackers yet. Add the date you started and Home will count your clean days.</T>
      ) : habits.map((h, i) => {
        const days = cleanDays(h, today)
        const b = breakdown(h.startDate, today)
        return (
          <View key={h.id} testID="tracker-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T font="semibold" size={17} color={c.title}>{h.name}</T>
              <T size={14} color={c.text}><T font="bold" size={14} color={c.text} testID="tracker-days">{days.toLocaleString()}</T> {days === 1 ? 'day' : 'days'} · since {shortDate(h.startDate, today)}</T>
              {b && b.totalDays > 0 ? <T size={13} color={c.muted}>{formatBreakdown(b)}</T> : null}
            </View>
            {h.id === activeId ? (
              <T font="semibold" size={13} color={c.accent}>On Home</T>
            ) : (
              <Pressable onPress={() => onMakePrimary(h.id)} accessibilityRole="button" accessibilityLabel={`Show ${h.name} on Home`}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
                <T font="semibold" size={14} color={c.accent}>Show on Home</T>
              </Pressable>
            )}
            <HeaderButton label="Edit" accessibilityLabel={`Edit ${h.name}`} onPress={() => onEdit(h)} testID={`edit-${i}`} />
          </View>
        )
      })}
      <Button kind="secondary" label={habits.length === 0 ? 'Add your sober date' : '+ Add another'} onPress={onAdd} testID="tracker-add" />
      <Row title="Backup & restore" sub="Save everything to a file, or bring it back" onPress={onOpenBackup} />
    </Sheet>
  )
}

// Add or edit one tracker. Edit also offers "Start a new count", the 24h undo, and Delete (confirmed).
function HabitSheet({ habit, today, onSave, onDelete, onReset, undoable, onUndoReset, onClose }) {
  const { c } = useTheme()
  const isEdit = Boolean(habit)
  const [name, setName] = useState(habit ? habit.name : '')
  const [startDate, setStartDate] = useState(habit ? habit.startDate : today)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Give it a name, like "Drinking" or "Smoking".')
    if (!isValidISODate(startDate) || startDate > today) return setError('The start date can’t be in the future.')
    onSave({ name: trimmed, startDate })
  }
  const prev = habit?.resets?.at(-1)?.prevStartDate
  return (
    <Sheet title={isEdit ? 'Edit habit' : 'Add your sober date'} onClose={onClose} testID="habit-sheet"
      overlay={confirm ? (
        <Confirm title="Delete this habit?" message={`"${habit.name}" and its date will be removed from this phone. This can't be undone.`}
          confirmLabel="Delete" cancelLabel="Cancel" onCancel={() => setConfirm(false)} onConfirm={onDelete} />
      ) : null}>
      <Field label="What are you staying away from?" value={name} onChangeText={(t) => { setName(t); setError('') }} placeholder="e.g. Drinking" maxLength={MAX_NAME_LENGTH} testID="habit-name" />
      <T font="medium" size={14} color={c.muted}>Sober since</T>
      <DatePicker value={startDate} max={today} onChange={(d) => { setStartDate(d); setError('') }} testID="habit-date" />
      {error ? <T size={15} color={c.error} accessibilityRole="alert">{error}</T> : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
        <Button label={isEdit ? 'Save' : 'Add'} onPress={submit} style={{ flex: 1 }} testID="habit-save" />
      </View>
      {isEdit && undoable ? (
        <View testID="undo-reset" style={{ gap: 6 }}>
          <Button kind="secondary" label="Undo last reset" onPress={onUndoReset} testID="undo-last-reset" />
          <T size={14} color={c.muted}>Puts back your start date ({prev ? shortDate(prev, today) : 'before the reset'}). Free, until {untilLabel(undoable.until, today)}.</T>
        </View>
      ) : null}
      {isEdit ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
          <Button kind="quiet" label="Start a new count" onPress={onReset} testID="start-new-count" />
          <Button kind="quiet" label="Delete" textColor={c.danger} onPress={() => setConfirm(true)} testID="habit-delete" />
        </View>
      ) : null}
    </Sheet>
  )
}

// "Start a new count" in plain words: what changes, what stays, and the free 24h undo.
function ResetSheet({ habit, milestones, lifetime, today, onConfirm, onClose }) {
  const { c } = useTheme()
  const [date, setDate] = useState(today)
  const earned = earnedList(milestones, habit.id)
  const range = earned.length === 0 ? 'none yet' : earned.length === 1 ? milestoneShort(earned[0].milestone)
    : `${milestoneShort(earned[0].milestone)} → ${milestoneShort(earned.at(-1).milestone)}`
  const kept = ['All walks, breaths and journal entries', `Milestones you earned (${range})`, `Urges ridden out · ${lifetime.toLocaleString()}`]
  return (
    <Sheet title="Start a new count" onClose={onClose} testID="reset-sheet">
      <T size={type.body} color={c.text}>Your {habit.name} day count goes back to 0 from the date below. Walks, journal and milestones stay. You can undo this free for 24 hours.</T>
      {kept.map((k) => (
        <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.tileAlt, alignItems: 'center', justifyContent: 'center' }}>
            <T font="bold" size={13} color={c.onTileAlt}>✓</T>
          </View>
          <T size={15} color={c.text} style={{ flex: 1 }}>{k}</T>
        </View>
      ))}
      <T font="medium" size={14} color={c.muted}>New count starts {date === today ? '(today)' : ''}</T>
      <DatePicker value={date} min={habit.startDate} max={today} onChange={setDate} testID="reset-date" />
      <Button label="Start a new count" onPress={() => onConfirm(date)} testID="reset-go" />
      <Button kind="quiet" label="Keep current count" onPress={onClose} testID="reset-keep" />
    </Sheet>
  )
}

// Rendered by the screen that owns the editor: the short "History kept." toast after a reset.
export function ResetToast({ editor }) {
  const { c } = useTheme()
  if (!editor.undo) return null
  return (
    <View testID="reset-toast" accessibilityLiveRegion="polite" style={{ backgroundColor: c.toastBg, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <T size={15} color={c.toastText} style={{ flex: 1 }}>New count started. History kept.</T>
      <Pressable accessibilityRole="button" onPress={editor.handleUndo} testID="reset-toast-undo" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
        <T font="bold" size={15} color={c.toastAct}>Undo</T>
      </Pressable>
    </View>
  )
}
