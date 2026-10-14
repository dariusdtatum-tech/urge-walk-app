// Native capabilities behind one small module, so screens stay simple and tests can stub them.
import { Linking, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as SMS from 'expo-sms'
import { Contact } from 'expo-contacts'
import { composeText, pickPhoneContact } from './reachOut.js'
import * as Notifications from 'expo-notifications'
import { pickBackupFile, shareBackup } from './backupFile.js'
import { syncWalkAlert } from './walkAlert.js'
import { listenCheckin, syncCheckinReminder } from './checkinReminder.js'
import { cancelFollowUp, listenFollowUp, scheduleFollowUp } from './followUpNotify.js'

const native = Platform.OS === 'ios' || Platform.OS === 'android'

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  })
}

// Haptics follow the phone's own System Haptics setting (iOS ignores them when it's off).
// tap: Ride it out tap (Light) · press: hold to start a walk (Medium) · done: something saved (Success).
// Reset, delete, error and undo get no haptic.
export const device = {
  tap() { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  press() { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}) },
  breathTurn() { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}) },
  done() { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  syncWalkAlert(walk, now) { return native ? syncWalkAlert(Notifications, walk, now) : Promise.resolve(null) },
  scheduleFollowUp(urgeId) { return native ? scheduleFollowUp(Notifications, urgeId) : Promise.resolve(false) },
  cancelFollowUp() { return native ? cancelFollowUp(Notifications) : Promise.resolve() },
  onFollowUp(cb) {
    if (native) return listenFollowUp(Notifications, cb)
    // Web preview has no notifications: a 'urgewalk-followup' window event stands in for a tap.
    if (typeof window === 'undefined' || !window.addEventListener) return () => {}
    const f = (e) => e?.detail?.urgeId && cb({ urgeId: e.detail.urgeId, action: e.detail.action || 'open' })
    window.addEventListener('urgewalk-followup', f)
    return () => window.removeEventListener('urgewalk-followup', f)
  },
  syncCheckinReminder(reminder) { return native ? syncCheckinReminder(Notifications, reminder) : Promise.resolve(false) },
  onCheckinReminder(cb) { return native ? listenCheckin(Notifications, cb) : () => {} },
  // Opens the Messages composer filled in; the person presses Send. Never sends by itself.
  textContact(phone, message) { return native ? composeText(SMS, Linking, phone, message) : Linking.openURL(`sms:${phone}`).then(() => 'link').catch(() => 'unavailable') },
  pickContact() { return native ? pickPhoneContact(Contact) : Promise.resolve(null) },
  shareBackup,
  pickBackupFile,
  openURL(url) { Linking.openURL(url).catch(() => {}) },
}
