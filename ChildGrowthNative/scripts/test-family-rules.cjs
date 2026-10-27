const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction, Timestamp } = require('firebase/firestore');
let environment;
const code = 'ABCDEFGH2345';
const parent = uid => environment.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const device = uid => environment.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-quest-champ',
    firestore: { host: '127.0.0.1', port: 8087, rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
after(async () => { await environment?.cleanup(); });
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    await Promise.all(['parent-a', 'parent-b'].map(uid => setDoc(doc(context.firestore(), 'profiles', uid), { role: 'parent', nickname: uid, full_name: uid })));
  });
});
async function createChild(id = 'child-a', owner = 'parent-a') {
  const db = parent(owner);
  const batch = writeBatch(db);
  batch.set(doc(db, 'family_children', id), { uid: id, parent_uid: owner, full_name: 'Alex', nickname: id, role: 'child' });
  batch.set(doc(db, 'family_progress', id), { coins: 0, tasks: [] });
  batch.set(doc(db, 'user_data', owner), { managed_family_enabled: true }, { merge: true });
  await assertSucceeds(batch.commit());
}
async function issueCode() {
  await createChild();
  await assertSucceeds(setDoc(doc(parent('parent-a'), 'family_codes', code), {
    parent_uid: 'parent-a', child_uid: 'child-a', expires_at: Timestamp.fromMillis(Date.now() + 15 * 60_000), claimed_by: '',
  }));
}
async function claim(db, uid, ticketCode = code) {
  return runTransaction(db, async tx => {
    const ticket = await tx.get(doc(db, 'family_codes', ticketCode));
    const data = ticket.data();
    tx.update(ticket.ref, { claimed_by: uid });
    tx.set(doc(db, 'family_devices', uid), { parent_uid: data.parent_uid, child_uid: data.child_uid, code: ticketCode });
  });
}
test('parent can create and query only their own child profiles', async () => {
  await createChild();
  await assertSucceeds(getDocs(query(collection(parent('parent-a'), 'family_children'), where('parent_uid', '==', 'parent-a'))));
  await assertFails(getDoc(doc(parent('parent-b'), 'family_children', 'child-a')));
  await assertFails(getDoc(doc(parent('parent-b'), 'family_progress', 'child-a')));
  await assertFails(setDoc(doc(parent('parent-b'), 'family_progress', 'child-a'), { coins: 999 }));
});
test('guest cannot create a parent profile, list codes or read child progress', async () => {
  await issueCode();
  const db = device('device-a');
  await assertFails(setDoc(doc(db, 'profiles', 'device-a'), { role: 'parent', nickname: 'fake', full_name: 'fake' }));
  await assertFails(getDocs(collection(db, 'family_codes')));
  await assertFails(getDoc(doc(db, 'family_children', 'child-a')));
  await assertFails(getDoc(doc(db, 'family_progress', 'child-a')));
});
test('atomic one-time pairing grants access only to the selected child', async () => {
  await issueCode();
  await createChild('child-b');
  const db = device('device-a');
  await assertSucceeds(claim(db, 'device-a'));
  await assertSucceeds(getDoc(doc(db, 'family_children', 'child-a')));
  await assertSucceeds(updateDoc(doc(db, 'family_progress', 'child-a'), { coins: 50 }));
  assert.equal((await getDoc(doc(parent('parent-a'), 'family_progress', 'child-a'))).data().coins, 50);
  await assertFails(getDoc(doc(db, 'family_progress', 'child-b')));
  await assertFails(claim(device('device-b'), 'device-b'));
});
test('parent and paired child exchange progress while duplicate reward writes stay idempotent', async () => {
  await issueCode();
  await createChild('child-b');
  const childDevice = device('device-a');
  const owner = parent('parent-a');
  await assertSucceeds(claim(childDevice, 'device-a'));
  await assertSucceeds(setDoc(doc(childDevice, 'family_progress', 'child-a'), {
    coins: 0, tasks: [{ id: 'read', pendingApproval: true, done: false }], reward_operations: [],
  }, { merge: true }));
  assert.equal((await getDoc(doc(owner, 'family_progress', 'child-a'))).data().tasks[0].pendingApproval, true);

  const grantOnce = () => runTransaction(owner, async tx => {
    const ref = doc(owner, 'family_progress', 'child-a');
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    const operation = 'read:2026-10-27';
    if ((data.reward_operations || []).includes(operation)) return;
    tx.update(ref, {
      coins: (data.coins || 0) + 25,
      tasks: data.tasks.map(task => task.id === 'read' ? { ...task, pendingApproval: false, done: true, rewardedCoins: 25 } : task),
      reward_operations: [...(data.reward_operations || []), operation],
    });
  });
  await assertSucceeds(grantOnce());
  await assertSucceeds(grantOnce());
  const restored = (await getDoc(doc(childDevice, 'family_progress', 'child-a'))).data();
  assert.equal(restored.coins, 25);
  assert.equal(restored.tasks[0].done, true);
  await assertFails(getDoc(doc(childDevice, 'family_progress', 'child-b')));
});
test('device cannot claim a code without the matching binding or forge a binding', async () => {
  await issueCode();
  const db = device('device-a');
  await assertFails(updateDoc(doc(db, 'family_codes', code), { claimed_by: 'device-a' }));
  await assertFails(setDoc(doc(db, 'family_devices', 'device-a'), { parent_uid: 'parent-a', child_uid: 'child-a', code }));
});
test('expired codes cannot be consumed', async () => {
  await issueCode();
  await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'family_codes', code), {
    expires_at: Timestamp.fromMillis(Date.now() - 60_000),
  }));
  await assertFails(claim(device('device-a'), 'device-a'));
});
test('connected devices cannot change profile ownership or their binding', async () => {
  await issueCode();
  const db = device('device-a');
  await assertSucceeds(claim(db, 'device-a'));
  await assertFails(updateDoc(doc(db, 'family_devices', 'device-a'), { child_uid: 'child-b' }));
  await assertFails(updateDoc(doc(db, 'family_children', 'child-a'), { parent_uid: 'device-a' }));
  await assertFails(updateDoc(doc(parent('parent-a'), 'family_children', 'child-a'), { parent_uid: 'parent-b' }));
});

test('parent revocation immediately removes access and the consumed code cannot reconnect', async () => {
  await issueCode();
  const db = device('device-a');
  await assertSucceeds(claim(db, 'device-a'));
  await assertFails(deleteDoc(doc(parent('parent-b'), 'family_devices', 'device-a')));
  await assertSucceeds(deleteDoc(doc(parent('parent-a'), 'family_devices', 'device-a')));
  await assertFails(getDoc(doc(db, 'family_progress', 'child-a')));
  await assertFails(updateDoc(doc(db, 'family_progress', 'child-a'), { coins: 999 }));
  await assertFails(claim(db, 'device-a'));
  assert.equal((await getDoc(doc(parent('parent-a'), 'family_progress', 'child-a'))).data().coins, 0);
});

test('lost-phone recovery revokes the old device and restores the same cloud profile on a new one', async () => {
  await issueCode();
  const oldDevice = device('device-a');
  await assertSucceeds(claim(oldDevice, 'device-a'));
  await assertSucceeds(updateDoc(doc(oldDevice, 'family_progress', 'child-a'), { coins: 70 }));
  const owner = parent('parent-a');
  await assertSucceeds(deleteDoc(doc(owner, 'family_devices', 'device-a')));
  await assertSucceeds(deleteDoc(doc(owner, 'family_codes', code)));
  const recoveryCode = 'JKLMNPQR6789';
  await assertSucceeds(setDoc(doc(owner, 'family_codes', recoveryCode), {
    parent_uid: 'parent-a', child_uid: 'child-a', expires_at: Timestamp.fromMillis(Date.now() + 15 * 60_000), claimed_by: '',
  }));
  const newDevice = device('device-b');
  await assertSucceeds(claim(newDevice, 'device-b', recoveryCode));
  await assertFails(getDoc(doc(oldDevice, 'family_progress', 'child-a')));
  const restored = await assertSucceeds(getDoc(doc(newDevice, 'family_progress', 'child-a')));
  assert.equal(restored.data().coins, 70);
  assert.equal((await getDocs(query(collection(owner, 'family_children'), where('parent_uid', '==', 'parent-a')))).size, 1);
});

test('disconnecting a device preserves child progress and blocks other devices from disconnecting it', async () => {
  await issueCode();
  const db = device('device-a');
  await assertSucceeds(claim(db, 'device-a'));
  await assertSucceeds(updateDoc(doc(db, 'family_progress', 'child-a'), { coins: 70 }));
  await assertFails(deleteDoc(doc(device('device-b'), 'family_devices', 'device-a')));
  await assertSucceeds(deleteDoc(doc(db, 'family_devices', 'device-a')));
  await assertFails(getDoc(doc(db, 'family_children', 'child-a')));
  assert.equal((await getDoc(doc(parent('parent-a'), 'family_progress', 'child-a'))).data().coins, 70);
});

test('parent account cleanup can remove managed family data in authorization-safe order', async () => {
  await issueCode();
  await assertSucceeds(claim(device('device-a'), 'device-a'));
  const db = parent('parent-a');
  for (const name of ['family_devices', 'family_codes']) {
    const rows = await assertSucceeds(getDocs(query(collection(db, name), where('parent_uid', '==', 'parent-a'))));
    for (const row of rows.docs) await assertSucceeds(deleteDoc(row.ref));
  }
  await assertSucceeds(deleteDoc(doc(db, 'family_progress', 'child-a')));
  await assertSucceeds(deleteDoc(doc(db, 'family_children', 'child-a')));
  await assertSucceeds(deleteDoc(doc(db, 'profiles', 'parent-a')));
  await assertFails(getDoc(doc(device('device-a'), 'family_progress', 'child-a')));
  await environment.withSecurityRulesDisabled(async context => {
    for (const name of ['family_devices', 'family_codes', 'family_progress', 'family_children']) {
      assert.equal((await getDocs(collection(context.firestore(), name))).size, 0);
    }
  });
});

test('atomic managed profile deletion does not delete or expose a sibling', async () => {
  await issueCode();
  await createChild('child-b');
  await assertSucceeds(claim(device('device-a'), 'device-a'));
  const db = parent('parent-a');
  await assertSucceeds(deleteDoc(doc(db, 'family_devices', 'device-a')));
  await assertSucceeds(deleteDoc(doc(db, 'family_codes', code)));
  const batch = writeBatch(db);
  batch.delete(doc(db, 'family_progress', 'child-a'));
  batch.delete(doc(db, 'family_children', 'child-a'));
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(doc(device('device-a'), 'family_progress', 'child-a'), { coins: 999 }));
  await assertSucceeds(getDoc(doc(db, 'family_progress', 'child-b')));
  await assertSucceeds(updateDoc(doc(db, 'family_progress', 'child-b'), { coins: 30 }));
});
