const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const storage = new Map(), modules = new Map(), calls = [], dismissed = [];
let allowed = true, token = 'ExpoPushToken[first]', failing = false, onToken;
const auth = { currentUser: { uid: 'child' } };
const notifications = {
  IosAuthorizationStatus: { PROVISIONAL: 3 }, AndroidImportance: { DEFAULT: 3 }, AndroidNotificationVisibility: { PRIVATE: 0 },
  getPermissionsAsync: async () => ({ granted: allowed }), setNotificationChannelAsync: async () => {},
  getExpoPushTokenAsync: async () => { if (onToken) await onToken(); return { data: token }; },
  getPresentedNotificationsAsync: async () => [{ request: { identifier: 'ours', content: { data: { questbloxPush: true } } } }, { request: { identifier: 'unrelated', content: { data: {} } } }],
  dismissNotificationAsync: async id => dismissed.push(id),
};
function load(file) {
  file = path.resolve(__dirname, '../src', file); if (!file.endsWith('.ts')) file += '.ts';
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-notifications') return notifications;
    if (name === 'expo-constants') return { expoConfig: { extra: { eas: { projectId: 'synthetic-project' } } } };
    if (name === './firebase') return { auth, app: {} };
    if (name === '../i18n') return { t: key => key };
    if (name.includes('async-storage')) return { getItem: async key => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) };
    if (name === 'firebase/functions') return { getFunctions: () => ({}), httpsCallable: (_functions, endpoint) => async data => {
      calls.push({ endpoint, data, uid: auth.currentUser?.uid });
      if (failing) throw Error('offline');
      return { data: { id: data.token === 'ExpoPushToken[first]' ? 'first-id' : 'second-id' } };
    } };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    throw Error(`Unexpected module: ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { syncFamilyPushDevice, retireFamilyPushDevice } = load('lib/pushDevices');
const { pushDestination } = load('utils/pushNavigation');
(async () => {
  assert.equal(await syncFamilyPushDevice('child', 'cs', true, true), 'push_ready');
  assert.equal(calls[0].data.language, 'cs');
  assert.equal(calls[0].data.enabled, true);
  const before = calls.length;
  await syncFamilyPushDevice('child', 'cs', true, true);
  assert.equal(calls.length, before);
  console.log('✓ Device registration includes locale and preferences; unchanged registrations are reused');
  assert.equal(await syncFamilyPushDevice('child', 'de', false, false), 'push_off');
  assert.equal(calls.at(-1).data.enabled, false);
  token = 'ExpoPushToken[second]';
  await syncFamilyPushDevice('child', 'de', true, false, true);
  assert.deepEqual(calls.at(-1).data, { id: 'first-id' });
  console.log('✓ Opt-out is persisted remotely and token rotation retires the old device token');
  failing = true;
  assert.equal(await syncFamilyPushDevice('child', 'es', true, true, true), 'push_retry');
  failing = false;
  assert.equal(await syncFamilyPushDevice('child', 'es', true, true, true), 'push_ready');
  console.log('✓ Offline registration reports a retry state and can recover');
  await retireFamilyPushDevice();
  assert.equal(calls.at(-1).endpoint, 'unregisterPushDevice');
  assert.deepEqual(dismissed, ['ours']);
  const retiredCalls = calls.length;
  await syncFamilyPushDevice('child', 'es', true, true, true);
  assert.equal(calls.length, retiredCalls);
  auth.currentUser = null;
  await syncFamilyPushDevice(null, 'en', false, false);
  auth.currentUser = { uid: 'child' };
  onToken = () => { auth.currentUser = { uid: 'parent' }; };
  await syncFamilyPushDevice('child', 'en', true, true, true);
  assert.equal(calls.length, retiredCalls);
  onToken = null;
  console.log('✓ Logout retires registration; account changes during token acquisition cannot register the previous account');
  const data = { questbloxPush: true, recipient: 'child', kind: 'battle_invite', battleId: 'safe-id' };
  assert.deepEqual(pushDestination(data, 'child', 'child'), { screen: 'battle', id: 'safe-id' });
  assert.equal(pushDestination(data, 'parent', 'parent'), null);
  assert.equal(pushDestination({ ...data, battleId: '../../login' }, 'child', 'child'), null);
  assert.equal(pushDestination({ ...data, kind: 'quest_review' }, 'child', 'child'), null);
  assert.equal(pushDestination({ ...data, kind: 'unknown' }, 'child', 'child'), null);
  assert.deepEqual(pushDestination({ ...data, recipient: 'parent', kind: 'quest_help', sourceChildId: 'child' }, 'parent', 'parent'), { screen: 'parent', id: 'child' });
  console.log('✓ Notification navigation validates account, role, event kind and destination identifiers');
  console.log('5 push client checks passed; mocked native APIs and no network traffic.');
})().catch(error => { console.error(error); process.exitCode = 1; });
