# Quest Champ privacy and support release record

The in-app/web privacy policy is maintained in `src/app/privacy.tsx` and the support/account-deletion instructions are maintained in `src/app/support.tsx`.

Release facts:

- Target audience: children ages 5–12 and their parents or guardians.
- Guest mode stores progress locally and does not require an account.
- Optional accounts use Firebase Authentication and Cloud Firestore.
- Firestore location: Frankfurt, Germany (`europe-west3`).
- No third-party ads, behavioral advertising, analytics SDK, precise location, contacts, microphone recordings, or payment-card collection.
- Account deletion is available in Settings and removes the Firebase account, profile, synced data, and family invitations.
- Public support/privacy contact currently configured in the app: `mike.fecko@gmail.com`.

Before production release, verify the public Firebase Hosting URLs after deployment and repeat the Data Safety audit against the final signed AAB.
