import Svg, { Path } from 'react-native-svg'

// Line icons (decorative; the button or label next to them carries the meaning).
const hide = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' }
export function WaveIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" {...hide}>
      <Path d="M2.5 13.5c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3" />
      <Path d="M2.5 17.5c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3" opacity={0.55} />
    </Svg>
  )
}
export function LeafIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...hide}>
      <Path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><Path d="M5 19l7-7" />
    </Svg>
  )
}
export function PathIcon({ color, size = 30 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...hide}>
      <Path d="M7 20c0-4 10-4 10-8s-6-4-6-8" /><Path d="M5 20h4M15 4h4" />
    </Svg>
  )
}
export function HomeIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" {...hide}>
      <Path d="M4 11l8-6.5 8 6.5V20h-5v-5h-6v5H4z" />
    </Svg>
  )
}
export function LogIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" {...hide}>
      <Path d="M6 3.5h9l3 3V20.5H6z" /><Path d="M9 10h6M9 14h6M9 18h4" />
    </Svg>
  )
}
export function JournalIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" {...hide}>
      <Path d="M12 6.5C9.5 4.5 6.5 4.5 3.5 5v13c3-.5 6-.5 8.5 1.5 2.5-2 5.5-2 8.5-1.5V5c-3-.5-6-.5-8.5 1.5zM12 6.5v13" />
    </Svg>
  )
}
export function YouIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" {...hide}>
      <Path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </Svg>
  )
}
export function CommunityIcon({ color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" {...hide}>
      <Path d="M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.3a3.5 3.5 0 010 6.4M18 14.8c1.8.8 3 2.5 3.5 5.2" />
    </Svg>
  )
}
// Two hands-around-a-heart, simplified: a heart. Used as the Reach out badge.
export function HeartIcon({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...hide}>
      <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </Svg>
  )
}
export function ChevronDownIcon({ color, size = 12 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...hide}>
      <Path d="M2.5 4.5L6 8l3.5-3.5" />
    </Svg>
  )
}
