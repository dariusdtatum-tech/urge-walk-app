import { describe, expect, it } from 'vitest'
import { buildBackup } from './backup.js'
import { COMMUNITY_NOTIFY_KEY, COMMUNITY_RULES, loadCommunityNotify, saveCommunityNotify } from './community.js'

function mem() {
  const d = {}
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] }, key: (i) => Object.keys(d)[i] ?? null, get length() { return Object.keys(d).length } }
}

describe('community (pre-launch)', () => {
  it('notify defaults off and is stored on this phone only', () => {
    const s = mem()
    expect(loadCommunityNotify(s)).toBe(false)
    saveCommunityNotify(true, s, 1000)
    expect(loadCommunityNotify(s)).toBe(true)
    expect(JSON.parse(s.getItem(COMMUNITY_NOTIFY_KEY))).toEqual({ on: true, at: 1000 })
    saveCommunityNotify(false, s)
    expect(loadCommunityNotify(s)).toBe(false)
  })
  it('the choice is not in the backup file', () => {
    const s = mem()
    saveCommunityNotify(true, s)
    expect(JSON.stringify(buildBackup(s))).not.toMatch(/communityNotify/)
  })
  it('the rules are 18+, sobriety-focused and zero tolerance for predators', () => {
    const all = COMMUNITY_RULES.join(' ')
    expect(all).toMatch(/18\+/)
    expect(all).toMatch(/Sobriety-focused/)
    expect(all).toMatch(/Zero tolerance for predatory behavior/)
  })
})
