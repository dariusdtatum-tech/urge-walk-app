import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { size } from './tokens.js'

// Bottom padding for scrolling tab screens: tab bar height + bottom safe area + 24, so the last row
// (Progress's money total, Log's last entry, Journal's footer note) always clears the tab bar and the
// raised Ride it out button.
export const bottomSpace = (insetBottom = 0) => size.tabBar + insetBottom + 24
// The raised Ride it out button sticks up this far above the tab bar. Tab screens stop scrolling above
// it (AppRoot reserves this strip), so the last rows (Log's dots, Appearance's footer) are never under it.
export const TAB_OVERHANG = 30
export function useBottomSpace() {
  return bottomSpace(useSafeAreaInsets().bottom)
}

// Sheets and full-screen sessions (Walk, Breathe, Ground) have no tab bar: the bottom safe area + a
// little room. Sheets get 36 so the last button never meets the home indicator.
export const sheetBottomSpace = (insetBottom = 0) => insetBottom + 36
export const sessionBottomSpace = (insetBottom = 0) => insetBottom + 24
export function useSheetBottomSpace() { return sheetBottomSpace(useSafeAreaInsets().bottom) }
export function useSessionBottomSpace() { return sessionBottomSpace(useSafeAreaInsets().bottom) }
