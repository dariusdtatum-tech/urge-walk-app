import { createContext, useContext } from 'react'
import { useColorScheme } from 'react-native'
import { palettes } from './palette.js'

// Bundled OFL fonts (assets/fonts). Body: Plus Jakarta Sans. Titles and numbers: Cormorant Garamond.
export const FONT_FILES = {
  'Jakarta-Regular': require('../../assets/fonts/PlusJakartaSans_400Regular.ttf'),
  'Jakarta-Medium': require('../../assets/fonts/PlusJakartaSans_500Medium.ttf'),
  'Jakarta-SemiBold': require('../../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
  'Jakarta-Bold': require('../../assets/fonts/PlusJakartaSans_700Bold.ttf'),
  'Cormorant-SemiBold': require('../../assets/fonts/CormorantGaramond_600SemiBold.ttf'),
  'Cormorant-Italic': require('../../assets/fonts/CormorantGaramond_500Medium_Italic.ttf'),
}
export const fonts = {
  body: 'Jakarta-Regular', medium: 'Jakarta-Medium', semibold: 'Jakarta-SemiBold', bold: 'Jakarta-Bold',
  serif: 'Cormorant-SemiBold', serifItalic: 'Cormorant-Italic',
}

// Dynamic Type: text follows the phone's text size. Text inside the fixed-size rings is capped so it
// never spills out of the circle; everything else may grow up to 2x.
export const MAX_SCALE = { body: 2, display: 1.6, ring: 1.25, ringSmall: 1.3, tab: 1.4 }

// 'system' follows the phone; tests and previews can force 'light' / 'dark'.
export const SchemeContext = createContext('system')

export function useTheme() {
  const forced = useContext(SchemeContext)
  const system = useColorScheme()
  const scheme = forced === 'light' || forced === 'dark' ? forced : system === 'dark' ? 'dark' : 'light'
  return { scheme, c: palettes[scheme], fonts }
}


// Type / space / size / radius scale lives in tokens.js (plain values, testable without React Native).
export { radius, size, space, type } from './tokens.js'
