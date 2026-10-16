import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAmbient, DUCK_VOLUME, PAIRED, resolveSound, timerMs, VOLUME } from './ambient.js'

const timers = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t), now: () => Date.now() }
function fakePlayer() {
  const p = { calls: [], volume: null, systemPause: null }
  const make = vi.fn((id, onSystemPause) => {
    p.systemPause = onSystemPause
    return { play: () => p.calls.push(`play:${id}`), pause: () => p.calls.push('pause'), setVolume: (v) => { p.volume = v }, remove: () => p.calls.push('remove') }
  })
  return { p, make }
}

describe('ambient sound', () => {
  beforeEach(() => vi.useFakeTimers({ now: 0 }))
  afterEach(() => vi.useRealTimers())

  it('pairs sounds with heroes; the ring gets soft rain', () => {
    expect(PAIRED).toEqual({ ring: 'rain', tide: 'tide', stones: 'shore', trail: 'wind' })
    expect(resolveSound('paired', 'stones')).toBe('shore')
    expect(resolveSound('paired', 'ring')).toBe('rain')
    expect(resolveSound('wind', 'tide')).toBe('wind')
  })
  it('timer: 10/20/30 minutes or the walk length', () => {
    expect(timerMs(10)).toBe(600000)
    expect(timerMs('walk', 15)).toBe(900000)
    expect(timerMs('walk', null)).toBe(1200000)
  })
  it('fades in over 3 seconds, then stops on the timer with a fade', () => {
    const { p, make } = fakePlayer()
    const a = createAmbient({ makePlayer: make, timers })
    a.play('shore', { ms: 60000 })
    expect(p.calls).toEqual(['play:shore'])
    expect(p.volume).toBe(0)
    vi.advanceTimersByTime(1500)
    expect(p.volume).toBeGreaterThan(0.2); expect(p.volume).toBeLessThan(VOLUME)
    vi.advanceTimersByTime(1600)
    expect(p.volume).toBeCloseTo(VOLUME)
    vi.advanceTimersByTime(60000)
    expect(p.calls).toEqual(['play:shore', 'pause', 'remove'])
    expect(a.state.status).toBe('idle')
  })
  it('ducks under the chime and comes back', () => {
    const { p, make } = fakePlayer()
    const a = createAmbient({ makePlayer: make, timers })
    a.play('tide', { ms: 600000, duckAt: 10000 })
    vi.advanceTimersByTime(10400)
    expect(p.volume).toBeCloseTo(DUCK_VOLUME)
    vi.advanceTimersByTime(5000)
    expect(p.volume).toBeCloseTo(VOLUME)
  })
  it('stops when the phone locks, unless a walk is running; inactive alone does nothing', () => {
    const { p, make } = fakePlayer()
    const a = createAmbient({ makePlayer: make, timers })
    a.play('rain')
    a.onAppState('inactive', false)
    expect(a.state.status).toBe('playing')
    a.onAppState('background', true)
    expect(a.state.status).toBe('playing')
    a.onAppState('background', false)
    expect(a.state.status).toBe('idle')
    expect(p.calls.at(-1)).toBe('remove')
  })
  it('does nothing without a player (web preview, tests)', () => {
    const a = createAmbient({ makePlayer: null, timers })
    expect(a.play('rain')).toBe(false)
    expect(a.state.status).toBe('idle')
    a.stop(); a.duck(); a.resume()
  })
})

describe('headphones-aware sound', () => {
  beforeEach(() => vi.useFakeTimers({ now: 0 }))
  afterEach(() => vi.useRealTimers())

  it('a system pause (headphones out) stays paused; only a tap resumes', () => {
    const { p, make } = fakePlayer()
    const a = createAmbient({ makePlayer: make, timers })
    a.play('shore')
    vi.advanceTimersByTime(3200)
    p.systemPause()
    expect(a.state.status).toBe('paused')
    vi.advanceTimersByTime(60000)
    expect(p.calls).toEqual(['play:shore']) // nothing played again by itself
    a.resume()
    expect(a.state.status).toBe('playing')
    expect(p.calls).toEqual(['play:shore', 'play:shore'])
  })
  it('our own pause or stop is never read as a system pause', () => {
    const { p, make } = fakePlayer()
    const a = createAmbient({ makePlayer: make, timers })
    a.play('wind')
    a.stop({ fade: false })
    p.systemPause()
    expect(a.state.status).toBe('idle')
  })
  it('the player wrapper reports a pause it did not ask for, and ignores its own', async () => {
    const { wrapPlayer } = await import('./ambient.js')
    let listener = null
    const raw = { play: vi.fn(), pause: vi.fn(), remove: vi.fn(), addListener: (_e, f) => { listener = f; return { remove: vi.fn() } } }
    const onSystemPause = vi.fn()
    const w = wrapPlayer(raw, onSystemPause)
    w.play(); listener({ playing: true }); listener({ playing: false })
    expect(onSystemPause).toHaveBeenCalledTimes(1)
    w.play(); listener({ playing: true }); w.pause(); listener({ playing: false })
    expect(onSystemPause).toHaveBeenCalledTimes(1)
    w.play(); listener({ playing: true }); listener({ playing: false, didJustFinish: true })
    expect(onSystemPause).toHaveBeenCalledTimes(1)
  })
})
