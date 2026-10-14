// Native capabilities behind one small module, so screens stay simple and tests can stub them.
import { Linking, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { pickBackupFile, shareBackup } from './backupFile.js'
import { syncWalkAlert } from './walkAlert.js'

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
  shareBackup,
  pickBackupFile,
  openURL(url) { Linking.openURL(url).catch(() => {}) },
}
