const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const storage = new Map();
const cancelled = [];
let cloudOwnReads = 0;
let cloudOwnPayload = { coins: 999 };
let deleteManagedHandler = async () => {};
let linkedReadHandler = async () => [];
let inviteReadHandler = async () => [];
const mocks = {
  '../lib/accountRole': { loadAccountRole: async () => 'parent' },
  '../lib/firebase': { auth: { currentUser: null }, db: {} },
  'firebase/auth': {},
  'firebase/firestore': {},
  '../lib/familyCloud': {
    loadOwnCloudData: async () => { cloudOwnReads++; return cloudOwnPayload; },
    loadLinkedChildren: () => linkedReadHandler(),
    listFamilyInvites: () => inviteReadHandler(),
  },
  './devicePairing': { deleteManagedChild: (...args) => deleteManagedHandler(...args) },
  '../lib/projectStorage': { default: {
    getItem: async key => storage.get(key) || null,
    setItem: async (key, value) => { storage.set(key, value); },
    removeItem: async key => { storage.delete(key); },
  } },
  '../i18n': { default: { changeLanguage() {}, t: (key, fallback) => typeof fallback === 'string' ? fallback : key } },
  '../lib/sound': { playSound() {} },
  '../lib/notifications': { cancelQuestNotification: async id => { cancelled.push(id); } },
};
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  cache.set(file, mod);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  const nativeRequire = mod.require.bind(mod);
  mod.require = spec => {
    if (mocks[spec]) return { __esModule: true, ...mocks[spec] };
    const target = path.resolve(path.dirname(file), spec + '.ts');
    return spec.startsWith('.') && fs.existsSync(target) ? load(target) : nativeRequire(spec);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, file);
  return mod.exports;
}
const { localDateKey, freshTaskDay, isQuestDue } = load(path.join(root, 'src/lib/questSchedule.ts'));
const { normalizeActivity, recordQuestActivity, weeklyProgress } = load(path.join(root, 'src/lib/weeklyProgress.ts'));
const { importGuestProgress, hasPlayedProgress } = load(path.join(root, 'src/lib/familyProgress.ts'));
const { reconnectProgress } = load(path.join(root, 'src/lib/reconnectProgress.ts'));
const { calculateQuestReward } = load(path.join(root, 'src/lib/heroRewards.ts'));
const { reminderPlan } = load(path.join(root, 'src/lib/reminderPlan.ts'));
const { wheelChoices, wheelPrizePresentation } = load(path.join(root, 'src/lib/wheelPrizePresentation.ts'));
const { todayBuildPower, worldPowerBalance, canPlaceBuilding, WORLD_BUILDINGS, WORLD_PLOTS, newlyAffordableBuilding } = load(path.join(root, 'src/lib/worldEconomy.ts'));
const { worldDropTarget } = load(path.join(root, 'src/lib/worldPlacement.ts'));

test('town drops reject off-map, nonfinite, occupied and distant targets', () => {
  assert.equal(worldDropTarget(199, 72, []), 'north');
  assert.equal(worldDropTarget(-1, 292, []), null);
  assert.equal(worldDropTarget(401, 292, []), null);
  assert.equal(worldDropTarget(200, -1, []), null);
  assert.equal(worldDropTarget(200, 561, []), null);
  assert.equal(worldDropTarget(NaN, 142, []), null);
  assert.equal(worldDropTarget(199, 72, [{ plotId: 'north', type: 'home', level: 1 }]), null);
  assert.equal(worldDropTarget(200, 0, []), null);
  assert.equal(worldDropTarget(199, 72, WORLD_PLOTS.map(plot => ({ plotId: plot.id, type: 'tree', level: 1 }))), null);
});
const { useAppStore: store } = load(path.join(root, 'src/store/useAppStore.ts'));
const { useWorldStore: worldStore } = load(path.join(root, 'src/store/useWorldStore.ts'));
const { deleteChildProfile } = load(path.join(root, 'src/lib/deleteChildProfile.ts'));
const initial = store.getState();
test('confirmed empty managed family clears stale selection while retaining a local recovery copy', async () => {
  storage.clear();
  cloudOwnPayload = { managed_family_enabled: true };
  mocks['../lib/firebase'].auth.currentUser = { uid: 'parent-a', isAnonymous: false };
  reset({ role: 'parent', userId: 'parent-a', nickname: 'parent', userEmail: 'parent@test.local',
    selectedChildId: 'deleted', children: [{ id: 'deleted', managed: true }], coins: 75,
    tasks: [task('old')], prizes: ['Old prize'], wonPrizes: [{ id: 'old', prize: 'Old prize' }] });
  try {
    await store.getState().loadMockState();
    assert.deepEqual(store.getState().children, []);
    assert.equal(store.getState().selectedChildId, null);
    assert.equal(store.getState().coins, 0);
    assert.deepEqual(store.getState().tasks, []);
    assert.deepEqual(store.getState().prizes, []);
    assert.equal(store.getState().userId, 'parent-a');
    assert.equal(JSON.parse(storage.get('family_refresh_backup_parent-a')).coins, 75);
  } finally { cloudOwnPayload = { coins: 999 }; mocks['../lib/firebase'].auth.currentUser = null; storage.clear(); }
});
test('empty or failed family lookup preserves local progress without authoritative managed confirmation', async () => {
  for (const scenario of ['missing-marker', 'legacy-child', 'offline']) {
    storage.clear();
    cloudOwnPayload = scenario === 'missing-marker' ? {} : { managed_family_enabled: true };
    linkedReadHandler = async () => {
      if (scenario === 'offline') throw new Error('offline');
      return [];
    };
    mocks['../lib/firebase'].auth.currentUser = { uid: 'parent-a', isAnonymous: false };
    reset({ role: 'parent', userId: 'parent-a', nickname: 'parent', userEmail: 'parent@test.local',
      selectedChildId: 'kept', children: [{ id: 'kept', managed: scenario !== 'legacy-child' }],
      coins: 75, tasks: [task('kept-task')] });
    try {
      await store.getState().loadMockState();
      assert.equal(store.getState().selectedChildId, 'kept', scenario);
      assert.equal(store.getState().children[0].id, 'kept', scenario);
      assert.equal(store.getState().coins, 75, scenario);
      assert.equal(store.getState().tasks[0].id, 'kept-task', scenario);
      assert.equal(storage.has('family_refresh_backup_parent-a'), false, scenario);
    } finally {
      cloudOwnPayload = { coins: 999 };
      linkedReadHandler = async () => [];
      mocks['../lib/firebase'].auth.currentUser = null;
      storage.clear();
    }
  }
});
test('late family response cannot replace a different account', async () => {
  mocks['../lib/firebase'].auth.currentUser = { uid: 'parent-a', isAnonymous: false };
  reset({ role: 'parent', userId: 'parent-a', nickname: 'parent', userEmail: 'parent@test.local' });
  linkedReadHandler = async () => {
    store.setState({ userId: 'parent-b', coins: 42, children: [] });
    mocks['../lib/firebase'].auth.currentUser = { uid: 'parent-b' };
    return [{ profile: { uid: 'child-a', full_name: 'Old child', nickname: 'old', managed: true }, data: { coins: 999 } }];
  };
  try {
    await store.getState().loadMockState();
    assert.equal(store.getState().userId, 'parent-b');
    assert.equal(store.getState().coins, 42);
    assert.deepEqual(store.getState().children, []);
  } finally { linkedReadHandler = async () => []; mocks['../lib/firebase'].auth.currentUser = null; }
});
const { authErrorKey } = load(path.join(root, 'src/lib/authMessages.ts'));
test('late invitation lookup cannot apply child progress to a switched account', async () => {
  storage.clear();
  mocks['../lib/firebase'].auth.currentUser = { uid: 'child-a', isAnonymous: false };
  reset({ role: 'child', userId: 'child-a', nickname: 'child-a', userEmail: 'child@test.local', coins: 10 });
  inviteReadHandler = async () => {
    store.setState({ userId: 'parent-b', role: 'parent', coins: 42 });
    mocks['../lib/firebase'].auth.currentUser = { uid: 'parent-b', isAnonymous: false };
    return [];
  };
  try {
    await store.getState().loadMockState();
    assert.equal(store.getState().userId, 'parent-b');
    assert.equal(store.getState().coins, 42);
    assert.equal(storage.has('mockState_child-a'), false);
  } finally {
    inviteReadHandler = async () => [];
    mocks['../lib/firebase'].auth.currentUser = null;
    storage.clear();
  }
});
test('authentication diagnostics map to safe localizable guidance without exposing provider messages', () => {
  assert.equal(authErrorKey({ code: 'auth/network-request-failed' }), 'auth_network');
  assert.equal(authErrorKey({ code: 'auth/wrong-password' }), 'auth_credentials');
  assert.equal(authErrorKey({ code: 'auth/user-not-found' }), 'auth_credentials');
  assert.equal(authErrorKey({ code: 'auth/popup-blocked' }), 'auth_popup_blocked');
  assert.equal(authErrorKey(new Error('auth_expo_required')), 'auth_expo_required');
  assert.equal(authErrorKey({ code: 'unknown', message: 'sensitive diagnostic' }), 'auth_failed');
  assert.equal(authErrorKey(null), 'auth_failed');
  assert.equal(authErrorKey(new Error('token=private')), 'auth_failed');
});
test('native destructive dialog cancels on dismissal and requires explicit confirmation', async () => {
  let buttons, options;
  mocks['react-native'] = { Platform: { OS: 'android' }, Alert: {
    alert: (_title, _message, actions, settings) => { buttons = actions; options = settings; },
  } };
  const { confirmAction } = load(path.join(root, 'src/lib/confirmAction.ts'));
  let result = confirmAction('Delete?', 'Delete', 'Cancel');
  assert.equal(buttons[0].text, 'Cancel');
  assert.equal(buttons[1].style, 'destructive');
  options.onDismiss();
  assert.equal(await result, false);
  result = confirmAction('Delete?', 'Delete', 'Cancel');
  buttons[0].onPress();
  assert.equal(await result, false);
  result = confirmAction('Delete?', 'Delete', 'Cancel');
  buttons[1].onPress();
  options.onDismiss();
  assert.equal(await result, true);
});
const { parentActionScopeMatches } = load(path.join(root, 'src/lib/parentActionScope.ts'));
test('delayed parent confirmations cannot target a sibling, another account or a removed child', () => {
  reset({ role: 'parent', userId: 'p', selectedChildId: 'a', children: [{ id: 'a', isApproved: true }] });
  assert.equal(parentActionScopeMatches('p', 'a'), true);
  assert.equal(parentActionScopeMatches('p', 'b'), false);
  assert.equal(parentActionScopeMatches('other', 'a'), false);
  store.setState({ familyOperationBusy: true });
  assert.equal(parentActionScopeMatches('p', 'a'), false);
  store.setState({ familyOperationBusy: false, children: [] });
  assert.equal(parentActionScopeMatches('p', 'a'), false);
});
const { saveChildPrizes } = load(path.join(root, 'src/lib/saveChildPrizes.ts'));
test('parent wheel editor rejects stale sibling and account drafts', () => {
  reset({ role: 'parent', userId: 'parent-a', selectedChildId: 'b', prizes: ['B reward'],
    children: [{ id: 'a', isApproved: true, prizes: ['A reward'] }, { id: 'b', isApproved: true, prizes: ['B reward'] }] });
  assert.equal(saveChildPrizes('parent-a', 'a', ['Wrong draft']), false);
  assert.equal(saveChildPrizes('parent-b', 'b', ['Wrong account']), false);
  assert.deepEqual(store.getState().prizes, ['B reward']);
  assert.equal(saveChildPrizes('parent-a', 'b', [' New reward ', '']), true);
  assert.deepEqual(store.getState().prizes, ['New reward']);
  assert.deepEqual(store.getState().children[0].prizes, ['A reward']);
  store.setState({ familyOperationBusy: true });
  assert.equal(saveChildPrizes('parent-a', 'b', ['During deletion']), false);
  store.setState({ familyOperationBusy: false, children: [] });
  assert.equal(saveChildPrizes('parent-a', 'b', ['Deleted child']), false);
  store.setState({ role: 'child' });
  assert.equal(saveChildPrizes('parent-a', 'b', ['Not parent']), false);
});
test('legacy child-link routes reuse verified pairing without simulated approval or profile mutation', () => {
  for (const route of ['child-onboard', 'waiting']) {
    const source = fs.readFileSync(path.join(root, 'src/app', route + '.tsx'), 'utf8');
    assert.match(source, /export \{ default \} from '\.\/link-account';/);
    assert.doesNotMatch(source, /sendParentInvite|setUser\(|router\.replace|TextInput/);
  }
});
const task = (id, extra = {}) => ({
  id, name: id, icon: '⭐', freq: 'daily', diff: 'med', mystery: false,
  done: false, date: localDateKey(), ...extra,
});
const reset = (extra = {}) => {
  store.setState({ ...initial, userEmail: 'guest@local', userId: 'guest-local', role: 'child',
    saveMockState: async () => {}, ...extra }, true);
};

test('guest migration detects every independent progress signal', () => {
  for (const progress of [
    { total_earned: -1, coins: 50 },
    { total_earned: -1, coins: -1, xp: 10 },
    { last_spin_date: localDateKey() },
    { activity_history: [{ taskId: 'deleted', date: localDateKey(), completed: true }] },
    { tasks: [task('pending', { pendingApproval: true })] },
    { tasks: [task('focus', { activeFocusStartedAt: new Date().toISOString() })] },
  ]) {
    assert.equal(hasPlayedProgress(progress), true);
    assert.throws(() => importGuestProgress({ coins: 10 }, progress, 'attempt'), /pair_progress_conflict/);
  }
});

test('reconnection keeps local changes when the cloud has not changed', () => {
  const baseline = { coins: 30, tasks: [], world: { spentPower: 0 }, updated_at: 'old' };
  const cloud = { ...baseline, updated_at: 'new', owner_uid: 'child-a' };
  const local = { coins: 10, tasks: [], world: { spentPower: 500 } };
  const result = reconnectProgress(baseline, cloud, local);
  assert.equal(result.coins, 10);
  assert.equal(result.world.spentPower, 500);
  assert.equal(result.owner_uid, 'child-a');
});

test('reconnection accepts parent updates when local progress is unchanged', () => {
  const baseline = { coins: 30, tasks: [task('a')], world: { spentPower: 0 } };
  const cloud = { ...baseline, tasks: [task('a'), task('parent-added')] };
  assert.deepEqual(reconnectProgress(baseline, cloud, { ...baseline }), cloud);
});

test('divergent reconnect histories are preserved, not added or silently overwritten', () => {
  const baseline = { coins: 30, tasks: [] };
  const cloud = { coins: 40, tasks: [] };
  const local = { coins: 50, tasks: [] };
  assert.throws(() => reconnectProgress(baseline, cloud, local), /pair_progress_conflict/);
  assert.equal(cloud.coins, 40);
  assert.equal(local.coins, 50);
  assert.deepEqual(reconnectProgress(baseline, local, local), local);
});

test('reconnect comparison ignores property ordering but preserves task differences', () => {
  const base = { coins: 30, tasks: [{ id: 'a', name: 'Read' }] };
  assert.equal(reconnectProgress(base, { tasks: [{ name: 'Read', id: 'a' }], coins: 30 }, { ...base, coins: 20 }).coins, 20);
  assert.throws(() => reconnectProgress(base, { ...base, tasks: [] }, { ...base, coins: 20 }), /pair_progress_conflict/);
});

test('sibling switching isolates purchases, wheel choices and daily spin eligibility', () => {
  const child = id => ({
    id, name: id, nickname: id, level: 1, xp: 0, coins: 100,
    tasks: [task(id, { done: true })], wonPrizes: [], unlockedAvatars: ['default'],
    currentAvatar: 'default', linkedParents: [], isApproved: true,
  });
  reset({ role: 'parent', selectedChildId: null, children: [child('a'), child('b')] });
  store.getState().selectChild('a');
  store.getState().setPrizes(['Park time']);
  assert.equal(store.getState().unlockBackground('ocean', 50), true);
  assert.equal(store.getState().claimDailyWheelPrize(), 'Park time');
  store.getState().selectChild('b');
  assert.equal(store.getState().coins, 100);
  assert.equal(store.getState().activeBackground, 'clean');
  assert.deepEqual(store.getState().unlockedBackgrounds, ['clean']);
  assert.deepEqual(store.getState().prizes, []);
  assert.deepEqual(store.getState().wonPrizes, []);
  assert.equal(store.getState().lastSpinDate, null);
  store.getState().setPrizes(['Movie night']);
  assert.equal(store.getState().claimDailyWheelPrize(), 'Movie night');
  store.getState().selectChild('a');
  assert.equal(store.getState().coins, 50);
  assert.equal(store.getState().activeBackground, 'ocean');
  assert.deepEqual(store.getState().prizes, ['Park time']);
  assert.equal(store.getState().wonPrizes[0].prize, 'Park time');
  assert.equal(store.getState().claimDailyWheelPrize(), null);
  store.getState().selectChild('b');
  assert.equal(store.getState().claimDailyWheelPrize(), null);
});

test('selected child appearance and wheel state are saved in the parent snapshot', async () => {
  storage.clear();
  reset({ role: 'parent', nickname: 'parent-test', userEmail: 'parent@test.local',
    selectedChildId: 'a', activeTheme: 'space', unlockedThemes: ['classic', 'space'],
    activeBackground: 'mint', unlockedBackgrounds: ['clean', 'mint'],
    prizes: ['Picnic'], lastSpinDate: localDateKey(), coins: 42,
    children: [{ id: 'a', name: 'Alex', nickname: 'alex', tasks: [], wonPrizes: [],
      currentAvatar: 'default', unlockedAvatars: ['default'], coins: 100, xp: 0,
      level: 1, linkedParents: [], isApproved: true }],
    saveMockState: initial.saveMockState, syncToServer: async () => {},
  });
  await store.getState().saveMockState();
  const saved = JSON.parse(storage.get('mockState_parent-test'));
  assert.equal(saved.children[0].coins, 42);
  assert.equal(saved.children[0].activeTheme, 'space');
  assert.deepEqual(saved.children[0].unlockedThemes, ['classic', 'space']);
  assert.equal(saved.children[0].activeBackground, 'mint');
  assert.deepEqual(saved.children[0].prizes, ['Picnic']);
  assert.equal(saved.children[0].lastSpinDate, localDateKey());
  storage.clear();
});

test('removing a legacy child restores the next sibling without copying the old wallet', () => {
  const child = (id, coins) => ({ id, name: id, nickname: id, level: 1, xp: 0, coins,
    tasks: [], wonPrizes: [], currentAvatar: 'default', unlockedAvatars: ['default'],
    linkedParents: [], isApproved: true });
  reset({ role: 'parent', selectedChildId: null, children: [child('a', 80), child('b', 15)] });
  store.getState().selectChild('a');
  store.getState().removeChild('a');
  assert.equal(store.getState().selectedChildId, 'b');
  assert.equal(store.getState().coins, 15);
  store.getState().removeChild('b');
  assert.equal(store.getState().selectedChildId, null);
  assert.equal(store.getState().coins, 0);
  assert.deepEqual(store.getState().prizes, []);
});

test('managed child cannot be removed by the legacy nickname unlink action', () => {
  reset({ role: 'parent', selectedChildId: 'managed-a', coins: 42,
    children: [{ id: 'managed-a', managed: true, nickname: 'a', coins: 42 }] });
  store.getState().removeChild('managed-a');
  assert.equal(store.getState().children.length, 1);
  assert.equal(store.getState().coins, 42);
});

test('confirmed managed deletion selects a sibling without transferring the deleted wallet', async () => {
  const child = (id, coins) => ({ id, managed: true, name: id, nickname: id, coins, xp: 0, level: 1,
    tasks: [], prizes: [id], wonPrizes: [], unlockedAvatars: ['default'], currentAvatar: 'default' });
  reset({ role: 'parent', userId: 'parent-a', selectedChildId: null, children: [child('a', 80), child('b', 15)] });
  store.getState().selectChild('a');
  let deleted;
  deleteManagedHandler = async id => { deleted = id; assert.equal(store.getState().familyOperationBusy, true); };
  await deleteChildProfile('a');
  assert.equal(deleted, 'a');
  assert.equal(store.getState().selectedChildId, 'b');
  assert.equal(store.getState().coins, 15);
  assert.deepEqual(store.getState().prizes, ['b']);
  assert.equal(store.getState().children.length, 1);
  assert.equal(store.getState().familyOperationBusy, false);
  assert.equal(store.getState().familyOperationEpoch, 2);
});

test('failed managed deletion leaves the local child and balances intact', async () => {
  reset({ role: 'parent', userId: 'parent-a', selectedChildId: 'a', coins: 80,
    children: [{ id: 'a', managed: true, coins: 80 }] });
  deleteManagedHandler = async () => { throw new Error('offline'); };
  await assert.rejects(deleteChildProfile('a'), /offline/);
  assert.equal(store.getState().children.length, 1);
  assert.equal(store.getState().coins, 80);
  assert.equal(store.getState().familyOperationBusy, false);
});

test('deleting the last managed child clears only child state, not the parent identity', async () => {
  reset({ role: 'parent', userId: 'parent-a', selectedChildId: 'a', coins: 80, prizes: ['Park'],
    children: [{ id: 'a', managed: true }] });
  deleteManagedHandler = async () => {};
  await deleteChildProfile('a');
  assert.equal(store.getState().userId, 'parent-a');
  assert.equal(store.getState().role, 'parent');
  assert.equal(store.getState().selectedChildId, null);
  assert.equal(store.getState().coins, 0);
  assert.deepEqual(store.getState().prizes, []);
});

test('a late deletion result cannot replace a different signed-in user', async () => {
  reset({ role: 'parent', userId: 'parent-a', selectedChildId: 'a', children: [{ id: 'a', managed: true }] });
  deleteManagedHandler = async () => { store.setState({ userId: 'parent-b', coins: 99, children: [] }); };
  await assert.rejects(deleteChildProfile('a'), /pair_session_changed/);
  assert.equal(store.getState().userId, 'parent-b');
  assert.equal(store.getState().coins, 99);
});

test('a cloud refresh started before deletion cannot resurrect the removed child', async () => {
  let release, signal;
  const started = new Promise(resolve => { signal = resolve; });
  linkedReadHandler = () => { signal(); return new Promise(resolve => { release = resolve; }); };
  mocks['../lib/firebase'].auth.currentUser = { uid: 'parent-a', isAnonymous: false };
  reset({ role: 'parent', userId: 'parent-a', userEmail: 'parent@test.local', nickname: 'parent',
    selectedChildId: 'a', children: [{ id: 'a', managed: true }] });
  deleteManagedHandler = async () => {};
  try {
    const refreshing = store.getState().loadMockState();
    await started;
    await deleteChildProfile('a');
    release([{ profile: { uid: 'a', full_name: 'Alex', nickname: 'a', managed: true }, data: { coins: 100 } }]);
    await refreshing;
    assert.deepEqual(store.getState().children, []);
    assert.equal(store.getState().selectedChildId, null);
    assert.equal(store.getState().coins, 0);
  } finally {
    linkedReadHandler = async () => [];
    mocks['../lib/firebase'].auth.currentUser = null;
  }
});

test('unfinished anonymous pairing cannot replace local guest progress during refresh', async () => {
  storage.clear();
  cloudOwnReads = 0;
  mocks['../lib/firebase'].auth.currentUser = { uid: 'pairing-device', isAnonymous: true };
  try {
    storage.set('active_user_tag', 'guest');
    storage.set('mockState_guest', JSON.stringify({
      userEmail: 'guest@local', userId: 'guest-local', nickname: 'guest', role: 'child',
      coins: 42, tasks: [task('mine')], lastActiveDate: localDateKey(),
    }));
    reset({ userEmail: null, nickname: null });
    await store.getState().loadMockState();
    assert.equal(cloudOwnReads, 0);
    assert.equal(store.getState().coins, 42);
    assert.equal(store.getState().tasks[0].id, 'mine');
  } finally {
    mocks['../lib/firebase'].auth.currentUser = null;
    storage.clear();
  }
});

test('restart preserves an intentionally empty family wheel instead of inventing prizes', async () => {
  storage.clear();
  storage.set('active_user_tag', 'guest');
  storage.set('mockState_guest', JSON.stringify({ userEmail: 'guest@local', userId: 'guest-local',
    nickname: 'guest', role: 'child', prizes: [], tasks: [task('finished', { done: true })], lastActiveDate: localDateKey() }));
  reset({ userEmail: null, nickname: null });
  await store.getState().loadMockState();
  assert.deepEqual(store.getState().prizes, []);
  assert.equal(store.getState().claimDailyWheelPrize(), null);
  assert.equal(store.getState().lastSpinDate, null);
  assert.deepEqual(store.getState().wonPrizes, []);
  store.getState().setPrizes(['Family walk']);
  assert.equal(store.getState().claimDailyWheelPrize(), 'Family walk');
  storage.clear();
});

test('restart prefers UID role cache over a stale nickname role', async () => {
  storage.clear();
  storage.set('active_user_tag', 'alex');
  storage.set('user_role_alex', 'child');
  storage.set('account_role_parent-a', 'parent');
  storage.set('mockState_alex', JSON.stringify({ userEmail: 'alex@example.test', userId: 'parent-a',
    nickname: 'alex', role: 'child', lastActiveDate: localDateKey(), tasks: [], children: [] }));
  reset({ userEmail: null, nickname: null, userId: null, role: null });
  await store.getState().loadMockState();
  assert.equal(store.getState().role, 'parent');
  storage.clear();
});

test('disconnected device restores locally without querying a later signed-in account', async () => {
  storage.clear();
  cloudOwnReads = 0;
  mocks['../lib/firebase'].auth.currentUser = { uid: 'different-parent', isAnonymous: false };
  storage.set('active_user_tag', 'family_a');
  storage.set('mockState_family_a', JSON.stringify({
    userEmail: 'a@device.local', userId: 'a', nickname: 'family_a', role: 'child',
    deviceConnection: 'local', coins: 70, tasks: [task('mine')], lastActiveDate: localDateKey(),
  }));
  try {
    reset({ userEmail: null, nickname: null });
    await store.getState().loadMockState();
    assert.equal(store.getState().deviceConnection, 'local');
    assert.equal(store.getState().coins, 70);
    assert.equal(cloudOwnReads, 0);
    await store.getState().syncToServer();
    assert.equal(store.getState().coins, 70);
  } finally {
    mocks['../lib/firebase'].auth.currentUser = null;
    storage.clear();
  }
});

test('linked profile whose device auth is gone restores as local-only, preserving progress', async () => {
  storage.clear();
  storage.set('active_user_tag', 'family_a');
  storage.set('mockState_family_a', JSON.stringify({
    userEmail: 'a@device.local', userId: 'a', nickname: 'family_a', role: 'child',
    deviceConnection: 'linked', coins: 90, lastSpinDate: localDateKey(), tasks: [task('mine')], lastActiveDate: localDateKey(),
  }));
  reset({ userEmail: null, nickname: null });
  await store.getState().loadMockState();
  assert.equal(store.getState().deviceConnection, 'local');
  assert.equal(store.getState().coins, 90);
  assert.equal(store.getState().lastSpinDate, localDateKey());
  storage.clear();
});

test('guest task collision keeps distinct history IDs and is retry-safe', () => {
  const cloud = { tasks: [task('same'), task('import-same')] };
  const guest = { tasks: [task('same', { name: 'Guest quest' })], activity_history: [
    { taskId: 'same', name: 'Guest quest', date: localDateKey(), completed: true, postponed: 0 },
  ] };
  const result = importGuestProgress(cloud, guest, 'import');
  assert.equal(result.tasks.length, 3);
  assert.equal(new Set(result.tasks.map(item => item.id)).size, 3);
  assert.equal(result.activity_history[0].taskId, result.tasks[2].id);
  assert.deepEqual(importGuestProgress(result, guest, 'import'), result);
  assert.equal(guest.tasks[0].id, 'same');
});

test('starter onboarding preserves guest identity and grants exactly one selected hero', async () => {
  reset({ nickname: 'guest', tasks: [], unlockedAvatars: ['default'] });
  const completed = await store.getState().finishGuestOnboarding('  Alex  ', 'quest_coral',
    ['template_teeth', 'template_read', 'template_toys']);
  assert.equal(completed, true);
  assert.equal(store.getState().nickname, 'guest');
  assert.equal(store.getState().fullName, 'Alex');
  assert.equal(store.getState().currentAvatar, 'quest_coral');
  assert.deepEqual(store.getState().unlockedAvatars, ['default', 'quest_coral']);
  assert.equal(store.getState().tasks.length, 3);
  assert.equal(store.getState().tasks[0].focusDurationMinutes, 2);
  assert.equal(store.getState().coins, 0);
  assert.equal(await store.getState().finishGuestOnboarding('Other', 'quest_sunrise',
    ['template_teeth', 'template_read', 'template_toys']), false);
  assert.equal(store.getState().fullName, 'Alex');
});

test('town encouragement requires newly affordable unowned item and an empty plot', () => {
  assert.equal(newlyAffordableBuilding(5000, 8400, [{ plotId: 'home', type: 'home', level: 1 }]), 'studio');
  assert.equal(newlyAffordableBuilding(8400, 8400, []), null);
  assert.equal(newlyAffordableBuilding(7000, 7500, [{ plotId: 'home', type: 'bakery', level: 1 }]), null);
  assert.equal(newlyAffordableBuilding(5000, 8400, WORLD_PLOTS.map(plot => ({ plotId: plot.id, type: 'tree', level: 1 }))), null);
});

test('weekly history counts completion once, handles Undo, and retains postponements', () => {
  const now = new Date(2026, 9, 23, 10);
  let history = recordQuestActivity([], task('a'), 'postpone', now);
  history = recordQuestActivity(history, task('a'), 'postpone', now);
  history = recordQuestActivity(history, task('a'), 'complete', now);
  history = recordQuestActivity(history, task('a'), 'complete', now);
  assert.equal(weeklyProgress(history, now).completed, 1);
  assert.equal(weeklyProgress(history, now).postponed, 2);
  history = recordQuestActivity(history, task('a'), 'undo', now);
  assert.equal(weeklyProgress(history, now).completed, 0);
  assert.equal(weeklyProgress(history, now).postponed, 2);
});

test('pairing imports guest coins, purchases, history and town without losing prepared tasks', () => {
  const guest = {
    coins: 42, total_earned: 100, tasks: [task('guest-task')],
    unlocked_avatars: ['default', 'quest_sunrise'], unlocked_backgrounds: ['clean', 'forest'],
    world: { spentPower: 1000, placements: [{ plotId: 'home', type: 'home', level: 1 }, { plotId: 'north', type: 'tree', level: 1 }] },
    activity_history: [{ taskId: 'finished', date: localDateKey(), completed: true }],
  };
  const cloud = { tasks: [task('parent-task')], coins: 0, total_earned: 0, starter_avatar: 'quest_coral', unlocked_avatars: ['default', 'quest_coral'] };
  const imported = importGuestProgress(cloud, guest, 'migration-a');
  assert.equal(imported.coins, 42);
  assert.equal(imported.total_earned, 100);
  assert.deepEqual(imported.tasks.map(task => task.id), ['parent-task', 'guest-task']);
  assert.deepEqual(imported.world, guest.world);
  assert.deepEqual(imported.activity_history, guest.activity_history);
  assert.ok(imported.unlocked_avatars.includes('quest_coral'));
  assert.ok(imported.unlocked_avatars.includes('quest_sunrise'));
  assert.deepEqual(importGuestProgress(imported, guest, 'migration-a'), imported);
});

test('pairing refuses two played histories and leaves both unchanged', () => {
  const cloud = { coins: 99, tasks: [task('cloud')] };
  const guest = { coins: 42, tasks: [task('guest')] };
  assert.throws(() => importGuestProgress(cloud, guest, 'migration-b'), /pair_progress_conflict/);
  assert.equal(cloud.coins, 99);
  assert.equal(guest.coins, 42);
});

test('weekly window uses seven local dates and ignores malformed or expired records', () => {
  const now = new Date(2026, 9, 23, 0, 15);
  const old = recordQuestActivity([], task('a'), 'complete', new Date(2026, 9, 16, 23));
  const current = recordQuestActivity(old, task('b'), 'complete', now);
  const summary = weeklyProgress(current, now);
  assert.equal(summary.days.length, 7);
  assert.equal(summary.days[0].date, '2026-10-17');
  assert.equal(summary.completed, 1);
  assert.equal(weeklyProgress([], now).hasRecords, false);
  assert.deepEqual(normalizeActivity([{ date: '2020-01-01', taskId: 'bad', name: 'bad' }, null], now), []);
});

test('completion history survives task deletion, midnight and child switching', () => {
  reset({ tasks: [task('a')] });
  store.getState().completeTask('a');
  store.getState().removeTask('a');
  assert.equal(weeklyProgress(store.getState().activityHistory).completed, 1);
  store.setState({ lastActiveDate: '2000-01-01' });
  store.getState().resetTasksForNewDay();
  assert.equal(weeklyProgress(store.getState().activityHistory).completed, 1);
  const history = store.getState().activityHistory;
  store.setState({ children: [
    { id: 'one', name: 'One', tasks: [], activityHistory: history },
    { id: 'two', name: 'Two', tasks: [], activityHistory: [] },
  ] });
  store.getState().selectChild('two');
  assert.equal(weeklyProgress(store.getState().activityHistory).completed, 0);
  store.getState().selectChild('one');
  assert.equal(weeklyProgress(store.getState().activityHistory).completed, 1);
});

test('weekly history is persisted and restored with guest state', async () => {
  storage.clear();
  reset({ nickname: 'guest', tasks: [task('persisted')], saveMockState: initial.saveMockState });
  store.getState().completeTask('persisted');
  await store.getState().saveMockState();
  const saved = JSON.parse(storage.get('mockState_guest'));
  assert.equal(saved.activityHistory[0].completed, true);
  store.setState({ userEmail: null, nickname: null, activityHistory: [] });
  await store.getState().loadMockState();
  assert.equal(weeklyProgress(store.getState().activityHistory).completed, 1);
});

test('onboarding rejects invalid choices and cannot overwrite an existing child', async () => {
  reset({ tasks: [] });
  assert.equal(await store.getState().finishGuestOnboarding('Alex', 'quest_champ',
    ['template_teeth', 'template_teeth', 'template_read']), false);
  assert.equal(await store.getState().finishGuestOnboarding('Alex', 'unknown',
    ['template_teeth', 'template_read', 'template_toys']), false);
  reset({ tasks: [task('existing')], coins: 50, totalEarned: 100 });
  assert.equal(await store.getState().finishGuestOnboarding('Alex', 'quest_champ',
    ['template_teeth', 'template_read', 'template_toys']), false);
  assert.equal(store.getState().tasks[0].id, 'existing');
  assert.equal(store.getState().coins, 50);
});

test('returning guest restores purchases, tasks and daily wheel after another user signs out', async () => {
  storage.clear();
  const guest = { ...initial, userEmail: 'guest@questhero.local', userId: 'guest-local', role: 'child',
    nickname: 'guest', fullName: 'Alex', tasks: [task('saved')],
    coins: 87, totalEarned: 500, unlockedAvatars: ['default', 'quest_coral'],
    currentAvatar: 'quest_coral', lastSpinDate: localDateKey() };
  storage.set('mockState_guest', JSON.stringify(guest));
  reset({ userId: 'parent-id', userEmail: 'parent@example.com', nickname: 'parent',
    role: 'parent', tasks: [task('parent-task')], coins: 999 });
  await store.getState().continueAsGuest();
  assert.equal(store.getState().userId, 'guest-local');
  assert.equal(store.getState().fullName, 'Alex');
  assert.equal(store.getState().coins, 87);
  assert.equal(store.getState().totalEarned, 500);
  assert.equal(store.getState().tasks[0].id, 'saved');
  assert.equal(store.getState().currentAvatar, 'quest_coral');
  assert.equal(store.getState().lastSpinDate, localDateKey());
});

test('100 coins split evenly and identical for all cosmetic heroes', () => {
  reset({ tasks: [task('a'), task('b'), task('c')] });
  const tasks = store.getState().tasks;
  assert.deepEqual(calculateQuestReward(tasks[0], tasks, 'quest_sunrise'), calculateQuestReward(tasks[0], tasks, 'default'));
  const rewards = tasks.map(t => store.getState().completeTask(t.id).reward.coins);
  assert.deepEqual(rewards, [34, 33, 33]);
  assert.equal(store.getState().coins, 100);
  assert.equal(store.getState().completeTask('a').completed, false);
});
test('deleting a completed quest and adding another cannot refill daily budget', () => {
  reset({ tasks: [task('a'), task('b')] });
  store.getState().completeTask('a');
  store.getState().removeTask('a');
  store.getState().addTask(task('new'));
  for (const t of store.getState().tasks) store.getState().completeTask(t.id);
  assert.equal(store.getState().dailyEarnings.coins, 100);
  assert.equal(store.getState().coins, 100);
});
test('undo reverses wallet, goal earnings and XP without farming', () => {
  reset({ tasks: [task('a')], xp: 90 });
  store.getState().completeTask('a');
  assert.equal(store.getState().level, 2);
  assert.equal(store.getState().undoTaskCompletion('a'), true);
  assert.equal(store.getState().coins, 0);
  assert.equal(store.getState().totalEarned, 0);
  assert.equal(store.getState().level, 1);
  assert.equal(store.getState().xp, 90);
  store.getState().completeTask('a');
  assert.equal(store.getState().coins, 100);
});
test('spending does not reduce goal progress; collect can happen only once', () => {
  reset({ tasks: [task('a')] });
  store.getState().setRewardGoal('Choose dinner', 100);
  store.getState().completeTask('a');
  assert.equal(store.getState().spendCoins(50), true);
  assert.equal(store.getState().totalEarned, 100);
  assert.equal(store.getState().spendCoins(-50), false);
  store.getState().claimRewardGoal();
  store.getState().claimRewardGoal();
  assert.equal(store.getState().wonPrizes.length, 1);
  assert.equal(store.getState().coins, 50);
  assert.equal(store.getState().undoTaskCompletion('a'), false);
});
test('parent approval is required, gives coins once and updates selected child', () => {
  reset({ tasks: [task('a', { requiresApproval: true })], linkedParents: ['parent'] });
  assert.equal(store.getState().completeTask('a').pendingApproval, true);
  assert.equal(store.getState().coins, 0);
  const child = { id: 'child', name: 'Test', nickname: 'test', xp: 0, level: 1, coins: 0,
    tasks: store.getState().tasks, wonPrizes: [], currentAvatar: 'default', unlockedAvatars: ['default'], linkedParents: ['parent'], isApproved: true };
  reset({ role: 'parent', children: [child], selectedChildId: 'child', tasks: child.tasks });
  store.getState().verifyChildTask('child', 'a', true);
  store.getState().verifyChildTask('child', 'a', true);
  assert.equal(store.getState().coins, 100);
  assert.equal(store.getState().children[0].totalEarned, 100);
});
test('a delayed parent review is still rewardable on a non-repeat day', () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const pending = task('review', { freq: days[(new Date().getDay() + 1) % 7], pendingApproval: true });
  assert.equal(isQuestDue(pending), false);
  assert.equal(calculateQuestReward(pending, [pending]).coins, 100);
});
test('daily reset uses local calendar day and cannot reset completed quests twice', () => {
  reset({ tasks: [task('a')] });
  store.getState().completeTask('a');
  store.getState().resetTasksForNewDay();
  assert.equal(store.getState().tasks[0].done, true);
  store.setState({ lastActiveDate: '2000-01-01', dailyEarnings: { date: '2000-01-01', coins: 100 }, tasks: [task('a', { done: true, date: '2000-01-01' })] });
  store.getState().resetTasksForNewDay();
  assert.equal(store.getState().tasks[0].done, false);
  assert.equal(store.getState().dailyEarnings.coins, 0);
  assert.equal(freshTaskDay(task('p', { date: '2000-01-01', pendingApproval: true })).pendingApproval, true);
  assert.equal(localDateKey(new Date(2026, 0, 2, 0, 5)), '2026-01-02');
});
test('delete/restore retains earned ledger and cancels focus and snooze', () => {
  reset({ tasks: [task('a', { focusNotificationId: 'focus-a' })] });
  const original = store.getState().tasks[0];
  store.getState().removeTask('a');
  assert.ok(cancelled.includes('focus-a'));
  assert.ok(cancelled.includes('later-a'));
  store.getState().restoreTask({ ...original, focusNotificationId: undefined });
  store.getState().restoreTask(original);
  assert.equal(store.getState().tasks.length, 1);
});
test('changing a running timer cancels its stale finish alert', () => {
  reset({ tasks: [task('a', { focusDurationMinutes: 10, activeFocusStartedAt: new Date().toISOString(), focusNotificationId: 'timer-old' })] });
  store.getState().updateTask('a', { focusDurationMinutes: 15 });
  assert.equal(store.getState().tasks[0].activeFocusStartedAt, undefined);
  assert.ok(cancelled.includes('timer-old'));
});
test('completed quests skip today but retain future dated reminders', () => {
  const now = new Date(2026, 9, 20, 8, 0);
  const plan = reminderPlan([task('a', {
    date: localDateKey(now), done: true, reminderEnabled: true, reminderTime: '09:00',
  })], now);
  assert.equal(plan.length, 13);
  assert.equal(localDateKey(plan[0].date), '2026-10-21');
});
test('reminders respect weekdays, invalid times, queue budget and chronological order', () => {
  const now = new Date(2026, 9, 20, 8, 0);
  const weekend = reminderPlan([task('a', { freq: 'weekends', reminderEnabled: true, reminderTime: '10:00' })], now);
  assert.ok(weekend.every(item => isQuestDue(item.task, item.date)));
  assert.equal(reminderPlan([task('bad', { reminderEnabled: true, reminderTime: '25:99' })], now).length, 0);
  const crowded = reminderPlan(Array.from({ length: 20 }, (_, i) => task(`${i}`, { reminderEnabled: true, reminderTime: '10:00' })), now);
  assert.equal(crowded.length, 48);
  assert.ok(crowded.every((item, i) => !i || item.date >= crowded[i - 1].date));
});
test('Android notification portrait metadata is idempotent and preserves unrelated entries', () => {
  const { applyHeroMetadata } = require('../plugins/withHeroNotification.cjs');
  const manifest = { manifest: { application: [{ $: { 'android:name': '.MainApplication' },
    'meta-data': [{ $: { 'android:name': 'other', 'android:value': 'keep' } }] }] } };
  applyHeroMetadata(manifest);
  applyHeroMetadata(manifest);
  const entries = manifest.manifest.application[0]['meta-data'];
  assert.equal(entries.length, 2);
  assert.equal(entries[1].$['android:resource'], '@drawable/quest_champ_notification');
  assert.ok(fs.existsSync(path.join(root, 'assets/branding/quest-hero-play-512.png')));
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const notificationPlugin = appConfig.expo.plugins.find(item => Array.isArray(item) && item[0] === 'expo-notifications');
  for (const sound of notificationPlugin[1].sounds) {
    const resourceName = path.basename(sound, path.extname(sound));
    assert.match(resourceName, /^[a-z][a-z0-9_]*$/, `${resourceName} must be a valid Android resource name`);
    assert.ok(fs.existsSync(path.join(root, sound)));
  }
});
test('legacy guest progress and purchased heroes survive local-state migration', async () => {
  storage.set('active_user_tag', 'legacy');
  storage.set('mockState_legacy', JSON.stringify({
    userEmail: 'legacy@guest.local', nickname: 'legacy', userId: 'guest-local', role: 'child',
    coins: 250, xp: 40, level: 3, tasks: [task('done', { done: true, rewardedCoins: 50 })],
    unlockedAvatars: ['default', 'quest_sunrise'], currentAvatar: 'quest_sunrise', lastActiveDate: localDateKey(),
  }));
  reset({ userEmail: null, nickname: null });
  await store.getState().loadMockState();
  assert.equal(store.getState().coins, 250);
  assert.equal(store.getState().totalEarned, 250);
  assert.equal(store.getState().dailyEarnings.coins, 50);
  assert.ok(store.getState().unlockedAvatars.includes('quest_sunrise'));
  assert.equal(store.getState().currentAvatar, 'quest_sunrise');
  storage.clear();
});
test('daily wheel requires a completed day, saves one prize, and cannot repeat', () => {
  reset({ tasks: [task('a')], prizes: ['Movie night 🍿'], lastSpinDate: null });
  assert.equal(store.getState().claimDailyWheelPrize(), null);
  store.getState().completeTask('a');
  assert.equal(store.getState().claimDailyWheelPrize(), 'Movie night 🍿');
  assert.equal(store.getState().wonPrizes[0].prize, 'Movie night 🍿');
  assert.equal(store.getState().lastSpinDate, localDateKey());
  assert.equal(store.getState().claimDailyWheelPrize(), null);
  assert.equal(store.getState().wonPrizes.length, 1);
});
test('wheel prizes use a dominant picture and no more than two visible words', () => {
  assert.deepEqual(wheelPrizePresentation('1 Day Screen Time 🎮'), { icon: '🎮', label: 'Screen Time' });
  assert.deepEqual(wheelPrizePresentation('Choose a special family dinner tonight'), { icon: '🍕', label: 'Choose special' });
  assert.ok(wheelPrizePresentation('Very long custom reward name').label.split(/\s+/).length <= 2);
});

test('wheel shows actual family rewards even with fewer or more than six choices', () => {
  assert.deepEqual(wheelChoices(['Park', 'Movie'], 'Movie'), ['Park', 'Movie']);
  assert.deepEqual(wheelChoices([], 'Park'), ['Park']);
  assert.deepEqual(wheelChoices([' ', 'Park'], 'Movie'), ['Park', 'Movie']);
  const many = Array.from({ length: 8 }, (_, i) => 'Prize ' + i);
  assert.deepEqual(wheelChoices(many, 'Prize 7'), many);
  assert.deepEqual(wheelChoices([], ''), []);
});

test('wheel preserves a saved winner after family choices change and localizes emoji-only labels', () => {
  const configured = ['Movie'];
  assert.deepEqual(wheelChoices(configured, 'Park'), ['Movie', 'Park']);
  assert.deepEqual(configured, ['Movie']);
  assert.deepEqual(wheelPrizePresentation('🎁', 'Překvapení'), { icon: '🎁', label: 'Překvapení' });
  const source = fs.readFileSync(path.join(root, 'src/components/PrizeWheelModal.tsx'), 'utf8');
  assert.ok(!source.includes('Math.random'), 'Reveal must not make a second random prize selection');
  assert.ok(!source.includes('const DEFAULT_PRIZES'), 'Reveal must not invent fallback reward choices');
});
test('My World awards up to 10,000 power without mixing it into spendable coins', () => {
  const quests = [task('a', { done: true }), task('b'), task('c', { done: true }), task('d')];
  assert.equal(todayBuildPower(quests), 5_000);
  assert.equal(todayBuildPower(quests.map(item => ({ ...item, done: true }))), 10_000);
  assert.equal(worldPowerBalance(100, 4_000), 11_000);
  assert.equal(canPlaceBuilding([], 'north', 'park', 5_000), true);
  assert.equal(canPlaceBuilding([{ plotId: 'north', type: 'home', level: 1 }], 'north', 'park', 50_000), false);
});
test('My World buildings have safe level caps and decorations cannot be upgraded', () => {
  worldStore.setState({ spentPower: 0, placements: [
    { plotId: 'home', type: 'home', level: 1 },
    { plotId: 'light', type: 'streetlight', level: 1 },
  ], ownerKey: 'guest-local', hydrated: true });
  assert.equal(worldStore.getState().upgradeBuilding('light', 50_000), false);
  assert.equal(worldStore.getState().upgradeBuilding('home', 50_000), true);
  assert.equal(worldStore.getState().upgradeBuilding('home', 50_000), true);
  assert.equal(worldStore.getState().upgradeBuilding('home', 50_000), false);
  assert.equal(worldStore.getState().placements.find(item => item.plotId === 'home').level, 3);
});
test('every My World item is translated in all four supported languages', () => {
  const source = fs.readFileSync(path.join(root, 'src/i18n/index.ts'), 'utf8');
  for (const item of Object.values(WORLD_BUILDINGS)) {
    const occurrences = source.match(new RegExp(`\\b${item.nameKey}\\s*:`, 'g')) || [];
    assert.equal(occurrences.length, 4, `${item.nameKey} must exist in EN, CS, ES and DE`);
  }
});
