# Questblox backend

Backend deployed to `questblox-10c14` on 25 October 2026 (Europe/Prague).
The dependent app update still needs authenticated parent/child device testing
before publication.

## Implemented

- Cosmetic outfits: Noob has Original and free Explorer artwork. The app saves
  the selection locally for guests and through `outfit.equip` for accounts.
  Server validation permits only known fighter/outfit pairs and owned fighters.
  Outfits do not change currency, quest rewards, or combat statistics. Family
  invitations snapshot each participant's outfit when they join, so later wardrobe
  changes do not change an ongoing battle. Deploy the updated progress and battle
  functions before releasing this app. Other fighters currently retain their
  original artwork; this is the first available outfit, not a full wardrobe.

- Server progress operations derive quest rewards, daily gifts, spins and shop
  prices, with request receipts for safe retries. The app store now sends these
  operations through its persisted, account-scoped outbox. Direct client snapshot
  writes have been removed. New edits made during refresh invalidate stale reads.
  Gift and spin screens wait for saved server results; a spin preserves its draw
  pool so the animated pointer matches the actual reward.
- Pending quest approvals survive midnight and account restoration. Submission
  rewards are preserved; late approval pays once without completing today's
  recurring quest. Explicit review receipts keep late-approval notifications
  distinct from daily resets. The picture-led parent review component has been
  checked at 320 pixels in English, Czech, Spanish and German.
- Server-owned account initialization, atomic nickname reservation and private
  family-account lookup. Existing roles and progress cannot be replaced by a
  repeated signup request. Legacy recovery copies only uniquely owned historical
  progress when the canonical save is absent and keeps the source as backup.
- Draft Firestore rules with owner/accepted-parent reads, participant-only battle
  reads and server-only writes. Verified family access grants are updated in the
  same transaction as invitations and unlinking.
- `manageFamily`: recipient consent, atomic profile summaries and trusted
  `familyLinks` memberships; private quest details are withheld until acceptance.
- Sibling discovery through accepted memberships, without exposing email addresses.
- Family battle invitations, acceptance, server-owned moves, surrender and expiry.
- Ownership checks, duplicate-request handling, invitation limits and immediate
  move rejection after a family link is removed.
- Transactional notification outbox, per-device delivery leases, Expo tickets and
  receipt checks, bounded retries, invalid-token cleanup and stale-event checks.
- Localized parent approval/help/reward alerts and family battle updates. Generic
  lock-screen messages contain no child names or quest/reward descriptions.
- Device opt-in, token rotation, account checks, notification navigation, and
  20:00–07:00 local quiet hours that account for daylight-saving changes.
- App lobby and live battle subscription in `src/app/family-battle.tsx`.
  All new interface strings are in English, Czech, Spanish and German.

## Local checks

From this directory, with Node and Java 21 available:

```sh
npm --prefix functions ci
npm --prefix functions run build
npx firebase-tools emulators:exec --only firestore --project demo-questblox --config firebase.test.json 'npm --prefix functions test'
```

The test runner refuses to run without a Firestore emulator and the exact demo
project ID. It seeds synthetic accounts only. Callable tests invoke handlers with
simulated authenticated contexts against real Firestore transactions; they do not
prove HTTP authentication or Android delivery. Rules tests load `firestore.rules`
and exercise authenticated/unauthenticated client access against the emulator.
`tests/deny-all.rules` is the initial emulator fixture, not production rules.

`tests/app-progress.test.cjs` runs the actual Zustand store, persistent queue and
account restoration against callable handlers using real emulator transactions.
It covers parent assignment, offline submission/restoration, single-payment
approval, Epic/spin/redemption, a lost purchase response and the saved daily gift.
Native storage and authentication transport are test doubles; this is not a
substitute for device and callable HTTP authentication testing.

Also run the app's account, quest, reminder, `test:progress`, `test:push`, translation and TypeScript
checks. Emulator push tests inject a simulated Expo transport; the default
transport refuses external delivery in a demo/emulator environment.

Push tickets mean Expo accepted a message; only a successful receipt marks a job
`delivered` (accepted by the downstream provider, not proof a person saw it).
Delivery is at least once: a crash between the external send and saving its ticket
can produce a duplicate. The app receives a stable notification ID. Limits are
eight enabled devices and 40 send attempts per account per UTC day, with five
attempts per job. Pending jobs expire after 24 hours. Registration expires after
30 days without an app refresh. An offline logout cannot retract a message already
queued by the provider; generic text and UID checks protect notification contents
and navigation. Background receipt/retry processing uses Cloud Scheduler. Daily
retention cleanup removes old event/quota records, delivery history older than
seven days and device registrations inactive for 30 days, in bounded batches.

## Recovery verification (24 October 2026)

Legacy saves can now be preserved locally before switching to cloud progress.
Recognized permanent rejections move to a review list without blocking later
commands; network failures remain queued. Parent-reviewed restoration preserves
higher cloud balances and current quest edits. Prior-day completions can request
their standard reward without completing today's quest. Original receipt IDs and
approved recovery source IDs prevent duplicate awards for the same request.

The 49 emulator tests pass, including recovery authorization, stale approvals,
preserving newer progress, and duplicate reward prevention. Client queue tests also
cover a restart after server success but before the review archive is saved.
The recovery review component was visually checked at 280px width in English,
Czech, Spanish and German. This is not proof of the full authenticated recovery
journey on a phone; that remains a release check.

## Concurrent quest verification (24 October 2026)

Pending submissions now prevent both individual and bulk deletion. The app
explains that a parent must review the submission first; stale offline deletion
commands are retained in the recovery list. After review, deletion preserves
already awarded currency. The 54 backend tests pass, including actual concurrent
submit/delete, approve/delete and edit/approve transactions. The 22 isolated quest
checks include preserving pending submissions in the local parent/child store.

Quest definitions now carry unique revision tokens. Updates, deletions and
completions must match the version the caller saw; bulk deletion must match the
whole quest list. Tokens also prevent a dependent offline edit from matching a
different device's edit after an earlier conflict. Editors keep unsaved drafts
when the local version changes; rejected queued edits remain in recovery with
their saved name visible. Conflicting commands cannot be blindly retried.

All 58 backend checks pass, including two concurrent editors, stale completion,
stale deletion, changed bulk lists and dependent offline edits. The app-store
integration was additionally rerun through parent editing and child completion
to verify client/server revision agreement. The 23 isolated quest checks,
TypeScript, 474 four-language keys and Android export also pass. Export:
`/tmp/questblox-versioned-android` (not a signed Play bundle or published update).

## Release gates still open

Latest local verification (24 October 2026): all 69 backend emulator tests pass
in one combined run, including the outfit, account-restoration, purchase-retry,
family-battle and notification cases. Expo native configuration introspection
also succeeds. Android autolinking includes `expo-notifications` and
`expo-speech`; their library manifests declare notification/boot handling and
text-to-speech service discovery respectively. These checks do not establish
that Android delivers notifications or that speech works on a physical phone.
No Android SDK/ADB was found in PATH or the standard local SDK directory during
this check. The latest Android export is `/tmp/questblox-current-android`, including the
editor/account-screen fixes (Hermes bundle
`entry-cd9294860aaacd33f0294ca4cc4735c3.hbc`). It is not a signed AAB or
a published OTA update.

The owner enabled Firebase billing on 25 October 2026. Read-only verification
confirmed billing enabled, after which the Questblox backend was deployed.
All 13 callable endpoints returned HTTP 401 / UNAUTHENTICATED for unsigned
requests. Production rules match the tested local file; the battle index is READY
and both notification schedules are ENABLED. The initial three Eventarc trigger
creations failed while Google's service-agent permissions propagated; retrying
only those triggers completed successfully. This is deployment and unauthenticated
HTTP verification, not proof of Google login, account flows or phone delivery.

Deployment evidence: `/tmp/questblox-backend-deploy-retry.log`,
`/tmp/questblox-trigger-deploy.log`, `/tmp/questblox-live-endpoint-checks.log`.
The Firebase CLI configured automatic cleanup of build images older than one day.
No new AAB or OTA update was published as part of this deployment.

- Verify the full authenticated backup/recovery journey on parent and child
  devices, including failed storage writes and reconnecting on a later day.
  Legacy snapshots must only restore currency through explicit parent review.
- Verify conflict/recovery screens on actual parent and child devices, including
  editing while offline and retaining drafts after a cloud refresh. Server and
  store conflict behavior is covered above; device usability is still unverified.
  **Do not publish the dependent app until these cases are resolved.**
- Verify offline cold-start behavior on real devices. Client tests now verify
  that historical family caches are backed up before hiding unverified approvals,
  previously verified relationships remain available offline, and delayed cache
  loads cannot overwrite a new signed-in session. Backups remain available in
  Saved changes, and this preservation never releases pending save markers.
  Authenticated restoration and online refresh use `getFamilyStatus`, which
  derives membership only from server links and offers explicit reconnect
  invitations for historical tags. Migration tests cover recipient consent,
  revocation and missing read-grant repair. Reconnection preserves historical
  parent summaries under `legacy_family_children`; these are recovery evidence,
  never trusted balances or membership. Settings now opens saved changes, where
  parents can inspect these backups and request restoration for a reconnected,
  accepted child. The existing explicit parent review applies the restoration.
  Migration tests verify this path never grants coins merely on submission and
  cannot restore the same backup again after coins are spent. Verify the full
  reconnect and recovery interfaces on real parent/child devices before release.
- Verify the invitation waiting screen with two accounts. It now reads actual
  server status, and old child-onboarding links redirect to the real invitation
  form; the demo approval/navigation behavior has been removed.
- Verify Android FCM credentials and real device delivery, including cold-start
  notification taps, denied permissions, logout, quiet hours and token rotation.
- Indexes and callable functions are deployed. Test authenticated HTTP calls and
  live battles with two devices and parent/child accounts.
- Check the four-language layouts on small screens and build the Android bundle
  including the native dependencies before release.

Historical production inspection on 24 October 2026 found expired test rules and
billing disabled. This deployment resolves those infrastructure blockers; the
remaining release gates above still apply.
