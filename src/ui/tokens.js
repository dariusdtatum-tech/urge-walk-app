// ---------- Scale tokens (density pass, Oct 2026) ----------
// One place for type sizes, spacing and component sizes. Nothing is below 12pt, every tap target
// is at least 44pt, and all text still follows Dynamic Type (MAX_SCALE above is unchanged).
export const type = {
  caption: 12, tab: 12, section: 12, ringName: 12,
  footnote: 13, rowSub: 13, rideBarSub: 13,
  sub: 14,
  body: 15, rowTitle: 15, button: 15,
  bodyLg: 16, rideBar: 16, identity: 17, why: 17, ringLabel: 17,
  rideTile: 18, statCell: 20,
  sheetTitle: 24, rideSheetTitle: 26, rideTileIcon: 26,
  screenTitle: 28, statBig: 34,
  ringDays: 56, ringDaysMd: 46, ringDaysSm: 36,
}
export const space = {
  screen: 16, section: 12, card: 14, cardDense: 12, cardGap: 8, rowX: 14, rowY: 8, sheet: 16,
}
export const size = {
  minTap: 44, row: 48, button: 48, seg: 44, logIt: 48,
  rideBar: 56, rideBarIcon: 32, rideTile: 96,
  ring: 164, ringStroke: 8,
  tabCenter: 56, tabWave: 26,
}
export const radius = { card: 16, row: 14, button: 12 }
