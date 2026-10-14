import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import {
  applyBackup, backupFilename, buildBackup, getUndoInfo, loadBackupMeta, MAX_FILE_BYTES, recordBackup, summaryText, undoImport, validateBackup,
} from '../lib/backup.js'
import { Button } from '../ui/Button.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { useDevice } from '../ui/DeviceContext.js'
import { Card } from '../ui/Row.jsx'
import { useStorage } from '../ui/StorageContext.js'
import { T } from '../ui/Text.jsx'
import { space, type, useTheme } from '../ui/theme.js'

const formatWhen = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatDay = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Backup & restore (format 1, the same file as the PWA): Export opens the share sheet ("Save to Files"),
// Import opens the document picker, shows what's inside, and asks before replacing anything.
export function BackupScreen({ onBack, backLabel = 'Home', onRestored, clock = Date.now }) {
  const storage = useStorage()
  const device = useDevice()
  const { c } = useTheme()
  const [meta, setMeta] = useState(() => loadBackupMeta(storage))
  const [undoInfo, setUndoInfo] = useState(() => getUndoInfo(storage))
  const [message, setMessage] = useState(null) // { kind: 'ok' | 'error', text }
  const [pending, setPending] = useState(null)
  const [confirmUndo, setConfirmUndo] = useState(false)

  async function handleExport() {
    setMessage(null)
    const now = clock()
    try {
      const outcome = await device.shareBackup(JSON.stringify(buildBackup(storage, now), null, 2), backupFilename(now))
      recordBackup(now, storage)
      setMeta(loadBackupMeta(storage))
      setMessage({ kind: 'ok', text: outcome === 'downloaded' ? 'Backup file downloaded.' : 'Backup ready. Make sure you saved it somewhere safe.' })
    } catch {
      setMessage({ kind: 'error', text: 'Couldn’t create the backup file. Please try again.' })
    }
  }

  async function handleImport() {
    setMessage(null)
    let file
    try {
      file = await device.pickBackupFile()
    } catch {
      setMessage({ kind: 'error', text: 'Couldn’t read that file.' })
      return
    }
    if (!file) return
    if (file.size > MAX_FILE_BYTES) { setMessage({ kind: 'error', text: 'This file is too large to be an Urge Walk backup.' }); return }
    const result = validateBackup(file.text)
    if (!result.ok) setMessage({ kind: 'error', text: result.error })
    else setPending(result)
  }

  function handleReplace() {
    const { backup, summary } = pending
    setPending(null)
    if (applyBackup(backup, storage, clock())) {
      const text = `Backup restored: ${summaryText(summary)}.`
      if (onRestored) { onRestored(text); return }
      setUndoInfo(getUndoInfo(storage))
      setMessage({ kind: 'ok', text })
    } else {
      setMessage({ kind: 'error', text: 'Couldn’t restore the backup on this phone. Nothing was changed.' })
    }
  }

  function handleUndo() {
    setConfirmUndo(false)
    if (undoImport(storage)) { setUndoInfo(null); setMessage({ kind: 'ok', text: 'Import undone. Your previous data is back.' }) }
    else setMessage({ kind: 'error', text: 'Couldn’t undo the import.' })
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.screen, paddingBottom: 140, gap: space.section }} testID="backup">
        <Button kind="quiet" label={`‹ ${backLabel}`} onPress={onBack} testID="backup-back" style={{ alignSelf: 'flex-start', paddingHorizontal: 4 }} />
        <T accessibilityRole="header" font="serif" size={type.screenTitle} color={c.title}>Backup</T>
        <T size={15} color={c.text}>🔒 Your backup file holds everything in the app, including your private journal. Keep it somewhere safe, like iCloud Drive or the Files app, and don’t share it.</T>
        {message ? (
          <T size={15} color={message.kind === 'ok' ? c.accent : c.error} accessibilityRole={message.kind === 'ok' ? undefined : 'alert'}
            accessibilityLiveRegion="polite" testID="backup-msg">{message.text}</T>
        ) : null}
        <Card>
          <T accessibilityRole="header" font="semibold" size={18} color={c.title}>Export backup</T>
          <T size={15} color={c.text}>Saves your habits, walks, journal and settings to one file. On iPhone, choose “Save to Files”.</T>
          <T size={14} color={c.muted} testID="last-backup">{meta.lastBackupAt ? `Last backup: ${formatWhen(meta.lastBackupAt)}` : 'No backup yet'}</T>
          <Button label="Export backup" onPress={handleExport} testID="export" />
        </Card>
        <Card>
          <T accessibilityRole="header" font="semibold" size={18} color={c.title}>Restore from a backup</T>
          <T size={15} color={c.text}>Choose a backup file. You’ll see what’s in it before anything changes.</T>
          <Button kind="secondary" label="Import backup…" onPress={handleImport} testID="import" />
          {undoInfo ? (
            <View style={{ gap: 6 }}>
              <T size={14} color={c.text}>Imported by mistake? Your data from before the last import was saved.</T>
              <Button kind="quiet" label="Undo import" onPress={() => setConfirmUndo(true)} testID="undo-import" style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : null}
        </Card>
      </ScrollView>
      {pending ? (
        <Confirm title="Replace everything on this phone?" confirmLabel="Replace everything" cancelLabel="Cancel"
          message={`This backup has ${summaryText(pending.summary)}, exported ${formatDay(pending.summary.exportedAt)}.`
            + (pending.summary.skipped ? ` ${pending.summary.skipped} damaged item(s) will be skipped.` : '')
            + ' Everything currently on this phone will be replaced. A safety copy is kept so you can undo.'}
          onCancel={() => setPending(null)} onConfirm={handleReplace} />
      ) : null}
      {confirmUndo ? (
        <Confirm title="Undo the last import?" danger={false} confirmLabel="Undo import" cancelLabel="Cancel"
          message={`This puts back the data that was on this phone before the import${undoInfo?.savedAt ? ` (${formatWhen(undoInfo.savedAt)})` : ''}.`}
          onCancel={() => setConfirmUndo(false)} onConfirm={handleUndo} />
      ) : null}
    </View>
  )
}
