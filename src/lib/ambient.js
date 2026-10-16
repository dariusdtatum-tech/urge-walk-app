// Coastal ambient sound (relay #3, ideas 1, 7, 10). Off by default. Pure controller: the player and
// the timers are passed in, so it is tested without audio. The native player lives in
// src/native/ambientPlayer.js.
//   - fades in over 3 s, stops after the timer (10/20/30 min or the walk's length) with a 3 s fade
//   - ducks under the walk-end chime (the chime itself is unchanged)
//   - stops when the phone locks or the app goes to the background, unless a walk is running
//   - if the system pauses it (headphones unplugged, a call), it stays paused until a tap
export const SOUNDS = {
  tide: { label: 'Steady tide' },
  shore: { label: 'Shore waves' },
  wind: { label: 'Dune-grass wind' },
  rain: { label: 'Soft rain' },
}
export const PAIRED = { ring: 'rain', tide: 'tide', stones: 'shore', trail: 'wind' }
export const resolveSound = (soundId, heroStyle) => (SOUNDS[soundId] ? soundId : PAIRED[heroStyle] ?? 'rain')
export const timerMs = (timer, walkMinutes) => (timer === 'walk' ? (walkMinutes > 0 ? walkMinutes : 20) : timer) * 60000

export const VOLUME = 0.6
export const DUCK_VOLUME = 0.15
export const FADE_IN_MS = 3000
export const FADE_OUT_MS = 3000
export const DUCK_MS = 4000
const STEP_MS = 100

const realTimers = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t), now: () => Date.now() }

// makePlayer(soundId, onSystemPause) → { play(), pause(), setVolume(v), remove() } or null when unavailable.
export function createAmbient({ makePlayer, timers = realTimers } = {}) {
  let player = null
  let state = { status: 'idle', soundId: null }
  let volume = 0
  let target = VOLUME
  let fade = null
  let stopTimer = null
  let duckTimer = null
  let restoreTimer = null
  let pausing = false // true while we pause on purpose, so our own pause is not read as a system pause
  const listeners = new Set()
  const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l(state)) }
  const clear = (t) => t && timers.clearTimeout(t)

  function rampTo(to, ms, done) {
    clear(fade)
    const from = volume
    const steps = Math.max(1, Math.round(ms / STEP_MS))
    let i = 0
    const tick = () => {
      i += 1
      volume = from + (to - from) * (i / steps)
      player?.setVolume(volume)
      if (i < steps) fade = timers.setTimeout(tick, STEP_MS)
      else { fade = null; done?.() }
    }
    fade = timers.setTimeout(tick, STEP_MS)
  }

  function teardown() {
    clear(fade); clear(stopTimer); clear(duckTimer); clear(restoreTimer)
    fade = stopTimer = duckTimer = restoreTimer = null
    if (player) { pausing = true; try { player.pause(); player.remove() } catch { /* already gone */ } pausing = false }
    player = null
    volume = 0
  }

  function onSystemPause() {
    if (pausing || state.status !== 'playing') return
    clear(fade); fade = null
    set({ status: 'paused' }) // headphones out or an interruption: wait for a tap
  }

  return {
    get state() { return state },
    subscribe(l) { listeners.add(l); return () => listeners.delete(l) },
    // ms: how long to play. duckAt: a time (ms since epoch) when the walk-end chime plays.
    play(soundId, { ms = 20 * 60000, duckAt = null } = {}) {
      teardown()
      player = makePlayer ? makePlayer(soundId, onSystemPause) : null
      if (!player) { set({ status: 'idle', soundId: null }); return false }
      target = VOLUME
      player.setVolume(0)
      player.play()
      set({ status: 'playing', soundId })
      rampTo(target, FADE_IN_MS)
      stopTimer = timers.setTimeout(() => this.stop(), Math.max(0, ms - FADE_OUT_MS))
      if (duckAt != null) {
        const wait = duckAt - timers.now()
        if (wait >= 0 && wait < ms) duckTimer = timers.setTimeout(() => this.duck(), wait)
      }
      return true
    },
    stop({ fade: soft = true } = {}) {
      if (!player) { if (state.status !== 'idle') set({ status: 'idle', soundId: null }); return }
      if (!soft || state.status !== 'playing') { teardown(); set({ status: 'idle', soundId: null }); return }
      clear(stopTimer); stopTimer = null
      rampTo(0, FADE_OUT_MS, () => { teardown(); set({ status: 'idle', soundId: null }) })
    },
    // Only ever called from a tap.
    resume() {
      if (!player || state.status !== 'paused') return
      player.play()
      set({ status: 'playing' })
      rampTo(target, FADE_IN_MS)
    },
    duck(ms = DUCK_MS) {
      if (!player || state.status !== 'playing') return
      target = DUCK_VOLUME
      rampTo(DUCK_VOLUME, 300)
      clear(restoreTimer)
      restoreTimer = timers.setTimeout(() => { target = VOLUME; if (state.status === 'playing') rampTo(VOLUME, 1000) }, ms)
    },
    // App state from React Native: 'background' (locked, or another app) stops the sound unless a walk
    // is running. 'inactive' alone (our own share sheet, Face ID) does not.
    onAppState(appState, walkRunning) {
      if (appState === 'background' && !walkRunning) this.stop({ fade: false })
    },
  }
}
