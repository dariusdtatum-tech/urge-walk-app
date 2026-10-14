import { defineConfig } from 'vitest/config'

// Pure-logic tests (src/lib carried over from the PWA, src/storage adapter). Same fixed time zone
// with daylight saving as the PWA, so day-grouping tests are stable.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    env: { TZ: 'America/New_York' },
  },
})
