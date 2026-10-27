const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const cache = new Map();
const memory = new Map();
const storage = { getItem: async key => memory.get(key) || null, setItem: async (key, value) => memory.set(key, value), removeItem: async key => memory.delete(key) };
function load(file) {
  file = path.resolve(__dirname, '../src', file);
  if (!file.endsWith('.ts')) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name === 'zustand') return require('zustand');
    if (name.includes('async-storage')) return storage;
    if (name.includes('firebase')) return new Proxy({}, { get: () => () => { throw new Error('Unexpected network access in isolated test'); } });
    if (name.includes('i18n')) return { changeLanguage() {}, t: key => key };
    if (name.includes('sound')) return { playSound() {} };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { localDay, tasksForDay, canSpin } = load('utils/questDay');
const { newPractice, practiceTurn } = load('utils/practiceBattle');
const { useAppStore: store } = load('store/useAppStore');
let passed = 0;
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }
const today = localDay();
const task = { id: 'one', name: 'Brush', diff: 'easy', freq: 'daily', done: false, date: today, mystery: false };
function reset(extra = {}) { store.setState({ userEmail: null, userId: 'guest-local', role: 'child', tasks: [{ ...task }], coins: 0, xp: 0, level: 1, isSick: false, currentAvatar: 'roblox_noob', epicClaimedDate: null, lastSpinDate: null, wonPrizes: [], prizes: ['Custom A', 'Custom B'], children: [], selectedChildId: null, linkedParents: [], superchargedTaskId: null, ...extra }); }
test('Local dates and weekday schedule exclude future postponements', () => {
  const date = new Date(2026, 9, 20, 0, 15);
  assert.equal(localDay(date), '2026-10-20');
  const result = tasksForDay([{ ...task, freq: 'weekdays' }, { ...task, id: 'weekend', freq: 'weekends' }, { ...task, id: 'later', postponedUntil: '2026-10-21' }], date);
  assert.equal(result.length, 1);
});
test('Parent edits update only the selected child reminder time', () => {
  reset({ role: 'parent', selectedChildId: 'kid-a', children: [
    { id: 'kid-a', tasks: [{ ...task }] }, { id: 'kid-b', tasks: [{ ...task }] },
  ] });
  store.getState().updateTask('one', { reminderTime: '17:30' });
  assert.equal(store.getState().tasks[0].reminderTime, '17:30');
  assert.equal(store.getState().children[0].tasks[0].reminderTime, '17:30');
  assert.equal(store.getState().children[1].tasks[0].reminderTime, undefined);
});
test('Editor versions preserve a newer local edit and allow ordered edits', () => {
  reset({ role: 'parent' });
  assert.equal(store.getState().updateTask(task.id, { name: 'New instructions' }, 0), true);
  const revision = store.getState().tasks[0].revision;
  assert.equal(typeof revision, 'string');
  assert.equal(store.getState().updateTask(task.id, { name: 'Stale draft' }, 0), false);
  assert.equal(store.getState().tasks[0].name, 'New instructions');
  assert.equal(store.getState().updateTask(task.id, { reminderTime: '18:00' }, revision), true);
  assert.notEqual(store.getState().tasks[0].revision, revision);
});
test('Pending approval survives midnight and account restoration; a late review leaves today undone', () => {
  reset({ tasks: [{ ...task, date: '2026-01-01', requiresApproval: true }], lastActiveDate: '2026-01-01' });
  store.getState().submitTaskForApproval(task.id);
  const pending = store.getState().tasks[0];
  const earned = pending.pendingReward;
  store.getState().resetTasksForNewDay();
  assert.equal(store.getState().tasks[0].pendingApproval, true);
  assert.equal(store.getState().tasks[0].date, '2026-01-01');
  const { restoredAccount } = load('utils/accountState');
  const restored = restoredAccount({}, { tasks: [pending], lastActiveDate: '2026-01-01' }, { uid: 'kid', email: 'test@example.test', name: 'Test', nickname: 'test', role: 'child' });
  assert.equal(restored.tasks[0].pendingApproval, true);
  reset({ role: 'parent', selectedChildId: 'kid', tasks: [pending], children: [{ id: 'kid', tasks: [pending], xp: 0, level: 1, coins: 0, currentAvatar: 'roblox_ninja' }] });
  store.getState().verifyChildTask('kid', task.id, true);
  assert.equal(store.getState().coins, earned.coinGain);
  assert.equal(store.getState().tasks[0].done, false);
  assert.equal(store.getState().tasks[0].date, today);
  store.getState().verifyChildTask('kid', task.id, true);
  assert.equal(store.getState().coins, earned.coinGain);
  assert.equal(store.getState().claimEpicBoss(), null);
});
test('A quest pays once, including its actual fighter bonus', () => {
  reset(); const reward = store.getState().toggleTaskDone('one');
  assert.equal(store.getState().coins, reward.coinGain);
  assert.equal(store.getState().xp, reward.xpGain);
  store.getState().toggleTaskDone('one');
  assert.equal(store.getState().coins, reward.coinGain);
});
test('Approval task remains unpaid and pending until review', async () => {
  reset({ tasks: [{ ...task, requiresApproval: true }] });
  store.getState().toggleTaskDone('one'); store.getState().toggleTaskDone('one');
  assert.equal(store.getState().coins, 0); assert.equal(store.getState().tasks[0].pendingApproval, true);
  assert.equal(store.getState().claimEpicBoss(), null); assert.equal(await store.getState().spinPrize(), null);
});
test('Pending submissions survive local single and bulk deletion until parent review', () => {
  const pending = { ...task, requiresApproval: true, pendingApproval: true };
  reset({ role: 'parent', selectedChildId: 'kid', tasks: [pending], children: [{ id: 'kid', tasks: [pending], xp: 0, level: 1, coins: 0, currentAvatar: 'roblox_noob' }] });
  store.getState().removeTask(task.id);
  store.getState().deleteAllTasks();
  assert.equal(store.getState().tasks.length, 1);
  assert.equal(store.getState().children[0].tasks[0].pendingApproval, true);
  store.getState().verifyChildTask('kid', task.id, false);
  store.getState().removeTask(task.id);
  assert.equal(store.getState().tasks.length, 0);
  assert.equal(store.getState().children[0].tasks.length, 0);
});
test('Parent approval is idempotent and preserves accumulated levels', () => {
  const pending = { ...task, requiresApproval: true, pendingApproval: true };
  reset({ role: 'parent', selectedChildId: 'kid', tasks: [pending], children: [{ id: 'kid', tasks: [pending], xp: 95, level: 4, coins: 10, currentAvatar: 'roblox_noob' }] });
  store.getState().verifyChildTask('kid', 'one', true);
  const child = store.getState().children[0];
  assert.equal(child.level, 5); assert.equal(child.xp, 5); assert.equal(child.coins, 22);
  store.getState().verifyChildTask('kid', 'one', true);
  assert.equal(store.getState().children[0].coins, 22);
});
test('Daily + Epic unlock one spin from the exact custom pool', async () => {
  reset(); assert.equal(await store.getState().spinPrize(), null);
  store.getState().toggleTaskDone('one'); assert.equal(await store.getState().spinPrize(), null);
  assert.ok(store.getState().claimEpicBoss());
  const prize = await store.getState().spinPrize(); assert.ok(['Custom A', 'Custom B'].includes(prize.prize));
  assert.equal(await store.getState().spinPrize(), null); assert.equal(store.getState().wonPrizes.length, 1);
});
test('Unscheduled quests do not block the daily spin; empty pool cannot consume it', async () => {
  reset({ tasks: [{ ...task, postponedUntil: '2099-01-01' }], prizes: [] });
  assert.ok(store.getState().claimEpicBoss()); assert.equal(await store.getState().spinPrize(), null);
  assert.equal(store.getState().lastSpinDate, null);
});
test('Empty quest list is not silently repopulated by a completion tap', () => {
  reset({ tasks: [] }); store.getState().toggleTaskDone('starter_1'); assert.equal(store.getState().tasks.length, 0);
});
test('Rest days prevent quest and Epic claims', () => {
  reset({ isSick: true }); assert.equal(store.getState().toggleTaskDone('one'), null); assert.equal(store.getState().claimEpicBoss(), null);
});
test('Practice guard reduces damage, skill cooldown and terminal results hold', () => {
  const player = { hp: 120, attack: 25, speed: 25 }, rival = { hp: 100, attack: 20, speed: 20 };
  const initial = newPractice(player, rival);
  assert.ok(practiceTurn(initial, 'guard', player, rival).playerHP > practiceTurn(initial, 'attack', player, rival).playerHP);
  let state = practiceTurn(initial, 'skill', player, rival);
  assert.equal(practiceTurn(state, 'skill', player, rival), state);
  for (let i = 0; i < 30 && !state.finished; i++) state = practiceTurn(state, 'attack', player, rival);
  assert.equal(state.finished, true); assert.equal(practiceTurn(state, 'attack', player, rival), state);
});
test('Daily reset clears completed receipts exactly once', () => {
  reset({ lastActiveDate: '2026-01-01', tasks: [{ ...task, date: '2026-01-01', done: true, pendingApproval: false, awardedReward: { coinGain: 14, xpGain: 12 } }] });
  store.getState().resetTasksForNewDay();
  assert.equal(store.getState().tasks[0].pendingApproval, false);
  assert.equal(store.getState().tasks[0].awardedReward, undefined);
  const streak = store.getState().streak;
  store.getState().toggleTaskDone('one');
  store.getState().resetTasksForNewDay();
  assert.equal(store.getState().tasks[0].done, true);
  assert.equal(store.getState().streak, streak);
});
const { restoredAccount, canManageQuest } = load('utils/accountState');
const { mergeCloudState } = load('utils/mergeCloudState');
test('Linked children cannot edit or delete family quests or change rewards', () => {
  reset({ linkedParents: ['parent'], tasks: [{ ...task, ownerRole: 'parent' }] });
  store.getState().removeTask(task.id); store.getState().updateTask(task.id, { name: 'Changed' });
  store.getState().setPrizes(['Unauthorised prize']);
  assert.equal(store.getState().tasks[0].name, 'Brush');
  assert.deepEqual(store.getState().prizes, ['Custom A', 'Custom B']);
  assert.equal(canManageQuest(task, 'child', ['parent']), false);
});
test('Child-created family quests require approval and cannot bypass it through editing', () => {
  reset({ linkedParents: ['parent'] });
  store.getState().addTask({ name: 'Help', diff: 'hard', freq: 'daily', mystery: false });
  const created = store.getState().tasks.at(-1);
  assert.equal(created.ownerRole, 'child'); assert.equal(created.requiresApproval, true);
  store.getState().updateTask(created.id, { requiresApproval: false, done: true, diff: 'hard' });
  assert.equal(store.getState().tasks.at(-1).requiresApproval, true);
  assert.equal(store.getState().tasks.at(-1).done, false);
});
test('Restoring an account preserves identity, rewards and same-day spin gate', () => {
  const account = restoredAccount({ nickname: 'original', role: 'parent', coins: 420, xp: 35, level: 9 },
    { tasks: [], lastActiveDate: today, lastSpinDate: today, epicClaimedDate: today, won_prizes: [{ id: 'saved' }], unlocked_avatars: ['roblox_dragon'] },
    { uid: 'verified', email: 'parent@example.test', name: 'Parent', nickname: 'fallback', role: 'child' });
  assert.equal(account.coins, 420); assert.equal(account.nickname, 'original'); assert.equal(account.role, 'parent');
  assert.equal(account.lastSpinDate, today); assert.equal(account.wonPrizes[0].id, 'saved');
  const fresh = restoredAccount({}, {}, { uid: 'new', email: 'new@example.test', name: 'New', nickname: 'new', role: 'child' });
  assert.equal(fresh.coins, 0); assert.equal(fresh.children.length, 0); assert.equal(fresh.lastSpinDate, null);
});
test('Cloud merging preserves independent edits, deletion and concurrent siblings', () => {
  const base = { tasks: [{ id: 'a', name: 'Read', done: false }, { id: 'b', name: 'Brush', done: false }] };
  const local = { tasks: [{ id: 'a', name: 'Read books', done: false }, { id: 'b', name: 'Brush', done: false }] };
  const remote = { tasks: [{ id: 'a', name: 'Read', done: true }, { id: 'b', name: 'Brush', done: false }, { id: 'c', name: 'Help' }] };
  const merged = mergeCloudState(base, local, remote);
  assert.equal(merged.tasks[0].name, 'Read books'); assert.equal(merged.tasks[0].done, true); assert.equal(merged.tasks.length, 3);
  assert.deepEqual(mergeCloudState(base, { tasks: [base.tasks[0]] }, base).tasks, [base.tasks[0]]);
  assert.throws(() => mergeCloudState({ coins: 10 }, { coins: 20 }, { coins: 30 }), /SYNC_CONFLICT/);
});
const { newDuel, duelTurn, DUEL_SKILLS } = load('utils/duel');
const { wheelRotation } = load('utils/prizeWheel');
test('The wheel pointer lands inside the awarded segment for every prize', () => {
  for (let count = 1; count <= 40; count++) for (let index = 0; index < count; index++) {
    const pointer = (360 - wheelRotation(index, count) % 360) % 360;
    assert.equal(Math.floor(pointer / (360 / count)), index);
  }
});
test('Every fighter skill works, uses a cooldown and keeps health in bounds', () => {
  for (const fighter of Object.keys(DUEL_SKILLS)) {
    let state = newDuel(fighter, 'roblox_noob');
    state.players[0].hp = 50;
    state = duelTurn(state, 'skill');
    assert.equal(state.active, 1); assert.ok(state.players[0].readyAt > 0);
    state = duelTurn(state, 'attack');
    assert.equal(duelTurn(state, 'skill'), state);
    for (let turn = 0; turn < 120 && state.winner === null; turn++) state = duelTurn(state, 'attack');
    assert.notEqual(state.winner, null);
    assert.ok(state.players.every(p => p.hp >= 0 && p.hp <= 100));
    assert.equal(duelTurn(state, 'attack'), state);
  }
});
test('Guard blocks, piercing bypasses shields, healing caps and burn expires', () => {
  let guarded = duelTurn(newDuel('roblox_noob', 'roblox_noob'), 'guard');
  guarded = duelTurn(guarded, 'attack'); assert.equal(guarded.players[0].hp, 96);
  let pierced = newDuel('roblox_dominus', 'roblox_builderman');
  pierced.players[1].shield = 25; pierced.players[1].guarding = true;
  pierced = duelTurn(pierced, 'skill'); assert.equal(pierced.players[1].hp, 78);
  let healed = newDuel('roblox_unicorn', 'roblox_noob'); healed.players[0].hp = 95;
  assert.equal(duelTurn(healed, 'skill').players[0].hp, 100);
  let burning = duelTurn(newDuel('roblox_bacon_hair', 'roblox_noob'), 'skill');
  for (let turn = 0; turn < 4; turn++) burning = duelTurn(burning, 'guard');
  assert.equal(burning.players[1].burnTurns, 0); assert.equal(burning.players[1].hp, 78);
  const finalBurn = newDuel('roblox_noob', 'roblox_bacon_hair');
  finalBurn.players[0].hp = 3; finalBurn.players[0].burn = 4; finalBurn.players[0].burnTurns = 1;
  const ended = duelTurn(finalBurn, 'attack');
  assert.equal(ended.winner, 1); assert.equal(ended.turn, 1);
  assert.equal(ended.players[0].hp, 0); assert.equal(ended.players[1].hp, 100);
  assert.deepEqual(ended.event, { key: 'arena_damage', actor: 1, damage: 3 });
  assert.equal(duelTurn(ended, 'attack'), ended);
});
(async () => {
  for (const { name, fn } of cases) { await fn(); passed++; console.log(`✓ ${name}`); }
  await new Promise(resolve => setImmediate(resolve));
  memory.clear();
  reset();
  memory.set('user_email_someone', 'someone@example.test');
  const rejected = await store.getState().loginWithEmail('someone', 'wrong-password');
  assert.equal(rejected.success, false); assert.equal(store.getState().userEmail, null);
  passed++; console.log('✓ Failed authentication cannot open a cached profile');

  reset({ userEmail: 'guest@questblox.local', userId: 'guest-local', nickname: 'guest', coins: 123, lastActiveDate: today });
  await store.getState().logout();
  await store.getState().continueAsGuest();
  assert.equal(store.getState().coins, 123);
  assert.equal(store.getState().userId, 'guest-local');
  passed++;
  console.log('✓ Guest progress survives logout and guest re-entry');
  console.log(`${passed} isolated checks passed; no Firebase writes.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
