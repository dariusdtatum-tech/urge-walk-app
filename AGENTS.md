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

- Fuller Home (approved Oct 15 2026, rebuilt Oct 16), top to bottom: the tracker title (a 44pt sand pill with a small chevron so it reads as a picker; it opens the switcher); the hero; a fixed Last milestone / Next milestone pair (Next has a thin progress bar); nothing milestone-related goes inside the ring. Then the first-week card when it applies, and at most five cards in `HOME_CARDS` order (`src/screens/home/HomeCards.jsx`): Your why (latest saved reason, else the setup answer; hidden when locked or none) · Daily check-in · This week · Urge Map preview (links to Track) · Money kept (only when set up). Then the "Hold the center button for a quick walk" hint. `HOME_ITEMS` in `src/screens/HomeScreen.jsx` and `src/__tests__/drawer.test.jsx` enforce this. No Ride it out pill, 988 is not a Home card, no rotating quote, no "+ Add a habit".
- Home hero: the ring is the default and stays the default. ONLY the ring swipes (page 1 days clean, page 2 days and hours, page 3 Time back when estimated) with page dots under it (VoiceOver: "Clean time, page 1 of N"). Optional styles Tide, Stones and Trail (`src/screens/home/AltHeroes.jsx`) are picked in You → Appearance and lock → Home hero and saved on this phone only (`urgewalk.v1.heroPrefs`, `src/lib/heroStyle.js`, not in the backup). Each optional hero is one accessible image with a spoken summary, draws no motion, and keeps the same day count header. Never replace the ring as the default.
- App Store readiness (Oct 15 2026):
  - Wellness note (`src/lib/wellness.js`): a quiet line in onboarding and under About in You → Data and privacy. Calm wording, muted or soft text, never danger colors.
  - A fresh install starts empty. Never seed demo data in app code; render scripts seed their own. Sample data plan: /workspace/handoff/app-review-sample-data.md.
  - Bottom padding: tab screens use `useBottomSpace()`; sheets use `sheetBottomSpace`; Walk, Breathe and Ground use `useSessionBottomSpace()` (`src/ui/layout.js`). No ScrollView hard-codes a paddingBottom number (tested).
- Reset uses native alerts (`ask()` in `src/ui/ask.js`), never a custom Modal: ask, write the backup to Documents/Backups and share (`saveResetBackup`), ask again, and erase only on Erase and start again. Each run has an id, so nothing can stay stuck, and `reset-status` shows progress or the error text.
- App lock privacy cover: wrap every share sheet, document picker or Face ID call in `withSystemSheet()` (`src/lib/systemSheet.js`). They make the app 'inactive', and that must not cover the app. When the lock isn't engaged, LockCover is a plain non-touch view; it is a native Modal only while locked. Never present a Modal over a system sheet.
- Confirm (`src/ui/Confirm.jsx`) hides the Modal and runs its action on onDismiss (400ms fallback). Give step-by-step Confirms a `key`.
- App lock: turning it ON and turning it OFF both need a successful Face ID / passcode check (expo-local-authentication, device passcode fallback). A failed or cancelled check changes nothing; a cancel shows no error. Tested in `phase1.test.jsx` and `appAuth.test.js`.
- You → Progress order: hero, Walks (Walk length), Trackers, Money kept, Time back. Appearance and lock has no hero; the theme picker shows the current value.
- Gemini review 2 (Oct 15 2026), also enforced by tests:
  - Scroll padding: Progress, Track Log and Journal end with `bottomSpace(inset)` = tab bar height (`size.tabBar` 84) + bottom safe area + 24 (`src/ui/layout.js`).
  - Dark mode: no sea glass (#a9cbc0) text; use cream (#f3ede2) or cream at 70%. Sea glass is for fills, edges and the ring only. #009688, #fdfbf7 and #6b7280 are banned (`palette.test.js`); switches always pass `thumbColor`/`activeThumbColor` tokens.
  - Ground: stacked stones (`ground-stones`), left-aligned copy, step dots with the first filled. Onboarding: a flat borderless path over the wave, no crosshair and no brand mark (brand work on hold; the space stays empty), Restore uses `c.title`.
  - Track: the Week / Month / All pill sits in the Track title row on Log; on Journal "+ New entry" is a compact 44pt button in that row. The 30-day dots are labelled "Last 30 days".
  - Tracker switcher: the selected tracker is one treatment in both modes, a solid `c.action` fill with `c.onAction` text plus a check. The drawer stays (opt-in): a "Trackers" header with a 44pt close, top safe-area padding, the panel absolutely positioned at left 0 with overflow hidden.
  - Ride it out (dark): Walk and Breathe share one surface (#24395c), edge and height, with cream text.
  - Journal mood dots are flat (no stroke); the opacity is the level and the word label carries the meaning.
- The tracker switcher is a bottom sheet by default (grabber, 44x44 ✕, 48pt side-by-side + Add tracker / Edit trackers pills, Back up pill in the bottom safe area). You → Appearance and lock → Tracker switcher: Drawer / Sheet (`urgewalk.v1.switcherPrefs`) switches the title tap to the left drawer. The drawer also opens from a swipe in from Home's left edge (a strip the width of the side padding, sideways intent only; Reduce Motion fades it open instead of following the finger). It holds Reach out (top), trackers with the user's own names and day counts, + Add tracker / Edit trackers, and the backup status row (bottom). Never Ride it out, and never Premium, Plus, upgrades or prices (tested).
- You is six section rows plus "Your plan" last.

Read DESIGN-RULES.md before any UI or copy change; it overrides defaults.

- **Editorial lists (You sections, Track Log/Journal):** no stacked rounded cards. One hero stat at the top (`HeroStat`, Cormorant italic, on the background), groups under small-caps `SectionLabel`s (Plus Jakarta 12pt, tracked 0.08em; deep sea in light, cream at 70% in dark; no text anywhere is under 12pt), rows divided by hairlines (`RowGroup` + `HairlineRow` / `HairlineToggle`; navy or cream at 10%), an occasional two-up `StatPair`, and at most one flat `FeaturedPanel` per screen (sand; #182b47 at night). Soft text inside the sand panel uses `mutedSand` / `title`, never `muted` or deep sea. All in src/ui/kit.jsx; guarded by src/__tests__/editorial.test.jsx.
