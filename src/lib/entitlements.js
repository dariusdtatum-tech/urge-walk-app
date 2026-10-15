// The entitlement map. There's no paywall and no RevenueCat yet: every feature here is free, and
// anything on the Free forever list (content/free-features.json) must stay `free: true` with no
// entitlement. entitlements.test.js fails if one ever gets a check. Premium items (none yet) would be
// added with `free: false, entitlement: 'plus'`, on top of this list, never in place of it.
import FREE from '../content/free-features.json'

export const FREE_FOREVER = FREE
export const ENTITLEMENTS = Object.fromEntries(FREE.features.map((f) => [f.id, { free: true, entitlement: null }]))

// Can this feature be used? Free features always can, with no store or account check.
export function canUse(featureId, active = []) {
  const e = ENTITLEMENTS[featureId]
  if (!e) return false
  if (e.free) return true
  return active.includes(e.entitlement)
}
