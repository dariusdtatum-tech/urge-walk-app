// Photos, voice notes and the optional Face ID lock for Your reasons.
// Modules are passed in so this can be tested without a phone.
// Files live in the app's own documents folder (reasons/); they are never uploaded anywhere.

const ext = (uri, fallback) => { const m = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(uri ?? ''); return m ? m[1].toLowerCase() : fallback }

// Copy a picked or recorded file into reasons/. On web the picked uri is used as is.
export async function keepFile(FS, uri, fallbackExt, web = false) {
  if (!uri) return null
  if (web || !FS) return uri
  const dir = new FS.Directory(FS.Paths.document, 'reasons')
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
  const dest = new FS.File(dir, `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext(uri, fallbackExt)}`)
  await new FS.File(uri).copy(dest)
  return dest.uri
}

export function deleteFile(FS, uri) {
  if (!FS || !uri || !uri.startsWith('file:')) return
  try { const f = new FS.File(uri); if (f.exists) f.delete() } catch { /* already gone */ }
}

export function deleteAllFiles(FS) {
  if (!FS) return
  try { const dir = new FS.Directory(FS.Paths.document, 'reasons'); if (dir.exists) dir.delete() } catch { /* nothing to remove */ }
}

// Returns a kept uri, or null when cancelled / not allowed.
export async function pickPhoto(Picker, FS, web) {
  const perm = web ? { granted: true } : await Picker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return { uri: null, denied: true }
  const r = await Picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false })
  if (r.canceled || !r.assets?.[0]?.uri) return { uri: null }
  return { uri: await keepFile(FS, r.assets[0].uri, 'jpg', web) }
}

// One recorder at a time. start() → true when recording; stop() → { uri, durationMs } | null.
export function makeVoice(Audio, FS, Platform) {
  let rec = null
  let player = null
  let startedAt = 0
  const opts = () => {
    const p = Audio.RecordingPresets.HIGH_QUALITY
    const base = { extension: p.extension, sampleRate: p.sampleRate, numberOfChannels: p.numberOfChannels, bitRate: p.bitRate, isMeteringEnabled: false }
    return Platform.OS === 'ios' ? { ...base, ...p.ios } : Platform.OS === 'android' ? { ...base, ...p.android } : { ...base, ...p.web }
  }
  return {
    async start() {
      const perm = await Audio.requestRecordingPermissionsAsync()
      if (!perm.granted) return false
      await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      rec = new Audio.AudioModule.AudioRecorder(opts())
      await rec.prepareToRecordAsync()
      rec.record()
      startedAt = Date.now()
      return true
    },
    async stop() {
      if (!rec) return null
      const r = rec
      rec = null
      await r.stop()
      await Audio.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
      const durationMs = Date.now() - startedAt
      const uri = await keepFile(FS, r.uri, 'm4a', Platform.OS === 'web')
      try { r.release?.() } catch { /* fine */ }
      return uri ? { uri, durationMs } : null
    },
    play(uri) {
      try { player?.remove?.() } catch { /* fine */ }
      player = Audio.createAudioPlayer(uri)
      player.play()
    },
    stopPlaying() { try { player?.pause(); player?.remove?.() } catch { /* fine */ } player = null },
  }
}

// true when unlocked. Phones without Face ID / a passcode set up are let through: the lock is a
// privacy screen, and it must never keep someone from their own reasons during an urge.
export async function unlock(LA) {
  try {
    const has = await LA.hasHardwareAsync()
    const enrolled = has && (await LA.isEnrolledAsync())
    if (!enrolled) return true
    const r = await LA.authenticateAsync({ promptMessage: 'Show your reasons', cancelLabel: 'Not now', disableDeviceFallback: false })
    return Boolean(r.success)
  } catch {
    return true
  }
}
