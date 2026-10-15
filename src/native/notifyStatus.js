// What the launch self-check needs from expo-notifications. Never throws; unknown → nulls.
export async function notificationStatus(N) {
  try {
    const perm = await N.getPermissionsAsync()
    const scheduled = await N.getAllScheduledNotificationsAsync()
    return { permission: perm?.granted ? 'granted' : (perm?.status ?? 'undetermined'), scheduled: (scheduled ?? []).map((n) => n.identifier) }
  } catch {
    return { permission: null, scheduled: null }
  }
}
