import { createContext, useContext, useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

// True when the phone's Reduce Motion setting is on (sheets fade instead of sliding, waves stay still).
// Design Check only: force Reduce Motion on for a preview.
export const PreviewReducedMotion = createContext(null)

export function useReducedMotion() {
  const forced = useContext(PreviewReducedMotion)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (live) setReduced(!!v) }).catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduced(!!v))
    return () => { live = false; sub?.remove?.() }
  }, [])
  return forced ?? reduced
}
// Ride it out tiles stack once text is above the largest standard size (xxxLarge ≈ 1.35).
export const STACK_FONT_SCALE = 1.35
