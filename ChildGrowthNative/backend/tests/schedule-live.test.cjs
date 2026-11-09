const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { progressTransition } = require('../functions/lib/backend/functions/src/progress');
const { setChildDisplayName } = require('../functions/lib/backend/functions/src/family');
const { getFamilyStatus } = require('../functions/lib/backend/functions/src/accounts');
const { questOnDay, isTaskScheduled } = require('../functions/lib/src/utils/questDay');
after(() => db.terminate());
const profile = { role: 'child', coins: 0, xp: 0, level: 1, current_avatar: 'roblox_noob' };
const day = '2026-11-09';
const context = { parent: true, linked: true, day, time: Date.parse(`${day}T12:00:00Z`), random: () => 0, actorUid: 'parent' };
const base = { id: 'once', name: 'Read', diff: 'easy', freq: 'once', scheduledDate: '2026-11-10', reminderTime: '15:00' };
test('tomorrow quest cannot pay early and stays cleared after midnight', () => {
  const made = progressTransition(profile, { tasks: [], lastActiveDate: day }, 'task.create', base, context);
  const task = made.data.tasks[0];
  assert.equal(isTaskScheduled(task, day), false);
  assert.equal(isTaskScheduled(task, '2026-11-10'), true);
  assert.throws(() => progressTransition(made.profile, made.data, 'task.complete', { id: task.id }, context), /QUEST_NOT_READY/);
  const next = { ...context, day: '2026-11-10', time: context.time + 86400000 };
  const done = progressTransition(made.profile, made.data, 'task.complete', { id: task.id }, next);
  assert.equal(done.data.tasks[0].done, true);
  assert.equal(done.data.tasks[0].date, next.day);
  assert.equal(questOnDay(done.data.tasks[0], '2026-11-11').done, true);
  assert.equal(isTaskScheduled(done.data.tasks[0], '2026-11-11'), false);
});
test('custom days and invalid calendar dates are validated', () => {
  const made = progressTransition(profile, {}, 'task.create', { ...base, freq: 'custom', repeatDays: [0, 6] }, context);
  assert.equal(isTaskScheduled(made.data.tasks[0], day), false);
  assert.equal(isTaskScheduled(made.data.tasks[0], '2026-11-14'), true);
  assert.equal(isTaskScheduled(made.data.tasks[0], '2026-11-15'), true);
  for (const repeatDays of [[], [8], ['1']]) assert.throws(() => progressTransition(profile, {}, 'task.create', { ...base, freq: 'custom', repeatDays }, context), /INVALID_TASK_DAYS/);
  assert.throws(() => progressTransition(profile, {}, 'task.create', { ...base, scheduledDate: '2026-02-31' }, context), /INVALID_TASK_DATE/);
});
test('parent name is scoped to accepted relationship and does not rename account', async () => {
  const parentUid = 'display-parent', childUid = 'display-child';
  await Promise.all([
    db.doc(`profiles/${parentUid}`).set({ role: 'parent', nickname: 'displayparent' }),
    db.doc(`profiles/${childUid}`).set({ role: 'child', nickname: 'displaychild', full_name: 'Official Full Name' }),
    db.doc(`user_data/${parentUid}`).set({}), db.doc(`user_data/${childUid}`).set({}),
    db.doc(`familyLinks/${linkId(parentUid, childUid)}`).set({ parentUid, childUid, participants: [parentUid, childUid], status: 'accepted' }),
  ]);
  await setChildDisplayName.run({ auth: { uid: parentUid }, data: { childUid, name: '  Šimonek  ' } });
  assert.equal((await getFamilyStatus.run({ auth: { uid: parentUid }, data: {} })).children[0].name, 'Šimonek');
  assert.equal((await db.doc(`profiles/${childUid}`).get()).data().full_name, 'Official Full Name');
  await assert.rejects(setChildDisplayName.run({ auth: { uid: childUid }, data: { childUid, name: 'bad' } }), /FAMILY_REQUIRED/);
  await db.doc(`familyLinks/${linkId(parentUid, childUid)}`).update({ status: 'pending' });
  await assert.rejects(setChildDisplayName.run({ auth: { uid: parentUid }, data: { childUid, name: 'bad' } }), /FAMILY_REQUIRED/);
});
