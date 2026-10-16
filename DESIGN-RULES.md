# Urge Walk design rules (read before any UI or copy change)

Urge Walk is a calm recovery and walking app from Evenfaring. It should feel warm, steady, quietly confident, and handmade but professional, like a well-kept coastal house. It is never loud, corporate, techy, or "AI-made". If a change makes it look like a generic template, undo it.

## Brand (locked)
- **Colors:** cream `#faf7f1`, warm sand `#f1ebe0`, navy `#24395c`. Accents: deep sea `#3f7a6b` (text only on cream or white), sea glass `#a9cbc0` (fills only, never text). Night mode: `#0f1d33` background, `#182b47` surfaces, cream text.
- **Type:** Cormorant Garamond italic for display moments (numbers, quotes, titles). Plus Jakarta Sans for everything else. Use two weights at most per screen.
- **Icon:** the A2 mark (sun, hills, tapering path) in `/icon/final`. Don't redraw, recolor, or add effects.
- **Space:** generous whitespace. Screen padding 16, card padding 14, tap targets at least 44pt. Cards are flat sand or cream with a hairline border or none at all.
- **Motion:** slow and soft (200–350 ms ease-out, gentle springs). No bounce, shake, confetti, or looping attention grabbers.

## Banned
- Box shadows, glows, or blur used as decoration. A subtle hairline or a color step is enough.
- Gradients in blue, purple, pink, or neon, and gradient text. The only gradient allowed is the soft cream-to-sand ground already in the icon.
- Emoji anywhere in the UI or in product copy.
- "LIVE", "NEW", "HOT", or pulsing badges, notification-style red dots, and count bubbles used to create urgency.
- Red, or any alarm color, for a slip, a reset, or an error. Resets use neutral navy or sand, with calm wording.
- Glassmorphism, neumorphism, 3D blobs, stock illustrations of people, and generic line-art "hero" scenes.
- Dense dashboards, stacked stat tiles, and charts on Home beyond the agreed preview.
- Ads, streak-restore or streak-freeze sales, guilt prompts, and countdown pressure.
- Centered everything. Left-align body text and keep one clear focal point per screen.

## Copy
- Plain, short, and kind. Use second person, sentence case, and no exclamation marks.
- Never shame. Say "Reset is okay, you're still here", not "You failed" or "Streak lost".
- Banned words: delve, vibe, seamless, elevate, unlock, unleash, empower, journey (as filler), supercharge, game-changer, revolutionize, cutting-edge, leverage, robust, harness, tapestry, embark, "level up", "crush it", and "next-level".
- Breathe text never mentions walking. No political or sexual references in the product. Religious content appears only in an optional faith feature the user chooses to turn on.
- 18+ audience: speak to adults, without cute mascots or baby talk.

## Before you ship
Check that the change works in both light and dark mode, that contrast is at least 4.5:1 for text (3:1 for large text and UI), that it uses only the colors above, and that it has no emoji, decorative shadows, or banned words. Test it on a stressed reader: is the next step obvious in one glance?
