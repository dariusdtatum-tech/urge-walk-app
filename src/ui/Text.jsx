import { createContext, useContext } from 'react'
import { Text as RNText } from 'react-native'
import { MAX_SCALE, type, useTheme } from './theme.js'

// App text: bundled font, palette colour, scales with the phone's text size (capped at 2x; 1.6x for big serif).
// Big Cormorant numbers and titles cap at 1.6x so they still fit at accessibility sizes.
// Design Check only: preview a text size (e.g. the largest accessibility size) without changing the phone.
export const PreviewFontScale = createContext(null)

export function T({ style, color, font = 'body', size = type.body, max, ...rest }) {
  const { c, fonts } = useTheme()
  const preview = useContext(PreviewFontScale)
  const cap = max ?? (String(font).startsWith('serif') && size >= 28 ? MAX_SCALE.display : MAX_SCALE.body)
  const shown = preview ? Math.round(size * Math.min(preview, cap)) : size
  return (
    <RNText
      maxFontSizeMultiplier={cap}
      {...(preview ? { allowFontScaling: false } : {})}
      style={[{ fontFamily: fonts[font], fontSize: shown, color: color ?? c.text }, style]}
      {...rest}
    />
  )
}
