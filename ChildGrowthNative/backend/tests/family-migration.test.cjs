const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { getFamilyStatus } = require('../functions/lib/backend/functions/src/accounts');
const { applyProgress, progressDay } = require('../functions/lib/backend/functions/src/progress');
const { recoveryClaimFromSave } = require('../functions/lib/src/types/recovery');
const { manageFamily } = require('../functions/lib/backend/functions/src/family');
after(() => db.terminate());
const read = uid => getFamilyStatus.run({ auth: { uid }, data: {} });
const action = (uid, action, otherTag) => manageFamily.run({ auth: { uid }, data: { action, otherTag } });
test('existing family summaries require new recipient consent without deleting historical progress', async t => {
  const parent = 'migration-parent', child = 'migration-child';
  const childData = { linked_parents: ['migrate_parent'], approval_status: 'approved', tasks: [{ id: 'legacy-quest', done: true }], won_prizes: [{ id: 'legacy-prize' }], unlocked_avatars: ['roblox_noob', 'roblox_ninja'] };
  await db.doc(`profiles/${parent}`).set({ role: 'parent', nickname: 'migrate_parent', full_name: 'Parent' });
  await db.doc(`profiles/${child}`).set({ role: 'child', nickname: 'migrate_child', coins: 500, level: 4 });
  await db.doc(`user_data/${parent}`).set({ children: [{ id: child, nickname: 'migrate_child', isApproved: true, coins: 9999 }] });
  await db.doc(`user_data/${child}`).set(childData);
  await t.test('legacy claims never appear as accepted membership and source data is unchanged', async () => {
    await assert.rejects(getFamilyStatus.run({ data: {} }), /AUTH_REQUIRED/);
    const p = await read(parent), c = await read(child);
    assert.deepEqual(p.children, []); assert.deepEqual(p.familyReconnectTags, ['migrate_child']);
    assert.deepEqual(c.linked_parents, []); assert.equal(c.approval_status, null); assert.deepEqual(c.familyReconnectTags, ['migrate_parent']);
    assert.deepEqual((await db.doc(`user_data/${child}`).get()).data(), childData);
    assert.equal((await db.doc(`user_data/${parent}`).get()).data().children[0].coins, 9999);
  });
  await t.test('new invitation is pending until recipient accepts; progress is preserved', async () => {
    await action(parent, 'invite', 'migrate_child');
    assert.equal((await db.doc(`user_data/${parent}`).get()).data().legacy_family_children[0].coins, 9999);
    const pending = await read(child);
    assert.deepEqual(pending.linked_parents, []); assert.equal(pending.approval_status, 'pending');
    assert.equal(pending.children[0].initiatedBy, 'parent'); assert.equal(pending.children[0].isApproved, false);
    await assert.rejects(action(parent, 'accept', 'migrate_child'), /INVITATION_NOT_AVAILABLE/);
    await action(child, 'accept', 'migrate_parent');
    const accepted = await read(parent), c = await read(child);
    assert.equal(accepted.children[0].isApproved, true); assert.equal(accepted.children[0].coins, 500);
    assert.deepEqual(c.linked_parents, ['migrate_parent']); assert.deepEqual(c.familyReconnectTags, []);
    assert.deepEqual((await db.doc(`user_data/${child}`).get()).data().tasks, childData.tasks);
    assert.equal((await db.doc(`profiles/${child}`).get()).data().coins, 500);
  });
  await t.test('preserved parent backup can be reviewed and restored only once after reconnection', async () => {
    const backup = (await db.doc(`user_data/${parent}`).get()).data().legacy_family_children[0];
    let sequence = 0;
    const progress = (action, payload) => applyProgress.run({ auth: { uid: parent }, data: { targetUid: child, requestId: `family-backup-${++sequence}`, action, payload, day: progressDay(Date.now(), 'UTC'), timeZone: 'UTC' } });
    const payload = { sourceId: `family-legacy:${parent}:${child}`, claim: recoveryClaimFromSave(backup) };
    const requested = await progress('recovery.request', payload);
    assert.equal(requested.profile.coins, 500); // Sending a backup is not approval.
    const id = requested.data.recoveryRequests[0].id;
    const reviewed = await progress('recovery.review', { id, approved: true });
    assert.equal(reviewed.profile.coins, 9999); assert.equal(reviewed.profile.level, 4);
    assert.deepEqual(reviewed.data.tasks, requested.data.tasks);
    await db.doc(`profiles/${child}`).update({ coins: 300 });
    const repeated = await progress('recovery.request', payload);
    assert.equal(repeated.profile.coins, 300); assert.equal(repeated.result.alreadyRecovered, true);
    assert.equal((await db.doc(`user_data/${parent}`).get()).data().legacy_family_children[0].coins, 9999);
  });
  await t.test('accepted retries repair a missing read grant without another invitation', async () => {
    const grant = db.doc(`familyAccess/${child}/parents/${parent}`);
    await grant.delete();
    await action(parent, 'invite', 'migrate_child');
    assert.equal((await grant.get()).data().accepted, true);
    assert.equal((await db.doc(`familyLinks/${linkId(parent, child)}`).get()).data().status, 'accepted');
  });
  await t.test('revocation clears the projection even if old summaries are restored', async () => {
    await action(child, 'unlink', 'migrate_parent');
    await db.doc(`user_data/${child}`).update({ linked_parents: ['migrate_parent'], approval_status: 'approved' });
    const c = await read(child); assert.deepEqual(c.linked_parents, []); assert.equal(c.approval_status, null);
    assert.deepEqual(c.familyReconnectTags, []); // Do not resurrect a deliberately removed relationship.
    assert.deepEqual((await read(parent)).children, []);
  });
});
