/* global jest */
// Component tests run in Node: stub the native-only modules.
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn(), activateKeepAwakeAsync: jest.fn(), deactivateKeepAwake: jest.fn() }))
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return { SafeAreaProvider: ({ children }) => children, useSafeAreaInsets: () => inset }
})
// Confirm hides first and runs its action on dismiss (see src/ui/Confirm.jsx). Tests run it right away;
// confirm.test.jsx covers the deferred path.
require('./src/ui/Confirm.jsx').confirmTiming.fallbackMs = 0
