// Scene engine (relay #3, idea 16): one small, pure "scene state" that every Home hero reads, so new
// scenes are just art. Clean time stays the number on top; the art grows only from effort (walks and
// urges ridden out), which a reset never takes back. A reset only softens the sky for a day.

export const SOFTEN_MS = 24 * 60 * 60 * 1000

const isWalk = (w) => w.kind == null || w.kind === 'walk'

// The phone's own clock, no location: dawn 5–8, day 8–17, dusk 17–20, night otherwise.
export function timeOfDay(date) {
  const h = date.getHours()
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

// True for 24 hours after the tracker's latest reset.
export function isSoftened(hero, now) {
  const last = Array.isArray(hero?.resets) ? hero.resets.map((r) => Date.parse(r?.at)).filter(Number.isFinite) : []
  if (!last.length) return false
  const ago = now - Math.max(...last)
  return ago >= 0 && ago < SOFTEN_MS
}

// days: clean days (the number on top). walks: walks taken. ridden: every urge ridden out (walks,
// breathing, grounding, logged), all time. growth = ridden, so it only ever goes up.
export function sceneState({ days = 0, walks = [], hero = null, now = Date.now() } = {}) {
  let ridden = 0
  let walked = 0
  for (const w of walks) {
    if (!w || Date.parse(w.startedAt) > now) continue
    ridden += 1
    if (isWalk(w)) walked += 1
  }
  return {
    days: Math.max(0, Math.floor(days) || 0),
    walks: walked,
    ridden,
    growth: ridden,
    timeOfDay: timeOfDay(new Date(now)),
    softened: isSoftened(hero, now),
  }
}

// Sky tint per time of day, from palette tokens only. A recent reset gives the soft evening tone.
export function skyTone(scene) {
  if (scene.softened) return { token: 'breathePearlB', opacity: 0.35 }
  return {
    dawn: { token: 'sand', opacity: 0.9 },
    day: { token: 'surface', opacity: 0 },
    dusk: { token: 'breathePearlB', opacity: 0.25 },
    night: { token: 'bg', opacity: 0.6 },
  }[scene.timeOfDay]
}

// 0 → 1, rises with every urge ridden out and never drops (slows as it fills).
export const tideLevel = (growth) => 1 - Math.exp(-Math.max(0, growth) / 40)
