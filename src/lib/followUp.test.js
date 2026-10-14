import { describe, expect, it } from 'vitest'
import { buildBackup, validateBackup } from './backup.js'
import { FOLLOWUP_ANSWERS, answerFollowUp, claimFollowUp, clearPendingFollowUp, loadFollowUpEnabled, pendingFollowUp, saveFollowUpEnabled } from './followUp.js'
import { FOLLOWUP_VALUES, appendWalk, buildLoggedRecord, loadWalks } from './walkStorage.js'

function mem() {
  const d = {}
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] }, key: (i) => Object.keys(d)[i] ?? null, get length() { return Object.keys(d).length } }
}

describe('how did it go? follow-up', () => {
  it('on by default; one per urge; a new urge replaces the pending one', () => {
    const s = mem()
    expect(loadFollowUpEnabled(s)).toBe(true)
    expect(claimFollowUp('a', s, 1)).toBe(true)
    expect(claimFollowUp('a', s, 2)).toBe(false) // max one per urge
    expect(pendingFollowUp(s)).toEqual({ urgeId: 'a', at: 1 })
    expect(claimFollowUp('b', s, 3)).toBe(true)
    expect(pendingFollowUp(s)).toEqual({ urgeId: 'b', at: 3 })
  })
  it('switched off: nothing is claimed', () => {
    const s = mem()
    saveFollowUpEnabled(false, s)
    expect(loadFollowUpEnabled(s)).toBe(false)
    expect(claimFollowUp('a', s)).toBe(false)
  })
  it('the answer is saved on that entry and clears the pending follow-up', () => {
    const s = mem()
    appendWalk(buildLoggedRecord({ id: 'a', at: Date.parse('2030-05-14T12:00:00Z') }), s)
    claimFollowUp('a', s)
    expect(answerFollowUp('a', 'tough', s)).toBe('tough')
    expect(loadWalks(s).walks[0].followUp).toBe('tough')
    expect(pendingFollowUp(s)).toBe(null)
    expect(answerFollowUp('a', 'bogus', s)).toBe(null)
    expect(answerFollowUp('gone', 'skip', s)).toBe('skip') // entry deleted: nothing to update, no throw
  })
  it('the answer survives a backup round trip; records without one are unchanged', () => {
    const s = mem()
    appendWalk(buildLoggedRecord({ id: 'a', at: Date.parse('2030-05-14T12:00:00Z') }), s)
    appendWalk(buildLoggedRecord({ id: 'b', at: Date.parse('2030-05-14T13:00:00Z') }), s)
    answerFollowUp('a', 'passed', s)
    const v = validateBackup(JSON.stringify(buildBackup(s)))
    expect(v.backup.data.walks.find((w) => w.id === 'a').followUp).toBe('passed')
    expect('followUp' in v.backup.data.walks.find((w) => w.id === 'b')).toBe(false)
  })
  it('clearing pending keeps the per-urge cap', () => {
    const s = mem()
    claimFollowUp('a', s)
    clearPendingFollowUp(s)
    expect(pendingFollowUp(s)).toBe(null)
    expect(claimFollowUp('a', s)).toBe(false)
  })
  it('answers match the stored values', () => { expect(FOLLOWUP_ANSWERS).toEqual(FOLLOWUP_VALUES) })
})
