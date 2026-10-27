const assert = require('node:assert/strict');
const { test, after } = require('node:test');
// Refuse to seed or exercise a real Firebase project.
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') {
  throw new Error('Run with the Firestore emulator and GCLOUD_PROJECT=demo-questblox');
}
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { manageFamily } = require('../functions/lib/backend/functions/src/family');
const battles = require('../functions/lib/backend/functions/src/battles');
const call = (fn, uid, data = {}) => fn.run({ auth: uid ? { uid } : undefined, data });
const rejects = (fn, message) => assert.rejects(fn, error => error.message === message);
const read = async (collection, id) => (await db.doc(`${collection}/${id}`).get()).data();
after(() => db.terminate());

test('real Firestore transactions enforce family consent and online battle authority', async t => {
  for (const [uid, role] of [['parent', 'parent'], ['alice', 'child'], ['bob', 'child'], ['outsider', 'child']]) {
    await db.doc(`profiles/${uid}`).set({ nickname: uid, role, email: `${uid}@example.test`, coins: 120, current_avatar: 'roblox_noob' });
    await db.doc(`user_data/${uid}`).set({ tasks: [{ id: 'task', name: 'My private quest' }], unlocked_avatars: ['roblox_noob', 'roblox_ninja'] });
  }
  await t.test('authentication, roles and recipient consent', async () => {
    await rejects(() => call(manageFamily, null, { otherTag: 'alice', action: 'invite' }), 'AUTH_REQUIRED');
    await rejects(() => call(manageFamily, 'alice', { otherTag: 'bob', action: 'invite' }), 'FAMILY_ROLE_MISMATCH');
    await call(manageFamily, 'parent', { otherTag: 'alice', action: 'invite' });
    assert.deepEqual((await read('user_data', 'parent')).children[0].tasks, []);
    await rejects(() => call(manageFamily, 'parent', { otherTag: 'alice', action: 'accept' }), 'INVITATION_NOT_AVAILABLE');
    assert.equal((await read('familyLinks', linkId('parent', 'alice'))).status, 'pending');
    await call(manageFamily, 'alice', { otherTag: 'parent', action: 'accept' });
    await call(manageFamily, 'alice', { otherTag: 'parent', action: 'accept' });
    assert.equal((await read('user_data', 'parent')).children.length, 1);
    assert.deepEqual((await read('user_data', 'alice')).linked_parents, ['parent']);
    await call(manageFamily, 'bob', { otherTag: 'parent', action: 'invite' });
    await call(manageFamily, 'parent', { otherTag: 'bob', action: 'accept' });
    const opponents = await call(battles.listFamilyOpponents, 'alice');
    assert.deepEqual(opponents.map(item => item.uid), ['bob']);
    assert.deepEqual(Object.keys(opponents[0]).sort(), ['fighter', 'nickname', 'uid']);
  });
  let id;
  await t.test('outsiders and unowned fighters cannot challenge', async () => {
    await rejects(() => call(battles.createFamilyBattle, 'outsider', { opponentUid: 'alice', fighter: 'roblox_noob', requestId: 'outside-0001' }), 'FAMILY_REQUIRED');
    await rejects(() => call(battles.createFamilyBattle, 'alice', { opponentUid: 'bob', fighter: 'roblox_dragon', requestId: 'unowned-0001' }), 'FIGHTER_NOT_OWNED');
    const args = { opponentUid: 'bob', fighter: 'roblox_ninja', requestId: 'challenge-0001' };
    ({ id } = await call(battles.createFamilyBattle, 'alice', args));
    assert.equal((await call(battles.createFamilyBattle, 'alice', args)).id, id);
    assert.equal((await read('battleLimits', 'alice')).count, 1);
  });
  await t.test('only the invited sibling can accept using an owned fighter', async () => {
    await rejects(() => call(battles.respondFamilyBattle, 'alice', { battleId: id, accept: true, fighter: 'roblox_noob' }), 'NOT_PARTICIPANT');
    await rejects(() => call(battles.respondFamilyBattle, 'bob', { battleId: id, accept: true, fighter: 'roblox_dragon' }), 'FIGHTER_NOT_OWNED');
    await db.doc('user_data/bob').update({ fighterOutfits: { roblox_noob: 'explorer' } });
    await call(battles.respondFamilyBattle, 'bob', { battleId: id, accept: true, fighter: 'roblox_noob' });
    const room = await read('battles', id);
    assert.deepEqual(room.outfits, ['original', 'explorer']);
    assert.deepEqual(room.duel.players.map(player => player.hp), [100, 100]);
    await db.doc('user_data/bob').update({ fighterOutfits: {} });
    assert.deepEqual((await read('battles', id)).outfits, ['original', 'explorer'], 'battle keeps its confirmed outfit snapshot');
    assert.equal((await read('battles', id)).status, 'active');
  });
  await t.test('turn order, duplicate submissions and forged damage', async () => {
    await rejects(() => call(battles.playFamilyBattleMove, 'bob', { battleId: id, move: 'attack', expectedTurn: 0, requestId: 'wrong-turn-01' }), 'NOT_YOUR_TURN');
    await rejects(() => call(battles.playFamilyBattleMove, 'outsider', { battleId: id, move: 'attack', expectedTurn: 0, requestId: 'outside-move' }), 'NOT_PARTICIPANT');
    const args = { battleId: id, move: 'attack', expectedTurn: 0, requestId: 'first-move-01', damage: 9999, winner: 0 };
    await Promise.all([call(battles.playFamilyBattleMove, 'alice', args), call(battles.playFamilyBattleMove, 'alice', args)]);
    const room = await read('battles', id);
    assert.equal(room.duel.turn, 1);
    assert.equal(room.duel.players[1].hp, 86);
    assert.equal(room.duel.winner, null);
    await rejects(() => call(battles.playFamilyBattleMove, 'bob', { ...args, requestId: 'stale-move-01' }), 'NOT_YOUR_TURN');
    await call(battles.playFamilyBattleMove, 'bob', { battleId: id, move: 'guard', expectedTurn: 1, requestId: 'second-move-01' });
  });
  await t.test('unlink revokes existing battles immediately and preserves progress', async () => {
    await call(manageFamily, 'parent', { otherTag: 'bob', action: 'unlink' });
    await rejects(() => call(battles.playFamilyBattleMove, 'alice', { battleId: id, move: 'skill', expectedTurn: 2, requestId: 'after-unlink' }), 'FAMILY_REQUIRED');
    assert.deepEqual(await call(battles.listFamilyOpponents, 'alice'), []);
    assert.equal((await read('user_data', 'bob')).tasks[0].name, 'My private quest');
    assert.equal((await read('profiles', 'bob')).coins, 120);
    assert.deepEqual((await read('user_data', 'bob')).linked_parents, []);
    await rejects(() => call(manageFamily, 'parent', { otherTag: 'bob', action: 'invite' }), 'INVITATION_COOLDOWN');
    await call(battles.leaveFamilyBattle, 'alice', { battleId: id });
    assert.equal((await read('battles', id)).status, 'finished');
  });
});
