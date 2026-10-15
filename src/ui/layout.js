import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { size } from './tokens.js'

// Bottom padding for scrolling tab screens: tab bar height + bottom safe area + 24, so the last row
// (Progress's money total, Log's last entry, Journal's footer note) always clears the tab bar and the
// raised Ride it out button.
export const bottomSpace = (insetBottom = 0) => size.tabBar + insetBottom + 24
export function useBottomSpace() {
  return bottomSpace(useSafeAreaInsets().bottom)
}
