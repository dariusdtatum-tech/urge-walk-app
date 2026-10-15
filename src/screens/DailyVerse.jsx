// Daily verse card (top of You, only when turned on). No buttons, sharing, streaks or counting.
// Long-press the verse for the system copy menu. Read as one label: "[verse], [reference]".
import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { refLine, verseFor, verseLabel } from '../lib/verse.js'
import { useReducedMotion } from '../ui/motion.js'
import { T } from '../ui/Text.jsx'
import { radius, space, type, useTheme } from '../ui/theme.js'

export function DailyVerseCard({ date = new Date(), fadeIn = false }) {
  const { c } = useTheme()
  const reduced = useReducedMotion()
  const v = verseFor(date)
  const fade = useRef(new Animated.Value(fadeIn && !reduced ? 0 : 1)).current
  useEffect(() => {
    if (fadeIn && !reduced) Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    else fade.setValue(1)
  }, [fadeIn, reduced, fade])
  return (
    <Animated.View testID="daily-verse" accessible accessibilityLabel={verseLabel(v)}
      style={{ opacity: fade, backgroundColor: c.verseBg, borderWidth: 1, borderColor: c.verseBorder, borderRadius: radius.card, padding: space.card, gap: 6 }}>
      <T font="semibold" size={type.caption} color={c.verseLabel} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>Today’s verse</T>
      <T font="serifItalic" size={18} color={c.verseText} style={{ lineHeight: 24 }} selectable testID="daily-verse-text">{v.text}</T>
      <T size={type.footnote} color={c.verseRef} testID="daily-verse-ref">{refLine(v)}</T>
    </Animated.View>
  )
}
