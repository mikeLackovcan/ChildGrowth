const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('../../node_modules/typescript');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { applyProgress } = require('../functions/lib/backend/functions/src/progress');
const { resolveFamilyAccount, getFamilyStatus } = require('../functions/lib/backend/functions/src/accounts');
after(() => db.terminate());
const memory = new Map(), modules = new Map(), calls = [];
const auth = { currentUser: null, authStateReady: async () => {} };
let offline = false, loseResponse = false;
const storage = { getItem: async key => memory.get(key) || null, setItem: async (key, value) => memory.set(key, value), removeItem: async key => memory.delete(key) };
function load(file) {
  file = path.resolve(__dirname, '../../src', file);
  if (!file.endsWith('.ts')) file += '.ts';
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name === 'zustand') return require('../../node_modules/zustand');
    if (name.includes('async-storage')) return storage;
    if (name.includes('i18n')) return { t: key => key, changeLanguage() {} };
    if (name.includes('sound')) return { playSound() {} };
    if (name.endsWith('/firebase') || name === './firebase') return { app: {}, auth, db: {} };
    if (name === 'firebase/auth') return { signOut: async () => { auth.currentUser = null; } };
    if (name === 'firebase/firestore') return {
      doc: (_db, collection, id) => `${collection}/${id}`,
      getDoc: async key => { if (offline) throw Error('offline'); const snap = await db.doc(key).get(); return { exists: () => snap.exists, data: () => snap.data() }; },
      runTransaction: () => { throw Error('Direct client writes are forbidden'); },
      setDoc: () => { throw Error('Direct client writes are forbidden'); },
    };
    if (name === 'firebase/functions') return { getFunctions: () => ({}), httpsCallable: (_functions, endpoint) => async data => {
      if (offline) throw Error('offline');
      const handler = { applyProgress, resolveFamilyAccount, getFamilyStatus }[endpoint];
      assert.ok(handler, `Unexpected callable ${endpoint}`);
      calls.push({ uid: auth.currentUser?.uid, endpoint, data });
      const result = await handler.run({ auth: auth.currentUser ? { uid: auth.currentUser.uid } : undefined, data });
      if (loseResponse && endpoint === 'applyProgress') throw Error('response lost after commit');
      return { data: result };
    } };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { useAppStore: store } = load('store/useAppStore');
const { restoreAuthenticatedAccount } = load('lib/accountSession');
const { hasQueuedProgress, progressBusy } = load('lib/progressQueue');
const { localDay } = load('utils/questDay');
const child = { uid: 'app-progress-child', email: 'app-child@example.test', displayName: 'Child' };
const parent = { uid: 'app-progress-parent', email: 'app-parent@example.test', displayName: 'Parent' };
async function enter(user) { auth.currentUser = user; store.setState(await restoreAuthenticatedAccount(user)); }
async function settle() {
  // Let fire-and-forget local cache saves reach their queued server operation.
  for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
  await store.getState().syncToServer();
  assert.equal(store.getState().syncError, null);
  assert.equal(await hasQueuedProgress(auth.currentUser.uid), false);
}
test('the app store uses real server operations for the complete family quest and reward flow', async t => {
  const today = localDay();
  await db.doc(`profiles/${child.uid}`).set({ role: 'child', nickname: 'appchild', email: child.email, coins: 700, xp: 0, level: 1, current_avatar: 'roblox_noob' });
  await db.doc(`user_data/${child.uid}`).set({ lastActiveDate: today, tasks: [], prizes: ['Park', 'Story'], won_prizes: [], unlocked_avatars: ['roblox_noob'], linked_parents: ['appparent'] });
  await db.doc(`profiles/${parent.uid}`).set({ role: 'parent', nickname: 'appparent', email: parent.email, coins: 0, xp: 0, level: 1 });
  await db.doc(`user_data/${parent.uid}`).set({ lastActiveDate: today, children: [{ id: child.uid, name: 'Child', nickname: 'appchild', isApproved: true, tasks: [], wonPrizes: [] }] });
  await db.doc(`familyLinks/${linkId(parent.uid, child.uid)}`).set({ parentUid: parent.uid, childUid: child.uid, status: 'accepted' });
  await t.test('parent adds a quest; only the selected child receives it', async () => {
    await enter(parent); await store.getState().loadMockState();
    assert.equal(store.getState().selectedChildId, child.uid);
    store.getState().addTask({ name: 'Brush', diff: 'easy', freq: 'daily', mystery: false, requiresApproval: true });
    await settle();
    assert.equal((await db.doc(`user_data/${child.uid}`).get()).data().tasks.length, 1);
    assert.equal((await db.doc(`profiles/${parent.uid}`).get()).data().coins, 0);
    assert.equal(calls.filter(call => call.endpoint === 'applyProgress').at(-1).data.action, 'task.create');
    const created = store.getState().tasks[0];
    assert.equal(store.getState().updateTask(created.id, { name: 'Brush teeth' }, created.revision ?? 0), true);
    const optimisticRevision = store.getState().tasks[0].revision;
    await settle();
    const saved = (await db.doc(`user_data/${child.uid}`).get()).data().tasks[0];
    assert.equal(saved.name, 'Brush teeth');
    assert.equal(saved.revision, optimisticRevision);
  });
  await t.test('offline child completion survives sign-in restoration, then parent approval pays once', async () => {
    await enter(child);
    const taskId = store.getState().tasks[0].id;
    offline = true; store.getState().toggleTaskDone(taskId);
    await new Promise(resolve => setImmediate(resolve)); await store.getState().syncToServer();
    assert.equal(store.getState().tasks[0].pendingApproval, true); assert.equal(store.getState().coins, 700);
    assert.equal(await hasQueuedProgress(child.uid), true);
    offline = false; await enter(child);
    assert.equal(store.getState().tasks[0].pendingApproval, true);
    await settle();
    await enter(parent); await store.getState().loadMockState();
    store.getState().verifyChildTask(child.uid, taskId, true);
    store.getState().verifyChildTask(child.uid, taskId, true);
    await settle();
    assert.equal((await db.doc(`profiles/${child.uid}`).get()).data().coins, 712);
    await enter(child); assert.equal(store.getState().tasks[0].done, true); assert.equal(store.getState().coins, 712);
  });
  await t.test('Epic, server-selected wheel and approval-gated redemption complete the daily adventure', async () => {
    assert.ok(store.getState().claimEpicBoss()); await settle();
    const prize = await store.getState().spinPrize();
    assert.ok(['Park', 'Story'].includes(prize.prize));
    assert.deepEqual(prize.pool, ['Park', 'Story']);
    assert.equal(store.getState().wonPrizes[0].id, prize.id);
    store.getState().requestPrize(prize.id); await settle();
    store.getState().togglePrizeRedeemed(prize.id); await settle();
    assert.equal(store.getState().wonPrizes[0].redeemed, false);
    await enter(parent); await store.getState().loadMockState();
    store.getState().approvePrize(child.uid, prize.id); await settle();
    await enter(child); store.getState().togglePrizeRedeemed(prize.id); await settle();
    assert.equal((await db.doc(`user_data/${child.uid}`).get()).data().won_prizes[0].redeemed, true);
  });
  await t.test('lost purchase response retries one charge and one fighter unlock', async () => {
    const before = store.getState().coins;
    loseResponse = true;
    assert.equal(await store.getState().buyAvatar('roblox_bacon_hair'), false);
    assert.equal(store.getState().coins, before);
    assert.equal(store.getState().unlockedAvatars.includes('roblox_bacon_hair'), false);
    await new Promise(resolve => setImmediate(resolve)); await store.getState().syncToServer();
    assert.equal(await hasQueuedProgress(child.uid), true);
    loseResponse = false; await settle();
    assert.equal(store.getState().coins, before - 350);
    assert.equal(store.getState().unlockedAvatars.filter(id => id === 'roblox_bacon_hair').length, 1);
    assert.equal(store.getState().currentAvatar, 'roblox_bacon_hair');
    const server = (await db.doc(`profiles/${child.uid}`).get()).data(); assert.equal(server.coins, before - 350);
  });
  await t.test('equipment and world purchases use confirmed server ownership and prices', async () => {
    const before = store.getState().coins;
    assert.equal(await store.getState().setCurrentAvatar('roblox_noob'), true);
    assert.equal(store.getState().currentAvatar, 'roblox_noob');
    assert.equal(await store.getState().buyAvatar('roblox_bacon_hair'), true);
    assert.equal(store.getState().coins, before, 'an owned fighter must not charge again');
    assert.equal(store.getState().currentAvatar, 'roblox_bacon_hair');
    assert.equal(await store.getState().unlockTheme('space', 0), true);
    assert.equal(store.getState().coins, before - 150, 'server catalog price overrides the client argument');
    assert.equal(store.getState().activeTheme, 'space');
    assert.equal(await store.getState().setActiveTheme('classic'), true);
    assert.equal(store.getState().activeTheme, 'classic');
    assert.equal(await store.getState().setActiveTheme('space'), true);
    assert.equal(store.getState().coins, before - 150, 'equipping an owned world is free');
  });
  await t.test('offline equipment stays unchanged until the saved operation is confirmed', async () => {
    offline = true;
    assert.equal(await store.getState().setCurrentAvatar('roblox_noob'), false);
    assert.equal(store.getState().currentAvatar, 'roblox_bacon_hair');
    assert.equal(await hasQueuedProgress(child.uid), true);
    offline = false; await settle();
    assert.equal(store.getState().currentAvatar, 'roblox_noob');
  });
  await t.test('outfits survive account restoration without currency or fighter changes', async () => {
    const before = store.getState().coins, fighter = store.getState().currentAvatar;
    assert.equal(await store.getState().setFighterOutfit('roblox_noob', 'explorer'), true);
    assert.equal(store.getState().fighterOutfits.roblox_noob, 'explorer');
    await enter(parent); assert.deepEqual(store.getState().fighterOutfits, {});
    await enter(child); assert.equal(store.getState().fighterOutfits.roblox_noob, 'explorer');
    assert.equal(store.getState().coins, before); assert.equal(store.getState().currentAvatar, fighter);
    assert.equal(await store.getState().setFighterOutfit('roblox_ninja', 'explorer'), false);
    assert.equal(await store.getState().setFighterOutfit('roblox_noob', 'original'), true);
    assert.deepEqual(store.getState().fighterOutfits, {});
  });
  await t.test('daily gift displays the saved roll and preserves the once-per-day limit', async () => {
    const before = store.getState().coins;
    const gift = await store.getState().claimDailyLoginChest();
    assert.ok(gift.coins >= 30 && gift.coins <= 44); assert.equal(store.getState().coins, before + gift.coins);
    await store.getState().claimDailyLoginChest();
    assert.equal(store.getState().coins, before + gift.coins);
    assert.equal(progressBusy(), false);
  });
  await t.test('a child’s daily feeling reaches the accepted parent without changing rewards', async () => {
    await enter(child);
    const before = store.getState().coins;
    store.getState().setDailyMood('wiped'); await settle();
    await enter(parent); await store.getState().loadMockState();
    const linked = store.getState().children.find(item => item.id === child.uid);
    assert.equal(linked.dailyMood, 'wiped');
    assert.equal(linked.lastActiveDate, localDay());
    assert.equal(linked.coins, before);
    await enter(child); assert.equal(store.getState().dailyMood, 'wiped');
  });

});
