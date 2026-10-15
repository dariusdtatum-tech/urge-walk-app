// Android 8+ shows notifications only through a channel, and Android 13+ won't show the
// notification permission prompt until one exists. One quiet default channel covers the walk alert,
// the follow-up and the daily check-in. iOS has no channels.
export const CHANNEL_ID = 'default'
export const CHANNEL = { name: 'Reminders', importance: 3 /* AndroidImportance.DEFAULT */, sound: 'default', vibrationPattern: [0, 200], showBadge: false }

export function ensureChannel(N, os) {
  if (os !== 'android') return Promise.resolve(false)
  return N.setNotificationChannelAsync(CHANNEL_ID, { ...CHANNEL, importance: N.AndroidImportance?.DEFAULT ?? CHANNEL.importance })
    .then(() => true).catch(() => false)
}
