import { Text as RNText } from 'react-native'
import { MAX_SCALE, type, useTheme } from './theme.js'

// App text: bundled font, palette colour, scales with the phone's text size (capped at 2x; 1.6x for big serif).
// Big Cormorant numbers and titles cap at 1.6x so they still fit at accessibility sizes.
export function T({ style, color, font = 'body', size = type.body, max, ...rest }) {
  const { c, fonts } = useTheme()
  return (
    <RNText
      maxFontSizeMultiplier={max ?? (String(font).startsWith('serif') && size >= 28 ? MAX_SCALE.display : MAX_SCALE.body)}
      style={[{ fontFamily: fonts[font], fontSize: size, color: color ?? c.text }, style]}
      {...rest}
    />
  )
}
