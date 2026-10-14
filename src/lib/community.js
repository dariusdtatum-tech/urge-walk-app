// Community, before launch: a preview of the house rules and a "tell me when it opens" choice.
// The choice stays on this phone (no network, no account). Not part of the backup file.
import { readObject, writeObject } from './storage.js'

export const COMMUNITY_NOTIFY_KEY = 'urgewalk.v1.communityNotify' // { on: boolean, at: ms }

export const COMMUNITY_RULES = [
  'Adults only (18+). Age confirmed on join.',
  'Kind and clean. No politics or religion debates.',
  'Sobriety-focused. No glorifying use, no sharing where to get it.',
  'No sexual talk or images.',
  'Zero tolerance for predatory behavior. Instant ban, reported.',
  'Moderated by real people.',
]

export const loadCommunityNotify = (storage) => readObject(COMMUNITY_NOTIFY_KEY, storage)?.on === true
export function saveCommunityNotify(on, storage, now = Date.now()) {
  return writeObject(COMMUNITY_NOTIFY_KEY, { on: Boolean(on), at: now }, storage)
}
