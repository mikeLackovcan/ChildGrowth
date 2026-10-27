const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function fixture() {
  let state = { userId: 'child-a', nickname: 'family_child-a', role: 'child', deviceConnection: 'linked',
    coins: 70, linkedParents: ['parent-a'], parentEmail: 'parent-a', approvalStatus: 'approved',
    tasks: [{ id: 'a' }], lastSpinDate: '2026-10-23' };
  const auth = { currentUser: { uid: 'device-a', isAnonymous: true }, authStateReady: async () => {} };
  const world = { spentPower: 500, placements: [{ plotId: 'home', type: 'home', level: 2 }], updatedAt: 10, hydrate: async () => {} };
  const saved = new Map(), events = [];
  const control = {
    release: async () => {},
    signOut: async () => { auth.currentUser = null; },
    write: async (key, value) => { saved.set(key, value); },
  };
  const mocks = {
    'firebase/auth': { signOut: async () => { events.push('sign-out'); await control.signOut(); } },
    './firebase': { auth },
    './projectStorage': { default: { setItem: (...args) => control.write(...args) } },
    './devicePairing': { releaseDeviceLink: async () => { events.push('revoke'); await control.release(); } },
    './familyCloud': { loadOwnCloudData: async () => ({ coins: 70, total_earned: 100 }) },
    '../store/useAppStore': { useAppStore: { getState: () => state, setState: patch => { state = { ...state, ...patch }; } } },
    '../store/useWorldStore': { useWorldStore: { getState: () => world } },
  };
  const filename = path.resolve(__dirname, '../src/lib/disconnectManagedDevice.ts');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = name => { assert.ok(mocks[name]); return { __esModule: true, ...mocks[name] }; };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return { disconnect: mod.exports.disconnectManagedDevice, state: () => state,
    patch: patch => { state = { ...state, ...patch }; }, control, auth, saved, events };
}
test('disconnect revokes before sign-out and retains profile, wallet, town and wheel state', async () => {
  const f = fixture();
  await f.disconnect();
  assert.deepEqual(f.events, ['revoke', 'sign-out']);
  assert.equal(f.state().deviceConnection, 'local');
  assert.equal(f.state().userId, 'child-a');
  assert.equal(f.state().coins, 70);
  assert.deepEqual(f.state().linkedParents, []);
  const saved = JSON.parse(f.saved.get('mockState_family_child-a'));
  assert.equal(saved.lastSpinDate, '2026-10-23');
  assert.equal(saved.deviceConnection, 'local');
  assert.equal(JSON.parse(f.saved.get('world_child-a')).spentPower, 500);
  assert.ok(f.saved.has('device_disconnect_backup_child-a'));
  assert.deepEqual(JSON.parse(f.saved.get('device_reconnect_baseline_child-a')), { coins: 70, total_earned: 100 });
});
test('failed revocation does not report disconnected or sign out', async () => {
  const f = fixture();
  f.control.release = async () => { throw new Error('offline'); };
  await assert.rejects(f.disconnect(), /offline/);
  assert.equal(f.state().deviceConnection, 'linked');
  assert.deepEqual(f.events, ['revoke']);
  assert.equal(f.state().coins, 70);
});
test('backup storage failure prevents remote revocation', async () => {
  const f = fixture();
  f.control.write = async () => { throw new Error('disk-full'); };
  await assert.rejects(f.disconnect(), /disk-full/);
  assert.deepEqual(f.events, []);
  assert.equal(f.state().deviceConnection, 'linked');
});
test('notification progress during revocation is retained in the offline snapshot', async () => {
  const f = fixture();
  f.control.release = async () => { f.patch({ coins: 80 }); };
  await f.disconnect();
  assert.equal(JSON.parse(f.saved.get('mockState_family_child-a')).coins, 80);
});
test('a changed auth session is never signed out by a late disconnect', async () => {
  const f = fixture();
  f.control.release = async () => { f.auth.currentUser = { uid: 'parent-b', isAnonymous: false }; };
  await assert.rejects(f.disconnect(), /pair_session_changed/);
  assert.deepEqual(f.events, ['revoke']);
  assert.equal(f.auth.currentUser.uid, 'parent-b');
});
test('parent accounts cannot use the child disconnect operation', async () => {
  const f = fixture();
  f.patch({ role: 'parent' });
  await assert.rejects(f.disconnect(), /pair_use_child_device/);
  assert.deepEqual(f.events, []);
});
