// Reaching a trusted person. Nothing is ever sent by the app: Text opens the phone's own Messages
// composer already filled in (expo-sms), and the person presses Send themselves.
// `Sms`, `Linking` and `ContactApi` are injected for tests.
export async function composeText(Sms, Linking, phone, message) {
  try {
    if (await Sms.isAvailableAsync()) {
      await Sms.sendSMSAsync([phone], message)
      return 'composer'
    }
  } catch { /* fall back to an sms: link */ }
  try {
    await Linking.openURL(`sms:${phone}${message ? `&body=${encodeURIComponent(message)}` : ''}`)
    return 'link'
  } catch {
    return 'unavailable'
  }
}

// The phone's own contact picker (no address-book permission needed to pick one person).
// Returns { name, phone } or null. Anything that fails falls back to typing it in.
export async function pickPhoneContact(ContactApi) {
  try {
    const contact = await ContactApi.presentPicker()
    if (!contact) return null
    const [name, phones] = await Promise.all([contact.getFullName().catch(() => ''), contact.getPhones().catch(() => [])])
    const mobile = phones.find((p) => /mobile|iphone|cell/i.test(p.label || '')) || phones[0]
    return { name: name || '', phone: mobile?.number || '' }
  } catch {
    return null
  }
}
