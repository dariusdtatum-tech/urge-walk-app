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
  onCheckinReminder: (_cb) => () => {},
}
export const DeviceContext = createContext(noopDevice)
export const useDevice = () => useContext(DeviceContext)
