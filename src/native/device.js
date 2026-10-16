// Native capabilities behind one small module, so screens stay simple and tests can stub them.
import { Linking, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as SMS from 'expo-sms'
import { Contact } from 'expo-contacts'
import * as ImagePicker from 'expo-image-picker'
import * as Audio from 'expo-audio'
import * as LocalAuthentication from 'expo-local-authentication'
import * as FS from 'expo-file-system'
import { deleteAllFiles, deleteFile, makeVoice, pickPhoto, unlock } from './reasonsMedia.js'
import { composeText, pickPhoneContact } from './reachOut.js'
import * as Notifications from 'expo-notifications'
import { pickBackupFile, saveResetBackup, shareBackup } from './backupFile.js'
import { syncWalkAlert } from './walkAlert.js'
import { ensureChannel } from './channel.js'
import { authenticateApp } from './appAuth.js'
import { notificationStatus } from './notifyStatus.js'
import { makeAmbientPlayerFactory } from './ambientPlayer.js'
import { listenCheckin, syncCheckinReminder } from './checkinReminder.js'
import { cancelFollowUp, listenFollowUp, scheduleFollowUp } from './followUpNotify.js'

const native = Platform.OS === 'ios' || Platform.OS === 'android'
const voice = makeVoice(Audio, native ? FS : null, Platform)
const ambientPlayer = makeAmbientPlayerFactory(Audio)

if (native) {
  ensureChannel(Notifications, Platform.OS)
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
  // Launch self-check: notification permission + what's scheduled. Web: unknown.
  notificationStatus() { return native ? notificationStatus(Notifications) : Promise.resolve({ permission: null, scheduled: null }) },
  openSettings() { Linking.openSettings?.().catch(() => {}) },
  onCheckinReminder(cb) { return native ? listenCheckin(Notifications, cb) : () => {} },
  // Opens the Messages composer filled in; the person presses Send. Never sends by itself.
  textContact(phone, message) { return native ? composeText(SMS, Linking, phone, message) : Linking.openURL(`sms:${phone}`).then(() => 'link').catch(() => 'unavailable') },
  pickContact() { return native ? pickPhoneContact(Contact) : Promise.resolve(null) },
  // Your reasons: photo / voice note files stay in the app's own folder. unlock() → true when shown.
  pickReasonPhoto() { return pickPhoto(ImagePicker, native ? FS : null, !native) },
  startVoice() { return voice.start().catch(() => false) },
  stopVoice() { return voice.stop().catch(() => null) },
  playVoice(uri) { try { voice.play(uri) } catch { /* nothing to play */ } },
  stopPlaying() { voice.stopPlaying() },
  deleteReasonFile(uri) { if (native) deleteFile(FS, uri) },
  deleteAllReasonFiles() { if (native) deleteAllFiles(FS) },
  // Whole-app lock (Face ID / passcode). Web preview: always unlocks.
  authenticateApp(prompt) { return native ? authenticateApp(LocalAuthentication, prompt) : Promise.resolve({ ok: true }) },
  unlockReasons() { return native ? unlock(LocalAuthentication) : Promise.resolve(true) },
  shareBackup,
  saveResetBackup,
  pickBackupFile,
  openURL(url) { Linking.openURL(url).catch(() => {}) },
  // Coastal ambient loops (off by default; see src/lib/ambient.js).
  makeAmbientPlayer: ambientPlayer,
}
