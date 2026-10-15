This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- This app does **not** use Expo Router. Navigation is plain React state in `src/AppRoot.jsx`: `screen` is one of `tabs`, `walk` or `breathe`, and `tab` is one of `home`, `track`, `community` or `you`. Sheets (Ride it out, check-in, follow-up, etc.) are booleans there too.
- To add a screen, add a state value and render branch in `AppRoot.jsx`. Don't add `src/app/` or `expo-router`.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Layout limits (Option C, Gemini review Oct 2026)

- Fuller Home (approved Oct 15 2026), top to bottom: the tracker title (a 44pt pill, the switcher); the ring, where ONLY the ring swipes (page 1 days clean, page 2 days and hours like "163d 7h", page 3 Time back hours only when the estimate is set, otherwise 2 pages) with page dots right under it (VoiceOver: "Clean time, page 1 of N"); a fixed Last milestone / Next milestone pair (Next has a thin progress bar). Nothing milestone-related goes inside the ring. Then at most five cards in `HOME_CARDS` order (`src/screens/home/HomeCards.jsx`): Your why (latest saved reason, else the setup answer; hidden when locked or none) · Daily check-in · This week · Urge Map preview (free, links to Track) · Money kept (only when set up). Then the "Hold the center button for a quick walk" hint. `HOME_ITEMS` in `src/screens/HomeScreen.jsx` and `src/__tests__/drawer.test.jsx` enforce this. No Ride it out pill (the raised center tab button is the one trigger; a "Back to your walk" bar shows only while a walk runs), 988 is not a Home card, no rotating quote, no "+ Add a habit". Dark mode: small labels are cream, sea glass is for fills only. Anything new replaces a card or goes to the switcher, Track or You.
- The tracker switcher is a bottom sheet by default (grabber, 44x44 ✕, 48pt side-by-side + Add tracker / Edit trackers pills, Back up pill in the bottom safe area). You → Appearance and lock → Tracker switcher: Drawer / Sheet (`urgewalk.v1.switcherPrefs`) switches the title tap to the left drawer. The drawer also opens from a swipe in from Home's left edge (a strip the width of the side padding, sideways intent only; Reduce Motion fades it open instead of following the finger). It holds Reach out (top), trackers with the user's own names and day counts, + Add tracker / Edit trackers, and the backup status row (bottom). Never Ride it out, and never Premium, Plus, upgrades or prices (tested).
- You is six section rows plus "Your plan" last.

Read DESIGN-RULES.md before any UI or copy change; it overrides defaults.
