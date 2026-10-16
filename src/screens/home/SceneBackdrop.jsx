// Ride it out uses your scene (relay #3, idea 4): a dimmed band of your Home hero's scene along the
// bottom of Walk, Breathe and Ground. Purely decorative (hidden from VoiceOver, no touches), flat fills
// at low opacity so text above it keeps its contrast. In Breathe the water rises and falls with the breath.
import { useState } from 'react'
import { Animated, View } from 'react-native'
import Svg, { Ellipse, Path } from 'react-native-svg'
import { loadHeroStyle } from '../../lib/heroStyle.js'
import { useStorage } from '../../ui/StorageContext.js'
import { useTheme } from '../../ui/theme.js'

export const BACKDROP_H = 200
export const BACKDROP_RISE = 70 // how far the water rises with a full breath, in points
// Light: pale sea glass at 60%; dark: sea glass at 15%. Text over the band (navy / cream titles and the
// soft text color) keeps at least 7:1; session screens don't put the muted color or accent links on it.
export const backdropOpacity = (scheme) => (scheme === 'dark' ? 0.15 : 0.6)

const W = 400
const wave = (y, amp) => `M0 ${y} C ${W * 0.2} ${y - amp}, ${W * 0.35} ${y + amp}, ${W * 0.55} ${y} S ${W * 0.85} ${y - amp}, ${W} ${y} L ${W} ${BACKDROP_H + BACKDROP_RISE} L 0 ${BACKDROP_H + BACKDROP_RISE} Z`

// rise: an Animated.Value or number from 0 (low) to 1 (full breath). Default: resting halfway.
export function SceneBackdrop({ rise = 0.5 }) {
  const storage = useStorage()
  const { c, scheme } = useTheme()
  const water = scheme === 'dark' ? c.ringA : c.breathePearlB
  const stone = scheme === 'dark' ? c.ringA : c.breathePearlC
  const [style] = useState(() => loadHeroStyle(storage))
  const ty = typeof rise === 'number' ? (1 - rise) * BACKDROP_RISE : rise.interpolate({ inputRange: [0, 1], outputRange: [BACKDROP_RISE, 0] })
  const H = BACKDROP_H + BACKDROP_RISE
  return (
    <View testID="scene-backdrop" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BACKDROP_H, overflow: 'hidden', opacity: backdropOpacity(scheme) }}>
      <Animated.View testID="scene-backdrop-water" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H, transform: [{ translateY: ty }] }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {style === 'trail' ? (
            <Path d={`M0 90 C 120 60, 220 120, ${W} 80 L ${W} ${H} L 0 ${H} Z`} fill={water} />
          ) : (
            <>
              <Path d={wave(70, 8)} fill={water} opacity={0.6} />
              <Path d={wave(60, 10)} fill={water} />
            </>
          )}
        </Svg>
      </Animated.View>
      {style === 'stones' ? (
        <Svg width="100%" height={40} viewBox={`0 0 ${W} 40`} style={{ position: 'absolute', bottom: 8 }}>
          {[40, 90, 150, 215, 270, 330].map((x, i) => <Ellipse key={x} cx={x} cy={22 - (i % 2) * 4} rx={16 - (i % 3) * 2} ry={10} fill={stone} />)}
        </Svg>
      ) : null}
    </View>
  )
}
