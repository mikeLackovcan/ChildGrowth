# Quest Habi backend status

Updated 2026-10-20 on the Quest Habi branch. The registered Firebase/EAS project and Android package retain their internal Quest Hero identifiers so existing credentials remain valid.

## Configured

- Firebase project quest-hero-dab6b on the Spark plan.
- Android package com.questhero.app.
- Firestore Standard database in europe-west3 (Frankfurt).
- Email/password and Google authentication providers enabled.
- Separate EAS project daed5f3a-fd4f-44a8-9b72-be86f5b6f2a2.
- Separate Android upload keystore registered in Firebase with SHA-1 and SHA-256.
- Refreshed google-services.json has the Android and web OAuth clients.
- Native Google sign-in plugin configured for development and production builds.
- Local AsyncStorage keys retain the internal Quest Hero prefix for safe migration.

## Current sync model

Cloud sync uses Firebase Auth UIDs as canonical document IDs. Profiles contain only minimal nickname, display name, and role fields. Quest and reward data live in protected `user_data` documents. Family invitations identify both participants by UID and require the invited account to approve before linked access is allowed. Legacy nickname-keyed synchronization is disabled.

The repository rules must be deployed before account sync is tested. Before a public children’s launch, also add expiring one-time pairing, App Check, abuse limits, emulator tests for cross-account denial, and transactional/idempotent reward operations. No billing upgrade was made.

Google sign-in cannot run in Expo Go because it uses native code. Test it in a
new Quest Habi development or preview build. After Google Play App Signing is
enabled, also register Play's app-signing SHA fingerprints in Firebase and
download google-services.json again.
