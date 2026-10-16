// Onboarding answers, saved on this phone only, in urgewalk.v1.profile:
// {
//   version: 1,
//   onboardedAt: ISO | null,  // set when setup is finished (or skipped for existing users)
//   skipped: boolean,         // true = existing user, onboarding was skipped automatically
//   adultConfirmed: boolean, privacyAckAt: ISO | null,   // screen 02
//   before: { daysPerWeek: 0-7 | null, timesPerDay: 1-7 | null },  // 05, 06 (7 = "7+"); optional
//   improve: ['calm', …], improveOwn: string,            // 07 -> encouragement lines (old ids map via LEGACY_IMPROVE)
//   importance: 'critical' | 'very' | 'somewhat' | 'exploring' | null,   // 08 -> Home prominence
//   identity: 'healthy' | 'daybyday' | 'done' | 'control' | 'loved' | 'waves' | null,  // 09 -> under the tagline
//   support: 'private' | 'trusted' | 'community' | 'unsure' | null,    // 10
//   trustedName, trustedPhone,                            // 10 follow-up ("Text <name>" on Ride it out)
//   why: string,                                          // 11 -> Ride it out sheet, live walk, Breathe
//   timeBack: { hoursPerTime: 0.25-12 (default 1), moneyPerTime: number | null (opt-in, off by default) },
// }
// Trackers from screens 03-04 live in the existing habits store.
import { readObject, writeObject } from './storage.js'

export const PROFILE_KEY = 'urgewalk.v1.profile'

// The public community invite. null until a public Discord invite exists: the option shows
// "Coming soon" and can't be picked. Set it to the https://discord.gg/... link to turn it on.
export const COMMUNITY_INVITE_URL = null
export const communityAvailable = () => typeof COMMUNITY_INVITE_URL === 'string' && /^https:\/\//.test(COMMUNITY_INVITE_URL)

// Grouped, searchable list for "What are you riding out?". Picks become tracker names.
// No self-harm preset (removed Oct 16 2026 at Darius's request: too triggering). A tracker someone
// already named that way still loads as their own name, under "Your own"; 988 stays in You → Support.
export const RIDING_GROUPS = [
  { id: 'substances', label: 'Substances', items: ['Alcohol', 'Nicotine / vaping', 'Cannabis', 'Opioids', 'Stimulants', 'Benzos', 'Kratom', 'Caffeine', 'Prescription meds'] },
  { id: 'behaviors', label: 'Behaviors', items: ['Gambling', 'Sports betting', 'Porn', 'Gaming', 'Social media', 'Shopping', 'Overeating / binge', 'Doomscrolling'] },
]
export const MAX_TRACKER_NAME = 40

// "What do you want more of?", grouped Body / Mind / Life, plus one of your own (improveOwn).
export const IMPROVE_GROUPS = [
  { id: 'body', label: 'Body', items: [
    { id: 'sleep', label: 'Sleep' }, { id: 'energy', label: 'Energy' }, { id: 'fitness', label: 'Fitness' },
    { id: 'outdoors', label: 'Outdoors' }, { id: 'clearhead', label: 'Clear head' }] },
  { id: 'mind', label: 'Mind', items: [
    { id: 'calm', label: 'Calm' }, { id: 'focus', label: 'Focus' }, { id: 'selfrespect', label: 'Self-respect' },
    { id: 'confidence', label: 'Confidence' }, { id: 'creativity', label: 'Creativity' }] },
  { id: 'life', label: 'Life', items: [
    { id: 'family', label: 'Time with family' }, { id: 'friendships', label: 'Friendships' }, { id: 'money', label: 'Money saved' },
    { id: 'hobbies', label: 'Hobbies' }, { id: 'work', label: 'Work' }, { id: 'faith', label: 'Faith / prayer' }, { id: 'present', label: 'Being present' }] },
]
export const IMPROVE = IMPROVE_GROUPS.flatMap((g) => g.items)
export const MAX_IMPROVE = IMPROVE.length
export const MAX_IMPROVE_OWN = 40
// Answers saved before the grouped list (backup format 1) map onto the new chips.
export const LEGACY_IMPROVE = {
  calm: 'calm', sleep: 'sleep', money: 'money', proud: 'confidence', relationships: 'family',
  control: 'selfrespect', health: 'energy', interests: 'hobbies',
}
export const migrateImprove = (list) => (Array.isArray(list)
  ? [...new Set(list.map((x) => (IMPROVE.some((o) => o.id === x) ? x : LEGACY_IMPROVE[x])).filter(Boolean))] : [])

export const IMPORTANCE = [
  { id: 'critical', label: 'Critical', hint: 'I need help today', recap: 'Critical' },
  { id: 'very', label: 'Very', hint: 'It’s a top priority', recap: 'Very important' },
  { id: 'somewhat', label: 'Somewhat', hint: 'I want to make a change', recap: 'Somewhat important' },
  { id: 'exploring', label: 'Exploring', hint: 'I’m just looking', recap: 'Just exploring' },
]

// `home` is the line shown under the Home tagline.
export const IDENTITY = [
  { id: 'healthy', label: 'Making a healthy choice', home: 'Someone making a healthy choice' },
  { id: 'daybyday', label: 'Taking it one day at a time', home: 'Someone taking it one day at a time' },
  { id: 'done', label: 'Done feeling this way', home: 'Someone done feeling this way' },
  { id: 'control', label: 'Taking back control', home: 'Someone taking back control' },
  { id: 'loved', label: 'Doing this for people I love', home: 'Someone doing this for people I love' },
  { id: 'waves', label: 'Riding it out, wave by wave', home: 'Someone riding it out, wave by wave' },
]

export const SUPPORT = [
  { id: 'private', label: 'Private · just for me', hint: 'Nothing leaves your phone' },
  { id: 'trusted', label: 'Someone I trust', hint: 'Text one person you choose when it gets hard' },
  { id: 'community', label: 'The Urge Walk community', hint: 'Discord · 18+ · we’ll let you know' },
  { id: 'unsure', label: 'Not sure yet', hint: 'You can decide later in You' },
]

export const MAX_WHY = 140
export const MAX_TRUSTED_NAME = 30

const ids = (list) => list.map((o) => o.id)
const isISO = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s))
const cleanText = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const intIn = (n, lo, hi) => (Number.isInteger(n) && n >= lo && n <= hi ? n : null)

// ---------- Phone ----------
// Accepts what people type ("(555) 123-4567", "+44 20 7946 0958", "555.123.4567").
// Returns digits with an optional leading + (what an sms: link needs), or null if it can't be a phone number.
export function validatePhone(input) {
  if (typeof input !== 'string') return null
  const s = input.trim()
  if (!s || s.length > 30) return null
  if (!/^\+?[\d\s().-]+$/.test(s)) return null
  if ((s.match(/\+/g) || []).length > 1) return null
  const digits = s.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return (s.startsWith('+') ? '+' : '') + digits
}

// sms: link with no prefilled text. Opening it is always the user's own tap.
export function smsHref(phone) {
  const p = validatePhone(phone ?? '')
  return p ? `sms:${p}` : null
}

// ---------- Profile shape ----------

export function emptyProfile() {
  return {
    version: 1, onboardedAt: null, skipped: false, adultConfirmed: false, privacyAckAt: null,
    before: { daysPerWeek: null, timesPerDay: null }, improve: [], importance: null, identity: null,
    support: null, trustedName: '', trustedPhone: '', why: '',
    timeBack: { hoursPerTime: 1, moneyPerTime: null },
  }
}

// Clean any stored or imported value. Returns a full profile, or null if it isn't a profile at all.
export function sanitizeProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = emptyProfile()
  p.onboardedAt = isISO(raw.onboardedAt) ? new Date(raw.onboardedAt).toISOString() : null
  p.skipped = raw.skipped === true
  p.adultConfirmed = raw.adultConfirmed === true
  p.privacyAckAt = p.adultConfirmed && isISO(raw.privacyAckAt) ? new Date(raw.privacyAckAt).toISOString() : null
  const b = raw.before && typeof raw.before === 'object' ? raw.before : {}
  p.before = { daysPerWeek: intIn(b.daysPerWeek, 0, 7), timesPerDay: intIn(b.timesPerDay, 1, 7) }
  p.improve = migrateImprove(raw.improve)
  // Only written when set, so a format-1 file without it round-trips unchanged.
  const own = cleanText(raw.improveOwn, MAX_IMPROVE_OWN)
  if (own) p.improveOwn = own
  p.importance = ids(IMPORTANCE).includes(raw.importance) ? raw.importance : null
  p.identity = ids(IDENTITY).includes(raw.identity) ? raw.identity : null
  // Community can't be chosen until there's a public invite.
  p.support = ids(SUPPORT).includes(raw.support) && (raw.support !== 'community' || communityAvailable()) ? raw.support : null
  const phone = validatePhone(raw.trustedPhone ?? '')
  const name = cleanText(raw.trustedName, MAX_TRUSTED_NAME)
  // A trusted contact needs both a name and a valid number; otherwise it's dropped.
  if (p.support === 'trusted' && phone && name) {
    p.trustedName = name
    p.trustedPhone = phone
  } else if (p.support === 'trusted') {
    p.support = null
  }
  p.why = cleanText(raw.why, MAX_WHY)
  const tb = raw.timeBack && typeof raw.timeBack === 'object' ? raw.timeBack : {}
  const num = (x, lo, hi) => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x * 100) / 100 : null)
  p.timeBack = { hoursPerTime: num(tb.hoursPerTime, 0.25, 12) ?? 1, moneyPerTime: num(tb.moneyPerTime, 0.01, 100000) }
  return p
}

export function loadProfile(storage = globalThis.localStorage) {
  const raw = readObject(PROFILE_KEY, storage)
  return raw == null ? null : sanitizeProfile(raw)
}

export function saveProfile(profile, storage = globalThis.localStorage) {
  const clean = sanitizeProfile(profile)
  return clean ? writeObject(PROFILE_KEY, clean, storage) : false
}

// ---------- Who sees onboarding ----------
// New users (no profile, no data) see it. Existing users (data but no profile) skip it:
// { onboardedAt, skipped: true } is written once, so it never shows. A profile that was started
// but not finished (onboardedAt null, e.g. Redo setup was left halfway) shows it again.
// Returns true when onboarding should show.
export function resolveOnboarding({ hasData }, storage = globalThis.localStorage, now = Date.now()) {
  const profile = loadProfile(storage)
  if (profile?.onboardedAt) return false
  if (!profile && hasData) {
    saveProfile({ ...emptyProfile(), onboardedAt: new Date(now).toISOString(), skipped: true }, storage)
    return false
  }
  return true
}

// ---------- What answers power ----------

// The line under the Home tagline, or '' if not chosen.
export const identityLine = (profile) => IDENTITY.find((o) => o.id === profile?.identity)?.home ?? ''

// The "Text <name>" row on Ride it out, or null.
export function trustedContact(profile) {
  if (profile?.support !== 'trusted') return null
  const href = smsHref(profile.trustedPhone)
  return href && profile.trustedName ? { name: profile.trustedName, href } : null
}

// One tracker per pick (screen 03), all with the one start date (screen 04).
// Names that already exist (any case) aren't added twice, so Redo setup never duplicates trackers.
export function trackersFromPicks(picks, startDate, existing = [], makeId) {
  const have = new Set(existing.map((h) => h.name.trim().toLowerCase()))
  const out = []
  for (const raw of picks) {
    const name = cleanText(raw, MAX_TRACKER_NAME)
    const key = name.toLowerCase()
    if (!name || have.has(key)) continue
    have.add(key)
    out.push({ id: makeId(), name, startDate })
  }
  return out
}

// The "more of" answer as words: chips, then your own.
export const improveLabels = (p) => [...(p?.improve || []).map((id) => IMPROVE.find((o) => o.id === id)?.label).filter(Boolean), ...(p?.improveOwn ? [p.improveOwn] : [])]

export const labelFor = (list, id) => list.find((o) => o.id === id)?.label ?? ''

// Screen 10 can move on unless "Someone I trust" is picked without a name and a valid number.
export function supportValid({ support, trustedName = '', trustedPhone = '' }) {
  return support !== 'trusted' || (trustedName.trim() !== '' && validatePhone(trustedPhone) != null)
}
