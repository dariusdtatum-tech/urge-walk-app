import { View } from 'react-native'
import { T } from '../ui/Text.jsx'
import { useTheme } from '../ui/theme.js'

// Log, Journal and You arrive in the next milestone. Plain and honest, no placeholder features.
export function ComingSoon({ title, line }) {
  const { c } = useTheme()
  return (
    <View style={{ flex: 1, padding: 20, paddingTop: 24, gap: 10 }} testID={`tab-screen-${title.toLowerCase()}`}>
      <T accessibilityRole="header" font="serif" size={34} color={c.title}>{title}</T>
      <T size={16} color={c.text}>{line}</T>
    </View>
  )
}
