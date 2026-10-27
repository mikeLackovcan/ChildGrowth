const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { applyProgress, progressDay } = require('../functions/lib/backend/functions/src/progress');
after(() => db.terminate());
const day = progressDay(Date.now(), 'UTC');
const task = { id: 'conflict-task', name: 'Read', ownerRole: 'parent', requiresApproval: true, diff: 'easy', freq: 'daily', mystery: false, done: false, date: day };
let sequence = 0;
const call = (uid, action, payload = {}) => applyProgress.run({ auth: { uid }, data: { targetUid: 'conflict-child', action, payload, requestId: `quest-conflict-${++sequence}`, timeZone: 'UTC', day } });
const reset = async () => {
  await db.doc('profiles/conflict-child').set({ role: 'child', coins: 0, xp: 0, level: 1, current_avatar: 'roblox_noob' });
  await db.doc('user_data/conflict-child').set({ lastActiveDate: day, tasks: [task] });
};
test('cross-device deletion cannot erase a committed submission or an earned reward', async t => {
  await db.doc('profiles/conflict-parent').set({ role: 'parent' });
  await db.doc(`familyLinks/${linkId('conflict-parent', 'conflict-child')}`).set({ parentUid: 'conflict-parent', childUid: 'conflict-child', status: 'accepted' });
  await t.test('pending submissions block single and bulk deletion until reviewed', async () => {
    await reset();
    const submitted = await call('conflict-child', 'task.submit', { id: task.id });
    await assert.rejects(call('conflict-parent', 'task.delete', { id: task.id }), /QUEST_REVIEW_REQUIRED/);
    await assert.rejects(call('conflict-parent', 'tasks.clear'), /QUEST_REVIEW_REQUIRED/);
    assert.equal((await db.doc('user_data/conflict-child').get()).data().tasks[0].pendingApproval, true);
    await call('conflict-parent', 'task.review', { id: task.id, approved: true, submissionId: submitted.data.tasks[0].pendingSubmissionId });
    const deleted = await call('conflict-parent', 'task.delete', { id: task.id });
    assert.equal(deleted.data.tasks.length, 0); assert.equal(deleted.profile.coins, 12);
  });
  await t.test('simultaneous submit and delete have one explicit outcome, never silent success for both', async () => {
    await reset();
    const [submit, deletion] = await Promise.allSettled([
      call('conflict-child', 'task.submit', { id: task.id }),
      call('conflict-parent', 'task.delete', { id: task.id }),
    ]);
    const saved = (await db.doc('user_data/conflict-child').get()).data();
    if (submit.status === 'fulfilled') {
      assert.equal(deletion.status, 'rejected'); assert.match(deletion.reason.message, /QUEST_REVIEW_REQUIRED/);
      assert.equal(saved.tasks[0].pendingApproval, true);
    } else {
      assert.equal(deletion.status, 'fulfilled'); assert.match(submit.reason.message, /QUEST_NOT_FOUND/);
      assert.equal(saved.tasks.length, 0);
    }
    assert.equal((await db.doc('profiles/conflict-child').get()).data().coins, 0);
  });
  await t.test('simultaneous approval and deletion preserve exactly one earned reward', async () => {
    await reset();
    const submitted = await call('conflict-child', 'task.submit', { id: task.id });
    const [review, deletion] = await Promise.allSettled([
      call('conflict-parent', 'task.review', { id: task.id, approved: true, submissionId: submitted.data.tasks[0].pendingSubmissionId }),
      call('conflict-parent', 'task.delete', { id: task.id }),
    ]);
    assert.equal(review.status, 'fulfilled');
    if (deletion.status === 'rejected') {
      assert.match(deletion.reason.message, /QUEST_REVIEW_REQUIRED/);
      await call('conflict-parent', 'task.delete', { id: task.id });
    }
    assert.equal((await db.doc('profiles/conflict-child').get()).data().coins, 12);
    assert.equal((await db.doc('user_data/conflict-child').get()).data().tasks.length, 0);
  });
  await t.test('two stale editors cannot overwrite one another', async () => {
    await reset();
    const outcomes = await Promise.allSettled([
      call('conflict-parent', 'task.update', { id: task.id, expectedRevision: 0, changes: { name: 'Read a chapter' } }),
      call('conflict-parent', 'task.update', { id: task.id, expectedRevision: 0, changes: { name: 'Read a page' } }),
    ]);
    assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
    assert.match(outcomes.find(item => item.status === 'rejected').reason.message, /QUEST_CHANGED/);
    const saved = (await db.doc('user_data/conflict-child').get()).data().tasks[0];
    assert.equal(typeof saved.revision, 'string');
    const fresh = await call('conflict-parent', 'task.update', { id: task.id, expectedRevision: saved.revision, changes: { reminderTime: '17:30' } });
    assert.equal(fresh.data.tasks[0].name, saved.name); assert.notEqual(fresh.data.tasks[0].revision, saved.revision);
  });
  await t.test('dependent offline edits cannot match another device’s version after a conflict', async () => {
    await reset();
    const saved = await call('conflict-parent', 'task.update', { id: task.id, expectedRevision: 0, nextRevision: 'online-edit-001', changes: { name: 'Current instructions' } });
    await assert.rejects(call('conflict-parent', 'task.update', { id: task.id, expectedRevision: 0, nextRevision: 'offline-edit-001', changes: { name: 'Offline draft one' } }), /QUEST_CHANGED/);
    await assert.rejects(call('conflict-parent', 'task.update', { id: task.id, expectedRevision: 'offline-edit-001', nextRevision: 'offline-edit-002', changes: { name: 'Offline draft two' } }), /QUEST_CHANGED/);
    await assert.rejects(call('conflict-child', 'task.submit', { id: task.id, expectedRevision: 'offline-edit-002' }), /QUEST_CHANGED/);
    const current = (await db.doc('user_data/conflict-child').get()).data().tasks[0];
    assert.equal(current.name, 'Current instructions'); assert.equal(current.revision, saved.data.tasks[0].revision);
  });
  await t.test('stale completion and deletion cannot act on revised instructions', async () => {
    await reset();
    const edited = await call('conflict-parent', 'task.update', { id: task.id, expectedRevision: 0, changes: { name: 'Read two chapters', diff: 'hard' } });
    for (const action of ['task.complete', 'task.submit']) {
      await assert.rejects(call('conflict-child', action, { id: task.id, expectedRevision: 0 }), /QUEST_CHANGED/);
    }
    await assert.rejects(call('conflict-parent', 'task.delete', { id: task.id, expectedRevision: 0 }), /QUEST_CHANGED/);
    await assert.rejects(call('conflict-parent', 'tasks.clear', { expectedTasks: [{ id: task.id, revision: 0 }] }), /QUEST_CHANGED/);
    assert.equal((await db.doc('profiles/conflict-child').get()).data().coins, 0);
    const latest = await call('conflict-child', 'task.submit', { id: task.id, expectedRevision: edited.data.tasks[0].revision });
    assert.equal(latest.data.tasks[0].pendingApproval, true);
  });
  await t.test('bulk deletion cannot remove quests added since the parent saw the list', async () => {
    await reset();
    await call('conflict-parent', 'task.create', { ...task, id: 'new-quest' });
    await assert.rejects(call('conflict-parent', 'tasks.clear', { expectedTasks: [{ id: task.id, revision: 0 }] }), /QUEST_CHANGED/);
    const cleared = await call('conflict-parent', 'tasks.clear', { expectedTasks: [{ id: task.id, revision: 0 }, { id: 'new-quest', revision: 0 }] });
    assert.equal(cleared.data.tasks.length, 0);
  });
  await t.test('an edit racing with review preserves both the edit and captured reward', async () => {
    await reset();
    const submitted = await call('conflict-child', 'task.submit', { id: task.id });
    await Promise.all([
      call('conflict-parent', 'task.update', { id: task.id, changes: { name: 'Read a chapter', diff: 'hard' } }),
      call('conflict-parent', 'task.review', { id: task.id, approved: true, submissionId: submitted.data.tasks[0].pendingSubmissionId }),
    ]);
    const saved = (await db.doc('user_data/conflict-child').get()).data().tasks[0];
    assert.equal(saved.name, 'Read a chapter'); assert.equal(saved.diff, 'hard'); assert.equal(saved.done, true);
    assert.equal((await db.doc('profiles/conflict-child').get()).data().coins, 12);
  });
});
