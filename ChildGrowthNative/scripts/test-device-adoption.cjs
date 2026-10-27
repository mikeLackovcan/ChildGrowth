const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function fixture() {
  const saved = new Map();
  const calls = { pair: 0, released: 0 };
  let state = {
    userId: 'guest-local', userEmail: 'guest@local', nickname: 'guest', role: 'child', fullName: 'Alex',
    tasks: [{ id: 'a', name: 'Read', done: true }], prizes: ['Park'], wonPrizes: [{ id: 'prize' }],
    coins: 40, totalEarned: 100, dailyEarnings: { date: '2026-10-23', coins: 100 },
    activityHistory: [], rewardGoal: { title: 'Bike', target: 3000, startCoins: 0 }, xp: 20, level: 2,
    currentAvatar: 'quest_coral', unlockedAvatars: ['default', 'quest_coral'],
    activeTheme: 'space', unlockedThemes: ['classic', 'space'], activeBackground: 'mint',
    unlockedBackgrounds: ['clean', 'mint'], lastSpinDate: '2026-10-23', lastActiveDate: '2026-10-23',
    epicBossTask: '', epicBossXP: 35, language: 'cs',
    saveMockState: async () => {},
  };
  const world = { ownerKey: 'guest-local', spentPower: 500, placements: [{ plotId: 'home', type: 'home', level: 2 }], updatedAt: 10,
    hydrate: async key => { world.ownerKey = key; } };
  const control = {
    pair: async (_code, guest) => ({ profile: { uid: 'child-a', nickname: 'alex', full_name: 'Alex', parent_uid: 'parent-a' }, data: guest }),
    write: async (key, value) => { saved.set(key, value); },
  };
  const mocks = {
    '../store/useAppStore': { useAppStore: { getState: () => state, setState: patch => { state = { ...state, ...patch }; } } },
    '../store/useWorldStore': { useWorldStore: { getState: () => world, setState: patch => Object.assign(world, patch) } },
    './devicePairing': {
      pairDevice: async (...args) => { calls.pair++; return control.pair(...args); },
      releaseDeviceLink: async () => { calls.released++; },
    },
    './projectStorage': { default: { setItem: (...args) => control.write(...args), getItem: async key => saved.get(key) || null } },
    './questSchedule': { localDateKey: () => '2026-10-23' },
    './weeklyProgress': { normalizeActivity: value => value || [] },
  };
  const filename = path.resolve(__dirname, '../src/lib/connectGuestDevice.ts');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = name => {
    assert.ok(mocks[name], 'Unexpected dependency ' + name);
    return { __esModule: true, ...mocks[name] };
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return { connect: mod.exports.connectGuestDevice, state: () => state, patch: patch => { state = { ...state, ...patch }; }, world, calls, control, saved };
}

test('successful device adoption preserves economy, purchases, rewards and town', async () => {
  const f = fixture();
  await f.connect('ABCD-EFGH-2345');
  assert.equal(f.state().userId, 'child-a');
  assert.equal(f.state().role, 'child');
  assert.equal(f.state().coins, 40);
  assert.equal(f.state().totalEarned, 100);
  assert.equal(f.state().activeBackground, 'mint');
  assert.equal(f.state().activeTheme, 'space');
  assert.equal(f.state().lastSpinDate, '2026-10-23');
  assert.equal(f.state().language, 'cs');
  assert.deepEqual(f.state().linkedParents, ['parent-a']);
  assert.equal(f.world.ownerKey, 'child-a');
  assert.equal(JSON.parse(f.saved.get('world_child-a')).spentPower, 500);
  assert.equal(JSON.parse(f.saved.get('mockState_alex')).rewardGoal.title, 'Bike');
  assert.equal(f.saved.get('active_user_tag'), 'alex');
});

test('failed code or network request leaves the guest identity and progress intact', async () => {
  const f = fixture();
  f.control.pair = async () => { throw new Error('pair_expired_code'); };
  await assert.rejects(f.connect('bad'), /pair_expired_code/);
  assert.equal(f.state().userId, 'guest-local');
  assert.equal(f.state().coins, 40);
  assert.equal(f.saved.size, 0);
});

test('parent accounts cannot enter the child device flow', async () => {
  const f = fixture();
  f.patch({ role: 'parent', userId: 'parent-a' });
  await assert.rejects(f.connect('code'), /pair_use_child_device/);
  assert.equal(f.calls.pair, 0);
});

test('progress changed while pairing is preserved and unfinished binding is released', async () => {
  const f = fixture();
  const original = f.control.pair;
  f.control.pair = async (...args) => { f.patch({ coins: 50 }); return original(...args); };
  await assert.rejects(f.connect('code'), /pair_progress_conflict/);
  assert.equal(f.state().coins, 50);
  assert.equal(f.state().userId, 'guest-local');
  assert.equal(f.calls.released, 1);
});

test('a changed signed-in session is never overwritten by a late pairing response', async () => {
  const f = fixture();
  const original = f.control.pair;
  f.control.pair = async (...args) => { f.patch({ userId: 'other', role: 'parent' }); return original(...args); };
  await assert.rejects(f.connect('code'), /pair_session_changed/);
  assert.equal(f.state().userId, 'other');
  assert.equal(f.calls.released, 0);
});

test('storage failure prevents false success and does not replace the in-memory guest', async () => {
  const f = fixture();
  f.control.write = async () => { throw new Error('disk-full'); };
  await assert.rejects(f.connect('code'), /disk-full/);
  assert.equal(f.state().userId, 'guest-local');
  assert.equal(f.state().coins, 40);
});

test('local-only profile can reconnect with its own baseline and refresh the same-owner town', async () => {
  const f = fixture();
  f.patch({ userId: 'child-a', nickname: 'alex', deviceConnection: 'local' });
  f.saved.set('device_reconnect_baseline_child-a', JSON.stringify({ coins: 40 }));
  let resume;
  f.control.pair = async (_code, guest, options) => {
    resume = options;
    return { profile: { uid: 'child-a', nickname: 'alex', full_name: 'Alex', parent_uid: 'parent-a' }, data: guest };
  };
  await f.connect('code');
  assert.deepEqual(resume, { childUid: 'child-a', baseline: { coins: 40 } });
  assert.equal(f.state().deviceConnection, 'linked');
  assert.equal(f.state().coins, 40);
  assert.equal(f.world.hydrated, false); // Rehydration was explicitly requested even with the same owner.
});

test('missing reconnect baseline remains explicit so service cannot silently reuse an old import', async () => {
  const f = fixture();
  f.patch({ userId: 'child-a', nickname: 'family_child-a', deviceConnection: 'local' });
  f.control.pair = async (_code, _guest, options) => {
    assert.deepEqual(options, { childUid: 'child-a', baseline: null });
    throw new Error('pair_progress_conflict');
  };
  await assert.rejects(f.connect('code'), /pair_progress_conflict/);
  assert.equal(f.state().deviceConnection, 'local');
  assert.equal(f.state().coins, 40);
});
