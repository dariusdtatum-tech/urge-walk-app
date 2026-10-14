import { createContext, useContext } from 'react'

// Haptics + walk-end notification. App passes the real device (src/native/device.js); tests pass stubs.
export const noopDevice = { tap() {}, breathTurn() {}, done() {}, syncWalkAlert: (_walk, _now) => Promise.resolve(/** @type {number | null} */ (null)) }
export const DeviceContext = createContext(noopDevice)
export const useDevice = () => useContext(DeviceContext)
