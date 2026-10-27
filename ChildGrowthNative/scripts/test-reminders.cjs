const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
const scheduled = new Map();
let allowed = true, calls = 0, exactAllowed = true, alarmInput;
const device = { canAlarm: async () => exactAllowed, syncAlarms: async json => { alarmInput = JSON.parse(json); } };
const auth = { currentUser: null };
let foregroundHandler, responseListener;
const notifications = {
  AndroidImportance: { HIGH: 4 }, AndroidNotificationVisibility: { PRIVATE: 0 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  setNotificationChannelAsync: async () => {}, getPermissionsAsync: async () => ({ granted: allowed, canAskAgain: false }),
  getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
  cancelScheduledNotificationAsync: async id => scheduled.delete(id),
  scheduleNotificationAsync: async item => { calls++; scheduled.set(item.identifier, item); return item.identifier; },
  setNotificationHandler: value => { foregroundHandler = value; },
  addNotificationResponseReceivedListener: listener => { responseListener = listener; return { remove() { responseListener = null; } }; },
  getLastNotificationResponseAsync: async () => null,
  clearLastNotificationResponseAsync: async () => {},
};
let app = {}, prefs = { hydrated: true, accounts: {} };
function load(file) {
  file = path.resolve(__dirname, '../src', file); if (!file.endsWith('.ts')) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  function localRequire(name) {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-notifications') return notifications;
    if (name === './questDevice') return { questDevice: device };
    if (name === './firebase') return { auth };
    if (name.includes('useAppStore')) return { useAppStore: { getState: () => app } };
    if (name.includes('useReminderStore')) return { useReminderStore: { getState: () => prefs, setState: values => Object.assign(prefs, values) }, defaultReminders: { enabled: true, time: '18:00', sound: true } };
    if (name.includes('i18n') && !name.endsWith('/pushMessages')) return { t: (_key, fallback) => fallback };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    throw Error(`Unexpected dependency: ${name}`);
  }
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { reminderPlan, validReminderTime } = load('utils/reminderPlan');
const { localDay } = load('utils/questDay');
const { syncQuestReminders, observeQuestNotifications } = load('lib/notifications');
const now = new Date(2026, 9, 21, 12);
const task = { id: 'brush', name: 'Brush teeth', icon: '🪥', freq: 'daily', date: localDay(now), done: false };
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`✓ ${name}`); }
(async () => {
  await test('Quiet-hour and malformed times are rejected', () => {
    for (const time of ['06:59', '20:00', '24:00', '18:99', 'abc']) assert.equal(validReminderTime(time), false);
    assert.equal(validReminderTime('07:00'), true); assert.equal(validReminderTime('19:59'), true);
  });
  await test('Same-time quests group; own time overrides default; past times excluded', () => {
    const plan = reminderPlan([task, { ...task, id: 'read' }, { ...task, id: 'early', reminderTime: '08:00' }], '18:00', localDay(now), false, now);
    assert.equal(plan[0].taskIds.length, 2); assert.equal(new Date(plan[1].at).getHours(), 8);
    assert.equal(plan.length, 13);
  });
  await test('Completion removes today but keeps recurring future days; approval waits are skipped', () => {
    assert.equal(reminderPlan([{ ...task, done: true }], '18:00', localDay(now), false, now).length, 6);
    assert.equal(reminderPlan([{ ...task, pendingApproval: true }], '18:00', localDay(now), false, now).length, 0);
    assert.equal(reminderPlan([{ ...task, done: true }], '18:00', '2026-10-20', false, now).length, 7);
  });
  await test('Weekends, postponements, rest mode and empty plans', () => {
    assert.equal(reminderPlan([{ ...task, freq: 'weekends' }], '18:00', localDay(now), false, now).length, 2);
    assert.equal(reminderPlan([{ ...task, postponedUntil: '2026-10-24' }], '18:00', localDay(now), false, now).length, 4);
    assert.equal(reminderPlan([task], '18:00', localDay(now), true, now).length, 0);
    assert.equal(reminderPlan([], '18:00', localDay(now), false, now).length, 0);
  });
  await test('Schedule cap is chronological', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...task, id: String(i), reminderTime: `18:${String(i).padStart(2, '0')}` }));
    const plan = reminderPlan(many, '18:00', localDay(now), false, now);
    assert.equal(plan.length, 60); assert.ok(plan.every((slot, i) => !i || slot.at >= plan[i - 1].at));
  });
  await test('Native reconciliation is idempotent and preserves unrelated notifications', async () => {
    app = { userEmail: 'kid@example.test', role: 'child', tasks: [task], isSick: false, lastActiveDate: localDay(), language: 'en' };
    prefs.accounts[app.userEmail] = { enabled: true, time: '18:00', sound: true };
    scheduled.set('other-feature', { identifier: 'other-feature', content: { data: {} } });
    await syncQuestReminders(); assert.ok(scheduled.size > 1);
    const before = calls; await syncQuestReminders(); assert.equal(calls, before);
    app.isSick = true; await syncQuestReminders(); assert.equal(scheduled.size, 1); assert.ok(scheduled.has('other-feature'));
  });
  await test('Logout, denied permission and parent accounts cancel child alerts', async () => {
    app.isSick = false; await syncQuestReminders(); assert.ok(scheduled.size > 1);
    app.userEmail = null; await syncQuestReminders(); assert.equal(scheduled.size, 1);
    app.userEmail = 'kid@example.test'; allowed = false; await syncQuestReminders(); assert.equal(scheduled.size, 1);
    allowed = true; app.role = 'parent'; await syncQuestReminders(); assert.equal(scheduled.size, 1);
  });
  await test('Alarm mode replaces regular notifications and falls back when exact permission is lost', async () => {
    app = { userEmail: 'kid@example.test', role: 'child', tasks: [{ ...task, reminderMode: 'alarm' }], isSick: false, lastActiveDate: localDay(), language: 'en' };
    prefs.accounts[app.userEmail] = { enabled: true, time: '18:00', sound: true };
    await syncQuestReminders();
    assert.ok(alarmInput.enabled); assert.ok(alarmInput.slots.length > 0);
    assert.deepEqual(alarmInput.liveIds, ['brush']); assert.equal(scheduled.size, 1);
    app.tasks.push({ ...task, id: 'quiet', reminderMode: 'notification' });
    await syncQuestReminders();
    assert.ok(alarmInput.slots.every(slot => slot.taskIds.length === 1 && slot.taskIds[0] === 'brush'));
    assert.ok([...scheduled.values()].filter(item => item.identifier !== 'other-feature').every(item => item.content.data.taskIds.length === 1 && item.content.data.taskIds[0] === 'quiet'));
    exactAllowed = false; await syncQuestReminders();
    assert.equal(alarmInput.enabled, false); assert.equal(alarmInput.slots.length, 0); assert.ok(scheduled.size > 1);
    exactAllowed = true; app.isSick = true; await syncQuestReminders();
    assert.equal(alarmInput.enabled, false); assert.equal(alarmInput.slots.length, 0); assert.equal(scheduled.size, 1);
  });
  await test('Completed tasks cannot retain snoozes; yesterday completion does not cancel today', async () => {
    app.isSick = false; app.tasks = [{ ...task, done: true, reminderMode: 'alarm' }];
    app.lastActiveDate = localDay(); await syncQuestReminders(); assert.deepEqual(alarmInput.liveIds, []);
    app.lastActiveDate = '2000-01-01'; await syncQuestReminders(); assert.deepEqual(alarmInput.liveIds, ['brush']);
    app.userEmail = null; await syncQuestReminders(); assert.equal(alarmInput.enabled, false); assert.equal(alarmInput.account, '');
  });
  await test('Remote alerts reject the wrong account and route valid taps through the guarded destination', async () => {
    app = { userId: 'child', userEmail: 'kid@example.test', role: 'child', isSick: false, tasks: [] };
    auth.currentUser = { uid: 'child' };
    prefs.accounts[app.userEmail] = { familyAlerts: true, sound: true };
    const opened = [];
    const stop = await observeQuestNotifications(() => { throw Error('Remote alerts must not use the local reminder route'); }, destination => opened.push(destination));
    const data = { questbloxPush: true, recipient: 'other-child', kind: 'battle_invite', battleId: 'safe-id' };
    const notification = { request: { identifier: 'push-id', content: { data } } };
    assert.equal((await foregroundHandler.handleNotification(notification)).shouldShowBanner, false);
    responseListener({ notification }); assert.equal(opened.length, 0);
    data.recipient = 'child';
    responseListener({ notification });
    assert.deepEqual(opened, [{ screen: 'battle', id: 'safe-id' }]);
    auth.currentUser = null;
    assert.equal((await foregroundHandler.handleNotification(notification)).shouldShowBanner, false);
    responseListener({ notification }); assert.equal(opened.length, 1);
    stop(); assert.equal(responseListener, null);
  });
  console.log(`${count} reminder checks passed; no real notifications sent.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
