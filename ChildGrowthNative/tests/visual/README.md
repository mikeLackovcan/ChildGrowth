# Free Questblox release checks

Use the isolated package so browser tooling does not change the native Expo runtime fingerprint.

## Browser visual and user-flow suite

```
npm ci --prefix tests/visual
npx --prefix tests/visual playwright install chromium
# Serve a clean Expo web export on 8083 before running.
QB_VISUAL_URL=http://127.0.0.1:8083 npx --prefix tests/visual playwright test --config tests/visual/playwright.config.cjs
```

For authenticated flows, set `QB_TEST_PARENT_EMAIL`, `QB_TEST_CHILD_EMAIL`, and `QB_TEST_PASSWORD` to disposable connected QA accounts. Never use a child's real account. Without credentials authenticated tests are explicitly skipped. Reward text tests edit drafts without saving. Backend mutation tests use local emulators.

The matrix covers English and Czech at 360×740, 412×915 and 768×1024: role selection, sign-in, registration, child tabs, reminders, linking, recovery, all four parent sections, reward typing, task creation and scheduling. It checks horizontal text overflow, captures screenshots, and saves failure traces. Hidden legacy routes and state-dependent screens are not full coverage. Native Android IME, alarm delivery, camera scanning, system bars, and Google OAuth require device testing.

Generate candidate screenshots with `--update-snapshots`, review them manually, then rerun without that flag. A first baseline run does **not** establish visual correctness. Local baselines are ignored until reviewed; do not blindly approve changed baselines. Keep browser/OS versions stable for comparisons. Reports can contain QA profile information: keep them private.

Long repeat run (no paid service):

```
npx --prefix tests/visual playwright test --config tests/visual/playwright.config.cjs --repeat-each=10
```

This is repeated regression testing, not server load testing or proof of absence of memory leaks. For a true device soak, leave an authenticated disposable family active for 30–60 minutes while repeatedly switching tabs, completing/resetting disposable quests, requesting/delivering rewards, reconnecting network and backgrounding the app. Record latency, crashes, duplicate awards, lost edits, and memory growth. Do not target production with synthetic load.

## Release gates

- TypeScript and all four translation catalogs.
- Quest, account, reminder, offline queue/recovery and push unit tests.
- Full Firebase auth/Firestore emulator suite: access rules, pairing consent, task revisions, concurrent edits, idempotency, rewards, deletion, real listeners.
- Reviewed screenshots plus a second comparison run; small viewport and long authored strings.
- Native Android test: gesture/three-button navigation, large font/display settings, keyboard open in every form; bottom actions and focused input must remain reachable.
- Native notification test: permission denied/granted, exact-alarm permission, 00:00/23:59, background, restart, task completion cancellation, timezone change. Browser checks cannot prove these.
- Two-device family checks: QR and code pairing with child acceptance; parent edits/completion; reward request/approve/deliver; offline/reconnect; sibling/account switching.
- Release identity: correct package, runtime/channel, backend deployed, clean scoped diff and rollback version recorded.

## Tool choices and official references

- Playwright (local): screenshot comparisons, user flows and trace viewer. https://playwright.dev/docs/test-snapshots
- Maestro CLI (local): native Android flows on an attached device/emulator. https://docs.maestro.dev/maestro-cli
- Firebase Emulator Suite (local): isolated authorization/concurrency tests. https://firebase.google.com/docs/emulator-suite

No paid Applitools, Maestro Cloud or device farm is required. A local Android device/emulator is still required for native coverage.
