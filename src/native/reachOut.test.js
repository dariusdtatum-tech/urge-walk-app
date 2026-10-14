import { describe, expect, it, vi } from 'vitest'
import { composeText, pickPhoneContact } from './reachOut.js'

describe('reach out', () => {
  it('opens the Messages composer filled in; never sends by itself', async () => {
    const Sms = { isAvailableAsync: async () => true, sendSMSAsync: vi.fn(async () => ({ result: 'cancelled' })) }
    const Linking = { openURL: vi.fn() }
    expect(await composeText(Sms, Linking, '5551234567', 'Rough moment. Can you call me?')).toBe('composer')
    expect(Sms.sendSMSAsync).toHaveBeenCalledWith(['5551234567'], 'Rough moment. Can you call me?')
    expect(Linking.openURL).not.toHaveBeenCalled()
  })
  it('falls back to an sms: link with the message', async () => {
    const Linking = { openURL: vi.fn(async () => {}) }
    expect(await composeText({ isAvailableAsync: async () => false }, Linking, '988', 'Hi there')).toBe('link')
    expect(Linking.openURL).toHaveBeenCalledWith('sms:988&body=Hi%20there')
  })
  it('picks a contact: name and the mobile number', async () => {
    const contact = { getFullName: async () => 'Sam Lee', getPhones: async () => [{ label: 'home', number: '555 000 1111' }, { label: 'mobile', number: '(555) 123-4567' }] }
    expect(await pickPhoneContact({ presentPicker: async () => contact })).toEqual({ name: 'Sam Lee', phone: '(555) 123-4567' })
    expect(await pickPhoneContact({ presentPicker: async () => null })).toBe(null)
    expect(await pickPhoneContact({ presentPicker: async () => { throw new Error('no') } })).toBe(null)
  })
})
