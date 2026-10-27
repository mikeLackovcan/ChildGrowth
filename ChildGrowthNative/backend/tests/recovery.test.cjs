const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { applyProgress, progressDay } = require('../functions/lib/backend/functions/src/progress');
after(() => db.terminate());
const day = progressDay(Date.now(), 'UTC'), yesterday = progressDay(Date.now() - 86400000, 'UTC');
let sequence = 0;
const call = (uid, action, payload = {}) => applyProgress.run({ auth: { uid }, data: { targetUid: 'recover-child', action, payload, day, timeZone: 'UTC', requestId: `recovery-test-${++sequence}` } });
const baseTask = { id: 'existing', name: 'Current parent edit', date: day, done: false, diff: 'easy', freq: 'daily', mystery: false, ownerRole: 'parent', requiresApproval: true };
const claim = { coins: 500, level: 4, xp: 20, unlockedAvatars: ['roblox_noob', 'roblox_bacon_hair'], tasks: [{ ...baseTask, name: 'Old name', done: true }, { ...baseTask, id: 'restored-task', name: 'Reading' }], wonPrizes: [{ id: 'restored-prize', prize: 'Park', date: '2026-10-01T12:00:00.000Z', redeemed: false }], lastSpinDate: day, dailyChestClaimedDate: null, epicClaimedDate: null };
test('verified family recovery restores evidence only after parent review and never pays twice', async t => {
  await db.doc('profiles/recover-child').set({ role: 'child', coins: 200, xp: 10, level: 2, current_avatar: 'roblox_noob' });
  await db.doc('profiles/recover-parent').set({ role: 'parent' });
  await db.doc('profiles/recover-outsider').set({ role: 'parent' });
  await db.doc('user_data/recover-child').set({ lastActiveDate: day, tasks: [baseTask], won_prizes: [], unlocked_avatars: ['roblox_noob'] });
  await db.doc(`familyLinks/${linkId('recover-parent', 'recover-child')}`).set({ parentUid: 'recover-parent', childUid: 'recover-child', status: 'accepted' });
  let request;
  await t.test('child submits a bounded claim but cannot grant progress', async () => {
    await assert.rejects(call('recover-child', 'recovery.request', { sourceId: 'invalid', claim: { ...claim, coins: 99999999 } }), /INVALID_RECOVERY/);
    const submitted = await call('recover-child', 'recovery.request', { sourceId: 'legacy-backup-1', claim });
    assert.equal(submitted.profile.coins, 200); assert.equal(submitted.profile.level, 2); assert.equal(submitted.data.unlocked_avatars.length, 1);
    request = submitted.data.recoveryRequests[0]; assert.equal(request.kind, 'snapshot');
    await assert.rejects(call('recover-child', 'recovery.review', { id: request.id, approved: true }), /PARENT_REQUIRED/);
    await assert.rejects(call('recover-outsider', 'recovery.review', { id: request.id, approved: true }), /FAMILY_REQUIRED/);
  });
  await t.test('parent restores missing items while preserving newer balances and quest edits', async () => {
    await db.doc('profiles/recover-child').update({ coins: 700 });
    const restored = await call('recover-parent', 'recovery.review', { id: request.id, approved: true });
    assert.equal(restored.profile.coins, 700); assert.equal(restored.profile.level, 4); assert.equal(restored.profile.xp, 20);
    assert.equal(restored.data.tasks[0].name, 'Current parent edit'); assert.equal(restored.data.tasks[1].done, false); assert.equal(restored.data.tasks[1].requiresApproval, true);
    assert.ok(restored.data.unlocked_avatars.includes('roblox_bacon_hair')); assert.equal(restored.data.won_prizes[0].status, 'approved'); assert.equal(restored.data.lastSpinDate, day);
    assert.equal(restored.data.recoveryRequests.length, 0);
    await db.doc('profiles/recover-child').update({ coins: 100 });
    const again = await call('recover-child', 'recovery.request', { sourceId: 'legacy-backup-1', claim });
    assert.equal(again.profile.coins, 100); assert.equal(again.result.alreadyRecovered, true); assert.equal(again.data.recoveryRequests.length, 0);
  });
  await t.test('stale approval cannot approve a revised request', async () => {
    const first = await call('recover-child', 'recovery.request', { sourceId: 'legacy-backup-2', claim });
    const oldId = first.data.recoveryRequests[0].id;
    await call('recover-parent', 'recovery.review', { id: oldId, approved: false });
    const newer = await call('recover-child', 'recovery.request', { sourceId: 'legacy-backup-2', claim: { ...claim, coins: 600 } });
    assert.notEqual(newer.data.recoveryRequests[0].id, oldId);
    const stale = await call('recover-parent', 'recovery.review', { id: oldId, approved: true });
    assert.equal(stale.profile.coins, 100); assert.equal(stale.data.recoveryRequests.length, 1);
    await call('recover-parent', 'recovery.review', { id: newer.data.recoveryRequests[0].id, approved: false });
  });
  await t.test('parent can credit a prior-day offline quest once without completing today', async () => {
    const original = { requestId: 'offline-yesterday-001', targetUid: 'recover-child', action: 'task.complete', day: yesterday, payload: { id: baseTask.id } };
    const queued = await call('recover-child', 'recovery.quest', { original });
    const request = queued.data.recoveryRequests[0]; assert.equal(request.kind, 'quest'); assert.equal(queued.profile.coins, 100);
    const reviewed = await call('recover-parent', 'recovery.review', { id: request.id, approved: true });
    assert.equal(reviewed.profile.coins, 112); assert.equal(reviewed.data.tasks[0].done, false);
    const again = await call('recover-child', 'recovery.quest', { original });
    assert.equal(again.result.alreadyRecovered, true); assert.equal(again.profile.coins, 112);
  });
  await t.test('committed submission keeps its normal approval instead of receiving a recovery reward', async () => {
    const requestId = 'committed-offline-001';
    await applyProgress.run({ auth: { uid: 'recover-child' }, data: { requestId, targetUid: 'recover-child', action: 'task.submit', payload: { id: baseTask.id }, day, timeZone: 'UTC' } });
    const recovered = await call('recover-child', 'recovery.quest', { original: { requestId, day: yesterday, action: 'task.complete', payload: { id: baseTask.id } } });
    assert.equal(recovered.result.alreadyRecovered, true); assert.equal(recovered.data.recoveryRequests.length, 0); assert.equal(recovered.data.tasks[0].pendingApproval, true); assert.equal(recovered.profile.coins, 112);
  });
});
