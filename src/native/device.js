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

export const device = {
  tap() { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  breathTurn() { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}) },
  done() { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  syncWalkAlert(walk, now) { return native ? syncWalkAlert(Notifications, walk, now) : Promise.resolve(null) },
  shareBackup,
  pickBackupFile,
  openURL(url) { Linking.openURL(url).catch(() => {}) },
}
