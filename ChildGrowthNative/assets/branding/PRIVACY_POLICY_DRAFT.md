# Quest Habi privacy policy draft

Quest Habi uses Firebase Authentication and Cloud Firestore to provide account login, parent/child linking, quests, progress, rewards, and avatar data synchronization. The app may cache account state locally on the device for offline continuity. Guest-mode data remains on the device unless the user later signs in and sync is intentionally enabled.

Quest Habi should not collect or store unnecessary sensitive information. Before publishing, replace this draft with a reviewed policy that identifies the publisher, support contact, retention period, deletion process, Firebase subprocessors, children’s privacy treatment, parental-consent flow, and applicable legal basis.

## Required product decisions before launch

- Decide whether child accounts require verified parental consent.
- Provide account and data deletion from inside the app or through a documented support process.
- Document exactly which profile, quest, reward, and device data is stored.
- Configure Firebase retention and access controls for production.
