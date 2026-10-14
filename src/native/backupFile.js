// Backup files on the phone: write the JSON into the cache folder and hand it to the share sheet
// ("Save to Files" on iPhone), and read one back with the document picker. On the web preview the
// file is downloaded / read through the browser instead.
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { MAX_FILE_BYTES } from '../lib/backup.js'

const isWeb = Platform.OS === 'web'

export async function shareBackup(text, filename) {
  if (isWeb) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return 'downloaded'
  }
  const file = new File(Paths.cache, filename)
  if (file.exists) file.delete()
  file.create()
  file.write(text)
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Urge Walk backup' })
  return 'shared'
}

// null when cancelled; { size, text } otherwise (text is '' when the file is too large to read).
export async function pickBackupFile() {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false })
  if (r.canceled || !r.assets?.length) return null
  const a = r.assets[0]
  const size = a.size ?? 0
  if (size > MAX_FILE_BYTES) return { size, text: '' }
  const text = isWeb && a.file ? await a.file.text() : await new File(a.uri).text()
  return { size: size || text.length, text }
}
