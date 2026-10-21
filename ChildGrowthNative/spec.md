# Quest Champ Product Specification

This is the living product contract for the Quest Champ React Native app. Read it before changing behavior or design. Update it whenever a product decision changes.

## Product identity

- Name: **Quest Champ**.
- Android package: `com.questhero.app` (Quest Champ is a separate app from QuestBlox).
- Platform: Expo SDK 57 / React Native, primarily Android and Google Play.
- Backend: the separate Quest Champ Firebase project. Use Firebase Auth and Firestore only for cloud account and family data.
- Audience: young children and their parents. Language must be short, friendly, easy to pronounce, and never guilt-inducing.
- Visual direction: clean white/pale surfaces, dark navy text, blue primary action, large icons, few containers, and at least 48dp touch targets.

## Protected product invariants

Do not remove or silently change these features during redesigns:

1. A child can start locally without registration or login. Existing guest progress must migrate safely.
2. The home screen uses the original Quest Champ boy portrait in the “Small steps” banner. It remains static.
3. A normal quest-row tap opens concise details; it never edits the quest. Editing and deleting are explicit actions. Completion and deletion support Undo.
4. Children and parents can create quests from icon templates or the plus-only custom template. Quests support repeat schedules, optional reminders, notification/alarm sound, optional focus timers, and optional parent approval.
5. Focus sessions support 2, 10, 15, 30, 60, and 120 minutes. Leaving the focus screen may keep the timer running; Stop explicitly cancels it.
6. Reminder notifications offer **Start**, **Done**, and **Later · 10 min**. Focus-finished notifications offer **Finish quest** and **Later · 10 min**.
7. Completing all quests for the current local day unlocks exactly one free daily reward-wheel spin. The selected family reward is saved to the reward shelf before the reveal animation, can be claimed later, costs no coins, and cannot be re-spun that day.
8. Daily quest earnings are capped at 100 coins and distributed across that day's quests. Heroes and skins are cosmetic and never alter earning power.
9. The spendable wallet and lifetime goal progress are separate. Buying heroes, backgrounds, colors, or future skins reduces only the wallet and never reduces progress toward a family reward goal.
10. Parent-approved quests reward only once. Pending approval survives midnight until reviewed.
11. Reward goals can be set by a child or connected parent. A claimed goal is added to the reward shelf.
12. Preserve all purchased/unlocked heroes, backgrounds, colors, prizes, goals, and guest/account progress when schemas or branding change.
13. App sounds and reduced-motion controls remain available. System reduced-motion is honored. Avoid constant motion, shame, loss aversion, paid re-spins, or manipulative variable rewards.
14. My World is a persistent, child-owned town. Town progress never decays and missing a day never destroys, removes, or downgrades anything.

## Main experience

### Home

- Show the child's first name prominently, today's progress, Now/Later groups when useful, and a collapsed Done group.
- Every unfinished untimed quest has a visible Done action. Timed quests have Start or Resume.
- Use a small non-blocking coin acknowledgement per quest.
- Use the larger hero celebration only when all due quests are complete.
- After that celebration, offer/open the daily reward wheel if today's spin has not been used. Keep a visible “Spin today's reward” recovery action until it is used.

### Rewards

- Show spendable coin balance, one prominent family reward goal, a reward shelf, and secondary XP/level progress.
- Wheel rewards and completed coin-target rewards go to the shelf and remain there until marked enjoyed.
- On the wheel and winner reveal, every reward uses one dominant picture/icon and a label of no more than two words. Keep the full parent-authored description in the reward shelf; do not crowd the child's spin experience with it.

### Shop and characters

- Quest Champ is the default/main hero. Preserve the established companion roster, names, and owned state.
- Current shop categories: Heroes, Backgrounds, and Colors.
- **Roadmap — skins:** add cosmetic outfits/skins later. Design animation around one shared Quest Champ rig with swappable visual layers where practical. Skins must reuse animation states, remain child-safe, preserve the recognizable silhouette, and provide no gameplay or coin advantage.

### My World

- Navigation order is Quests, My World, Prizes, Shop.
- Keep Build Power separate from spendable coins. A new child receives 5,000 starter Build Power and earns up to 10,000 per day in direct proportion to completed due quests.
- The child drags buildings and decorations from a visual tray onto glowing plots. Tap-then-place remains available for accessibility.
- Quest Champ moves to the chosen plot and gives a brief construction reaction. Buildings have three visual levels and world state persists locally for guests and in the authenticated child's Firebase data.
- Use a scalable 2.5D isometric scene with original rounded architecture. No real-money purchase of Build Power, decay, stealing, combat, rankings, or construction waiting timers.

## Character animation contract

- In-app animation target: Rive using `@rive-app/react-native` and `react-native-nitro-modules`.
- The production Quest Champ `.riv` file must be made from the approved original hero. Its default View Model exposes numeric `motion` (`0` idle, `1` welcome, `2` focus, `3` complete, `4` all-done/dance) and numeric `skin` inputs. The app's native adapter is `RiveQuestChamp.native.tsx`.
- Idle motion is subtle and occasional (blink/breathe). Focus is calm. Complete is brief. All-done may celebrate for about two seconds. No endless dancing.
- Preserve a static/sprite fallback for web, reduced motion, loading failure, unsupported devices, and until the approved `.riv` asset exists.
- Do not pretend the existing flattened PNG is a fully rigged model. A real Rive rig requires separated layers or a carefully meshed raster, bones, weights, and an exported `.riv` asset.

## Notification character rules

- Android/iOS system notifications cannot host a live Rive animation. Use the approved static Quest Champ portrait as the large notification image and the monochrome Q as the small Android icon.
- Keep native system notification framing and action buttons for reliability and accessibility.
- When a notification opens the app, the Rive hero may animate on the destination screen. Do not implement a permanent screen overlay without a separate, explicit product decision and Android policy review.

## Data and reliability

- Date-sensitive quest logic uses the child's local calendar date, not UTC day splitting.
- Wheel eligibility, coin rewards, approval, and goals must be enforced in the store, not only hidden in UI.
- Persist local state immediately, then sync authenticated data to Firestore. Family access is UID-based and requires approved linking.
- Changing or deleting a timed quest cancels stale timer and snooze notifications.
- Reminder scheduling retains future repeat occurrences after today's quest is completed.

## Release checks

Before a Google Play build:

- Run TypeScript, project isolation, reward/wheel regression tests, web export, and Android bundle export.
- Verify notification permission, channels, sounds, static hero image, and action buttons on a real Android device.
- Verify phone, 7-inch tablet, 10-inch tablet, large text, and reduced-motion layouts.
- A Rive dependency or new `.riv` asset requires a fresh native EAS build; Expo Go/web preview is not sufficient for final validation.
