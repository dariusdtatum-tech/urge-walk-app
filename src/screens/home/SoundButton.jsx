// Home's one sound control, shown only when You → Appearance and lock → Play with sound is on.
// Play fades in over 3 s and stops on the sound timer. If the system paused it (headphones out), it waits
// for this tap.
import { useState } from 'react'
import { Pressable } from 'react-native'
import { resolveSound, SOUNDS, timerMs } from '../../lib/ambient.js'
import { loadScenePrefs } from '../../lib/scenePrefs.js'
import { useAmbient, useAmbientState } from '../../ui/AmbientContext.js'
import { useStorage } from '../../ui/StorageContext.js'
import { T } from '../../ui/Text.jsx'
import { type, useTheme } from '../../ui/theme.js'

export function soundButtonLabel(status, name) {
  if (status === 'playing') return `Pause ${name.toLowerCase()}`
  if (status === 'paused') return `Sound paused. Tap to resume ${name.toLowerCase()}`
  return `Play ${name.toLowerCase()}`
}

export function SoundButton({ heroStyle, onlyWhenPaused = false, style }) {
  const storage = useStorage()
  const { c } = useTheme()
  const ambient = useAmbient()
  const st = useAmbientState()
  const [prefs] = useState(() => loadScenePrefs(storage))
  if (!prefs.sound || !ambient) return null
  if (onlyWhenPaused && st.status !== 'paused') return null
  const id = st.soundId ?? resolveSound(prefs.soundId, heroStyle)
  const label = soundButtonLabel(st.status, SOUNDS[id].label)
  const onPress = () => {
    if (st.status === 'playing') ambient.stop()
    else if (st.status === 'paused') ambient.resume()
    else ambient.play(id, { ms: timerMs(prefs.timer, null) })
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID="sound-button"
      style={[{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.sand }, style]}>
      <T font="semibold" size={type.sub} color={c.title}>{label}</T>
    </Pressable>
  )
}
