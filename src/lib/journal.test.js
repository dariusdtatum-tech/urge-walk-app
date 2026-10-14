import { describe, expect, it } from 'vitest'
import {
  DRAFT_KEY, JOURNAL_KEY, buildFeed, clearDraft, commitDraft, deleteEntry, draftFromEntry, filterFeed,
  hasChanges, insertPrompt, loadDraft, loadJournal, newDraft, saveDraft, saveJournal,
} from './journal.js'
import { groupByDay } from './logStats.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
  }
}

const T0 = Date.parse('2026-10-07T20:30:00-04:00')
const MIN = 60000
let n = 0
const ids = () => `id${++n}`

const walk = (id, startedAt, note, result = 'yes') => ({
  id, startedAt, endedAt: startedAt, plannedMinutes: 10, actualSeconds: 600, endedEarly: false, result, note,
})

describe('journal storage', () => {
  it('round-trips entries under a versioned key', () => {
    const s = memoryStorage()
    const entries = [{ id: 'a', createdAt: '2026-10-07T12:00:00.000Z', updatedAt: '2026-10-07T12:00:00.000Z', title: 'T', body: 'B', mood: 'good' }]
    saveJournal(entries, s)
    expect(JSON.parse(s.data[JOURNAL_KEY]).version).toBe(1)
    expect(loadJournal(s)).toEqual({ entries, recovered: false })
  })

  it('backs up corrupt data and cleans bad fields', () => {
    const s = memoryStorage({ [JOURNAL_KEY]: '[[[' })
    expect(loadJournal(s)).toEqual({ entries: [], recovered: true })
    expect(Object.keys(s.data).some((k) => k.startsWith(`${JOURNAL_KEY}.corrupt-`))).toBe(true)

    const s2 = memoryStorage({ [JOURNAL_KEY]: JSON.stringify({ version: 1, entries: [
      { id: 'ok', createdAt: '2026-10-07T12:00:00.000Z', title: 'x', body: 'y', mood: 'furious' },
      { id: 'bad', createdAt: 'whenever', body: 'z' },
    ] }) })
    const { entries, recovered } = loadJournal(s2)
    expect(entries).toEqual([{ id: 'ok', createdAt: '2026-10-07T12:00:00.000Z', updatedAt: '2026-10-07T12:00:00.000Z', title: 'x', body: 'y', mood: null }])
    expect(recovered).toBe(true)
  })
})

describe('draft autosave / restore', () => {
  it('saves and restores a draft, then clears it', () => {
    const s = memoryStorage()
    const d = { ...newDraft(T0), title: 'Tonight', body: 'Half-written thou', mood: 'okay' }
    saveDraft(d, s)
    expect(loadDraft(s)).toEqual(d)
    clearDraft(s)
    expect(s.data[DRAFT_KEY]).toBeUndefined()
    expect(loadDraft(s)).toBeNull()
  })

  it('ignores a damaged draft', () => {
    expect(loadDraft(memoryStorage({ [DRAFT_KEY]: '{nope' }))).toBeNull()
    expect(loadDraft(memoryStorage({ [DRAFT_KEY]: JSON.stringify({ body: 'x' }) }))).toBeNull()
  })

  it('a new draft becomes an entry dated when writing started', () => {
    const d = { ...newDraft(T0), title: '  Check-in ', body: 'Felt steady.\n\n' }
    const entries = commitDraft([], d, T0 + 10 * MIN, ids)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      title: 'Check-in', body: 'Felt steady.', mood: null,
      createdAt: new Date(T0).toISOString(), updatedAt: new Date(T0 + 10 * MIN).toISOString(),
    })
  })

  it('blank drafts are not saved', () => {
    expect(commitDraft([], { ...newDraft(T0), body: '   ' }, T0)).toEqual([])
  })

  it('editing updates fields and updatedAt only when something changed', () => {
    const [entry] = commitDraft([], { ...newDraft(T0), body: 'one' }, T0, ids)
    const same = commitDraft([entry], draftFromEntry(entry), T0 + MIN)
    expect(same[0]).toBe(entry)
    const edited = commitDraft([entry], { ...draftFromEntry(entry), body: 'two', mood: 'great' }, T0 + 5 * MIN)
    expect(edited[0]).toMatchObject({ id: entry.id, body: 'two', mood: 'great', createdAt: entry.createdAt,
      updatedAt: new Date(T0 + 5 * MIN).toISOString() })
    // clearing all text doesn't wipe a saved entry
    expect(commitDraft([entry], { ...draftFromEntry(entry), title: '', body: '' }, T0)[0]).toBe(entry)
  })

  it('hasChanges', () => {
    const [entry] = commitDraft([], { ...newDraft(T0), body: 'one' }, T0, ids)
    expect(hasChanges(newDraft(T0), [entry])).toBe(false)
    expect(hasChanges({ ...newDraft(T0), mood: 'low' }, [entry])).toBe(true)
    expect(hasChanges(draftFromEntry(entry), [entry])).toBe(false)
    expect(hasChanges({ ...draftFromEntry(entry), body: 'one!' }, [entry])).toBe(true)
  })

  it('deleteEntry', () => {
    const entries = commitDraft(commitDraft([], { ...newDraft(T0), body: 'a' }, T0, ids), { ...newDraft(T0), body: 'b' }, T0, ids)
    expect(deleteEntry(entries, entries[0].id).map((e) => e.body)).toEqual(['b'])
  })
})

describe('merging walk notes into the list', () => {
  const entries = [
    { id: 'e1', createdAt: '2026-10-07T23:00:00.000Z', updatedAt: '2026-10-07T23:00:00.000Z', title: 'Evening', body: 'Quiet night', mood: 'good' },
    { id: 'e2', createdAt: '2026-10-05T14:00:00.000Z', updatedAt: '2026-10-05T14:00:00.000Z', title: '', body: 'Grateful for the park', mood: null },
  ]
  const walks = [
    walk('w1', '2026-10-06T22:00:00.000Z', 'Walked to the park', 'kinda'),
    walk('w2', '2026-10-07T12:00:00.000Z', ''), // no note -> not in the Journal
    walk('w3', '2026-10-07T13:00:00.000Z', '   '),
  ]

  it('includes only walks with a note, newest first, without copying data', () => {
    const feed = buildFeed(entries, walks)
    expect(feed.map((i) => i.id)).toEqual(['e1', 'walk-w1', 'e2'])
    expect(feed[1].walk).toBe(walks[0]) // same object, read straight from the walks list
  })

  it('groups by local day like the Log', () => {
    const groups = groupByDay(buildFeed(entries, walks), '2026-10-07', (i) => i.time)
    expect(groups.map((g) => [g.label, g.walks.map((i) => i.id)])).toEqual([
      ['Today', ['e1']], ['Yesterday', ['walk-w1']], ['Mon, Oct 5', ['e2']],
    ])
  })

  it('search matches titles, bodies and walk notes (all words, any case)', () => {
    const feed = buildFeed(entries, walks)
    expect(filterFeed(feed, 'PARK').map((i) => i.id)).toEqual(['walk-w1', 'e2'])
    expect(filterFeed(feed, 'grateful park').map((i) => i.id)).toEqual(['e2'])
    expect(filterFeed(feed, 'evening').map((i) => i.id)).toEqual(['e1'])
    expect(filterFeed(feed, 'walk note').map((i) => i.id)).toEqual(['walk-w1'])
    expect(filterFeed(feed, 'zebra')).toEqual([])
    expect(filterFeed(feed, '   ')).toHaveLength(3)
  })
})

describe('insertPrompt', () => {
  it('adds the prompt at the top or as a new paragraph', () => {
    expect(insertPrompt('', 'What went well today?')).toBe('What went well today?\n')
    expect(insertPrompt('Some words  \n', 'Q?')).toBe('Some words\n\nQ?\n')
  })
})
