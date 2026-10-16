// A plain yes/no question. On the phone it is the native iOS / Android alert, which never conflicts
// with Modals, sheets or the share sheet. On the web preview it falls back to window.confirm.
// Resolves with the id of the button chosen, or null if the alert was dismissed.
import { Alert, Platform } from 'react-native'

/** @param {{ title: string, message: string, cancel: { id: string, text: string }, confirm: { id: string, text: string, destructive?: boolean } }} q */
export function ask({ title, message, cancel, confirm }) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(`${title}\n\n${message}`) : false
    return Promise.resolve(ok ? confirm.id : cancel.id)
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancel.text, style: 'cancel', onPress: () => resolve(cancel.id) },
      { text: confirm.text, style: confirm.destructive ? 'destructive' : 'default', onPress: () => resolve(confirm.id) },
    ], { cancelable: true, onDismiss: () => resolve(null) })
  })
}
