import { describe, expect, it } from 'vitest'
import { notificationStatus } from './notifyStatus.js'

describe('notificationStatus', () => {
  it('reads permission and scheduled ids', async () => {
    const N = { getPermissionsAsync: async () => ({ granted: false, status: 'denied' }), getAllScheduledNotificationsAsync: async () => [{ identifier: 'a' }] }
    expect(await notificationStatus(N)).toEqual({ permission: 'denied', scheduled: ['a'] })
    expect(await notificationStatus({ ...N, getPermissionsAsync: async () => ({ granted: true }) })).toEqual({ permission: 'granted', scheduled: ['a'] })
  })
  it('fails quietly to unknown', async () => {
    expect(await notificationStatus({ getPermissionsAsync: async () => { throw new Error('x') } })).toEqual({ permission: null, scheduled: null })
  })
})
