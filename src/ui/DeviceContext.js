import { createContext, useContext } from 'react'

// Phone capabilities behind one small object. App passes the real device (src/native/device.js);
// tests pass stubs.
//  shareBackup(text, filename) -> 'shared' (share sheet closed) | 'downloaded' (web)
//  pickBackupFile() -> null (cancelled) | { size, text }
//  openURL(url) opens a web page, tel: or sms: link outside the app.
export const noopDevice = {
  tap() {}, press() {}, breathTurn() {}, done() {},
  syncWalkAlert: (_walk, _now) => Promise.resolve(/** @type {number | null} */ (null)),
  shareBackup: (_text, _filename) => Promise.resolve(/** @type {'shared' | 'downloaded'} */ ('shared')),
  pickBackupFile: () => Promise.resolve(/** @type {{ size: number, text: string } | null} */ (null)),
  openURL: (_url) => {},
  // The "how did it go?" follow-up (local notification). onFollowUp(cb) returns an unsubscribe.
  scheduleFollowUp: (_urgeId) => Promise.resolve(false),
  cancelFollowUp: () => Promise.resolve(),
  onFollowUp: (_cb) => () => {},
  // The optional daily check-in reminder. syncCheckinReminder(null) turns it off.
  syncCheckinReminder: (_reminder) => Promise.resolve(false),
  notificationStatus: () => Promise.resolve({ permission: null, scheduled: null }),
  openSettings: () => {},
  onCheckinReminder: (_cb) => () => {},
  // Trusted contacts: textContact opens the Messages composer (never sends); pickContact -> { name, phone } | null
  textContact: (_phone, _message) => Promise.resolve(/** @type {string} */ ('composer')),
  pickContact: () => Promise.resolve(/** @type {{ name: string, phone: string } | null} */ (null)),
  // Your reasons
  pickReasonPhoto: () => Promise.resolve(/** @type {{ uri: string | null, denied?: boolean }} */ ({ uri: null })),
  startVoice: () => Promise.resolve(false),
  stopVoice: () => Promise.resolve(/** @type {{ uri: string, durationMs: number } | null} */ (null)),
  playVoice: (_uri) => {},
  stopPlaying: () => {},
  deleteReasonFile: (_uri) => {},
  deleteAllReasonFiles: () => {},
  unlockReasons: () => Promise.resolve(true),
  authenticateApp: (/** @type {string=} */ _prompt) => Promise.resolve(/** @type {{ ok: boolean, reason?: string }} */ ({ ok: true })),
}
export const DeviceContext = createContext(noopDevice)
export const useDevice = () => useContext(DeviceContext)
