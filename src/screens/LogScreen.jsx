import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { todayISO } from '../lib/cleanTime.js'
import {
  OUTCOME_LABELS, deleteWalk, dayLabel, finishedLabel, formatDuration, formatTimeOfDay, groupByDay, kindOf, localDayKey,
  outcomeKey, plannedLabel, summarize, updateWalk, walkSummaryLabel, weekDays,
} from '../lib/logStats.js'
import { tagLabel } from '../lib/urgeMap.js'
import { loadWalks, MAX_NOTE_LENGTH, saveWalks } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { OutcomePicker } from '../ui/CheckIn.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Field } from '../ui/Field.jsx'
import { Card, Notice } from '../ui/Row.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { radius, size as sz, space, type, useTheme } from '../ui/theme.js'

export function useOutcomeColors() {
  const { c } = useTheme()
  return { yes: c.resYes, kinda: c.resKinda, no: c.resNoText, skipped: c.muted }
}

// A walk's outcome as a calm colour word (mint / amber / grey). No red.
export function ResultWord({ result }) {
  const colors = useOutcomeColors()
  const key = outcomeKey(result)
  return <T font="semibold" size={14} color={colors[key]} testID="outcome-word">{OUTCOME_LABELS[key]}</T>
}

// One day of the week: a ring, filled per outcome (split into slices on mixed days).
function DayRing({ d }) {
  const { c } = useTheme()
  const colors = useOutcomeColors()
  const size = 30
  const r = 13
  const cx = size / 2
  const desc = d.state === 'none' ? 'no urge logged' : d.state === 'skipped' ? `${d.count} ${d.count === 1 ? 'walk' : 'walks'}, no check-in`
    : d.outcomes.map((o) => OUTCOME_LABELS[o].toLowerCase()).join(' and ')
  const slice = (i, n) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2
    const p = (a) => `${cx + r * Math.cos(a)},${cx + r * Math.sin(a)}`
    return `M${cx},${cx} L${p(a0)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${d.label}: ${desc}`} testID="day-ring" style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <Svg width={size} height={size}>
        {d.outcomes.length > 1
          ? d.outcomes.map((o, i) => <Path key={i} d={slice(i, d.outcomes.length)} fill={colors[o]} />)
          : d.outcomes.length === 1
            ? <Circle cx={cx} cy={cx} r={r} fill={colors[d.outcomes[0]]} />
            : <Circle cx={cx} cy={cx} r={r - 1} fill="none" stroke={d.state === 'skipped' ? c.muted : c.track} strokeWidth={2} strokeDasharray={d.state === 'skipped' ? '3 3' : undefined} />}
      </Svg>
      <T size={12} max={1.4} font={d.isToday ? 'bold' : 'body'} color={d.isToday ? c.title : c.muted}>{d.label}</T>
    </View>
  )
}

// Log: a summary of everything ridden out, this week's day marks, then the history grouped by day.
export function LogScreen({ now, onRide, initialSelectedId = null, header = null }) {
  const storage = useStorage()
  const { c } = useTheme()
  const colors = useOutcomeColors()
  const today = todayISO(new Date(now))
  const [initial] = useState(() => loadWalks(storage))
  const [walks, setWalks] = useState(initial.walks)
  const [notice, setNotice] = useState(initial.recovered ? 'Some saved walks were damaged and couldn’t be read. A backup was kept on this phone.' : '')
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const selected = walks.find((w) => w.id === selectedId)

  function update(next) {
    if (!saveWalks(next, storage)) setNotice('Couldn’t save on this phone.')
    setWalks(next)
    setSelectedId(null)
  }

  if (walks.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: space.section }} testID="log">
        {header ?? <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Log</T>}
        <Notice text={notice} onDismiss={() => setNotice('')} />
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }} testID="log-empty">
          <T accessibilityRole="header" font="serif" size={26} color={c.title}>No urges logged yet</T>
          <T size={type.body} color={c.text}>Urges you ride out will show up here.</T>
          <Button label="Ride it out" onPress={onRide} testID="log-ride" style={{ alignSelf: 'stretch' }} />
        </View>
      </ScrollView>
    )
  }

  const s = summarize(walks)
  const groups = groupByDay(walks, today)
  const week = weekDays(walks, today)
  const cells = [['yes', s.yes, 'Passed'], ['kinda', s.kinda, 'Kinda'], ['no', s.no, 'Didn’t'], ['skipped', s.skipped, 'No check-in']]

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: space.section }} testID="log">
        {header ?? <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Log</T>}
        <Notice text={notice} onDismiss={() => setNotice('')} />
        <Card testID="summary">
          <T size={18} color={c.text} testID="summary-total">
            <T font="serif" size={type.statBig} color={c.title} style={{ fontVariant: ['lining-nums'] }}>{s.total}</T>
            {s.onlyWalks ? (s.total === 1 ? ' urge walked off' : ' urges walked off') : (s.total === 1 ? ' urge ridden out' : ' urges ridden out')}
          </T>
          <T size={14} color={c.muted} testID="summary-passed">{s.yes} passed · {s.totalMinutes} {s.totalMinutes === 1 ? 'minute' : 'minutes'} walked</T>
          {!s.onlyWalks ? (
            <T size={14} color={c.muted} testID="summary-kinds">
              {[`${s.kinds.walk} ${s.kinds.walk === 1 ? 'walk' : 'walks'}`, s.kinds.breathe ? `${s.kinds.breathe} breathing` : null, s.kinds.logged ? `${s.kinds.logged} logged` : null].filter(Boolean).join(' · ')}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {cells.map(([key, n, label]) => (
              <View key={key} testID="outcome-cell" accessible accessibilityLabel={`${n} ${OUTCOME_LABELS[key]}`}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                <T font="serif" size={type.statCell} color={colors[key]} style={{ fontVariant: ['lining-nums'] }}>{n}</T>
                <T size={12} max={1.4} color={c.muted} numberOfLines={1}>{label}</T>
              </View>
            ))}
          </View>
          <T font="serifItalic" size={17} color={c.title}>Every walk is proof an urge doesn’t get the final say.</T>
        </Card>

        <Card>
          <T accessibilityRole="header" font="semibold" size={type.body} color={c.title}>This week</T>
          <View style={{ flexDirection: 'row' }}>{week.map((d) => <DayRing key={d.key} d={d} />)}</View>
        </Card>

        {groups.map((g) => (
          <View key={g.key} style={{ gap: 8 }}>
            <T accessibilityRole="header" font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{g.label}</T>
            {g.walks.map((w) => (
              <Pressable key={w.id} onPress={() => setSelectedId(w.id)} testID="log-entry" accessibilityRole="button"
                style={({ pressed }) => ({ minHeight: sz.row, backgroundColor: c.card, borderRadius: radius.row, borderWidth: 1, borderColor: c.border, padding: space.cardDense, gap: 4, flexDirection: 'row', opacity: pressed ? 0.85 : 1 })}>
                <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, borderColor: colors[outcomeKey(w.result)], marginTop: 4, marginRight: 10 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <T font="semibold" size={15} color={c.title}>{formatTimeOfDay(w.startedAt)}</T>
                    <T size={14} color={c.text} style={{ flex: 1 }}>{walkSummaryLabel(w)}</T>
                    <ResultWord result={w.result} />
                  </View>
                  {w.endedEarly ? <T size={12} color={c.mutedSand} style={{ alignSelf: 'flex-start', backgroundColor: c.sand, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>Ended early</T> : null}
                  {w.note ? <T size={14} color={c.textSoft} numberOfLines={3}>{w.note}</T> : null}
                  {w.tags?.length ? <T size={13} color={c.textSoft} testID="log-entry-tags" accessibilityLabel={`Context: ${w.tags.map(tagLabel).join(', ')}`}>{w.tags.map(tagLabel).join(' · ')}</T> : null}
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
      {selected ? (
        <WalkDetailSheet key={selected.id} walk={selected} today={today}
          onSave={(changes) => update(updateWalk(walks, selected.id, changes))}
          onDelete={() => update(deleteWalk(walks, selected.id))}
          onClose={() => setSelectedId(null)} />
      ) : null}
    </View>
  )
}

// One entry's details: outcome and note editable, delete (confirmed).
function WalkDetailSheet({ walk, today, onSave, onDelete, onClose }) {
  const { c } = useTheme()
  const [result, setResult] = useState(walk.result)
  const [note, setNote] = useState(walk.note || '')
  const [confirm, setConfirm] = useState(false)
  const kind = kindOf(walk)
  const facts = [
    [{ walk: 'Walked', breathe: 'Breathed', logged: 'Logged' }[kind], kind === 'logged' ? 'Rode it out' : formatDuration(walk.actualSeconds)],
    ['Planned', plannedLabel(walk)],
    ['Finished', finishedLabel(walk)],
  ]
  return (
    <Sheet title={`${dayLabel(localDayKey(walk.startedAt), today)} · ${formatTimeOfDay(walk.startedAt)}`} onClose={onClose} testID="walk-detail"
      overlay={confirm ? (
        <Confirm title={kind === 'walk' ? 'Delete this walk?' : 'Delete this entry?'} message="It will be removed from your log on this phone. This can’t be undone."
          confirmLabel="Delete" cancelLabel="Cancel" onCancel={() => setConfirm(false)} onConfirm={onDelete} />
      ) : null}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {facts.map(([k, v]) => (
          <View key={k} style={{ flex: 1, gap: 2 }}>
            <T size={13} color={c.muted}>{k}</T>
            <T font="semibold" size={15} color={c.title}>{v}</T>
          </View>
        ))}
      </View>
      <T font="semibold" size={type.body} color={c.title}>Did the urge pass?</T>
      <OutcomePicker value={result} onChange={setResult} testID="detail-outcome" />
      <Field label="Note" value={note} onChangeText={setNote} multiline maxLength={MAX_NOTE_LENGTH} placeholder="What helped, what you noticed…" testID="detail-note" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
        <Button label="Save" onPress={() => onSave({ result, note })} style={{ flex: 1 }} testID="detail-save" />
      </View>
      <Button kind="quiet" label={kind === 'walk' ? 'Delete this walk' : 'Delete this entry'} textColor={c.danger} onPress={() => setConfirm(true)} testID="detail-delete" style={{ alignSelf: 'flex-end' }} />
    </Sheet>
  )
}
