import { describe, expect, test, vi } from 'vitest'
import { CHANNEL_ID, ensureChannel } from './channel.js'

describe('Android notification channel', () => {
  test('created once on Android, before any permission request', async () => {
    const N = { setNotificationChannelAsync: vi.fn(async () => ({})), AndroidImportance: { DEFAULT: 3 } }
    expect(await ensureChannel(N, 'android')).toBe(true)
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(CHANNEL_ID, expect.objectContaining({ name: 'Reminders', importance: 3 }))
  })
  test('nothing on iOS; failures are quiet', async () => {
    const N = { setNotificationChannelAsync: vi.fn(async () => { throw new Error('x') }) }
    expect(await ensureChannel(N, 'ios')).toBe(false)
    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled()
    expect(await ensureChannel(N, 'android')).toBe(false)
  })
})
