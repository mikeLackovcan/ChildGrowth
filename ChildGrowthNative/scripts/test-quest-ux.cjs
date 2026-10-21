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
const mocks = {
  '../lib/firebase': { auth: { currentUser: null }, db: {} },
  'firebase/auth': {},
  'firebase/firestore': {},
  '../lib/familyCloud': {},
  '../lib/projectStorage': { default: {
    getItem: async key => storage.get(key) || null,
    setItem: async (key, value) => { storage.set(key, value); },
  } },
  '../i18n': { default: { changeLanguage() {}, t: (_, fallback) => fallback } },
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
const { calculateQuestReward } = load(path.join(root, 'src/lib/heroRewards.ts'));
const { reminderPlan } = load(path.join(root, 'src/lib/reminderPlan.ts'));
const { wheelPrizePresentation } = load(path.join(root, 'src/lib/wheelPrizePresentation.ts'));
const { todayBuildPower, worldPowerBalance, canPlaceBuilding, WORLD_BUILDINGS } = load(path.join(root, 'src/lib/worldEconomy.ts'));
const { useAppStore: store } = load(path.join(root, 'src/store/useAppStore.ts'));
const { useWorldStore: worldStore } = load(path.join(root, 'src/store/useWorldStore.ts'));
const initial = store.getState();
const task = (id, extra = {}) => ({
  id, name: id, icon: '⭐', freq: 'daily', diff: 'med', mystery: false,
  done: false, date: localDateKey(), ...extra,
});
const reset = (extra = {}) => {
  store.setState({ ...initial, userEmail: 'guest@local', userId: 'guest-local', role: 'child',
    saveMockState: async () => {}, ...extra }, true);
};

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
