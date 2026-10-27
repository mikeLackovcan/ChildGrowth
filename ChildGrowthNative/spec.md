# Quest Champ Product Specification

This is the living product contract for the Quest Champ React Native app. Read it before changing behavior or design. Update it whenever a product decision changes.

## Product identity

- Name: **Quest Champ**.
- Android package: `com.questhero.app` (Quest Champ is a separate app from QuestBlox).
- Platform: Expo SDK 57 / React Native, primarily Android and Google Play.
- Backend: the separate Quest Champ Firebase project. Use Firebase Auth and Firestore only for cloud account and family data.
- Audience: children ages **5–12** and their parents or guardians. Language must be short, friendly, easy to pronounce, and never guilt-inducing.
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
15. Every child-facing feature ships with matching English, Czech, Spanish, and German strings in the central localization file. Do not introduce hard-coded child-facing copy in screens.
16. Guest mode remains the privacy-first default for children. Account deletion must be available in-app and remove the signed-in user's Firebase Authentication account, profile, synced progress, and family invitations.
17. Cloud accounts are parent/guardian-only. A child never needs to provide an email address or use Google Sign-In; child play starts in local Kid mode. Any future child cloud profile must be created and controlled from an authenticated parent/guardian account, not by direct child registration.

## Main experience

- Language selection has no outer background/border container; only the selected language is highlighted. Buttons wrap with 48dp minimum targets. Sign-in uses safe-area-context on all four edges so the language row and bottom actions avoid Android system bars.
- Shared language buttons use at least 48dp targets, native language names for accessibility, and selected-state semantics. Support/privacy headings adapt below 480dp; language rows wrap on narrow layouts instead of shrinking their touch targets.
- Support instructions and the existing privacy-policy body are available in EN/CS/ES/DE and covered by locale checks. Shared support/privacy chrome provides a language selector, localized Back text and native safe-area spacing. Privacy translation preserves the existing policy and October 21, 2026 effective date; this is not a new legal certification or independent verification of its claims.
- The existing Tips route is a localized read-only family guide. It does not advertise an unimplemented premium library or present non-functional article buttons.
### Home

- First-time local children choose one original starter hero, a display nickname, and three illustrated starter quests. The chosen hero is a one-time free starter gift. The internal guest storage identity remains stable when the display nickname changes. Existing progress bypasses onboarding.
- The optional Bigger pictures setting enlarges home quest pictures and titles and can be changed in Settings without a birth date.
- Built-in starter tasks retain a template translation key; custom text remains family-authored.
- Existing Quest Map labels, hints, repeat options and accessibility text use EN/CS/ES/DE dictionaries. Family-authored goals and steps stay unchanged. This localizes the existing feature without expanding scheduling scope.

- Show the child's first name prominently, today's progress, Now/Later groups when useful, and a collapsed Done group.
- Every unfinished untimed quest has a visible Done action. Timed quests have Start or Resume.
- Use a small non-blocking coin acknowledgement per quest.
- Use the larger hero celebration only when all due quests are complete.
- After that celebration, offer/open the daily reward wheel if today's spin has not been used. Keep a visible “Spin today's reward” recovery action until it is used.

### Rewards

- An explicitly empty reward list remains empty across restart; loading must not invent default family promises. Missing legacy reward lists also load empty for parent configuration.
- With no configured nonempty reward, the day-complete celebration remains available but the wheel does not invent a prize or consume the daily spin. Home explains that rewards need to be chosen with a parent; configuring a reward restores that day's spin eligibility.
- Parent wheel drafts are scoped to the parent and selected child. Switching profiles remounts the editor; stale saves, deleted children and in-progress family operations cannot overwrite another child's choices. Empty configurations offer an editable first reward and an Add reward action. Empty lines are omitted on save. Editor copy is translated in all four languages.
- The wheel renders the actual configured family choices, including fewer or more than six. It reveals the already-saved winner without another random selection; a saved winner remains visible if the choices change before reveal. Wheel and celebration interface text uses all four locales.
- Show spendable coin balance, one prominent family reward goal, a reward shelf, and secondary XP/level progress.
- Wheel rewards and completed coin-target rewards go to the shelf and remain there until marked enjoyed.
- Reward-shelf and goal-editor interface text, validation errors, and accessibility labels use the shared EN/CS/ES/DE dictionaries. Family-written reward and goal names remain unchanged. Localization checks guard these two surfaces against hard-coded visible text.
- On the wheel and winner reveal, every reward uses one dominant picture/icon and a label of no more than two words. Keep the full parent-authored description in the reward shelf; do not crowd the child's spin experience with it.

### Shop and characters

- Quest Champ is the default/main hero. Preserve the established companion roster, names, and owned state.
- Current shop categories: Heroes, Backgrounds, and Colors.
- Shop category labels, hero personalities, background/color names, purchase dialogs, and ownership/price accessibility labels use EN/CS/ES/DE translations. Hero proper names and durable ownership IDs stay unchanged. Catalog-aware locale checks cover dynamically generated item keys.
- **Roadmap — skins:** add cosmetic outfits/skins later. Design animation around one shared Quest Champ rig with swappable visual layers where practical. Skins must reuse animation states, remain child-safe, preserve the recognizable silhouette, and provide no gameplay or coin advantage.

### My World

- Navigation order is Quests, My World, Prizes, Shop.
- Keep Build Power separate from spendable coins. A new child receives 5,000 starter Build Power and earns up to 10,000 per day in direct proportion to completed due quests.
- The child drags buildings and decorations from a visual tray onto glowing plots. Tap-then-place remains available for accessibility.
- Quest Champ moves to the chosen plot and gives a brief construction reaction. Buildings have three visual levels and world state persists locally for kids and, when enabled by a parent, in parent-controlled family data.
- Use a scalable 2.5D isometric scene with a coherent, friendly town style. The current lightweight sprite set is rendered from the CC0 KayKit City Builder Bits source pack; keep its source/license record in `assets/world/kaykit/LICENSE.txt`, and compose or modify the pieces into a recognizable Quest Champ world rather than redistributing the source pack. No real-money purchase of Build Power, decay, stealing, combat, rankings, or construction waiting timers.
- Buildings, roads, greenery, street furniture, and construction levels must feel like one visual family. Keep the rendered PNG pipeline in `scripts/render-kaykit-world.py` reproducible so Android remains performant and future town art can be regenerated consistently.
- Town interaction polish: a tap selects a tray item; an upward drag starts placement while horizontal movement remains available for tray browsing. Selected plots have a visible outline and empty plots highlight when choosing a building. Drops outside map bounds never purchase an item. Currency formatting and numbered plot accessibility labels follow EN/CS/ES/DE. Initial loading disables purchases; hero travel respects system/app reduced motion. These improvements do not constitute completion of the town-art or original-character Rive goals.
- October 25 town-polish pass: the live web app was inspected with local guest data. Conflicting gray road sprites were removed from the curved-road scene; Quest Champ is larger and uses the existing pose atlas to celebrate briefly after construction. A park placement was selected and purchased through the visible UI, reducing 5,000 to 1,000 Build Power exactly once, showing highlighted targets, a built confirmation, a persistent level-one park and an animated hero reaction. The park now has a landscaped isometric base and gains planters/benches across levels. This verifies browser interaction and composition only; native dragging, haptics, performance and the future `.riv` rig remain Android/device gates.
- The next visual pass replaces the flat procedural island with an original, compressed 2.5D town-board background while keeping every building, target, hero and touch area as a separate live layer. Idle empty plots use quiet markers and reveal large glowing plus targets only during placement. Quest Champ scales with the canvas (within a bounded mobile/tablet range) instead of becoming tiny on larger displays. The generated-art prompt and provenance are recorded in `assets/world/GENERATED_ART.md`; the asset contains no text, mascot, UI, currency or baked-in buildings.
- October 27 visual-family pass: the production board uses the v2 original floating island with exactly ten visible lawns. All ten existing plot IDs are preserved but repositioned onto those lawns, so existing saved towns are not reset. Home, Park, Bakery, School, Library, Clubhouse, Café, and Art Studio use a coherent set of original transparent Quest Champ sprites with bottom-centered placement and readable tray previews. The unrelated road car and the improvised CSS park were removed. Small planters, benches, and streetlights remain lightweight CC0 KayKit decorations. Generated sources, prompts, constraints, dimensions, and the remaining CC0 boundary are recorded in `assets/world/GENERATED_ART.md`.
- The town-polish JavaScript update was published to Android production OTA group `fb2adae8-df24-44e0-8e2f-d92232e57804` (update `01a17248-c513-79af-9408-6828d89b3c35`) on runtime `c7a52b6ae263db597caefd58b50b187302deb2b4`, matching Play build 5. This records publication, not download/application or native-device verification.

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

- October 27 workflow pass: the first screen asks **Kid** or **Parent** before exposing registration. Kid opens privacy-first local play and never sees Google/email registration; Parent opens the existing parent/guardian sign-in and registration flow. Native Google sign-out is cleared with Firebase sign-out so a later Google login can offer account selection again.
- Legacy family invitations now identify the requesting nickname and expose Accept and Decline to the recipient; the parent review surface also exposes an explicit decline action. Parent-owned managed children receive a readable, sibling-unique nickname derived from the entered name while retaining an opaque Firestore document ID for authorization.
- Family pairing supports both the existing one-use 12-character code and a Quest-Champ-only QR containing that same code. Camera permission is requested only after the child taps Scan; manual entry remains available after denial or on unsupported platforms. QR scanning adds `expo-camera`, changes the fingerprint runtime and therefore requires a new Android build before this JavaScript can be published to production users.
- Linked child devices cannot disable approval for quests they create. New child-created quests suggest an 18:00 reminder, but notification permission is requested only when the quest is saved. Parent-created quests retain the optional approval control.
- Authenticated progress saves create a durable per-profile pending marker before cloud writes. Failed/offline writes keep the marker and the latest local snapshot; launch and foreground activation retry the current snapshot. Successful same-profile writes clear the marker. This is snapshot retry, not an additive replay queue, so coin and reward mutations are never replayed as deltas.
- Alarm-style reminders use the high-importance alarm audio channel and retry on the normal notification channel if Android rejects alarm scheduling. Quest Champ does not request restricted exact-alarm permission for ordinary chores; delivery may therefore be approximate under aggressive battery saving. Expo Notifications supplies boot rescheduling support, but closed-app, reboot and battery-saver delivery still require validation on an installed Android release build.
- Parent sign-in presents Google as a full-width outlined button immediately below email Sign in/Create account. The parent/guardian confirmation sits before both actions; child guest entry remains unchanged. Existing EN/CS/ES/DE labels and accessible busy/disabled states are retained.
- October 25 follow-up: a Play tester reported the generic Google login failure. Firebase now contains both the EAS signing fingerprints and Google Play app-signing SHA-1 `B4:7D:6F:6E:73:CF:7D:0D:A6:C0:CE:9C:4F:57:53:B0:A2:F2:2C:D4` / SHA-256 `25:20:01:CF:48:4A:8F:05:D7:5D:CB:DB:FF:29:EC:72:55:34:59:29:C3:B4:74:CA:DF:50:DA:B2:EF:FC:55:AB`. The freshly downloaded `google-services.json` includes the Play-signed Android OAuth client. This native configuration requires a new Android build; Google login remains unverified until that Play-signed build is installed and tested.
- Email and Google sign-in restore the account role from its UID-addressed Firebase profile, with a UID-scoped offline cache. New cloud accounts default to parent; recorded legacy child roles are preserved. An anonymous device or an account switch during the lookup cannot adopt the result.
- Authentication failures map provider codes to localized, actionable messages instead of displaying raw diagnostics. Unknown failures never claim success. Google setup errors, cancellation, network failures and password-reset feedback are localized; failed Kid-mode entry always releases the loading state.
- Parent dashboard labels, review feedback, child statistics, hero descriptions and challenge hints use the shared four-language dictionaries. Built-in quest titles use their translation keys; family-written names and notes remain unchanged. Status feedback is inline, not browser-only alert popups. Locale regression checks include the dashboard.
- Parent layout uses native safe areas, a separate wrapping language toolbar, full-width labelled inputs and light section dividers instead of nested elevated cards. The clean dashboard starts with a horizontally scrollable child switcher, supports any number of managed children, and shows the selected child's key progress before secondary controls. Challenge, child-name and reward text wraps and grows vertically so the beginning remains readable; never pin the typing cursor to the beginning. Quest/reward status sits below its full title, and destructive bulk controls have separate full-width rows. Preserve all existing family actions and confirmation/sibling guards during layout changes.
- Parent logout is deterministic: stop using background refresh polling that can race sign-out, clear the session, and replace the route with the initial sign-in screen. Settings sign-out follows the same route contract.
- Android forms use `softwareKeyboardLayoutMode: resize`, non-translucent light status-bar configuration, keyboard-aware containers, and drag-to-dismiss scrolling. These native app-config changes require a new Android build; the JavaScript layout alone is not sufficient evidence that keyboards and system bars behave correctly on devices.
- October 25 parent-layout validation: local release checks and two focused `scripts/test-parent-layout.cjs` regressions passed. Web export succeeded. A read-only SSR fixture rendered the real dashboard/prize-editor JSX with synthetic long names, quests and rewards; German was checked at 360px without horizontal page overflow, and EN/CS/ES labels were inspected. This fixture omits several nested components and production fonts and is not an authenticated functional test. Native keyboard, dynamic input growth and large-text layout remain device checks.
- Parent destructive confirmations use native Android/iOS dialogs (browser dialogs on web). After confirmation, the account, selected child, child existence and family-operation state are checked again before deleting tasks or removing a legacy link.
- Legacy child-onboard and waiting routes render the same verified pairing screen as link-account. They do not collect parent email, simulate approval, change the active profile, or block local play behind a fictitious request.
- In-progress family pairing uses parent-issued, single-use, 15-minute codes and a credential-free anonymous device identity restricted to the paired child. Children never need an email address. Parent setup offers child-name/starter-hero creation, explicit child selection, and code generation. Kid-mode Settings makes **Enter family code** prominent; child code entry adopts confirmed cloud progress, keeps a guest backup, and saves the migrated town under the managed child ID. Both screens use EN/CS/ES/DE translations.
- Pairing failure must not replace local guest progress. Concurrent task changes or account switching during a pairing request abort adoption; newer local progress is retained. Storage writes must succeed before reporting a connected state. An unfinished device binding can be explicitly released without deleting either profile.
- Connected-device disconnect makes a durable local recovery copy before revoking the binding and signing out of the technical device identity. The child's local profile, wallet, wheel state and town remain under their existing storage identity, marked local-only. Sign-out and local reset revoke a connected device first; failed revocation must remain visible rather than falsely report success.
- Device connection state is persisted. Local-only profiles and towns neither read nor write account cloud data. A restored linked profile without an anonymous device auth identity falls back to local-only. Managed reads/writes verify the expected child ID against the device binding; another child's credentials cannot receive the current local snapshot.
- Disconnect saves a cloud baseline for later reconnection. A parent can issue a new code for the same child. For a lost or replaced phone, the parent selects that existing child and chooses **Lost or new phone**: all old device bindings and unused codes for that child are revoked, the cloud child/profile/progress remains intact, and one fresh 15-minute code is issued. The new phone restores the same child identity and progress after pairing. Reconnection preserves local changes if cloud progress is unchanged, accepts cloud changes if local progress is unchanged, and refuses divergent histories without summing balances or overwriting either copy. Missing baselines require conflict handling rather than replaying an old import. Child devices do not show parent-account deletion. Firestore rules are deployed; live pairing and end-to-end Android verification remain pending.
- October 25 recovery verification: all 11 synthetic Firestore emulator tests passed, including old-device revocation, same-child restoration on a new anonymous device, retained 70-coin progress, and no duplicate child profile. The complete local release suite, TypeScript, EN/CS/ES/DE parity/interpolation, notification localization, and 30 family/layout regressions also passed. This is backend and browser/static evidence; an installed Android build is still required to test the software keyboard, status bars, Google authentication, and real-device pairing end to end.
- Managed profiles use a dedicated parent-confirmed deletion flow, not legacy nickname unlinking. It revokes matching device bindings and codes, then atomically deletes that child's profile and progress. Other children remain intact. The confirmation explains that offline copies on other devices may remain.
- Parent refreshes are invalidated across a managed deletion so an older response cannot restore a deleted profile in the UI. Failed deletion retains the local profile; deleting the selected child safely selects a sibling or clears child-specific state without signing out the parent.
- A successful empty managed-family refresh clears stale child selection only when the account has the managed-family marker and all locally listed children are managed. A recovery snapshot is written first. Failed/offline lookups and unconfirmed legacy families retain their local progress. Refresh responses are discarded after account changes, including after invitation lookup.
- Guest migration refuses to overwrite two played profiles. Completed/pending/running tasks, activity history, and a previous daily spin count as existing progress even with an empty wallet. Renamed task IDs retain matching activity-history references; retrying an import must not duplicate it.
- Revoking a device removes its cloud access without deleting the child's progress. The cloud adapter routes paired devices to managed child progress and refuses an unpaired/revoked device; it never creates a child account profile. Parent-created managed families set a marker so existing accounts remain compatible before rollout.
- Account deletion invokes managed-family cleanup for marked accounts: revoke devices and codes, then delete managed progress before child profiles, and only afterward remove the parent identity. The managed flag is retained when loading child profiles so parent saves target the correct collection. Pairing UI is implemented locally and Firestore rules are deployed; live end-to-end pairing remains unverified.

- Weekly parent summaries retain up to 35 local calendar days of per-task daily activity (bounded at 1,500 records), display only the trailing seven days, and never infer failures from an empty day.
- Completed tasks are counted once per local day; Undo reverses that day's completion. Notification Later records a postponement only after scheduling succeeds. Parent-reviewed tasks count on the day approval awards completion.
- Activity stays with the selected child, survives deleting a task, and is included in local and Firebase progress. The weekly view links to editing existing tasks and enjoying pending family rewards.
- Sibling switching snapshots the outgoing child's complete selected state. Wheel choices, last-spin date, wallet, purchased heroes, backgrounds, colors, reward shelf, and goals are child-specific; a profile with missing fields uses clean defaults rather than borrowing from the previously selected sibling. These fields travel in parent-local snapshots and linked-child cloud serialization.

- Date-sensitive quest logic uses the child's local calendar date, not UTC day splitting.
- Wheel eligibility, coin rewards, approval, and goals must be enforced in the store, not only hidden in UI.
- Persist local state immediately, then sync authenticated data to Firestore. Family access is UID-based and requires approved linking.
- Changing or deleting a timed quest cancels stale timer and snooze notifications.
- Reminder scheduling retains future repeat occurrences after today's quest is completed.

## Release checks

### Standing delivery preference — OTA

- The user requests publishing compatible app changes through EAS Update after validation, not leaving them only in local source. Report the published update/channel and distinguish published from downloaded/applied on a device.
- Never deliver native dependency, permission, plugin, signing, or other native-runtime changes as a JavaScript-only update. Those require a new compatible Android build.
- Current internal build 1.0.0 (4) was built without expo-updates, an update URL/runtime version, or an EAS build channel. OTA delivery must first be configured and included in a new Play build; do not claim existing installations can receive OTA updates yet.
- October 25: installed the SDK-compatible expo-updates package and configured the Quest Champ EAS update URL, fingerprint-based runtime compatibility, production/preview channels, and nonblocking update checks on launch. Downloaded updates apply on the next cold launch; never force-reload during a child's task. Release checks pass. The OTA-enabled replacement build must be installed from Play before future updates can arrive.
- OTA bootstrap release: Android build `6645bb4f-4b82-465c-b53b-7cd562f6a0f7`, version code 5, succeeded; initial production update group `2b474ea4-9d5a-430f-a35d-64d5358ce451` successfully published. Both report runtime `c7a52b6ae263db597caefd58b50b187302deb2b4`. Play internal release 3, `1.0.0 (5) – OTA enabled`, was published October 25 at 02:39 Prague time and confirmed Available to internal testers, with EN/CS/ES/DE notes. No public production rollout. Google login remains explicitly unresolved.
- Version 5 AAB passed ZIP integrity validation; SHA-256 `1f4046a072c1ee2918c93f410456c8fb15f535e6518f2f876dc42f7675e88f6c`. Its Android manifest contains the expected EAS update URL and production channel. Play reported only the existing nonblocking deobfuscation-map warning, with no loss of supported devices. Local release checks and web export passed; sign-in layout reviewed in all four languages in the browser. Real-device OTA download/application and Android safe-area behavior remain to be verified after installing build 5.

### Approved improvement scope (in progress)

- Finish parent-owned child profiles, device pairing, guest progress migration, and isolated child switching.
- Complete localization of rendered screens, accessibility text, errors, and notifications. Matching dictionary keys alone do not prove screen coverage. Supplemental UI dictionaries live under `src/i18n/ui.<locale>.json` and are merged by the central configuration.
- `test:locales` guards literal copy and translation keys on the core child screens, settings and weekly summaries as well as the previously migrated family/reward screens. Mocked native-notification tests verify EN/CS/ES/DE content, action titles, channel names and denied/web test outcomes. These tests do not verify Android delivery, sound, system layout or translation quality with native speakers.
- First-use flow: hero, nickname, three illustrated starter quests; optional simpler presentation without collecting birth dates.
- Clarify existing rewards in their relevant tabs and connect quest completion to affordable town items.
- Provide a private weekly parent summary of completed and postponed tasks and unclaimed rewards, with direct task editing.
- Verify Android login, reminders/actions, timer recovery, and restoration. Settings includes a five-second reminder test; scheduled is not proof of delivered or audible.
- Explicitly excluded from this work: new routine templates/scheduling features (proposal 4) and Help/Later/Skip task additions (proposal 6). Existing functionality stays supported.

Before a Google Play build:

- `npm run test:release:local` runs TypeScript, project isolation, quest/reward regressions, locale/notification checks and family/account regressions without production data access. Firestore emulator rules, exports, native builds and real-device checks remain separate gates.
- Run TypeScript, project isolation, reward/wheel regression tests, web export, and Android bundle export.
- Verify notification permission, channels, sounds, static hero image, and action buttons on a real Android device.
- Verify phone, 7-inch tablet, 10-inch tablet, large text, and reduced-motion layouts.
- A Rive dependency or new `.riv` asset requires a fresh native EAS build; Expo Go/web preview is not sufficient for final validation.
- QR camera support likewise requires a fresh Android build. On a physical tester device verify camera denial/manual fallback, QR success, Google account chooser after logout, closed-app reminder actions, reboot persistence and Android battery-saver delivery before declaring those native requirements complete.

### Local browser verification — October 24, 2026

- Fresh web export at `/tmp/quest-champ-qa-current` succeeded. A new local preview origin was used with a synthetic guest, without signing into any cloud account.
- Verified guest entry, choosing Sunny, entering a nickname, selecting exactly three starter quests, and arriving at home with a 34/33/33 daily coin allocation.
- Completing Tidy toys awarded 33 coins and exposed an affordable-town-item link. Undo restored zero coins and zero completed quests.
- Switching to Czech translated home, built-in quest names, settings and tab labels. Reload retained the guest's three tasks, zero-coin state and Czech language without repeating onboarding.
- A two-minute focus session retained elapsed time after leaving and reloading (resumed below two minutes, not restarted). Stop returned the quest to Start without awarding coins or completion. Focus controls expose button roles; the home action's spoken label now agrees with its visible Resume state. Both changes were checked in the rebuilt browser preview.
- This is browser functional evidence only. Android delivery/sound, device authentication, live family pairing, and phone/tablet visual verification remain separate release gates.

### Firebase release verification — October 24, 2026

- The Firebase CLI successfully listed `quest-hero-dab6b` as an active accessible project; this confirms account access, not deployed-rule equivalence.
- The current local rules passed all 10 Firestore emulator tests against `demo-quest-champ`: parent isolation, anonymous-device restrictions, one-time pairing, expired/forged code rejection, ownership protection, revocation, disconnect, account cleanup and sibling-safe deletion.
- The emulator checks used synthetic data only. Following explicit user approval, `firebase deploy --only firestore:rules --project quest-hero-dab6b --config ../firebase.json --non-interactive` successfully compiled and released the rules to `cloud.firestore` (exit 0). Deployed local rules SHA-256: `4dc66f72d67b584534744ed2d236e77c06995165b494c495cdbe0c22bd59f3c2`. No stored family documents were modified by this deployment. Deployment success does not establish end-to-end pairing or Android readiness.
- The user will upload the app to Google Play internal testing. No APK/AAB was built, uploaded or published as part of this rules deployment. Device checks must use a native build containing the latest changes.

### Internal release — October 25, 2026 (published)

- The user subsequently authorized this agent to upload the private Quest Champ project to Expo EAS and distribute the result through Google Play internal testing to the existing `testeri` list (five people).
- EAS production Android build: `12d40b28-ba68-40cc-9dd2-90c83e0f6a8f`, app `com.questhero.app`, version `1.0.0`, remote version code `4`, existing remote signing credentials. Do not start a duplicate while this build is live.
- `.easignore` explicitly includes `assets/branding/quest-hero-source.png`, which Home requires, despite excluding other source artwork.
- Google Play Quest Champ app ID: `4975116368212144994`; internal track: `4700676888525351838`. The `testeri` list is selected and saved; unrelated MapPal testers are not selected. Internal release draft `2` has notes in EN/CS/ES/DE.
- Local release checks passed before upload. EAS build succeeded in about 22 minutes. The downloaded AAB passed ZIP integrity validation; SHA-256 `7e42c64be54ea28b9df1838b460e498d99bd49e9d2c8b5a11b883b2551188120`.
- Google Play accepted and published internal release `2`, `1.0.0 (4) – Internal test`, on October 25 at 00:43 Prague time. The console showed the track Active and the release Available to internal testers. No production rollout was performed.
- Tester opt-in URL: `https://play.google.com/apps/internaltest/4700676888525351838`. Access is limited to the selected `testeri` list. No separate invitation emails were sent. The console currently uses the temporary label `com.questhero.app (unreviewed)`.
- Play reported one non-blocking warning: no deobfuscation mapping file attached. Native debug symbols were attached. Device login, pairing, notification sound/actions and timer-recovery tests remain unverified until testers install this build.
