# Questblox product checklist

Status: `[x]` built, `[~]` verify on a child's phone, `[ ]` still to finish.

## Product direction

- [x] Designed for children aged 6–12.
- [x] Daily chores become visual quests, coins and rewards.
- [x] Keep original block-style fighters and Epic Quests.
- [x] Show one clear quest flow instead of many small boxes.
- [ ] Complete the full family fighting-game loop: choose fighter, skills, arena and sibling/friend battle.

## Child quest experience

- [x] Large task pictures with short one- or two-word labels.
- [x] Sequential Today’s Adventure flow.
- [x] Active Noob fighter is prominent.
- [x] Clear visual states for start, submit, waiting and completed.
- [x] Custom Questblox success modal after adding a quest.
- [x] Epic Quest labels and wide layouts improved.
- [x] Mum Quest and Dad Quest pictures available.
- [x] Quest states reviewed in the responsive web preview in all four languages.
- [~] Repeat on a small physical Android phone with large system text.

## Add and manage quests

- [x] Large, prominent quest-name input.
- [x] Microphone placed inside the quest-name field.
- [x] Visual task picker uses large pictures in a grid.
- [x] Rolling time picker.
- [x] Choose notification or alarm for each quest.
- [x] Add, edit and delete use compact visual icons.
- [x] Remove extra help text and unnecessary action rows.
- [x] Layout avoids the Android keyboard and top system bar.
- [x] Add-quest layout, picture grid and rolling time picker reviewed responsively.
- [~] Verify speech input, alarms and keyboard behavior on physical Android devices.

## Notifications and alarms

- [x] New child reminders start enabled.
- [x] Ask for notification permission when a child receives quests.
- [x] Exact alarms fall back to normal notifications when unavailable.
- [x] Reminder settings remain available after account changes.
- [ ] Confirm reminders arrive while the child app is closed, after restart and in battery-saver mode.

## Rewards and prize wheel

- [x] Visual roulette wheel with multiple prize choices.
- [x] Ten familiar reward icons, including treats and activities.
- [x] Parent can change a reward icon by tapping its picture or name.
- [x] Child can claim a won reward later.
- [x] Child can show an unlinked parent; parent can mark it given.
- [x] Connected parent can manage the child's rewards.
- [x] Ten wheel segments, saved prize, Claim and Show parent controls reviewed.
- [~] Verify claim delivery across two physical phones.

## Parent and child accounts

- [x] Choose Parent or Child before account setup, including Google sign-in.
- [x] Google sign-out allows choosing another Google account.
- [x] Invitations show who sent them, with Accept and Decline.
- [x] Normal short nicknames replace `hero_` IDs and long generated names.
- [x] Nicknames can be changed later.
- [x] Parent dashboard fields are wider and wrap safely.
- [x] Parent can select a child and manage quests, Epic Quests and rewards.
- [ ] Finish QR-code family linking as the fastest connection method.
- [~] Verify email/nickname linking and invitation delivery between two real accounts.

## Family sync and safety

- [x] Parent changes target only the selected child.
- [x] Sibling data stays separated.
- [x] Offline actions queue and retry after restart.
- [x] Duplicate delivery cannot grant rewards twice.
- [x] Parent approval and deletion rules are covered by automated tests.
- [x] Child-created family quests require parent approval.
- [x] Automated parent/child tests cover create, edit, delete, submit, approve, reward and reminder fields.
- [~] Verify the same flow between two physical phones, including offline reconnects.

## Fighters and battles

- [x] Previous fighters are visible in the fighter shop.
- [x] Original block-style characters and arena visuals are retained.
- [x] Family battle screen and fighter skills exist.
- [ ] Test a complete sibling battle on two devices.
- [ ] Improve battle progression, skill balance and earned fighter unlocks from real play feedback.

## Login, visuals and accessibility

- [x] Login and registration use a cleaner continuous layout.
- [x] Google sign-in is prominent.
- [x] New Questblox icon is configured for the app and in-app branding.
- [x] Icon-only controls have accessible labels.
- [~] Verify launcher icon after installing a fresh native build; OTA cannot replace the phone launcher icon.
- [x] Login, registration, quest path, add quest, wheel, fighters and settings reviewed responsively without clipping.
- [~] Repeat with the Android keyboard and large system fonts on a physical phone.

## Languages

- [x] English, Czech, Spanish and German ship together.
- [x] Notifications, errors and accessibility labels are translated.
- [x] Translation and TypeScript checks pass for current changes.
- [x] English, Czech, Spanish and German were reviewed in the responsive preview.
- [~] Repeat all four languages with large system text on a physical phone.

## Google Play and release

- [x] Internal-testing OTA channel is configured.
- [x] Latest interaction changes were published by OTA.
- [x] Native Android version code 12 includes the icon, alarm module and speech input and is live on internal testing.
- [x] Internal testing accepts testers from every country; the selected list currently contains five testers.
- [x] Google Play shows version code 12, API 24+, target SDK 36 and four-language release notes.
- [ ] Add reviewer account credentials in Google Play; this currently blocks the target-audience form.
- [ ] Finish the remaining Play Console store and policy forms.
- [ ] Commit and push the completed source changes to GitHub `main`.

## Release acceptance

- [x] Start → Complete → reward feedback works in the responsive child flow.
- [ ] Parent adds a quest in under 30 seconds.
- [x] Automated sync tests verify matching quests, rewards, approvals and selected-child isolation.
- [~] Repeat the sync acceptance flow on two physical phones.
- [ ] Notification or alarm arrives at the chosen time.
- [x] Reward wheel shows ten visible prizes and saved prizes have Claim and Show parent actions.
- [x] No clipped text or hidden buttons appeared in the responsive preview.
- [~] Verify keyboard overlap on the smallest physical Android phone.
- [x] Translation parity passes for 747 keys and the tested screens switch cleanly across all four languages.

## Engineering checks

- [x] TypeScript, lint, web export and Firebase Functions build pass.
- [x] Quest, account, reminder, push, offline recovery and family-sync tests pass.
- [x] Critical npm advisory fixed with compatible Expo 57 patches.
- [~] Ten upstream Expo/Firebase advisories remain; npm only offers breaking SDK downgrades or an Expo 58 migration.
