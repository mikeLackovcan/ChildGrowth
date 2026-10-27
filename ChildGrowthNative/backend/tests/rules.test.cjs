const { test, after } = require('node:test');
const fs = require('node:fs'), path = require('node:path');
const backendRequire = require('node:module').createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeTestEnvironment, assertSucceeds, assertFails } = backendRequire('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } = backendRequire('firebase/firestore');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
let environment;
after(async () => { if (environment) await environment.cleanup(); });
test('Firestore rules isolate family data and reject forged authority', async t => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({ projectId: 'demo-questblox', firestore: { host, port: Number(port), rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'profiles/rules-child'), { role: 'child', coins: 5 });
    await setDoc(doc(db, 'user_data/rules-child'), { tasks: [], linked_parents: ['forged-parent'] });
    await setDoc(doc(db, 'battles/rules-battle'), { participants: ['rules-child', 'rules-sibling'] });
    await setDoc(doc(db, 'familyLinks/rules-link'), { participants: ['rules-child', 'rules-parent'], status: 'pending' });
  });
  const child = environment.authenticatedContext('rules-child').firestore();
  const parent = environment.authenticatedContext('rules-parent').firestore();
  const outsider = environment.authenticatedContext('rules-outsider').firestore();
  const anonymous = environment.unauthenticatedContext().firestore();
  await t.test('owners can read their own profile; outsiders cannot browse or read it', async () => {
    await assertSucceeds(getDoc(doc(child, 'profiles/rules-child')));
    await assertFails(getDoc(doc(outsider, 'profiles/rules-child')));
    await assertFails(getDoc(doc(anonymous, 'profiles/rules-child')));
    await assertFails(getDocs(collection(child, 'profiles')));
  });
  await t.test('only a server-created accepted grant permits parent reads; revocation is immediate', async () => {
    await assertFails(getDoc(doc(parent, 'user_data/rules-child')));
    await assertFails(setDoc(doc(parent, 'familyAccess/rules-child/parents/rules-parent'), { accepted: true }));
    await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'familyAccess/rules-child/parents/rules-parent'), { accepted: true }));
    await assertSucceeds(getDoc(doc(parent, 'user_data/rules-child')));
    await assertSucceeds(getDoc(doc(parent, 'profiles/rules-child')));
    await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'familyAccess/rules-child/parents/rules-parent'), { accepted: false }));
    await assertFails(getDoc(doc(parent, 'user_data/rules-child')));
  });
  await t.test('clients cannot forge roles, currency, memberships, tokens, jobs or battle moves', async () => {
    for (const destination of ['profiles/rules-child', 'user_data/rules-child', 'familyLinks/rules-link', 'battles/rules-battle', 'pushDevices/forged', 'notificationOutbox/forged', 'pushJobs/forged', 'nicknames/forged']) {
      await assertFails(setDoc(doc(child, destination), { role: 'parent', coins: 999999, status: 'accepted' }));
    }
  });
  await t.test('participants can query their own battles without exposing other families', async () => {
    await assertSucceeds(getDocs(query(collection(child, 'battles'), where('participants', 'array-contains', 'rules-child'))));
    await assertFails(getDoc(doc(outsider, 'battles/rules-battle')));
    await assertFails(getDocs(collection(child, 'battles')));
    await assertFails(getDoc(doc(child, 'pushDevices/forged')));
  });
});
