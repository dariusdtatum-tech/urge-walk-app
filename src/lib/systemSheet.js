// While a system sheet that Urge Walk opened itself is up (share sheet, document picker, Face ID),
// iOS marks the app 'inactive'. That is not the app switcher, so the App lock privacy cover must not
// appear: presenting anything over the share sheet breaks it (the Reset bug, Oct 16 2026).
let open = 0
export const isSystemSheetOpen = () => open > 0
export async function withSystemSheet(fn) {
  open += 1
  try { return await fn() } finally { open = Math.max(0, open - 1) }
}
