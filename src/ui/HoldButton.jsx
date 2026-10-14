// Press and hold for at least 3 seconds. A soft wave fill shows progress; letting go early just resets.
// Screen-reader users get a plain "activate" action instead of a timed hold.
import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useDevice } from './DeviceContext.js'
import { T } from './Text.jsx'
import { useTheme } from './theme.js'

const TICK = 50

export function HoldButton({ label, doneLabel, holdMs = 3000, done = false, onDone, testID }) {
  const { c } = useTheme()
  const device = useDevice()
  const [progress, setProgress] = useState(done ? 1 : 0)
  const timer = useRef(null)
  const start = useRef(0)
  const ms = Math.max(3000, holdMs) // never shorter than 3 seconds
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null }
  useEffect(() => stop, [])
  const finish = () => { stop(); setProgress(1); device.tap(); onDone?.() }
  function pressIn() {
    if (done) return
    stop()
    start.current = Date.now()
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start.current) / ms)
      setProgress(p)
      if (p >= 1) finish()
    }, TICK)
  }
  function pressOut() { if (!done && progress < 1) { stop(); setProgress(0) } }
  const filled = done || progress >= 1
  return (
    <Pressable onPressIn={pressIn} onPressOut={pressOut} testID={testID} disabled={done}
      accessibilityRole="button" accessibilityLabel={filled ? doneLabel : `${label}. Hold for 3 seconds.`} accessibilityState={{ disabled: done }}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (!done) finish() }}
      style={{ minHeight: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1.5, borderColor: c.title, justifyContent: 'center' }}>
      {/* The wave fill sits under the label; holdFill keeps the title colour AA in light and dark. */}
      <View testID={testID ? `${testID}-fill` : undefined} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round((filled ? 1 : progress) * 100)}%`, backgroundColor: c.holdFill }} />
      {!filled && progress > 0 ? (
        <Svg width={10} height="100%" viewBox="0 0 10 56" preserveAspectRatio="none" style={{ position: 'absolute', left: `${Math.round(progress * 100)}%`, top: 0, bottom: 0 }}>
          <Path d="M0 0 C 7 9, 7 19, 0 28 C 7 37, 7 47, 0 56 Z" fill={c.holdFill} />
        </Svg>
      ) : null}
      <T font="semibold" size={16} color={c.title} style={{ textAlign: 'center', paddingHorizontal: 16 }}>{filled ? doneLabel : label}</T>
    </Pressable>
  )
}
