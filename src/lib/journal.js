// Journal data and pure helpers.
// - urgewalk.v1.journal       { version: 1, entries: [{ id, createdAt, updatedAt, title, body, mood }] }
// - urgewalk.v1.journalDraft  the entry being written right now (autosaved on every keystroke)
// Walk notes are NOT copied here: the Journal list reads them from urgewalk.v1.walks.
import { MOOD_IDS } from './journalContent.js'
import { makeId, readList, readObject, writeList, writeObject } from './storage.js'

export const JOURNAL_KEY = 'urgewalk.v1.journal'
export const DRAFT_KEY = 'urgewalk.v1.journalDraft'
export const MAX_TITLE_LENGTH = 120
export const MAX_BODY_LENGTH = 20000

const isTime = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s))
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const mood = (m) => (MOOD_IDS.includes(m) ? m : null)

// ---------- Saved entries ----------

export function sanitizeEntries(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((e) => e && typeof e === 'object' && isTime(e.createdAt))
    .filter((e) => typeof e.title === 'string' || typeof e.body === 'string')
    .map((e) => ({
      id: typeof e.id === 'string' && e.id ? e.id : makeId(),
      createdAt: e.createdAt,
      updatedAt: isTime(e.updatedAt) ? e.updatedAt : e.createdAt,
      title: str(e.title, MAX_TITLE_LENGTH),
      body: str(e.body, MAX_BODY_LENGTH),
      mood: mood(e.mood),
    }))
}

export function loadJournal(storage = globalThis.localStorage) {
  const { items, recovered } = readList(JOURNAL_KEY, 'entries', sanitizeEntries, storage)
  return { entries: items, recovered }
}

export function saveJournal(entries, storage = globalThis.localStorage) {
  return writeList(JOURNAL_KEY, 'entries', entries, storage)
}

// ---------- Drafts ----------
// A draft is { entryId (null for a new entry), startedAt, title, body, mood }.

export function newDraft(now) {
  return { entryId: null, startedAt: new Date(now).toISOString(), title: '', body: '', mood: null }
}

export function draftFromEntry(entry) {
  return { entryId: entry.id, startedAt: entry.createdAt, title: entry.title, body: entry.body, mood: entry.mood }
}

export function isBlank(draft) {
  return draft.title.trim() === '' && draft.body.trim() === ''
}

// True if the draft differs from what's saved (or, for a new entry, has any content).
export function hasChanges(draft, entries) {
  const original = draft.entryId && entries.find((e) => e.id === draft.entryId)
  if (!original) return !isBlank(draft) || draft.mood != null
  return draft.title !== original.title || draft.body !== original.body || draft.mood !== original.mood
}

export function loadDraft(storage = globalThis.localStorage) {
  const d = readObject(DRAFT_KEY, storage)
  if (!d || typeof d !== 'object' || !isTime(d.startedAt)) return null
  return {
    entryId: typeof d.entryId === 'string' ? d.entryId : null,
    startedAt: d.startedAt,
    title: str(d.title, MAX_TITLE_LENGTH),
    body: str(d.body, MAX_BODY_LENGTH),
    mood: mood(d.mood),
  }
}

export function saveDraft(draft, storage = globalThis.localStorage) {
  return writeObject(DRAFT_KEY, draft ? { version: 1, ...draft } : null, storage)
}

export function clearDraft(storage = globalThis.localStorage) {
  return writeObject(DRAFT_KEY, null, storage)
}

// Turn a draft into a saved entry. Blank drafts are not saved.
// Returns the new entries list (unchanged if nothing to save).
export function commitDraft(entries, draft, now, idFactory = makeId) {
  const nowISO = new Date(now).toISOString()
  const fields = {
    title: draft.title.trim().slice(0, MAX_TITLE_LENGTH),
    body: draft.body.replace(/\s+$/, '').slice(0, MAX_BODY_LENGTH),
    mood: mood(draft.mood),
  }
  const existing = draft.entryId && entries.find((e) => e.id === draft.entryId)
  if (existing) {
    if (isBlank(draft)) return entries // clearing everything doesn't wipe an entry; use Delete for that
    const changed = fields.title !== existing.title || fields.body !== existing.body || fields.mood !== existing.mood
    if (!changed) return entries
    return entries.map((e) => (e.id === existing.id ? { ...e, ...fields, updatedAt: nowISO } : e))
  }
  if (isBlank(draft)) return entries
  return [...entries, { id: idFactory(), createdAt: draft.startedAt, updatedAt: nowISO, ...fields }]
}

export function deleteEntry(entries, id) {
  return entries.filter((e) => e.id !== id)
}

// ---------- The Journal list ----------

// Journal entries + walks that have a note, as one list (newest first).
// Items: { kind: 'entry', id, time, entry } or { kind: 'walk', id, time, walk }
export function buildFeed(entries, walks) {
  const items = [
    ...entries.map((e) => ({ kind: 'entry', id: e.id, time: e.createdAt, entry: e })),
    ...walks
      .filter((w) => typeof w.note === 'string' && w.note.trim() !== '')
      .map((w) => ({ kind: 'walk', id: `walk-${w.id}`, time: w.startedAt, walk: w })),
  ]
  return items.sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
}

// Case-insensitive search; every word typed must appear somewhere in the item.
export function filterFeed(items, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return items
  return items.filter((item) => {
    const text = (item.kind === 'entry'
      ? `${item.entry.title}\n${item.entry.body}`
      : `walk note\n${item.walk.note}`).toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

// Put a prompt into the text: at the top if empty, otherwise on a new paragraph.
export function insertPrompt(body, prompt) {
  if (body.trim() === '') return `${prompt}\n`
  return `${body.replace(/\s+$/, '')}\n\n${prompt}\n`
}
