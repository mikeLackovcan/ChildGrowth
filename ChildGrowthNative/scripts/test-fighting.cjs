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
  state.fighters.forEach(game.resetFighterFootwork);
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
test('All 12 rigs preserve profile-specific limb lengths and weapon sockets across 12 actions', () => {
  for (const f of AVAILABLE_AVATARS) for (const action of ['idle', 'walk', 'takeoff', 'jump', 'land', 'block', 'jab', 'kick', 'special', 'hit', 'ko', 'victory']) for (let frame = 0; frame <= 120; frame++) {
    const p = rig.sampleFighterPose(f.id, action, frame / 60);
    for (const key of ['frontArm', 'backArm', 'frontLeg', 'backLeg']) {
      const limb = p[key], leg = key.endsWith('Leg');
      close(rig.distance(limb.root, limb.joint), leg ? 36 * p.body.height : 29 * p.body.arm);
      close(rig.distance(limb.joint, limb.end), leg ? 39 * p.body.height : 29 * p.body.arm);
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
  assert.equal(state.fighters[0].action, 'victory');
  state = ticks(state, 40); assert.ok(state.fighters[1].actionElapsed > 0.6);
  state.fighters[1].y = 5; state.fighters[1].velocityY = 10;
  state = ticks(state, 60); assert.equal(state.fighters[1].y, 0);
  const fresh = game.newRealTimeFight('roblox_noob', 'roblox_ninja');
  assert.equal(fresh.eventSerial, 0); assert.equal(fresh.hitstop, 0); assert.equal(fresh.remainder, 0);
});
test('Weapon families have distinct thrust, overhead and slash poses', () => {
  const pose = id => rig.sampleFighterPose(id, 'special', (rig.attackSpec(id, 'special').startup + 4) / 60);
  close(pose('roblox_dominus').weaponAngle, 0);
  close(pose('roblox_builderman').weaponAngle, 0);
  assert.notEqual(pose('roblox_builderman').frontArm.end.y, pose('roblox_dominus').frontArm.end.y);
  assert.notEqual(pose('roblox_ninja').weaponAngle, pose('roblox_wizard').weaponAngle);
});
test('All silhouettes have authored body proportions and movement rhythms', () => {
  const profiles = AVAILABLE_AVATARS.map(f => rig.BODY_PROFILES[f.id]);
  assert.ok(profiles.every(Boolean));
  assert.equal(new Set(profiles.map(p => JSON.stringify(p))).size, 12);
  assert.ok(rig.fighterBody('roblox_cyber').width > rig.fighterBody('roblox_ninja').width);
  assert.ok(rig.fighterBody('roblox_builderman').rhythm < rig.fighterBody('roblox_ninja').rhythm);
});
test('Both hands stay on two-handed weapon sockets without stretching', () => {
  for (const id of Object.keys(rig.FIGHTER_LOADOUTS)) {
    if (!['hammer', 'axe', 'spear', 'staff', 'mace', 'katana'].includes(rig.fighterLoadout(id).weapon)) continue;
    const spec = rig.attackSpec(id, 'special');
    for (let frame = 5; frame <= spec.total - 6; frame++) {
      const pose = rig.sampleFighterPose(id, 'special', frame / 60);
      close(pose.gripMix, 1);
      close(rig.distance(pose.backArm.end, pose.grip), 0, 1e-6);
      close(rig.distance(pose.frontArm.end, pose.backArm.end), 12, 1e-6);
    }
  }
});
test('Forward/backward footwork plants its support foot in world space across all 12 rigs', () => {
  for (const id of Object.keys(rig.FIGHTER_LOADOUTS)) for (const direction of [-1, 1]) {
    let state = ready(id, 50), plantedSamples = 0;
    for (let frame = 0; frame < 65; frame++) {
      const old = state, before = JSON.stringify(old);
      state = game.stepRealTimeFight(state, [{ move: direction, block: false }, neutral], dt);
      assert.equal(JSON.stringify(old), before, `${id}: previous frame mutated`);
      const f = state.fighters[0], p = rig.fighterPose(f);
      for (const leg of [0, 1]) {
        const endpoint = rig.worldPoint(leg === 0 ? p.frontLeg.end : p.backLeg.end, f);
        close(rig.distance(endpoint, f.footwork.feet[leg]), 0, 1e-6);
        if (f.footwork.step && leg !== f.footwork.step.leg && old.fighters[0].footwork.step?.leg === f.footwork.step.leg) {
          close(rig.distance(f.footwork.feet[leg], old.fighters[0].footwork.feet[leg]), 0);
          plantedSamples++;
        }
      }
    }
    assert.ok(plantedSamples > 20);
    state = ticks(state, 35);
    assert.equal(state.fighters[0].footwork.step, null);
    for (const foot of state.fighters[0].footwork.feet) close(foot.y, -5 * rig.fighterBody(id).height * rig.RIG_SCALE);
  }
});
test('An interrupted stride puts its lifted boot down during guard or attack', () => {
  for (const input of [{ ...neutral, block: true }, { ...neutral, attack: 'jab' }]) {
    let state = ticks(ready('roblox_ninja', 45), 4, [{ move: 1, block: false }, neutral]);
    assert.ok(state.fighters[0].footwork.step);
    state = game.stepRealTimeFight(state, [input, neutral], dt);
    state = ticks(state, 6, [{ ...neutral, block: input.block }, neutral]);
    const f = state.fighters[0];
    for (const foot of f.footwork.feet) close(foot.y, -5 * rig.fighterBody(f.id).height * rig.RIG_SCALE);
  }
});
test('Jump includes grounded anticipation, ascent, apex tuck, descent and landing recovery', () => {
  for (const id of Object.keys(rig.FIGHTER_LOADOUTS)) {
    let state = game.stepRealTimeFight(ready(id, 45), [{ ...neutral, jump: true }, neutral], dt);
    assert.equal(state.fighters[0].action, 'takeoff'); assert.equal(state.fighters[0].y, 0);
    state = ticks(state, 4); assert.equal(state.fighters[0].y, 0);
    state = ticks(state, 1); assert.equal(state.fighters[0].action, 'jump'); assert.ok(state.fighters[0].velocityY > 0);
    const ascending = rig.fighterPose(state.fighters[0]);
    state = ticks(state, 26);
    const apex = rig.fighterPose(state.fighters[0]);
    assert.ok(apex.frontLeg.end.y < ascending.frontLeg.end.y - 10);
    state = ticks(state, 10); assert.ok(state.fighters[0].velocityY < 0);
    while (state.fighters[0].y > 0) state = ticks(state, 1);
    assert.equal(state.fighters[0].action, 'land');
    state = ticks(state, 5); assert.equal(state.fighters[0].action, 'land');
    state = ticks(state, 7); assert.equal(state.fighters[0].action, 'idle');
  }
});
test('Pose transitions blend targets while preserving bone lengths and planted feet', () => {
  for (const id of Object.keys(rig.FIGHTER_LOADOUTS)) {
    let state = ticks(ready(id, 45), 30);
    const previous = rig.fighterPose(state.fighters[0]);
    state = game.stepRealTimeFight(state, [{ ...neutral, block: true }, neutral], dt);
    const f = state.fighters[0], pose = rig.fighterPose(f);
    assert.ok(f.poseContext.transition > 0 && f.poseContext.transition < 1);
    assert.ok(rig.distance(previous.frontArm.end, pose.frontArm.end) < 5);
    close(rig.distance(pose.frontArm.root, pose.frontArm.joint), 29 * pose.body.arm);
    close(rig.distance(rig.worldPoint(pose.backLeg.end, f), f.footwork.feet[1]), 0, 1e-6);
  }
});
test('Contact points are symmetric and lie inside both capsules, including degeneracies', () => {
  const capsule = (ax, ay, bx, by, radius) => ({ a: { x: ax, y: ay }, b: { x: bx, y: by }, radius });
  const cases = [
    [capsule(0, 0, 10, 0, 2), capsule(2, 3, 8, 3, 2)],
    [capsule(0, 0, 10, 10, 0), capsule(0, 10, 10, 0, 0)],
    [capsule(0, 0, 0, 0, 3), capsule(4, 0, 4, 0, 2)],
    [capsule(0, 0, 10, 0, 0), capsule(3, 0, 9, 0, 0)],
    [capsule(0, 0, 10, 0, 1), capsule(12, 0, 15, 0, 1)],
  ];
  for (const [a, b] of cases) {
    const p = rig.capsuleContact(a, b), q = rig.capsuleContact(b, a);
    assert.ok(p && q); close(p.x, q.x); close(p.y, q.y);
    const marker = { a: p, b: p, radius: 1e-7 };
    assert.ok(rig.capsulesOverlap(marker, a) && rig.capsulesOverlap(marker, b));
  }
  assert.equal(rig.capsuleContact(capsule(0, 0, 1, 0, 1), capsule(20, 0, 21, 0, 1)), null);
});
test('Texture atlas regions match bundled PNG dimensions and preserve costume fallback', () => {
  const { FIGHTER_ATLASES, texturedFighterAtlas } = load('constants/fighterAtlases');
  for (const fighter of AVAILABLE_AVATARS) {
    assert.ok(texturedFighterAtlas(fighter.id), `${fighter.id} needs its own textured rig`);
    assert.equal(texturedFighterAtlas(fighter.id, 'explorer'), null);
  }
  for (const atlas of Object.values(FIGHTER_ATLASES)) {
    const bytes = fs.readFileSync(atlas.source);
    assert.equal(bytes.readUInt32BE(16), atlas.size);
    assert.equal(bytes.readUInt32BE(20), atlas.size);
    assert.equal(bytes[25], 6, 'RGBA PNG required for transparent joints');
    assert.equal(Object.keys(atlas.regions).length, 9);
    for (const [x, y, width, height] of Object.values(atlas.regions)) {
      assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
      assert.ok(x + width <= atlas.size && y + height <= atlas.size);
    }
  }
  assert.equal(texturedFighterAtlas('roblox_noob', 'explorer'), null);
  assert.equal(texturedFighterAtlas('unknown'), null);
});
test('Photographed limb joint anchors map exactly onto the combat rig, at any angle', () => {
  const { textureBoneMatrix, DEFAULT_BONE_ANCHORS } = load('utils/atlasRigging');
  const { FIGHTER_ATLASES } = load('constants/fighterAtlases');
  for (const atlas of Object.values(FIGHTER_ATLASES)) for (const part of ['upperArm', 'forearm', 'thigh', 'shin']) {
    const region = atlas.regions[part], anchors = atlas.anchors?.[part] ?? DEFAULT_BONE_ANCHORS;
    for (let degrees = 0; degrees < 360; degrees += 15) {
      const root = { x: 13, y: -72 }, end = { x: root.x + Math.cos(degrees * Math.PI / 180) * 29, y: root.y + Math.sin(degrees * Math.PI / 180) * 29 };
      const m = textureBoneMatrix(region, anchors, root, end, 21);
      const apply = (u, v) => ({ x: m[0] * u * region[2] + m[2] * v * region[3] + m[4], y: m[1] * u * region[2] + m[3] * v * region[3] + m[5] });
      close(rig.distance(apply(anchors[0], anchors[1]), root), 0);
      close(rig.distance(apply(anchors[2], anchors[3]), end), 0);
      assert.ok(m.every(Number.isFinite));
    }
  }
});
test('Textured ankles release smoothly from planted feet without angular wrapping', () => {
  const { texturedBootAngle } = load('utils/atlasRigging');
  for (const x of [-35, 0, 35]) {
    close(texturedBootAngle({ x, y: -30 }, { x: 0, y: 0 }), 0);
    close(texturedBootAngle({ x, y: -30 }, { x: 0, y: -2 }), 0);
  }
  // The old hard -15 threshold could jump by 55 degrees in one sample.
  const atHeight = y => texturedBootAngle({ x: -30, y: y - 10 }, { x: 0, y });
  assert.ok(Math.abs(atHeight(-15.001) - atHeight(-14.999)) < 0.02);
  let previous;
  for (let degrees = -180; degrees <= 180; degrees += 0.25) {
    const radians = degrees * Math.PI / 180;
    const ankle = { x: 0, y: -40 };
    const knee = { x: -30 * Math.cos(radians), y: -40 - 30 * Math.sin(radians) };
    const pitch = texturedBootAngle(knee, ankle);
    assert.ok(Number.isFinite(pitch) && pitch >= -55 && pitch <= 25);
    if (previous !== undefined) assert.ok(Math.abs(pitch - previous) < 0.3);
    previous = pitch;
  }
  close(texturedBootAngle({ x: 0, y: -40 }, { x: 0, y: -40 }), 10);
});
test('A recent follow-up survives recovery once; old taps expire', () => {
  let state = ready('roblox_noob', 40);
  state.fighters[0].action = 'jab';
  state.fighters[0].actionElapsed = (rig.attackSpec('roblox_noob', 'jab').total - 3) * dt;
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'kick' }, neutral], dt);
  state = ticks(state, 3);
  assert.equal(state.fighters[0].action, 'kick');
  assert.equal(state.fighters[0].bufferedAction, null);
  state = ticks(state, 90);
  assert.equal(state.fighters[0].action, 'idle');
  state = ready('roblox_noob', 40);
  state.fighters[0].action = 'special';
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'kick' }, neutral], dt);
  state = ticks(state, game.INPUT_BUFFER_FRAMES);
  assert.equal(state.fighters[0].bufferedAction, null);
  state = ticks(state, 120);
  assert.equal(state.fighters[0].action, 'idle');
});
test('Guard and pause discard buffered attacks; latest intention wins', () => {
  let state = ready('roblox_noob', 40);
  state.fighters[0].action = 'special';
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab' }, neutral], dt);
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'kick' }, neutral], dt);
  assert.equal(state.fighters[0].bufferedAction.attack, 'kick');
  state = game.stepRealTimeFight(state, [{ move: 0, block: true }, neutral], dt);
  assert.equal(state.fighters[0].bufferedAction, null);
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab' }, neutral], dt / 2);
  state = game.clearFightInputs(state);
  assert.ok(state.fighters.every(f => f.bufferedAction === null));
  assert.ok(state.pendingInputs.every(i => !i.attack && !i.jump && !i.block && !i.move));
});
test('Hit recoil is gradual, freezes during hitstop, and preserves planted feet', () => {
  let state = game.stepRealTimeFight(ready(), [{ ...neutral, attack: 'jab' }, neutral], dt);
  while (!state.event) state = ticks(state, 1);
  const start = state.fighters[1].x;
  close(start, 56);
  assert.ok(state.fighters[1].recoil > 0);
  state = ticks(state, state.hitstop);
  close(state.fighters[1].x, start);
  state = ticks(state, 1);
  assert.ok(state.fighters[1].x > start);
  assert.ok(state.fighters[1].x - start < rig.attackSpec('roblox_noob', 'jab').knockback * 0.3);
  const f = state.fighters[1], pose = rig.fighterPose(f);
  close(rig.distance(rig.worldPoint(pose.frontLeg.end, f), f.footwork.feet[0]), 0, 1e-6);
  close(rig.distance(rig.worldPoint(pose.backLeg.end, f), f.footwork.feet[1]), 0, 1e-6);
  const results = [30, 60, 120].map(hz => {
    let s = state;
    for (let i = 0; i < hz; i++) s = game.stepRealTimeFight(s, pair, 1 / hz);
    return s.fighters[1].x;
  });
  results.forEach(x => close(x, results[0]));
});
test('Ground contact shadows soften with height and mirror with the fighter', () => {
  const { fighterGrounding } = load('utils/fighterPresentation');
  for (const avatar of AVAILABLE_AVATARS) {
    const f = ready(avatar.id).fighters[0];
    const ground = fighterGrounding(f), air = fighterGrounding({ ...f, y: 10 });
    const mirrored = fighterGrounding({ ...f, facing: -1 });
    assert.ok(air.radius > ground.radius && air.opacity < ground.opacity);
    ground.feet.forEach((foot, i) => {
      assert.ok(foot.opacity > air.feet[i].opacity);
      close(foot.x, -mirrored.feet[i].x);
      assert.ok(Number.isFinite(foot.radius));
    });
  }
});
test('Swing ribbons are finite, bounded and restricted to real active frames', () => {
  const { fighterSwingTrail } = load('utils/fighterPresentation');
  for (const avatar of AVAILABLE_AVATARS) for (const action of ['jab', 'kick', 'special']) {
    const spec = rig.attackSpec(avatar.id, action);
    const f = { ...ready(avatar.id).fighters[0], action };
    assert.equal(fighterSwingTrail({ ...f, actionElapsed: (spec.startup - 1) * dt }).length, 0);
    assert.equal(fighterSwingTrail({ ...f, actionElapsed: (spec.startup + spec.active + 1) * dt }).length, 0);
    const ribbons = fighterSwingTrail({ ...f, actionElapsed: (spec.startup + 1) * dt });
    assert.ok(ribbons.length > 0 && ribbons.length <= 4);
    for (const ribbon of ribbons) {
      assert.equal(ribbon.points.length, 4);
      assert.ok(ribbon.opacity > 0 && ribbon.opacity <= 0.33);
      assert.ok(ribbon.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    }
  }
});
test('Countdown taps cannot leak into the first fighting frame', () => {
  let state = game.newRealTimeFight('roblox_noob', 'roblox_ninja');
  state.phaseTime = dt;
  state = game.stepRealTimeFight(state, [{ ...neutral, attack: 'jab', jump: true }, neutral], dt);
  assert.equal(state.phase, 'fighting');
  state = ticks(state, 1);
  assert.equal(state.fighters[0].action, 'idle');
  assert.equal(state.fighters[0].bufferedAction, null);
});
test('Every default head has a bounded RGBA crop and fighters face rivals after crossing', () => {
  const { FIGHTER_ATLASES } = load('constants/fighterAtlases');
  for (const [id, atlas] of Object.entries(FIGHTER_ATLASES)) {
    // Rookie intentionally uses its redesigned atlas head, not the old classic head.
    if (id !== 'roblox_noob') assert.ok(atlas.combatHead, id);
    const head = atlas.combatHead || { source: atlas.source, size: atlas.size, region: atlas.regions.head, neckX: 0.5 };
    const bytes = fs.readFileSync(head.source);
    assert.equal(bytes.readUInt32BE(16), head.size);
    assert.equal(bytes.readUInt32BE(20), head.size);
    assert.equal(bytes[25], 6);
    const [x, y, w, h] = head.region;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= head.size && y + h <= head.size);
    assert.ok(head.neckX > 0 && head.neckX < 1);
    let state = ready(id);
    state.fighters[0].x = 70; state.fighters[1].x = 30;
    state = ticks(state, 1);
    assert.equal(state.fighters[0].facing, -1);
    assert.equal(state.fighters[1].facing, 1);
  }
});
console.log(`${count} fighting/rigging checks passed.`);
