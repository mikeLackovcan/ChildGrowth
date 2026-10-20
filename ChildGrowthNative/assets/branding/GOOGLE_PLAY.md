# Quest Champ Google Play release pack

## Product identity

- App name: `Quest Champ`
- Package name: `com.questhero.app`
- Category: Parenting / Productivity
- Primary audience: Families with children
- Brand promise: Help children turn habits and chores into small daily wins.

## Store assets

- App icon: `quest-hero-play-512.png` (512 × 512)
- Launcher source: `quest-hero-icon-1024.png` (1024 × 1024)
- Original hero artwork: `quest-hero-source.png`
- Adaptive foreground: `quest-hero-adaptive.png`
- Themed icon: `quest-q-monochrome.png`
- Feature graphic: `google-play-feature-graphic.png` (1024 × 500)

Google Play still needs final screenshots captured from the signed Android build. Use the clean white Quest Champ interface and show: today's quests, a focus session, an animated hero celebration, rewards/shop, progress, and parent controls. Do not submit web-renderer previews as final Android screenshots.

## Listing copy

Short description:

> Habits and chores become fun daily quests for kids.

Full description:

> Quest Champ turns everyday routines into clear, playful quests children can understand at a glance. Kids can complete chores, homework, focus sessions, and healthy habits while their chosen hero celebrates each small win.
>
> Visual task presets reduce reading. Optional reminders, alarms, and focus timers help children start and finish at the right time. Coins, XP, character items, and family rewards make progress visible without punishing missed days.
>
> Parents can create quests, choose rewards, review progress, and securely link with a child account. Families may also begin in guest mode without registration.

## Release checklist

- In Firebase Console, enable Authentication → Sign-in method → Google.
- Create an Android OAuth client for package `com.questhero.app` and the EAS/Play signing SHA-1.
- Add the Google OAuth client IDs from `.env` as EAS environment variables.
- Create a Web OAuth client and add the Firebase auth domain to its authorized JavaScript origins.
- Deploy `firestore.rules` before production testing.
- Create an EAS production project and Android signing credentials.
- Verify the package ID `com.questhero.app` in Play Console.
- Build the internal-testing bundle with `eas build --platform android --profile production`.
- Capture production screenshots on supported Android phone/tablet sizes.
- Add a public privacy policy URL and complete Play Console data-safety declarations.
- Test registration, login, password reset, parent/child linking, offline recovery, and logout on two devices.

## Google sign-in configuration

From the native app directory, copy `.env.example` to `.env` and fill in the three OAuth client IDs. For an EAS build, set the same values in the EAS project environment instead of committing `.env`.

The Android OAuth client must use the exact application ID `com.questhero.app`. Add both the EAS upload certificate and Google Play App Signing SHA-1/SHA-256 fingerprints, then download an updated `google-services.json` if Firebase changes it.
