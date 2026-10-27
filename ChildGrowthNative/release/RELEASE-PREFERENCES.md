# Questblox release preferences

User confirmed on 2026-10-25: publish the latest completed Questblox changes for internal testers. Use OTA for compatible JavaScript and asset changes. When native changes require a new runtime, build and publish a signed Android App Bundle to Google Play internal testing.

- Verify checks and runtime compatibility before publishing; never override a runtime fingerprint to force an incompatible update.
- Include English, Czech, Spanish and German translations together, following ../TRANSLATIONS.md.
- Complete internal publication, not just bundle upload, and verify the resulting release status.
- Report when Google Play propagation or device verification remains pending.
- This preference covers Questblox internal testing, not public production rollout or other apps.

## Current published baseline

Version 1.0.0, Android version code 12, published to internal testers on 2026-10-25 at 10:59 Europe/Prague.
Runtime: `aae75b492cbe429692d6eacbe52bb5dc1dbfb675`.
Channel: `internal-testing`.
Tester link: https://play.google.com/apps/internaltest/4701374113761647208

The family setup UX update was published over the compatible Android OTA runtime on 2026-10-25 at 10:49 Europe/Prague. Android update: `01a172ae-1a49-7174-b4c6-3328d9cb8468`.
