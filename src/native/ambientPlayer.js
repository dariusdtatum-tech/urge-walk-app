// expo-audio player for the bundled coastal loops (assets/sounds, see docs/SOUNDS.md).
const FILES = {
  tide: require('../../assets/sounds/steady-tide.m4a'),
  shore: require('../../assets/sounds/shore-waves.m4a'),
  wind: require('../../assets/sounds/dune-grass-wind.m4a'),
  rain: require('../../assets/sounds/soft-rain.m4a'),
}

export function makeAmbientPlayerFactory(Audio) {
  let moded = false
  return (soundId) => {
    const file = FILES[soundId]
    if (!file || !Audio?.createAudioPlayer) return null
    if (!moded) {
      moded = true
      // Mix with other audio, keep playing when locked only because the app asks (a walk is running).
      Audio.setAudioModeAsync?.({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch?.(() => {})
    }
    const p = Audio.createAudioPlayer(file)
    p.loop = true
    return {
      play: () => p.play(),
      pause: () => p.pause(),
      setVolume: (v) => { p.volume = Math.max(0, Math.min(1, v)) },
      remove: () => p.remove(),
    }
  }
}
