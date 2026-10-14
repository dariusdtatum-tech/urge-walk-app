// Trusted contacts: up to 3 people and one message written ahead of time. Kept on this phone.
// urgewalk.v1.contacts  { version: 1, contacts: [{ id, name, phone }], message }
// The app never sends anything itself: it opens the phone's own Messages composer, filled in.
// Before this list existed, setup saved one trusted person in the profile; that person seeds the list.
import { MAX_TRUSTED_NAME, loadProfile, trustedContact, validatePhone } from './profile.js'
import { makeId, readObject, writeObject } from './storage.js'

export const CONTACTS_KEY = 'urgewalk.v1.contacts'
export const MAX_CONTACTS = 3
export const MAX_MESSAGE = 160
export const MESSAGE_PRESETS = [
  'Rough moment. Can you call me?',
  'Having a hard time right now. Can you talk for a few minutes?',
  'Could use a friend right now. Text me back when you can?',
]
export const DEFAULT_MESSAGE = MESSAGE_PRESETS[0]
// Always there, whether or not any contacts are set up.
export const CRISIS_LINE = { name: '988 Suicide & Crisis Lifeline', phone: '988', note: 'Free, 24/7. Call or text.' }

const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '')

export function sanitizeContactsData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const seen = new Set()
  const contacts = []
  for (const c of Array.isArray(raw.contacts) ? raw.contacts : []) {
    const name = clean(c?.name, MAX_TRUSTED_NAME)
    const phone = validatePhone(c?.phone ?? '')
    if (!name || !phone || seen.has(phone) || contacts.length >= MAX_CONTACTS) continue
    seen.add(phone)
    contacts.push({ id: typeof c.id === 'string' && c.id ? c.id : makeId(), name, phone })
  }
  return { version: 1, contacts, message: clean(raw.message, MAX_MESSAGE) || DEFAULT_MESSAGE }
}

export function loadContactsData(storage) {
  const stored = sanitizeContactsData(readObject(CONTACTS_KEY, storage))
  if (stored) return stored
  const p = loadProfile(storage)
  const phone = trustedContact(p) ? validatePhone(p.trustedPhone) : null
  return { version: 1, contacts: phone ? [{ id: 'trusted', name: p.trustedName, phone }] : [], message: DEFAULT_MESSAGE }
}
export const saveContactsData = (data, storage) => writeObject(CONTACTS_KEY, sanitizeContactsData(data), storage)
export const loadContacts = (storage) => loadContactsData(storage).contacts

// Returns { ok, error }. Names and numbers are checked; at most 3; the same number isn't added twice.
export function addContact(storage, { name, phone }) {
  const data = loadContactsData(storage)
  const n = clean(name, MAX_TRUSTED_NAME)
  const p = validatePhone(phone ?? '')
  if (!n) return { ok: false, error: 'Add a name.' }
  if (!p) return { ok: false, error: 'That doesn’t look like a phone number.' }
  if (data.contacts.length >= MAX_CONTACTS) return { ok: false, error: `Up to ${MAX_CONTACTS} people.` }
  if (data.contacts.some((c) => c.phone === p)) return { ok: false, error: 'That number is already here.' }
  saveContactsData({ ...data, contacts: [...data.contacts, { id: makeId(), name: n, phone: p }] }, storage)
  return { ok: true }
}
export function removeContact(storage, id) {
  const data = loadContactsData(storage)
  return saveContactsData({ ...data, contacts: data.contacts.filter((c) => c.id !== id) }, storage)
}
export function setMessage(storage, message) {
  return saveContactsData({ ...loadContactsData(storage), message }, storage)
}

export const telHref = (phone) => `tel:${phone}`
