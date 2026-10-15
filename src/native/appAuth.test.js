import { describe, expect, test } from 'vitest'
import { authenticateApp } from './appAuth.js'

const LA = (level, success, calls = []) => ({
  getEnrolledLevelAsync: async () => level,
  authenticateAsync: async (o) => { calls.push(o); return { success } },
})

describe('app lock auth', () => {
  test('no passcode or Face ID: unavailable, never lets through', async () => {
    expect(await authenticateApp(LA(0, true))).toEqual({ ok: false, reason: 'unavailable' })
  })
  test('passcode fallback allowed; success / cancel', async () => {
    const calls = []
    expect(await authenticateApp(LA(2, true, calls))).toEqual({ ok: true })
    expect(calls[0].disableDeviceFallback).toBe(false)
    expect(await authenticateApp(LA(1, false))).toEqual({ ok: false, reason: 'failed' })
  })
  test('errors fail closed', async () => {
    expect(await authenticateApp({ getEnrolledLevelAsync: async () => { throw new Error('x') } })).toEqual({ ok: false, reason: 'failed' })
  })
})
