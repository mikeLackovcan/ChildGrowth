# Questblox UX release — 6 November 2026

## Delivered behavior
- Untimed quests have a direct 48-point completion control. Completed quests retain the crossed-out CLEARED stamp. Smaller task illustrations and expandable edit/delete controls keep the list compact.
- Custom Epic quests skip the unnecessary Start step.
- Recent own completions have an eight-second Undo control. The server checks a 30-second window, ownership, parent approval, available reward balance, and spin/Epic locks.
- Children accept/decline invitations directly on their QR page. Live changes, foreground refresh and polling keep it updated. Code loading can be retried. Already-connected codes show the correct status.
- Camera scanning is optional; code entry remains available. Android camera and autofocus hardware are explicitly optional to preserve device compatibility.
- Notification settings show notification and exact-alarm permissions. Server validation now accepts the entire 24-hour day.
- Saving activity appears alongside the existing errors, retry and recovery controls.
- Rewards have Saved, Requested and Given views.
- Children can choose a fighter savings goal; home progress follows it. This preference is scoped to the account on this device, not cloud-synced.
- Parents preview morning, after-school and bedtime routines and assign them to selected accepted children. Existing template tasks are preserved; network failures use the durable progress queue.
- A cooperative family boss shows combined daily progress for accepted siblings without exposing their task titles. It grants no extra currency.
- All new text is supplied in English, Czech, Spanish and German.

## Verification
- 24 quest-flow checks; 10 family/server checks; 12 account/client checks; 8 progress queue/recovery checks; 10 reminder checks; 8 QR parsing checks passed.
- TypeScript and all four translation catalogs passed (841 keys, matching placeholders).
- Expo manifest introspection verified optional camera, autofocus and any-camera declarations.
- Live disposable-account checks passed: already-connected status, a 23:59 reminder, exact coin reversal on child Undo, and temporary-quest cleanup.
- Browser: parent assigned a morning routine successfully and both tasks appeared. German routine form reviewed at 360×640 without horizontal overflow. Settings text inspected in all four languages.

## Release
- App code pushed to main: `873dd7c`.
- Backend `applyProgress`, `getFamilyStatus`, and `manageFamily` deployed successfully.
- Signed Android version 16: build `4d6afaed-fd85-4746-ac61-a3d4c687dfbb`.
- Published OTA: `b1d70112-e0f2-4324-8094-a28a5730f2c3` on `internal-testing`.
- Matching runtime: `3615ba89acae9694c1878572c5281a36aacf5f7b`.
- A Play update is required before existing version 14 devices can receive this runtime's OTA.
- Version 15 was not rolled out: Play validation revealed 435 devices excluded by the implied camera requirement. Version 16 corrects that requirement.
- Google Play version 16 published to internal testing on 6 November 2026 at 15:37 Europe/Prague. Play Console confirmed “Available to internal testers”. Validation showed zero newly excluded devices across every device category.

## Remaining acceptance checks
- Physical Android keyboard/system bars, camera QR scanning, and reminder delivery with the app closed, after reboot, and under battery saver.
- Comprehensive affected-screen review in every language with large text remains incomplete; translation parity alone does not prove layout coverage.
- Separate ongoing 3D fighter work is excluded from this release.
