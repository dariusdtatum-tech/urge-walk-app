// The follow-up notification (expo-notifications, local only). `N` is injected for tests.
// One at a time: a fixed identifier means a newer urge replaces an older pending one.
// Actions: It passed / Still tough (opens the app) / Skip. Tapping the notification opens a sheet.
import { FOLLOWUP_CONTENT, FOLLOWUP_DELAY_S, FOLLOWUP_LABELS } from '../lib/followUp.js'

export const FOLLOWUP_ID = 'urgewalk-followup'
export const FOLLOWUP_CATEGORY = 'urgewalk-followup'

export async function scheduleFollowUp(N, urgeId, seconds = FOLLOWUP_DELAY_S) {
  try {
    let perm = await N.getPermissionsAsync()
    if (!perm.granted && perm.canAskAgain !== false) perm = await N.requestPermissionsAsync()
    if (!perm.granted) return false
    await N.setNotificationCategoryAsync(FOLLOWUP_CATEGORY, [
      { identifier: 'passed', buttonTitle: FOLLOWUP_LABELS.passed, options: { opensAppToForeground: false } },
      { identifier: 'tough', buttonTitle: FOLLOWUP_LABELS.tough, options: { opensAppToForeground: true } },
      { identifier: 'skip', buttonTitle: FOLLOWUP_LABELS.skip, options: { opensAppToForeground: false } },
    ]).catch(() => {})
    await N.cancelScheduledNotificationAsync(FOLLOWUP_ID)
    await N.scheduleNotificationAsync({
      identifier: FOLLOWUP_ID,
      content: { ...FOLLOWUP_CONTENT, data: { urgeId, kind: 'followUp' }, categoryIdentifier: FOLLOWUP_CATEGORY },
      trigger: { type: 'timeInterval', seconds, repeats: false },
    })
    return true
  } catch {
    return false
  }
}

export async function cancelFollowUp(N) {
  try { await N.cancelScheduledNotificationAsync(FOLLOWUP_ID) } catch { /* nothing pending */ }
}

// Maps a notification response to { urgeId, action }: action is 'passed' | 'tough' | 'skip' | 'open'.
export function readFollowUpResponse(response, defaultAction = 'expo.modules.notifications.actions.DEFAULT') {
  const data = response?.notification?.request?.content?.data
  if (!data || data.kind !== 'followUp' || typeof data.urgeId !== 'string') return null
  const a = response.actionIdentifier
  const action = a === 'passed' || a === 'tough' || a === 'skip' ? a : a === defaultAction ? 'open' : 'open'
  return { urgeId: data.urgeId, action }
}

// Calls cb for each follow-up response, including the one that cold-started the app. Returns unsubscribe.
export function listenFollowUp(N, cb) {
  const seen = new Set()
  const handle = (r) => {
    const key = r?.notification?.request?.identifier + ':' + r?.notification?.date + ':' + r?.actionIdentifier
    if (seen.has(key)) return
    seen.add(key)
    const parsed = readFollowUpResponse(r, N.DEFAULT_ACTION_IDENTIFIER)
    if (parsed) cb(parsed)
  }
  N.getLastNotificationResponseAsync?.().then((r) => { if (r) handle(r) }).catch(() => {})
  const sub = N.addNotificationResponseReceivedListener(handle)
  return () => sub?.remove?.()
}
