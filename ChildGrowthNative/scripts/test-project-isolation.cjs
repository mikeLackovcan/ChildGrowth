const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const google = JSON.parse(fs.readFileSync(path.join(root, 'google-services.json'), 'utf8'));
const firebase = fs.readFileSync(path.join(root, 'src/lib/firebase.ts'), 'utf8');
const store = fs.readFileSync(path.join(root, 'src/store/useAppStore.ts'), 'utf8');
const rules = fs.readFileSync(path.join(root, '..', 'firestore.rules'), 'utf8');

assert.equal(app.name, 'Quest Champ');
assert.equal(app.slug, 'quest-hero');
assert.equal(app.scheme, 'questhero');
assert.equal(app.android.package, 'com.questhero.app');
assert.equal(app.extra.eas.projectId, 'daed5f3a-fd4f-44a8-9b72-be86f5b6f2a2');
assert.equal(google.project_info.project_id, 'quest-hero-dab6b');
assert.equal(google.client[0].client_info.android_client_info.package_name, app.android.package);
assert.ok(google.client[0].oauth_client.some(client => client.client_type === 1));
assert.ok(google.client[0].oauth_client.some(client => client.client_type === 3));
assert.match(firebase, /initializeApp\(firebaseConfig, firebaseConfig\.projectId\)/);
assert.doesNotMatch(firebase, /questblox-10c14|35992182600/);
assert.match(store, /const CLOUD_SYNC_ENABLED = true/);
assert.match(rules, /request\.auth\.uid == uid/);
assert.match(rules, /request\.auth\.uid != resource\.data\.created_by/);
assert.match(rules, /isApprovedParentOf\(uid\)/);
assert.match(rules, /approvedInvite\(childUid, request\.auth\.uid\)/);
assert.doesNotMatch(rules, /approvedInvite\(request\.auth\.uid, uid\)/);
console.log('PASS Quest Champ Firebase, OAuth, EAS and UID-based family isolation.');
