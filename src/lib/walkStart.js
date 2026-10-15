import { unlockAudio } from './chime.js'
import { makeId } from './storage.js'
import { WALK_MESSAGES } from './walkMessages.js'
import { loadActiveWalk, loadWalkPrefs, plannedMinutesFor, saveActiveWalk } from './walkStorage.js'
import { startWalk } from './walkTimer.js'

// Start a walk right now at the remembered length (from "Walk" in Ride it out, or a long-press on the
// center button). Call it during the tap so iOS allows the end-of-walk chime. Returns the saved walk.
export function startWalkNow(storage = globalThis.localStorage, now = Date.now(), minutes = undefined) {
  const existing = loadActiveWalk(storage)
  if (existing) return existing
  unlockAudio()
  const walk = startWalk(minutes ?? plannedMinutesFor(loadWalkPrefs(storage)), now, {
    id: makeId(),
    messageOffset: Math.floor(Math.random() * WALK_MESSAGES.length),
  })
  saveActiveWalk(walk, storage)
  return walk
}
