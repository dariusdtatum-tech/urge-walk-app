# Urge Walk (native app)

The React Native + Expo port of the Urge Walk PWA ([urge-walk](https://github.com/dariusdtatum-tech/urge-walk), frozen at tag `pwa-final-v1`).
Local-first: no accounts, no tracking, everything stays on the phone.

## Status: Milestone 1 (logic + storage, no screens yet)
- `src/lib/`: the PWA's pure logic and its tests, copied unchanged from `pwa-final-v1` (day counts, walks, journal, backup format 1, calm moments, day runs…).
  Browser-only files are left out (`useWakeLock`, `useToday`, `useSwipeDown`, `useVisualViewport`, `persist`, `theme`); `chime.js` is a no-op placeholder until native sound lands.
- `src/storage/`: a SQLite (`expo-sqlite`) store with the same `getItem / setItem / removeItem / key / length` shape the PWA's `localStorage` had,
  so the shared logic runs as-is and backup files stay format 1 (PWA ⇄ app).

## Commands
```bash
npm install
npm test           # Vitest: shared logic + SQLite adapter + PWA backup round-trip
npm run typecheck
npx expo start     # Expo Go / dev build
```

## Keeping logic in sync
`src/lib` is a copy of the PWA's `src/lib` at `pwa-final-v1`. The PWA is frozen, so changes are made here from now on.
