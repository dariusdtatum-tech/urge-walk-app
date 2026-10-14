import { Text as RNText } from 'react-native'
import { MAX_SCALE, useTheme } from './theme.js'

// App text: bundled font, palette colour, scales with the phone's text size (capped at 2x).
export function T({ style, color, font = 'body', size = 16, max = MAX_SCALE.body, ...rest }) {
  const { c, fonts } = useTheme()
  return (
    <RNText
      maxFontSizeMultiplier={max}
      style={[{ fontFamily: fonts[font], fontSize: size, color: color ?? c.text }, style]}
      {...rest}
    />
  )
}
