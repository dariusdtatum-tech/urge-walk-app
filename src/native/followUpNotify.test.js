import { describe, expect, it, vi } from 'vitest'
import { FOLLOWUP_CATEGORY, FOLLOWUP_ID, cancelFollowUp, listenFollowUp, readFollowUpResponse, scheduleFollowUp } from './followUpNotify.js'

const fakeN = (granted = true) => ({
  getPermissionsAsync: vi.fn(async () => ({ granted, canAskAgain: false })),
  requestPermissionsAsync: vi.fn(),
  setNotificationCategoryAsync: vi.fn(async () => {}),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  scheduleNotificationAsync: vi.fn(async () => 'x'),
})
const resp = (action, data = { kind: 'followUp', urgeId: 'u1' }) => ({ actionIdentifier: action, notification: { date: 1, request: { identifier: FOLLOWUP_ID, content: { data } } } })

describe('follow-up notification', () => {
  it('schedules one local notification ~30 min later with three actions, replacing any pending one', async () => {
    const N = fakeN()
    expect(await scheduleFollowUp(N, 'u1')).toBe(true)
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith(FOLLOWUP_ID)
    const req = N.scheduleNotificationAsync.mock.calls[0][0]
    expect(req.identifier).toBe(FOLLOWUP_ID)
    expect(req.trigger).toEqual({ type: 'timeInterval', seconds: 1800, repeats: false })
    expect(req.content).toMatchObject({ title: 'Checking in', categoryIdentifier: FOLLOWUP_CATEGORY, data: { urgeId: 'u1', kind: 'followUp' } })
    expect(N.setNotificationCategoryAsync.mock.calls[0][1].map((a) => a.buttonTitle)).toEqual(['It passed', 'Still tough', 'Skip'])
  })
  it('no permission: nothing scheduled, no throw', async () => {
    const N = fakeN(false)
    expect(await scheduleFollowUp(N, 'u1')).toBe(false)
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled()
  })
  it('wording is calm and neutral', async () => {
    const N = fakeN()
    await scheduleFollowUp(N, 'u1')
    const { title, body } = N.scheduleNotificationAsync.mock.calls[0][0].content
    expect(`${title} ${body}`).not.toMatch(/fail|relapse|slip|streak|!/i)
  })
  it('reads responses; ignores other notifications', () => {
    expect(readFollowUpResponse(resp('passed'))).toEqual({ urgeId: 'u1', action: 'passed' })
    expect(readFollowUpResponse(resp('tough'))).toEqual({ urgeId: 'u1', action: 'tough' })
    expect(readFollowUpResponse(resp('expo.modules.notifications.actions.DEFAULT'))).toEqual({ urgeId: 'u1', action: 'open' })
    expect(readFollowUpResponse(resp('passed', { kind: 'walkEnd' }))).toBe(null)
    expect(readFollowUpResponse(null)).toBe(null)
  })
  it('listens, including the cold-start response, and handles each response once', async () => {
    let listener
    const N = { getLastNotificationResponseAsync: async () => resp('skip'), addNotificationResponseReceivedListener: (f) => { listener = f; return { remove() {} } } }
    const got = []
    listenFollowUp(N, (x) => got.push(x))
    await new Promise((r) => setTimeout(r, 0))
    listener(resp('skip'))
    listener(resp('passed'))
    expect(got).toEqual([{ urgeId: 'u1', action: 'skip' }, { urgeId: 'u1', action: 'passed' }])
  })
  it('cancel never throws', async () => {
    await cancelFollowUp({ cancelScheduledNotificationAsync: async () => { throw new Error('x') } })
  })
})
