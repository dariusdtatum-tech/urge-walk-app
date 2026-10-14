import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from './theme.js'

// A progress ring (0..1) with content in the middle. Decorative: the content carries the meaning.
export function Ring({ size = 206, stroke = 10, value = 0, children, testID }) {
  const { c } = useTheme()
  const r = (size - stroke) / 2
  const len = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
      <Svg width={size} height={size} style={{ position: 'absolute' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.ringA} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size - stroke * 4 }}>{children}</View>
    </View>
  )
}
