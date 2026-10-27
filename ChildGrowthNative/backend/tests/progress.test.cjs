const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { applyProgress, progressTransition, progressDay } = require('../functions/lib/backend/functions/src/progress');
after(() => db.terminate());
const day = progressDay(Date.now(), 'UTC');
const context = { parent: false, linked: true, day, time: Date.now(), random: () => 0 };
const profile = { role: 'child', coins: 700, xp: 0, level: 1, current_avatar: 'roblox_noob' };
const task = { id: 'family-task', name: 'Brush', ownerRole: 'parent', requiresApproval: true, diff: 'easy', freq: 'daily', mystery: false, done: false, date: day };
const initial = { lastActiveDate: day, tasks: [task], prizes: ['Park', 'Story'], won_prizes: [], unlocked_avatars: ['roblox_noob'] };
let sequence = 0, submissionId;
const call = (uid, action, payload = {}, requestId = `progress-${++sequence}`, targetUid = 'progress-child') => applyProgress.run({ auth: { uid }, data: { action, payload, requestId, targetUid, timeZone: 'UTC', day } });

test('server progress transitions preserve the quest game and enforce permissions', () => {
  const created = progressTransition(profile, initial, 'task.create', { id: 'my-task', name: 'Read', diff: 'hard', freq: 'daily', done: true, ownerRole: 'parent' }, context);
  const mine = created.data.tasks[1];
  assert.equal(mine.ownerRole, 'child'); assert.equal(mine.requiresApproval, true); assert.equal(mine.diff, 'easy'); assert.equal(mine.done, false);
  assert.throws(() => progressTransition(profile, initial, 'task.delete', { id: task.id }, context), /PARENT_REQUIRED/);
  assert.throws(() => progressTransition(profile, created.data, 'task.update', { id: mine.id, changes: { done: true } }, context), /INVALID_TASK_EDIT/);
  assert.throws(() => progressTransition(profile, initial, 'prizes.configure', { prizes: ['Money'] }, context), /PARENT_REQUIRED/);
  assert.throws(() => progressTransition(profile, initial, 'theme.buy', { id: '__proto__' }, context), /INVALID_THEME/);
  assert.throws(() => progressTransition(profile, initial, 'epic.claim', {}, context), /QUESTS_FIRST/);
  const submitted = progressTransition(profile, initial, 'task.complete', { id: task.id, coins: 999999 }, context);
  assert.equal(submitted.data.tasks[0].pendingApproval, true); assert.equal(submitted.profile.coins, 700);
});
test('server-owned gift/spin rolls, redemption, rest and daily receipts', () => {
  const complete = { ...initial, tasks: [{ ...task, done: true }], epicClaimedDate: day };
  const spin = progressTransition(profile, complete, 'prize.spin', { prize: 'Forged prize' }, context);
  assert.equal(spin.result.prize, 'Park'); assert.equal(spin.data.lastSpinDate, day);
  const repeated = progressTransition(spin.profile, spin.data, 'prize.spin', {}, context);
  assert.equal(repeated.data.won_prizes.length, 1);
  assert.throws(() => progressTransition(spin.profile, spin.data, 'prize.redeem', { id: spin.result.id, redeemed: true }, context), /PARENT_REQUIRED/);
  const request = progressTransition(spin.profile, spin.data, 'prize.request', { id: spin.result.id }, context);
  assert.throws(() => progressTransition(request.profile, request.data, 'prize.approve', { id: spin.result.id }, context), /PARENT_REQUIRED/);
  const approved = progressTransition(request.profile, request.data, 'prize.approve', { id: spin.result.id }, { ...context, parent: true });
  assert.equal(progressTransition(approved.profile, approved.data, 'prize.redeem', { id: spin.result.id, redeemed: true }, context).data.won_prizes[0].redeemed, true);
  const gift = progressTransition(profile, initial, 'chest.claim', { coins: 999999 }, context);
  assert.equal(gift.profile.coins, 730); assert.equal(gift.profile.xp, 22);
  assert.equal(progressTransition(gift.profile, gift.data, 'chest.claim', {}, context).profile.coins, 730);
  assert.throws(() => progressTransition(profile, { ...initial, isSick: true }, 'task.complete', { id: task.id }, context), /QUEST_NOT_READY/);
  assert.throws(() => progressTransition(profile, { ...initial, lastActiveDate: '2099-01-01' }, 'day.refresh', {}, context), /DAY_MOVED_BACKWARDS/);
});
test('midnight preserves submissions and late approval pays the original reward once', () => {
  const yesterday = '2026-10-20', today = '2026-10-21';
  const oldContext = { ...context, day: yesterday };
  const submitted = progressTransition(profile, { ...initial, lastActiveDate: yesterday, tasks: [{ ...task, date: yesterday }] }, 'task.submit', { id: task.id }, oldContext);
  const originalReward = submitted.data.tasks[0].pendingReward;
  const nextContext = { ...context, day: today };
  const rolled = progressTransition(submitted.profile, submitted.data, 'day.refresh', {}, nextContext);
  assert.equal(rolled.data.tasks[0].pendingApproval, true);
  assert.equal(rolled.data.tasks[0].date, yesterday);
  assert.deepEqual(rolled.data.tasks[0].pendingReward, originalReward);
  // Changing fighters or editing difficulty after submission cannot alter its reward.
  const edited = progressTransition({ ...rolled.profile, current_avatar: 'roblox_ninja' }, rolled.data, 'task.update', { id: task.id, changes: { diff: 'hard' } }, { ...nextContext, parent: true });
  const approved = progressTransition(edited.profile, edited.data, 'task.review', { id: task.id, approved: true, submissionId: rolled.data.tasks[0].pendingSubmissionId }, { ...nextContext, parent: true });
  assert.equal(approved.profile.coins, profile.coins + originalReward.coinGain);
  assert.equal(approved.data.tasks[0].date, today);
  assert.equal(approved.data.tasks[0].done, false);
  assert.equal(approved.data.tasks[0].pendingApproval, false);
  const { familyChanges } = require('../functions/lib/backend/functions/src/pushPolicy');
  assert.deepEqual(familyChanges(rolled.data, approved.data), [{ kind: 'quest_approved', taskId: task.id, toParent: false }]);
  assert.deepEqual(familyChanges(submitted.data, rolled.data), []);
  const again = progressTransition(approved.profile, approved.data, 'task.review', { id: task.id, approved: true, submissionId: rolled.data.tasks[0].pendingSubmissionId }, { ...nextContext, parent: true });
  assert.equal(again.profile.coins, approved.profile.coins);
  assert.throws(() => progressTransition(again.profile, again.data, 'epic.claim', {}, nextContext), /QUESTS_FIRST/);
  const rejected = progressTransition(rolled.profile, rolled.data, 'task.review', { id: task.id, approved: false, submissionId: rolled.data.tasks[0].pendingSubmissionId }, { ...nextContext, parent: true });
  assert.equal(rejected.profile.coins, profile.coins);
  assert.equal(rejected.data.tasks[0].done, false);
  assert.equal(rejected.data.tasks[0].pendingReward, undefined);
});
test('real transactions apply approvals and purchases once, even with concurrent retries', async t => {
  await db.doc('profiles/progress-child').set(profile);
  await db.doc('profiles/progress-parent').set({ role: 'parent' });
  await db.doc('profiles/progress-outsider').set({ role: 'parent' });
  await db.doc('user_data/progress-child').set(initial);
  const familyRef = db.doc(`familyLinks/${linkId('progress-parent', 'progress-child')}`);
  await familyRef.set({ parentUid: 'progress-parent', childUid: 'progress-child', status: 'accepted' });
  await t.test('child submits and only the linked parent can approve', async () => {
    const submitted = await call('progress-child', 'task.complete', { id: task.id });
    submissionId = submitted.data.tasks[0].pendingSubmissionId;
    assert.equal(submitted.profile.coins, 700); assert.equal(submitted.data.tasks[0].pendingApproval, true);
    await assert.rejects(call('progress-child', 'task.review', { id: task.id, approved: true, submissionId }), /PARENT_REQUIRED/);
    await assert.rejects(call('progress-outsider', 'task.review', { id: task.id, approved: true, submissionId }), /FAMILY_REQUIRED/);
    await assert.rejects(call('progress-parent', 'task.review', { id: task.id, approved: true, submissionId: 'different-submission' }), /REVIEW_CHANGED/);
    const approved = await Promise.all([call('progress-parent', 'task.review', { id: task.id, approved: true, submissionId }, 'approve-once'), call('progress-parent', 'task.review', { id: task.id, approved: true, submissionId }, 'approve-once')]);
    assert.equal(approved[0].profile.coins, 712); assert.equal(approved[1].profile.coins, 712);
    assert.equal((await db.doc('profiles/progress-child').get()).data().xp, 10);
    await assert.rejects(call('progress-parent', 'task.review', { id: task.id, approved: false, submissionId }, 'approve-once'), /REQUEST_ID_REUSED/);
  });
  await t.test('fighter purchase derives its price and is atomic with ownership', async () => {
    const bought = await call('progress-child', 'fighter.buy', { id: 'roblox_bacon_hair', price: 0, coins: 99999 }, 'buy-once-001');
    assert.equal(bought.profile.coins, 362); assert.ok(bought.data.unlocked_avatars.includes('roblox_bacon_hair'));
    const again = await call('progress-child', 'fighter.buy', { id: 'roblox_bacon_hair', price: 0, coins: 99999 }, 'buy-once-001');
    assert.equal(again.profile.coins, 362);
    await assert.rejects(call('progress-child', 'fighter.buy', { id: 'roblox_ninja' }), /NOT_ENOUGH_COINS/);
    await assert.rejects(call('progress-child', 'fighter.equip', { id: 'roblox_ninja' }), /FIGHTER_NOT_OWNED/);
  });
  await t.test('a delayed offline action cannot complete a new day by accident', async () => {
    const before = (await db.doc('profiles/progress-child').get()).data().coins;
    await assert.rejects(applyProgress.run({ auth: { uid: 'progress-child' }, data: { targetUid: 'progress-child', action: 'chest.claim', payload: {}, requestId: 'old-day-claim', timeZone: 'UTC', day: '2026-01-01' } }), /PROGRESS_DAY_CHANGED/);
    assert.equal((await db.doc('profiles/progress-child').get()).data().coins, before);
  });
  await t.test('unlink revokes progress writes, including retries', async () => {
    await familyRef.update({ status: 'unlinked' });
    await assert.rejects(call('progress-parent', 'task.review', { id: task.id, approved: true, submissionId }, 'approve-once'), /FAMILY_REQUIRED/);
  });
});

test('outfits are validated cosmetics and cannot alter rewards or ownership', () => {
  const outfit = progressTransition(profile, initial, 'outfit.equip', { fighter: 'roblox_noob', outfit: 'explorer', coins: 99999 }, context);
  const { updated_at, ...unchangedProfile } = outfit.profile;
  assert.deepEqual(unchangedProfile, profile);
  assert.ok(updated_at);
  assert.deepEqual(outfit.data.fighterOutfits, { roblox_noob: 'explorer' });
  assert.deepEqual(outfit.data.unlocked_avatars, initial.unlocked_avatars);
  assert.throws(() => progressTransition(profile, initial, 'outfit.equip', { fighter: 'roblox_ninja', outfit: 'explorer' }, context), /INVALID_INPUT/);
  assert.throws(() => progressTransition(profile, initial, 'outfit.equip', { fighter: 'roblox_ninja', outfit: 'original' }, context), /FIGHTER_NOT_OWNED/);
  assert.throws(() => progressTransition(profile, initial, 'outfit.equip', { fighter: '__proto__', outfit: 'original' }, context), /INVALID_INPUT/);
  const plain = progressTransition(profile, initial, 'task.submit', { id: task.id }, context);
  const dressed = progressTransition(outfit.profile, outfit.data, 'task.submit', { id: task.id }, context);
  assert.deepEqual(dressed.data.tasks[0].pendingReward, plain.data.tasks[0].pendingReward);
});

test('per-quest alert choice persists and rejects invalid modes without widening child permissions', () => {
  const created = progressTransition(profile, initial, 'task.create', { id: 'alarm-task', name: 'Read', diff: 'easy', freq: 'daily', reminderMode: 'alarm', reminderTime: '17:30' }, context);
  const added = created.data.tasks.find(t => t.id === 'alarm-task');
  assert.equal(added.reminderMode, 'alarm');
  const edited = progressTransition(profile, created.data, 'task.update', { id: added.id, expectedRevision: 0, nextRevision: 'mode-edit', changes: { reminderMode: 'notification' } }, context);
  assert.equal(edited.data.tasks.find(t => t.id === added.id).reminderMode, 'notification');
  assert.throws(() => progressTransition(profile, created.data, 'task.update', { id: added.id, expectedRevision: 0, changes: { reminderMode: 'invalid' } }, context), /INVALID_REMINDER/);
  assert.throws(() => progressTransition(profile, initial, 'task.update', { id: task.id, changes: { reminderMode: 'alarm' } }, context), /PARENT_REQUIRED/);
});
