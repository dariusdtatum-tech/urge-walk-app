import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { todayISO } from '../lib/cleanTime.js'
import {
  buildFeed, clearDraft, commitDraft, deleteEntry, draftFromEntry, filterFeed, hasChanges, insertPrompt, loadDraft, loadJournal,
  MAX_BODY_LENGTH, MAX_TITLE_LENGTH, newDraft, saveDraft, saveJournal,
} from '../lib/journal.js'
import { MOODS, PROMPTS } from '../lib/journalContent.js'
import { formatTimeOfDay, groupByDay, kindOf, walkSummaryLabel } from '../lib/logStats.js'
import { loadWalks } from '../lib/walkStorage.js'
import { Button } from '../ui/Button.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Notice } from '../ui/Row.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { size as sz, space, type, useTheme } from '../ui/theme.js'
import { ResultWord } from './LogScreen.jsx'

const NOTE_TAGS = { walk: '🚶 Walk note', breathe: '🌬️ Breathe note', logged: '🌊 Urge note' }
const moodInfo = (id) => MOODS.find((m) => m.id === id)

// Journal: your entries plus notes from walks / breaths / logs, newest first, with search.
// The editor autosaves a draft on every keystroke; an unfinished draft reopens next time.
export function JournalScreen({ now, clock = Date.now, onOpenWalk, onEditingChange = () => {}, header = null }) {
  const storage = useStorage()
  const { c, fonts } = useTheme()
  const today = todayISO(new Date(now))
  const [initial] = useState(() => ({ ...loadJournal(storage), walks: loadWalks(storage).walks, draft: loadDraft(storage) }))
  const [entries, setEntries] = useState(initial.entries)
  const [draft, setDraft] = useState(initial.draft)
  const [restored, setRestored] = useState(initial.draft != null)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState(initial.recovered ? 'Some journal entries were damaged and couldn’t be read. A backup was kept on this phone.' : '')
  const editing = Boolean(draft)
  useEffect(() => { onEditingChange(editing); return () => onEditingChange(false) }, [editing, onEditingChange])

  function persist(next) {
    if (!saveJournal(next, storage)) setNotice('Couldn’t save on this phone.')
    setEntries(next)
  }
  const openEditor = (d) => { setRestored(false); setDraft(d) }
  const closeEditor = () => { clearDraft(storage); setDraft(null) }

  if (draft) {
    return (
      <JournalEditor draft={draft} entries={entries} restored={restored}
        onChange={(next) => { saveDraft(next, storage); setDraft(next) }}
        onDone={() => { const next = commitDraft(entries, draft, clock()); if (next !== entries) persist(next); closeEditor() }}
        onDiscard={closeEditor}
        onDelete={() => { persist(deleteEntry(entries, draft.entryId)); closeEditor() }} />
    )
  }

  const feed = buildFeed(entries, initial.walks)
  const shown = filterFeed(feed, query)
  const groups = groupByDay(shown, today, (item) => item.time)

  return (
    <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: 14 }} testID="journal" keyboardShouldPersistTaps="handled">
      {header ?? <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Journal</T>}
      <Notice text={notice} onDismiss={() => setNotice('')} />
      {feed.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }} testID="journal-empty">
          <T accessibilityRole="header" font="serif" size={26} color={c.title}>Your journal</T>
          <T size={type.body} color={c.text}>A few honest lines can help.</T>
          <Button label="Write your first entry" onPress={() => openEditor(newDraft(clock()))} testID="journal-new" style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <Button label="+ New entry" onPress={() => openEditor(newDraft(clock()))} testID="journal-new" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search your journal" placeholderTextColor={c.muted}
            accessibilityLabel="Search your journal" testID="journal-search" returnKeyType="search" maxFontSizeMultiplier={2}
            style={{ minHeight: 48, borderWidth: 1, borderColor: c.fieldBorder, borderRadius: 24, paddingHorizontal: 16, color: c.text, fontFamily: fonts.body, fontSize: 16, backgroundColor: c.card }} />
          {shown.length === 0 ? <T size={15} color={c.muted} testID="no-results">No entries match “{query.trim()}”.</T> : null}
          {groups.map((g) => (
            <View key={g.key} style={{ gap: 8 }}>
              <T accessibilityRole="header" font="bold" size={13} color={c.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{g.label}</T>
              {g.walks.map((item) => (
                <Pressable key={item.id} testID="journal-item" accessibilityRole="button"
                  onPress={() => (item.kind === 'entry' ? openEditor(draftFromEntry(item.entry)) : onOpenWalk(item.walk.id))}
                  style={({ pressed }) => ({ minHeight: sz.row, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12, gap: 4, opacity: pressed ? 0.85 : 1 })}>
                  {item.kind === 'entry' ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T font="semibold" size={14} color={c.muted}>{formatTimeOfDay(item.time)}</T>
                        <T font="semibold" size={type.body} color={c.title} style={{ flex: 1 }} numberOfLines={1}>{item.entry.title}</T>
                        {item.entry.mood ? <T size={18} accessibilityLabel={`Mood: ${moodInfo(item.entry.mood).label}`}>{moodInfo(item.entry.mood).emoji}</T> : null}
                      </View>
                      {item.entry.body ? <T size={15} color={c.textSoft} numberOfLines={3}>{item.entry.body}</T> : null}
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T font="semibold" size={14} color={c.muted}>{formatTimeOfDay(item.time)}</T>
                        <T size={13} color={c.mutedSand} style={{ backgroundColor: c.sand, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>{NOTE_TAGS[kindOf(item.walk)]}</T>
                        <View style={{ flex: 1 }} />
                        <ResultWord result={item.walk.result} />
                      </View>
                      <T size={15} color={c.textSoft} numberOfLines={3}>{item.walk.note}</T>
                      <T size={13} color={c.muted}>{walkSummaryLabel(item.walk)}</T>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
          <T size={13} color={c.muted}>Notes from walks, breathing and logged urges come from your Log. Tap one to edit it there.</T>
        </>
      )}
    </ScrollView>
  )
}

// Full-screen writing view. Every change is passed up and autosaved as a draft right away.
function JournalEditor({ draft, entries, restored, onChange, onDone, onDiscard, onDelete }) {
  const { c, fonts } = useTheme()
  const insets = useSafeAreaInsets()
  const isEdit = Boolean(draft.entryId && entries.some((e) => e.id === draft.entryId))
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length))
  const [showPrompt, setShowPrompt] = useState(!isEdit)
  const [touched, setTouched] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const change = (fields) => { setTouched(true); onChange({ ...draft, ...fields }) }
  const status = touched ? 'Draft saved on this phone' : restored ? 'Draft restored' : ''

  return (
    <View style={{ flex: 1 }} testID="journal-editor" accessibilityViewIsModal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Button kind="quiet" label={isEdit ? 'Close' : 'Discard'} onPress={() => (hasChanges(draft, entries) ? setConfirm('discard') : onDiscard())} testID="editor-close" />
          <T accessibilityRole="header" font="semibold" size={type.body} color={c.title} style={{ flex: 1, textAlign: 'center' }}>{isEdit ? 'Edit entry' : 'New entry'}</T>
          <Button label="Done" onPress={onDone} testID="editor-done" />
        </View>
        <ScrollView contentContainerStyle={{ padding: space.screen, gap: 14, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <T size={13} color={c.muted} testID="draft-status" accessibilityLiveRegion="polite">{status}</T>
          <TextInput value={draft.title} onChangeText={(title) => change({ title })} maxLength={MAX_TITLE_LENGTH} placeholder="Title (optional)"
            placeholderTextColor={c.muted} accessibilityLabel="Title" testID="editor-title" maxFontSizeMultiplier={2}
            style={{ minHeight: 48, fontFamily: fonts.serif, fontSize: 28, color: c.title }} />
          {showPrompt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.sand, borderRadius: 14, paddingLeft: 12 }}>
              <Pressable style={{ flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 8 }} accessibilityRole="button"
                accessibilityLabel={`Use prompt: ${PROMPTS[promptIndex]}`} testID="prompt"
                onPress={() => { change({ body: insertPrompt(draft.body, PROMPTS[promptIndex]) }); setShowPrompt(false) }}>
                <T size={15} color={c.text}>💡 {PROMPTS[promptIndex]}</T>
              </Pressable>
              <Pressable onPress={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)} accessibilityRole="button" accessibilityLabel="Another prompt" testID="prompt-next"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><T size={18} color={c.mutedSand}>↻</T></Pressable>
              <Pressable onPress={() => setShowPrompt(false)} accessibilityRole="button" accessibilityLabel="Hide prompt"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><T size={type.body} color={c.mutedSand}>✕</T></Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel="Mood (optional)">
            {MOODS.map((m) => {
              const on = draft.mood === m.id
              return (
                <Pressable key={m.id} onPress={() => change({ mood: on ? null : m.id })} accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={m.label} testID={`mood-${m.id}`}
                  style={{ flex: 1, minHeight: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 1, borderColor: on ? c.title : c.border, backgroundColor: on ? c.sand : c.card }}>
                  <T size={22} accessibilityElementsHidden>{m.emoji}</T>
                  <T size={12} max={1.4} color={on ? c.title : c.muted}>{m.label}</T>
                </Pressable>
              )
            })}
          </View>
          <TextInput value={draft.body} onChangeText={(body) => change({ body })} maxLength={MAX_BODY_LENGTH} multiline
            placeholder="Write anything. Only you will see this." placeholderTextColor={c.muted} accessibilityLabel="Journal text" testID="editor-body"
            maxFontSizeMultiplier={2} scrollEnabled={false}
            style={{ minHeight: 220, fontFamily: fonts.body, fontSize: 17, lineHeight: 26, color: c.text, textAlignVertical: 'top' }} />
          {isEdit ? <Button kind="quiet" label="Delete entry" textColor={c.danger} onPress={() => setConfirm('delete')} testID="editor-delete" /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {confirm === 'discard' ? (
        <Confirm title={isEdit ? 'Discard changes?' : 'Discard this entry?'} message={isEdit ? 'Your saved entry stays as it was.' : 'What you wrote here will be removed.'}
          confirmLabel="Discard" cancelLabel="Keep writing" onCancel={() => setConfirm(null)} onConfirm={onDiscard} />
      ) : null}
      {confirm === 'delete' ? (
        <Confirm title="Delete this entry?" message="It will be removed from this phone. This can’t be undone."
          confirmLabel="Delete" cancelLabel="Cancel" onCancel={() => setConfirm(null)} onConfirm={onDelete} />
      ) : null}
    </View>
  )
}
