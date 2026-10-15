# Urge Walk (native app)

The React Native + Expo port of the Urge Walk PWA ([urge-walk](https://github.com/dariusdtatum-tech/urge-walk), frozen at tag `pwa-final-v1`).
Local-first: no accounts, no tracking, everything stays on the phone.

## Status: all screens built, Phase 1 done
- **Tabs:** Home, Track (Log + Journal), the Ride it out button (Walk, Breathe 4-3-6, or Just log it), Community, and You. Onboarding runs on first launch.
- **Phase 1:**
  - the how-did-it-go follow-up (off by default for new installs)
  - the daily check-in
  - trusted contacts (the Messages composer, never auto-send, with 988 always shown)
  - Your reasons (photo, voice or words, with an optional Face ID cover)
  - Money kept (off by default)
  - the Urge Map (optional tags and a weekly pattern card)
  - the opt-in Daily verse in You
- `src/lib/`: pure logic, tested with Vitest. `src/screens/` and `src/ui/`: React Native UI, tested with jest-expo and RNTL. `src/native/`: native modules behind one `device` object, so tests can stub them. `src/ui/tokens.js`: the type, space and size scale.
- `src/storage/`: a SQLite (`expo-sqlite`) store with the same `getItem / setItem / removeItem / key / length` shape the PWA's `localStorage` had, so backup files stay format 1 (PWA ⇄ app).
- `chime.js` is still a no-op: the walk-end alert is a haptic plus the notification sound.

## Commands
```bash
npm install
npm test           # Vitest (lib, native helpers) + Jest (screens)
npm run typecheck
npx expo start     # Expo Go / dev build
```

## Keeping logic in sync
`src/lib` is a copy of the PWA's `src/lib` at `pwa-final-v1`. The PWA is frozen, so changes are made here from now on.
