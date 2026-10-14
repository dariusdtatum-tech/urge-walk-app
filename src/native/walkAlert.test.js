import { describe, expect, it, vi } from 'vitest'
import { pauseWalk, startWalk, extendWalk, finishWalk } from '../lib/walkTimer.js'
import { WALK_ALERT_ID, alertSecondsFor, syncWalkAlert } from './walkAlert.js'

const T = Date.parse('2030-03-04T12:00:00Z')
const fakeN = (granted = true) => ({
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  getPermissionsAsync: vi.fn(async () => ({ granted, canAskAgain: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted })),
  scheduleNotificationAsync: vi.fn(async () => 'id'),
})

describe('walk end alert', () => {
  it('seconds left for a timed walk; none for open, paused or finished walks', () => {
    const w = startWalk(10, T, { id: 'w' })
    expect(alertSecondsFor(w, T)).toBe(600)
    expect(alertSecondsFor(w, T + 61_500)).toBe(539)
    expect(alertSecondsFor(startWalk(null, T, { id: 'o' }), T)).toBeNull()
    expect(alertSecondsFor(pauseWalk(w, T + 1000), T + 2000)).toBeNull()
    expect(alertSecondsFor(finishWalk(w, T + 1000), T + 2000)).toBeNull()
  })
  it('schedules one alert at the end, replacing any earlier one', async () => {
    const N = fakeN()
    const w = startWalk(10, T, { id: 'w' })
    expect(await syncWalkAlert(N, w, T)).toBe(600)
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith(WALK_ALERT_ID)
    expect(N.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({ identifier: WALK_ALERT_ID, trigger: { type: 'timeInterval', seconds: 600, repeats: false } })
    expect(await syncWalkAlert(N, extendWalk(w), T)).toBe(900)
  })
  it('pause cancels without rescheduling', async () => {
    const N = fakeN()
    const w = startWalk(10, T, { id: 'w' })
    expect(await syncWalkAlert(N, pauseWalk(w, T + 1000), T + 1000)).toBeNull()
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalled()
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled()
  })
  it('no permission: nothing scheduled, no error', async () => {
    const N = fakeN(false)
    expect(await syncWalkAlert(N, startWalk(5, T, { id: 'w' }), T)).toBeNull()
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled()
  })
  it('the alert text is plain and never shaming', async () => {
    const { WALK_ALERT_CONTENT } = await import('./walkAlert.js')
    expect(WALK_ALERT_CONTENT.body).not.toMatch(/fail|broke|lost/i)
  })
})
