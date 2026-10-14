# QuestBlox Google Play release pack

## Product identity

- App name: `QuestBlox`
- Package name: `com.questblox.app`
- Category: Parenting / Productivity
- Primary audience: Families with children
- Brand promise: Turn everyday tasks into exciting quests and rewards.

## Store assets

- App icon: `google-play-icon-512.png` (512 × 512)
- Feature graphic: `google-play-feature-graphic.png` (1024 × 500)
- Source logo: `questblox-logo.png`
- Wordmark: `questblox-wordmark.svg`

Google Play still needs device screenshots captured from the final production build. Use the QuestBlox blue/gold palette and show: child quest tracker, parent dashboard, prize wheel/shop, and account-link approval.

## Listing copy

Short description:

> Turn everyday tasks into exciting quests and rewards.

Full description:

> QuestBlox helps families turn routines into adventures. Parents create quests, approve progress, and choose real-world rewards. Kids complete daily challenges, earn XP and coins, unlock avatars, and build momentum one quest at a time.
>
> Built for families, QuestBlox makes responsibility visible, motivating, and fun—with parent controls and Firebase-backed accounts for syncing across devices.

## Release checklist

- In Firebase Console, enable Authentication → Sign-in method → Google.
- Create an Android OAuth client for package `com.questblox.app` and the EAS/Play signing SHA-1.
- Add the Google OAuth client IDs from `.env` as EAS environment variables.
- Create a Web OAuth client and add the Firebase auth domain to its authorized JavaScript origins.
- Deploy `firestore.rules` before production testing.
- Create an EAS production project and Android signing credentials.
- Verify the package ID `com.questblox.app` in Play Console.
- Build the internal-testing bundle with `eas build --platform android --profile production`.
- Capture production screenshots on supported Android phone/tablet sizes.
- Add a public privacy policy URL and complete Play Console data-safety declarations.
- Test registration, login, password reset, parent/child linking, offline recovery, and logout on two devices.

## Google sign-in configuration

From the native app directory, copy `.env.example` to `.env` and fill in the three OAuth client IDs. For an EAS build, set the same values in the EAS project environment instead of committing `.env`.

The Android OAuth client must use the exact application ID `com.questblox.app`. Add both the local development SHA-1 and the Google Play App Signing SHA-1 if you test both builds.
