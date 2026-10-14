import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

// True when the phone's Reduce Motion setting is on (sheets fade instead of sliding, waves stay still).
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (live) setReduced(!!v) }).catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduced(!!v))
    return () => { live = false; sub?.remove?.() }
  }, [])
  return reduced
}
// Ride it out tiles stack once text is above the largest standard size (xxxLarge ≈ 1.35).
export const STACK_FONT_SCALE = 1.35
