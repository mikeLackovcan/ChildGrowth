# Questblox UX release — 6 November 2026

## Implemented
- Untimed quests have a direct 48-point completion control; completed quests retain the crossed-out CLEARED stamp.
- Compact task illustrations; edit/delete controls appear after expanding the quest.
- Custom Epic quests skip the unnecessary start step.
- Child can accept/decline invitations on the QR page; live changes, foreground refresh and polling update that page. Code loading can be retried.
- Notification settings show actual notification and exact-alarm permissions; unavailable native alarms require an app update.
- Saving activity is visible alongside existing errors/retry/recovery controls.
- Reward collection separates Saved, Requested and Given.
- Children can select a savings fighter; the home progress bar follows it. This preference is per-account on this device, not cloud-synced.
- Parents can preview morning, after-school and bedtime routines and assign them to multiple accepted children. Existing template tasks are preserved. Network failures use the existing durable progress queue.
- English, Czech, Spanish and German strings ship together.

## Verification
- Quest flow: 24 isolated checks passed.
- Family sync: 7 isolated checks passed.
- Progress queue/recovery: 8 isolated checks passed.
- Reminders: 10 checks passed; no real notifications fired by these tests.
- Family QR parsing: 8 checks passed; not a physical camera scan.
- Translation key and placeholder parity: passed.
- TypeScript: passed.

## Outstanding acceptance checks and scope
- Physical Android keyboard, system bars, QR scanning, notifications with app closed/reboot/battery saver.
- Full affected-screen visual review in all four languages and large text.
- Short child Undo needs a server-controlled correction window; current child completions remain locked.
- Cooperative family boss is not implemented in this release.
- Already-connected invite response still needs a distinct status.
- Separate ongoing 3D fighter changes are excluded from this release.
- Native camera dependency was added after Play build 14: a new Android build is required. OTA must match the build runtime; never override the fingerprint to force compatibility.

## Release status
Pending publication verification. No store availability claim until a successful submission is confirmed.
