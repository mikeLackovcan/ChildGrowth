# QuestBlox

QuestBlox is a family quest and habit tracker built with Expo React Native and Firebase.

## Canonical app

The supported product code is in [`ChildGrowthNative/`](ChildGrowthNative/). It is the only implementation intended for development, web export, Android builds, and Google Play release.

The root `www/`, `live_index.html`, `vercel_index.html`, root Supabase schema, and root Capacitor files are legacy artifacts retained for history and are not part of the QuestBlox release path.

## Backend

Firebase Authentication and Cloud Firestore are the only supported backend services. Local AsyncStorage is used only for offline UI state caching; it is not an authentication system.

## Commands

```bash
cd ChildGrowthNative
npm install
npm run web
npm test
npx expo export -p web
```

For Google Play builds, configure the EAS project and Android signing credentials, then use the production profile in `eas.json`.
