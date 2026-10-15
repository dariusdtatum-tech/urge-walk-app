// Whole-app lock check: Face ID / Touch ID with the phone's passcode as fallback.
// Returns { ok: true } | { ok: false, reason: 'unavailable' | 'failed' }. Unlike the reasons cover,
// this never lets someone through without a check: a phone with no passcode can't turn it on.
export async function authenticateApp(LA) {
  try {
    const level = await LA.getEnrolledLevelAsync()
    if (!level) return { ok: false, reason: 'unavailable' } // SecurityLevel.NONE
    const r = await LA.authenticateAsync({ promptMessage: 'Unlock Urge Walk', cancelLabel: 'Not now', disableDeviceFallback: false })
    return r.success ? { ok: true } : { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
