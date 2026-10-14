import { describe, expect, it } from 'vitest'
import { applyBackup, buildBackup, validateBackup } from './backup.js'
import {
  CRISIS_LINE, DEFAULT_MESSAGE, MAX_CONTACTS, MESSAGE_PRESETS, addContact, loadContacts, loadContactsData, removeContact,
  sanitizeContactsData, setMessage,
} from './contacts.js'

function mem(init = {}) {
  const d = { ...init }
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: (k) => { delete d[k] }, key: (i) => Object.keys(d)[i] ?? null, get length() { return Object.keys(d).length } }
}
const profileWith = (extra) => ({ 'urgewalk.v1.profile': JSON.stringify({ version: 1, onboardedAt: '2030-05-01T12:00:00.000Z', adultConfirmed: true, ...extra }) })

describe('trusted contacts', () => {
  it('up to 3 people; names and numbers are checked; no duplicates', () => {
    const s = mem()
    expect(addContact(s, { name: 'A', phone: '(555) 123-4567' })).toEqual({ ok: true })
    expect(addContact(s, { name: 'B', phone: '555 123 4567' }).error).toMatch(/already/)
    expect(addContact(s, { name: '', phone: '5551110000' }).error).toMatch(/name/)
    expect(addContact(s, { name: 'C', phone: 'call me' }).error).toMatch(/phone number/)
    addContact(s, { name: 'B', phone: '5552220000' })
    addContact(s, { name: 'C', phone: '5553330000' })
    expect(addContact(s, { name: 'D', phone: '5554440000' }).error).toMatch(/Up to 3/)
    expect(loadContacts(s).map((c) => [c.name, c.phone])).toEqual([['A', '5551234567'], ['B', '5552220000'], ['C', '5553330000']])
    expect(MAX_CONTACTS).toBe(3)
    removeContact(s, loadContacts(s)[0].id)
    expect(loadContacts(s).map((c) => c.name)).toEqual(['B', 'C'])
  })
  it('a prewritten message: preset by default, editable, capped', () => {
    const s = mem()
    expect(loadContactsData(s).message).toBe(DEFAULT_MESSAGE)
    expect(MESSAGE_PRESETS.every((m) => !/fail|relapse|!/i.test(m))).toBe(true)
    setMessage(s, '  Can you call me?  ')
    expect(loadContactsData(s).message).toBe('Can you call me?')
    setMessage(s, 'x'.repeat(300))
    expect(loadContactsData(s).message).toHaveLength(160)
  })
  it('the trusted person from setup seeds the list', () => {
    const s = mem(profileWith({ support: 'trusted', trustedName: 'Sam', trustedPhone: '5551234567' }))
    expect(loadContacts(s)).toEqual([{ id: 'trusted', name: 'Sam', phone: '5551234567' }])
    removeContact(s, 'trusted')
    expect(loadContacts(s)).toEqual([]) // removing it sticks
  })
  it('988 is always available', () => { expect(CRISIS_LINE.phone).toBe('988') })
  it('sanitizes imported data; caps at 3', () => {
    const many = { contacts: [1, 2, 3, 4].map((i) => ({ name: `P${i}`, phone: `555000000${i}` })) }
    expect(sanitizeContactsData(many).contacts).toHaveLength(3)
    expect(sanitizeContactsData([1])).toBe(null)
  })
  it('contacts go in the backup only once set up, and come back on import', () => {
    const s = mem()
    expect('contacts' in buildBackup(s).data).toBe(false)
    addContact(s, { name: 'A', phone: '5551234567' })
    const v = validateBackup(JSON.stringify(buildBackup(s)))
    const t = mem()
    applyBackup(v.backup, t)
    expect(loadContacts(t).map((c) => c.name)).toEqual(['A'])
  })
})
