# Quest Hero backend status

Updated 2026-10-19 on branch questhero. QuestBlox main and its Firebase
project were not changed.

## Configured

- Firebase project quest-hero-dab6b on the Spark plan.
- Android package com.questhero.app.
- Firestore Standard database in europe-west3 (Frankfurt).
- Email/password and Google authentication providers enabled.
- Separate EAS project daed5f3a-fd4f-44a8-9b72-be86f5b6f2a2.
- Separate Android upload keystore registered in Firebase with SHA-1 and SHA-256.
- Refreshed google-services.json has Quest Hero Android and web OAuth clients.
- Native Google sign-in plugin configured for development and production builds.
- Local AsyncStorage keys are prefixed for Quest Hero.

## Intentional safety lock

Firestore rules deny all reads and writes, and the app cloud-sync path is
disabled. Authentication can identify a user, but task, family, and reward data
stay on that device. This avoids exposing children's data through the legacy
nickname-based whole-profile synchronization model.

Before enabling cloud sync, implement server-owned immutable roles, expiring
single-use family pairing, canonical UID membership, transactional/idempotent
reward commands, App Check, and emulator tests for cross-account denial and
two-device concurrency. Cloud Functions deployment requires the Blaze plan;
no billing upgrade was made.

Google sign-in cannot run in Expo Go because it uses native code. Test it in a
new Quest Hero development or preview build. After Google Play App Signing is
enabled, also register Play's app-signing SHA fingerprints in Firebase and
download google-services.json again.
