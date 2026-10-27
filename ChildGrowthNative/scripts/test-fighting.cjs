// Pure, offline combat tests. Image requires are stubbed; no app/account state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '../src', file);
  if (/\.png$/.test(file)) return file;
  if (!file.endsWith('.ts')) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => load(path.resolve(path.dirname(file), name)), module, module.exports);
  return module.exports;
}
const rig = load('utils/fighterRigging');
const game = load('utils/fightingGame');
const { AVAILABLE_AVATARS } = load('constants/fighters');
const neutral = { move: 0, block: false };
const pair = [neutral, neutral];
const dt = rig.FIGHT_DT;
let count = 0;
function test(name, fn) { fn(); count++; console.log(`✓ ${name}`); }
function close(a, b, tolerance = 1e-7) { assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`); }
function ready(id = 'roblox_noob', gap = 16) {
  const state = game.newRealTimeFight(id, id);
  state.phase = 'fighting'; state.phaseTime = 0;
  state.fighters[0].x = 40; state.fighters[1].x = 40 + gap;
  return state;
}
function ticks(state, n, inputs = pair) { for (let i = 0; i < n; i++) state = game.stepRealTimeFight(state, inputs, dt); return state; }

test('Every roster fighter has a distinct weapon and valid frame data', () => {
  assert.equal(new Set(AVAILABLE_AVATARS.map(f => rig.fighterLoadout(f.id).weapon)).size, 12);
  for (const f of AVAILABLE_AVATARS) {
    assert.ok(rig.FIGHTER_LOADOUTS[f.id]);
    for (const action of ['jab', 'kick', 'special']) {
      const spec = rig.attackSpec(f.id, action);
      assert.equal(spec.total, spec.startup + spec.active + spec.recovery);
      assert.ok(spec.startup > 0 && spec.active > 0 && spec.recovery > 0);
    }
  }
});
test('All 12 rigs preserve four limb lengths and weapon sockets across 9 actions', () => {
  for (const f of AVAILABLE_AVATARS) for (const action of ['idle', 'walk', 'jump', 'block', 'jab', 'kick', 'special', 'hit', 'ko']) for (let frame = 0; frame <= 120; frame++) {
    const p = rig.sampleFighterPose(f.id, action, frame / 60);
    for (const key of ['frontArm', 'backArm', 'frontLeg', 'backLeg']) {
      const limb = p[key], leg = key.endsWith('Leg');
      close(rig.distance(limb.root, limb.joint), leg ? 36 : 29);
      close(rig.distance(limb.joint, limb.end), leg ? 39 : 29);
    }
    close(rig.distance(p.frontArm.end, p.weaponTip), rig.fighterLoadout(f.id).length);
  }
});
test('IK handles coincident, unreachable and near-singular targets', () => {
  for (const target of [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 0.000001, y: 0 }]) for (const bend of [-1, 1]) {
    const limb = rig.solveLimb({ x: 0, y: 0 }, target, 36, 39, bend);
    close(rig.distance(limb.root, limb.joint), 36);
    close(rig.distance(limb.joint, limb.end), 39);
  }
});
test('Capsule overlap handles crossing, parallel, point and separated segments', () => {
  const capsule = (x1, y1, x2, y2, radius = 0) => ({ a: { x: x1, y: y1 }, b: { x: x2, y: y2 }, radius });
  assert.ok(rig.capsulesOverlap(capsule(0, 0, 10, 10), capsule(0, 10, 10, 0)));
  assert.ok(rig.capsulesOverlap(capsule(0, 0, 10, 0, 1), capsule(0, 2, 10, 2, 1)));
  assert.ok(rig.capsulesOverlap(capsule(5, 0, 5, 0), capsule(0, 0, 10, 0)));
  assert.ok(!rig.capsulesOverlap(capsule(0, 0, 1, 0), capsule(2, 0, 3, 0)));
});
test('Mirroring preserves weapon geometry, including airborne world offset', () => {
  for (const id of Object.keys(rig.FIGHTER_LOADOUTS)) {
    const f = { id, action: 'special', actionElapsed: rig.attackSpec(id, 'special').startup / 60, x: 50, y: 7, facing: 1 };
    const a = rig.attackCapsule(f), b = rig.attackCapsule({ ...f, facing: -1 });
    close(a.a.x + b.a.x, 100); close(a.b.x + b.b.x, 100); close(a.b.y, b.b.y);
    close(a.b.y, rig.sampleFighterPose(id, 'special', f.actionElapsed).weaponTip.y * rig.RIG_SCALE - 7);
  }
});
test('A jab has startup, one contact, recovery, and does not mutate input state', () => {
  let state = ready(); const original = state; const before = JSON.stringify(state);
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab' }, neutral], dt);
  assert.equal(JSON.stringify(original), before);
  state = ticks(state, 4); assert.equal(state.fighters[1].hp, 100);
  state = ticks(state, 1); assert.equal(state.fighters[1].hp, 93);
  state = ticks(state, 50); assert.equal(state.fighters[1].hp, 93); assert.equal(state.eventSerial, 1);
  assert.equal(state.fighters[0].action, 'idle');
});
test('Every weapon can hit, and needs full energy to start', () => {
  for (const id of Object.keys(rig.FIGHTER_LOADOUTS)) {
    let state = game.stepRealTimeFight(ready(id), [{ ...neutral, attack: 'special' }, neutral], dt);
    assert.notEqual(state.fighters[0].action, 'special');
    state = ready(id); state.fighters[0].energy = 100;
    state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'special' }, neutral], dt);
    assert.equal(state.fighters[0].energy, 0);
    state = ticks(state, 90);
    assert.ok(state.fighters[1].hp < 100, `${id} weapon missed at close range`);
    assert.equal(state.eventSerial, 1);
  }
});
test('Whiffs and a high airborne defender do not take phantom damage', () => {
  let state = ready('roblox_ninja', 45); state.fighters[0].energy = 100;
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'special' }, neutral], dt);
  state = ticks(state, 60); assert.equal(state.fighters[1].hp, 100);
  state = ready(); state.fighters[1].y = 48;
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab' }, neutral], dt);
  state = ticks(state, 10); assert.equal(state.fighters[1].hp, 100);
});
test('Guard reduces damage and same-frame attacks trade without player-order priority', () => {
  let state = game.stepRealTimeFight(ready(), [{ ...neutral, attack: 'jab' }, { ...neutral, block: true }], dt);
  state = ticks(state, 10, [neutral, { ...neutral, block: true }]);
  assert.equal(state.fighters[1].hp, 98); assert.equal(state.event.blocked, true);
  state = game.stepRealTimeFight(ready(), [{ ...neutral, attack: 'jab' }, { ...neutral, attack: 'jab' }], dt);
  state = ticks(state, 5);
  assert.equal(state.fighters[0].hp, 93); assert.equal(state.fighters[1].hp, 93); assert.equal(state.eventSerial, 2);
});
test('30, 60 and 120 Hz rendering produce identical fixed-step movement', () => {
  const results = [30, 60, 120].map(hz => {
    let state = ready('roblox_noob', 40);
    for (let i = 0; i < hz / 2; i++) state = game.stepRealTimeFight(state, [{ move: 1, block: false }, neutral], 1 / hz);
    return state;
  });
  for (const state of results) { close(state.fighters[0].x, 50.2); close(state.timeLeft, 59.5); }
});
test('Inputs survive a sub-tick frame and hitstop without being repeated', () => {
  let state = game.stepRealTimeFight(ready(), [{ ...neutral, attack: 'jab' }, neutral], dt / 2);
  assert.equal(state.fighters[0].action, 'idle');
  state = game.stepRealTimeFight(state, pair, dt / 2);
  assert.equal(state.fighters[0].action, 'jab');
  state = ticks(state, 60); assert.equal(state.eventSerial, 1);
  state = ready(); state.hitstop = 2;
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'kick' }, neutral], dt);
  state = ticks(state, 2); assert.equal(state.fighters[0].action, 'kick');
});
test('Equal-health timeout and double KO are draws, with no free player-0 win', () => {
  let state = ready(); state.timeLeft = dt;
  state = ticks(state, 1); assert.equal(state.winner, null); assert.equal(state.phase, 'roundOver');
  assert.deepEqual(state.fighters.map(f => f.rounds), [0, 0]);
  state = ready(); state.fighters.forEach(f => f.hp = 7);
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab' }, { ...neutral, attack: 'jab' }], dt);
  state = ticks(state, 5); assert.equal(state.winner, null); assert.equal(state.phase, 'roundOver');
  assert.ok(state.fighters.every(f => f.action === 'ko'));
});
test('KO animation advances after match completion and rematches reset state', () => {
  let state = ready(); state.fighters[0].rounds = 1; state.fighters[1].hp = 7;
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab' }, neutral], dt);
  state = ticks(state, 5); assert.equal(state.phase, 'matchOver'); assert.equal(state.winner, 0);
  state = ticks(state, 40); assert.ok(state.fighters[1].actionElapsed > 0.6);
  const fresh = game.newRealTimeFight('roblox_noob', 'roblox_ninja');
  assert.equal(fresh.eventSerial, 0); assert.equal(fresh.hitstop, 0); assert.equal(fresh.remainder, 0);
});
console.log(`${count} fighting/rigging checks passed.`);
