// Whole-app lock check: Face ID / Touch ID with the phone's passcode as fallback.
// Returns { ok: true } | { ok: false, reason: 'unavailable' | 'failed' | 'cancelled' }. Unlike the reasons cover,
// this never lets someone through without a check: a phone with no passcode can't turn it on.
const CANCELS = ['user_cancel', 'system_cancel', 'app_cancel']
export async function authenticateApp(LA, promptMessage = 'Unlock Urge Walk') {
  try {
    const level = await LA.getEnrolledLevelAsync()
    if (!level) return { ok: false, reason: 'unavailable' } // SecurityLevel.NONE
    const r = await LA.authenticateAsync({ promptMessage, cancelLabel: 'Not now', disableDeviceFallback: false })
    if (r.success) return { ok: true }
    return { ok: false, reason: CANCELS.includes(r.error) ? 'cancelled' : 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
