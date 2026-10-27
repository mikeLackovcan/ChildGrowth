const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const docs = new Map(), memory = new Map(), modules = new Map();
const auth = { currentUser: null, authStateReady: async () => {} };
let failLogin = false, failRead = false, storageHook = null;
let callableError = null, callableHook = null;
const callableCalls = [];
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const snapshot = key => ({ exists: () => docs.has(key), data: () => clone(docs.get(key)), id: key.split('/')[1] });
const user = { uid: 'verified-uid', email: 'child@example.test', displayName: 'Google Display Name' };
const firestore = {
  doc: (_db, collection, id) => `${collection}/${id}`,
  collection: (_db, name) => name,
  where: (...args) => args,
  query: (...args) => args,
  getDocs: async ([collection, [field, , value]]) => {
    const matches = [...docs].filter(([key, data]) => key.startsWith(`${collection}/`) && data[field] === value).map(([key]) => snapshot(key));
    return { size: matches.length, empty: !matches.length, docs: matches };
  },
  getDoc: async key => { if (failRead) throw Error('offline'); return snapshot(key); },
  setDoc: async () => { throw Error('Direct client writes are forbidden'); },
  runTransaction: async () => { throw Error('Direct client writes are forbidden'); },
};
const firebaseAuth = {
  GoogleAuthProvider: { credential: () => ({}) },
  signInWithCredential: async () => { if (failLogin) throw Error('rejected'); auth.currentUser = user; return { user }; },
  signInWithEmailAndPassword: async () => { if (failLogin) throw Error('rejected'); auth.currentUser = user; return { user }; },
  createUserWithEmailAndPassword: async () => { throw Error('auth/email-already-in-use'); },
  signOut: async () => { auth.currentUser = null; },
};
const storage = { getItem: async key => { if (storageHook) storageHook(key); return memory.get(key) || null; }, setItem: async (key, value) => memory.set(key, value), removeItem: async key => memory.delete(key) };
function load(file) {
  if (!file.endsWith('.ts')) file += '.ts';
  file = path.resolve(__dirname, '../src', file);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name === 'firebase/firestore') return firestore;
    if (name === 'firebase/auth') return firebaseAuth;
    if (name === 'firebase/functions') return {
      getFunctions: (_app, region) => ({ region }),
      httpsCallable: (functions, endpoint) => async data => {
        if (endpoint === 'getFamilyStatus') {
          const d = docs.get(`user_data/${auth.currentUser.uid}`) || {};
          return { data: { children: d.children || [], linked_parents: d.linked_parents || [], parent_email: d.parent_email || null, approval_status: d.approval_status || null, familyReconnectTags: [] } };
        }
        if (endpoint === 'resolveFamilyAccount') {
          const clean = data.tag.toLowerCase().replace(/^@/, '');
          const matches = [...docs].filter(([key, value]) => key.startsWith('profiles/') && value[clean.includes('@') ? 'email' : 'nickname'] === clean);
          if (matches.length !== 1) throw Error('FAMILY_ACCOUNT_UNAVAILABLE');
          return { data: { uid: matches[0][0].split('/')[1] } };
        }
        if (endpoint === 'applyProgress') {
          assert.equal(data.action, 'task.review');
          assert.equal(data.targetUid, 'verified-uid');
          const p = docs.get('profiles/verified-uid'), d = docs.get('user_data/verified-uid');
          const task = d.tasks.find(task => task.id === data.payload.id);
          if (task.pendingApproval) { task.pendingApproval = false; task.done = true; p.coins += 12; p.xp += 10; }
          return { data: { profile: clone(p), data: clone(d), result: { xpGain: 10, coinGain: 12 } } };
        }
        callableCalls.push({ region: functions.region, endpoint, data });
        if (callableError) throw callableError;
        if (callableHook) callableHook();
        return { data: { ok: true } };
      },
    };
    if (name.endsWith('/firebase') || name === './firebase') return { auth, db: {} };
    if (name.includes('async-storage')) return storage;
    if (name.includes('i18n')) return { t: key => key, changeLanguage() {} };
    if (name.includes('sound')) return { playSound() {} };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { localDay } = load('utils/questDay');
const { useAppStore: store } = load('store/useAppStore');
const { progressBusy: hasPendingCloudWrites } = load('lib/progressQueue');
const flush = async () => { for (let i = 0; i < 30; i++) { await new Promise(resolve => setImmediate(resolve)); if (i > 2 && !hasPendingCloudWrites()) return; } };
(async () => {
  docs.set('profiles/verified-uid', { nickname: 'original-nick', full_name: 'Original Name', role: 'child', email: user.email, coins: 470, xp: 62, level: 8, current_avatar: 'roblox_ninja' });
  docs.set('user_data/verified-uid', { tasks: [], prizes: ['Dinner'], won_prizes: [{ id: 'earned', prize: 'Dinner', date: new Date().toISOString(), redeemed: false }], unlocked_avatars: ['roblox_ninja'], linked_parents: [], children: [], lastActiveDate: localDay(), lastSpinDate: localDay(), epicClaimedDate: localDay() });
  store.setState({ userEmail: null, role: null, coins: 99999, nickname: null, children: [{ id: 'wrong-family', tasks: [] }] });
  const wrongRole = await store.getState().signInWithGoogle('valid-token', undefined, 'parent');
  assert.equal(wrongRole.success, false);
  assert.equal(wrongRole.message, 'auth_google_is_child');
  assert.equal(auth.currentUser, null);
  assert.equal(store.getState().userEmail, null);
  assert.equal((await store.getState().signInWithGoogle('valid-token', undefined, 'child')).success, true);
  await flush();
  assert.equal(store.getState().coins, 470);
  assert.equal(store.getState().nickname, 'original-nick');
  assert.equal(store.getState().role, 'child');
  assert.equal(store.getState().children.length, 0);
  assert.equal(store.getState().lastSpinDate, localDay());
  assert.equal(docs.get('profiles/verified-uid').coins, 470);
  assert.equal(store.getState().syncError, null);
  console.log('✓ Google login rejects the wrong role, then restores the matching verified profile without leaks');
  await store.getState().logout();
  assert.equal((await store.getState().loginWithEmail(user.email, 'correct')).success, true);
  await flush();
  assert.equal(store.getState().currentAvatar, 'roblox_ninja');
  assert.equal(store.getState().wonPrizes[0].id, 'earned');
  console.log('✓ Email login restores collected fighters, prizes and same-day reward gates');
  await store.getState().logout(); failLogin = true;
  memory.set('user_email_child', user.email);
  assert.equal((await store.getState().loginWithEmail(user.email, 'wrong')).success, false);
  assert.equal(store.getState().userEmail, null);
  console.log('✓ Wrong passwords never fall back to cached accounts');
  failLogin = false; failRead = true;
  const before = JSON.stringify([...docs]);
  assert.equal((await store.getState().signInWithGoogle('token', undefined, 'child')).success, false);
  assert.equal(store.getState().userEmail, null);
  assert.equal(JSON.stringify([...docs]), before);
  console.log('✓ Failed profile restoration does not overwrite cloud progress or expose a partial session');
  failRead = false;
  const { restoreAuthenticatedAccount } = load('lib/accountSession');
  const pending = { id: 'family-task', name: 'Read', ownerRole: 'parent', diff: 'easy', freq: 'daily', mystery: false, done: false, pendingApproval: true, requiresApproval: true, date: localDay() };
  docs.get('user_data/verified-uid').tasks = [pending];
  const parent = { uid: 'parent-uid', email: 'parent@example.test', displayName: 'Parent' };
  docs.set('profiles/parent-uid', { nickname: 'parent', email: parent.email, role: 'parent', coins: 0, xp: 0, level: 1 });
  docs.set('user_data/parent-uid', { tasks: [], prizes: [], won_prizes: [], children: [{ id: 'child-link', nickname: 'original-nick', name: 'Child', isApproved: true, linkedParents: ['parent'], tasks: [], coins: 0, xp: 0, level: 1, wonPrizes: [], currentAvatar: 'roblox_noob', unlockedAvatars: ['roblox_noob'] }] });
  auth.currentUser = parent;
  store.setState(await restoreAuthenticatedAccount(parent));
  await store.getState().loadMockState();
  assert.equal(store.getState().children[0].coins, 470);
  store.getState().selectChild('verified-uid');
  store.getState().verifyChildTask('verified-uid', 'family-task', true);
  await flush();
  assert.equal(store.getState().syncError, null);
  assert.equal(docs.get('user_data/verified-uid').tasks[0].done, true);
  const awardedCoins = docs.get('profiles/verified-uid').coins;
  assert.ok(awardedCoins > 470);
  auth.currentUser = user;
  store.setState(await restoreAuthenticatedAccount(user));
  assert.equal(store.getState().coins, awardedCoins);
  await store.getState().loadMockState();
  assert.equal(store.getState().coins, awardedCoins);
  console.log('✓ Parent approval writes the child task and totals together; child refresh never pays twice');
  const { familyAction } = load('lib/familyAccounts');
  const callsBeforeUnauthenticatedAction = callableCalls.length;
  auth.currentUser = null;
  await assert.rejects(familyAction('parent', 'invite'), /AUTH_REQUIRED/);
  assert.equal(callableCalls.length, callsBeforeUnauthenticatedAction);
  auth.currentUser = user;
  const saved = JSON.stringify([...docs]);
  await familyAction('parent', 'invite');
  assert.deepEqual(callableCalls.at(-1), { region: 'europe-west1', endpoint: 'manageFamily', data: { otherTag: 'parent', action: 'invite' } });
  assert.equal(JSON.stringify([...docs]), saved);
  callableError = Error('INVITATION_NOT_AVAILABLE');
  await assert.rejects(familyAction('parent', 'accept'), /INVITATION_NOT_AVAILABLE/);
  callableError = null;
  console.log('✓ Family actions require authentication and delegate consent to the trusted server; no client membership writes');
  callableHook = () => { auth.currentUser = parent; };
  await assert.rejects(familyAction('parent', 'unlink'), /ACCOUNT_CHANGED/);
  callableHook = null;
  console.log('✓ A family response from a previous account cannot complete in a new account');
  auth.currentUser = parent; failRead = true;
  const legacy = { userId: parent.uid, userEmail: parent.email, nickname: 'parent', role: 'parent', lastActiveDate: localDay(), coins: 77,
    tasks: [], children: [{ id: user.uid, nickname: 'original-nick', isApproved: true, tasks: [{ ...pending, pendingApproval: true, done: false }], coins: 888 }], selectedChildId: user.uid };
  memory.set('active_user_tag', 'parent'); memory.set('mockState_parent', JSON.stringify(legacy));
  store.setState({ userEmail: null, nickname: null, userId: null, role: null, syncError: null });
  await store.getState().loadMockState();
  assert.equal(store.getState().children.length, 0); assert.equal(store.getState().selectedChildId, null);
  assert.deepEqual(store.getState().familyReconnectTags, ['original-nick']);
  assert.equal(store.getState().coins, 77);
  const preserved = JSON.parse(memory.get(`questblox-legacy-progress-backup:${parent.uid}`));
  assert.equal(preserved[0].local.children[0].coins, 888);
  assert.equal(preserved[0].local.children[0].tasks[0].pendingApproval, true);
  console.log('✓ Offline startup preserves the original family cache before hiding unverified approvals');
  memory.set('mockState_parent', JSON.stringify({ ...legacy, familyVerifiedUid: parent.uid }));
  store.setState({ userEmail: null, nickname: null, userId: null, role: null, syncError: null });
  await store.getState().loadMockState();
  assert.equal(store.getState().children[0].isApproved, true);
  assert.equal(store.getState().selectedChildId, user.uid);
  assert.equal(store.getState().familyVerifiedUid, parent.uid);
  assert.equal(JSON.parse(memory.get(`questblox-legacy-progress-backup:${parent.uid}`)).length, 1);
  console.log('✓ Previously server-verified memberships remain available offline without duplicating backups');
  auth.currentUser = parent;
  store.setState({ userEmail: null, nickname: null, userId: null, role: null, syncError: null });
  storageHook = key => {
    if (key !== 'user_role_parent') return;
    storageHook = null; auth.currentUser = user;
    store.setState({ userId: user.uid, userEmail: user.email, nickname: 'fresh-child', role: 'child', coins: 42 });
  };
  await store.getState().loadMockState();
  assert.equal(store.getState().userId, user.uid); assert.equal(store.getState().nickname, 'fresh-child'); assert.equal(store.getState().coins, 42);
  console.log('✓ A delayed cache load cannot replace a newer signed-in account');
  console.log('10 account/client checks passed against Firebase doubles. Family transaction invariants run separately against the Firestore emulator.');
})().catch(error => { console.error(error); process.exitCode = 1; });
