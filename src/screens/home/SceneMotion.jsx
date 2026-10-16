// Scene motion: one slow drift (8 s loop, 3 px) for water and grass layers. Still frames when the
// phone's Reduce Motion is on or You → Appearance and lock → Still scenes is on.
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing } from 'react-native'
import { loadScenePrefs, SCENE_LOOP } from '../../lib/scenePrefs.js'
import { useReducedMotion } from '../../ui/motion.js'
import { useStorage } from '../../ui/StorageContext.js'

export function useStillScenes() {
  const storage = useStorage()
  const reduced = useReducedMotion()
  const [still] = useState(() => loadScenePrefs(storage).still)
  return reduced || still
}

export function Drift({ children, style, testID }) {
  const still = useStillScenes()
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) { x.setValue(0); return undefined }
    const half = SCENE_LOOP.periodMs / 2
    const ease = Easing.inOut(Easing.sin)
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: half, easing: ease, useNativeDriver: true }),
      Animated.timing(x, { toValue: -1, duration: half, easing: ease, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [still, x])
  const translateX = x.interpolate({ inputRange: [-1, 1], outputRange: [-SCENE_LOOP.driftPx, SCENE_LOOP.driftPx] })
  return (
    <Animated.View testID={testID} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', left: -SCENE_LOOP.driftPx - 1, right: -SCENE_LOOP.driftPx - 1, top: 0, bottom: 0 }, style, { transform: [{ translateX: still ? 0 : translateX }] }]}>
      {children}
    </Animated.View>
  )
}
