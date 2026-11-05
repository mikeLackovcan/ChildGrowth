const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function fixture({ anonymous = false, link = null, managed = false } = {}) {
  const writes = [], reads = [], deletes = [], events = [];
  const auth = { currentUser: { uid: anonymous ? 'device-a' : 'parent-a', isAnonymous: anonymous } };
  const documents = new Map([
    ['user_data/parent-a', { managed_family_enabled: managed }],
    ['family_progress/child-a', { coins: 70 }],
    ['profiles/parent-a', { role: 'parent', nickname: 'parent-a', full_name: 'Parent A' }],
    ['profiles/child-account', { role: 'child', nickname: 'mia-champ', full_name: 'Mia', family_code: 'ABCDEFGH' }],
    ['family_account_codes/ABCDEFGH', { uid: 'child-account', role: 'child' }],
  ]);
  const snapshot = ref => ({ id: ref.split('/').pop(), ref, exists: () => documents.has(ref), data: () => documents.get(ref) });
  const mocks = {
    './firebase': { auth, db: {} },
    './devicePairing': {
      getDeviceLink: async () => link,
      listManagedChildren: async () => [{ profile: { uid: 'child-a', role: 'child', full_name: 'Alex', nickname: 'child-a' }, data: { coins: 70 } }],
      deleteManagedFamily: async () => { events.push('managed-cleanup'); },
    },
    'firebase/auth': { deleteUser: async () => { events.push('auth-delete'); } },
    'expo-crypto': { getRandomBytesAsync: async length => new Uint8Array(length) },
    'firebase/firestore': {
      doc: (_db, name, id) => name + '/' + id,
      collection: (_db, name) => name,
      query: name => name,
      where: () => null,
      getDoc: async ref => { reads.push(ref); return snapshot(ref); },
      getDocs: async () => ({ docs: [] }),
      setDoc: async (ref, data) => { writes.push({ ref, data }); },
      deleteDoc: async ref => { deletes.push(ref); events.push(ref); },
      serverTimestamp: () => 'timestamp',
    },
  };
  const filename = path.resolve(__dirname, '../src/lib/familyCloud.ts');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = name => {
    assert.ok(mocks[name], 'Unexpected dependency ' + name);
    return mocks[name];
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return { api: mod.exports, writes, reads, deletes, events };
}

test('paired device reads and writes only its managed child progress', async () => {
  const f = fixture({ anonymous: true, link: { child_uid: 'child-a', parent_uid: 'parent-a' } });
  assert.equal((await f.api.loadOwnCloudData()).coins, 70);
  await f.api.saveOwnCloudData({ coins: 80 });
  await f.api.saveCloudProfile({ nickname: 'child-a', full_name: 'Alex', role: 'child' });
  assert.deepEqual(f.reads, ['family_progress/child-a']);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].ref, 'family_progress/child-a');
  assert.equal(f.writes[0].data.owner_uid, 'child-a');
  assert.deepEqual(await f.api.listFamilyInvites(), []);
});

test('unpaired or revoked anonymous device cannot fall back to legacy account storage', async () => {
  const f = fixture({ anonymous: true });
  await assert.rejects(f.api.loadOwnCloudData(), /pair_not_connected/);
  await assert.rejects(f.api.saveOwnCloudData({ coins: 80 }), /pair_not_connected/);
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.writes, []);
});

test('a restored local profile cannot read or overwrite a different bound child', async () => {
  const f = fixture({ anonymous: true, link: { child_uid: 'child-b', parent_uid: 'parent-a' } });
  await assert.rejects(f.api.loadOwnCloudData('child-a'), /pair_session_changed/);
  await assert.rejects(f.api.saveOwnCloudData({ coins: 80 }, 'child-a'), /pair_session_changed/);
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.writes, []);
});

test('parent saves route by explicit managed-profile identity', async () => {
  const f = fixture();
  await f.api.saveOwnCloudData({ coins: 0 });
  await f.api.saveLinkedChildData('legacy-child', { coins: 20 });
  await f.api.saveLinkedChildData('child-a', { coins: 30 }, true);
  assert.deepEqual(f.writes.map(item => item.ref), [
    'user_data/parent-a', 'user_data/legacy-child', 'family_progress/child-a',
  ]);
});

test('scanned account QR links by stable UID even when its visible nickname is stale', async () => {
  const f = fixture();
  const invite = await f.api.createFamilyInvite('old-child-name', 'parent', 'child-account');
  assert.equal(invite.child_uid, 'child-account');
  assert.equal(invite.child_nickname, 'mia-champ');
  assert.equal(invite.parent_uid, 'parent-a');
  assert.ok(f.reads.includes('profiles/child-account'));
  assert.ok(f.writes.some(item => item.ref === 'family_invites/child-account_parent-a'));
});

test('typed child family code resolves to an approval-based account invite', async () => {
  const f = fixture();
  const invite = await f.api.createFamilyInvite('ABCD-EFGH', 'parent');
  assert.equal(invite.child_uid, 'child-account');
  assert.equal(invite.status, 'pending');
  assert.ok(f.reads.includes('family_account_codes/ABCDEFGH'));
  assert.ok(f.writes.some(item => item.ref === 'family_invites/child-account_parent-a'));
});

test('existing parents do not query undeployed managed collections', async () => {
  const f = fixture();
  assert.deepEqual(await f.api.loadLinkedChildren(), []);
  await f.api.deleteOwnCloudAccount();
  assert.ok(!f.events.includes('managed-cleanup'));
});

test('managed child listing keeps the collection identity for subsequent writes', async () => {
  const f = fixture({ managed: true });
  const children = await f.api.loadLinkedChildren();
  assert.equal(children[0].profile.managed, true);
  assert.equal(children[0].profile.uid, 'child-a');
});

test('managed-family cleanup finishes before removing parent authorization', async () => {
  const f = fixture({ managed: true });
  await f.api.deleteOwnCloudAccount();
  assert.equal(f.events[0], 'managed-cleanup');
  assert.equal(f.events.at(-1), 'auth-delete');
  assert.ok(f.deletes.includes('profiles/parent-a'));
});
