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
- Family sync/server rules: 10 isolated checks passed, including 24-hour reminder validation, Undo restrictions, and cooperative progress.
- Progress queue/recovery: 8 isolated checks passed.
- Reminders: 10 checks passed; no real notifications fired by these tests.
- Family QR parsing: 8 checks passed; not a physical camera scan.
- Translation key and placeholder parity: passed.
- TypeScript: passed.

## Outstanding acceptance checks and scope
- Physical Android keyboard, system bars, QR scanning, notifications with app closed/reboot/battery saver.
- Full affected-screen visual review in all four languages and large text.
- Recent own completions can be undone for eight seconds in the UI; the server checks a 30-second safety window, ownership, parent approval, reward balance and spin/Epic locks.
- Cooperative family boss shows combined daily progress for accepted siblings without exposing their private task titles. It grants no additional currency.
- Already-connected invites show a distinct connected status.
- Separate ongoing 3D fighter changes are excluded from this release.
- Native camera dependency was added after Play build 14: a new Android build is required. OTA must match the build runtime; never override the fingerprint to force compatibility.

## Release status
Initial OTA published: 446f7c4e-f6fc-40e0-b852-469510e6a184 (runtime 84a0ab2902193c6c3743b17b5d214bf3fb134502). Android version 15 build: 1c0cf3bb-1cf5-415f-8524-70971784d786. Follow-up OTA and Play submission verification pending.

Browser checks: morning routine assigned successfully to the disposable test child; two tasks appeared. German routine form reviewed at 360×640 without horizontal overflow.

Final OTA: 97f4b904-9d6b-485a-ae35-106ab79abe51, commit 3736bbe, same runtime as Android version 15. Backend applyProgress/getFamilyStatus/manageFamily deployed successfully. Live disposable-account checks passed: existing link reports accepted, 23:59 accepted, child Undo reverses exact coins, temporary quest removed. EAS Submit lacks a Google service-account key; Play Console upload is in progress.
