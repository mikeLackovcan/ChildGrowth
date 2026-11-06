const assert = require('node:assert/strict');

const {
  progressDay,
  progressTransition,
} = require('../backend/functions/lib/backend/functions/src/progress');

const now = Date.now();
const day = progressDay(now, 'Europe/Prague');
const child = { role: 'child', coins: 20, xp: 0, level: 1, current_avatar: 'roblox_noob' };
const sibling = {
  profile: { role: 'child', coins: 70, xp: 5, level: 2, current_avatar: 'roblox_ninja' },
  data: { lastActiveDate: day, tasks: [], prizes: ['Cinema'], won_prizes: [], unlocked_avatars: ['roblox_noob', 'roblox_ninja'] },
};
const childContext = { parent: false, linked: true, day, time: now, random: () => 0, actorUid: 'child-a' };
const parentContext = { ...childContext, parent: true, actorUid: 'parent' };
let data = { lastActiveDate: day, tasks: [], prizes: ['Park', 'Ice cream'], won_prizes: [], unlocked_avatars: ['roblox_noob'] };
let checks = 0;

function check(name, fn) {
  fn();
  checks += 1;
  console.log(`✓ ${name}`);
}

check('Parent-created quest keeps every visual, schedule and reminder field for the child', () => {
  const result = progressTransition(child, data, 'task.create', {
    id: 'parent-quest', name: 'Feed the dog', shortName: 'Feed dog', icon: '🐶', diff: 'hard', freq: 'weekdays',
    mystery: true, isRolling: true, canPostpone: true, requiresApproval: true,
    reminderMode: 'alarm', reminderTime: '17:30', done: true,
  }, parentContext);
  data = result.data;
  assert.deepEqual(data.tasks[0], {
    id: 'parent-quest', name: 'Feed the dog', shortName: 'Feed dog', icon: '🐶', diff: 'hard', freq: 'weekdays',
    mystery: true, revision: 0, done: false, date: day, ownerRole: 'parent', reminderMode: 'alarm', reminderTime: '17:30',
    isRolling: true, canPostpone: true, requiresApproval: true,
  });
  assert.deepEqual(sibling.data.tasks, []);
});

check('Parent edits reach the selected child and leave the sibling untouched', () => {
  const result = progressTransition(child, data, 'task.update', {
    id: 'parent-quest', expectedRevision: 0, nextRevision: 'parent-edit-1', changes: {
      name: 'Feed and water dog', shortName: 'Dog care', icon: '🦴', diff: 'med', freq: 'daily', mystery: false,
      isRolling: false, canPostpone: false, requiresApproval: true, reminderMode: 'notification', reminderTime: '18:15',
    },
  }, parentContext);
  data = result.data;
  assert.deepEqual({ ...data.tasks[0], date: undefined, ownerRole: undefined, done: undefined }, {
    id: 'parent-quest', name: 'Feed and water dog', shortName: 'Dog care', icon: '🦴', diff: 'med', freq: 'daily',
    mystery: false, revision: 'parent-edit-1', reminderMode: 'notification', reminderTime: '18:15',
    isRolling: false, canPostpone: false, requiresApproval: true, date: undefined, ownerRole: undefined, done: undefined,
  });
  assert.equal(data.tasks[0].ownerRole, 'parent');
  assert.deepEqual(sibling.data.tasks, []);
});

check('Child submission appears for the parent and approval pays exactly once', () => {
  const submitted = progressTransition(child, data, 'task.submit', {
    id: 'parent-quest', expectedRevision: 'parent-edit-1', submissionId: 'submission-1', note: 'Finished',
  }, childContext);
  assert.equal(submitted.data.tasks[0].pendingApproval, true);
  assert.equal(submitted.data.tasks[0].verificationNote, 'Finished');
  assert.equal(submitted.profile.coins, child.coins);
  const approved = progressTransition(submitted.profile, submitted.data, 'task.review', {
    id: 'parent-quest', approved: true, submissionId: 'submission-1',
  }, parentContext);
  assert.equal(approved.data.tasks[0].done, true);
  assert.equal(approved.data.tasks[0].pendingApproval, false);
  assert.ok(approved.profile.coins > child.coins);
  const repeated = progressTransition(approved.profile, approved.data, 'task.review', {
    id: 'parent-quest', approved: true, submissionId: 'submission-1',
  }, parentContext);
  assert.equal(repeated.profile.coins, approved.profile.coins);
  data = approved.data;
});

check('Reward configuration, claim, parent approval and redemption share one state', () => {
  const configured = progressTransition(child, data, 'prizes.configure', { prizes: ['🍦 Ice cream', '🎬 Movie'] }, parentContext);
  assert.deepEqual(configured.data.prizes, ['🍦 Ice cream', '🎬 Movie']);
  const ready = { ...configured.data, epicClaimedDate: day };
  const spun = progressTransition(child, ready, 'prize.spin', {}, childContext);
  assert.equal(spun.result.prize, '🍦 Ice cream');
  assert.deepEqual(spun.result.pool, ['🍦 Ice cream', '🎬 Movie']);
  const requested = progressTransition(spun.profile, spun.data, 'prize.request', { id: spun.result.id }, childContext);
  assert.equal(requested.data.won_prizes[0].status, 'requested');
  const approved = progressTransition(requested.profile, requested.data, 'prize.approve', { id: spun.result.id }, parentContext);
  assert.equal(approved.data.won_prizes[0].status, 'approved');
  const redeemed = progressTransition(approved.profile, approved.data, 'prize.redeem', { id: spun.result.id, redeemed: true }, childContext);
  assert.equal(redeemed.data.won_prizes[0].redeemed, true);
  data = redeemed.data;
});

check('Child-created family quests remain approval-gated when the parent refreshes', () => {
  const result = progressTransition(child, data, 'task.create', {
    id: 'child-quest', name: 'Read', shortName: 'Read', icon: '📚', diff: 'hard', freq: 'daily', mystery: false,
  }, childContext);
  const created = result.data.tasks.find(task => task.id === 'child-quest');
  assert.equal(created.ownerRole, 'child');
  assert.equal(created.diff, 'easy');
  assert.equal(created.requiresApproval, true);
  data = result.data;
});

check('Parent completion updates only the selected child and pays exactly once', () => {
  const created = progressTransition(child, data, 'task.create', {
    id: 'parent-direct', name: 'Pack school bag', shortName: 'Pack bag', icon: '🎒', diff: 'med', freq: 'daily', mystery: false,
  }, parentContext);
  const completed = progressTransition(created.profile, created.data, 'task.complete', {
    id: 'parent-direct', expectedRevision: 0,
  }, parentContext);
  assert.equal(completed.data.tasks.find(task => task.id === 'parent-direct').done, true);
  assert.ok(completed.profile.coins > created.profile.coins);
  assert.ok(completed.profile.xp > created.profile.xp);

  const repeated = progressTransition(completed.profile, completed.data, 'task.complete', {
    id: 'parent-direct', expectedRevision: 0,
  }, parentContext);
  assert.equal(repeated.profile.coins, completed.profile.coins);
  assert.equal(repeated.profile.xp, completed.profile.xp);
  assert.deepEqual(sibling.data.tasks, []);

  const undone = progressTransition(repeated.profile, repeated.data, 'task.undo', {
    id: 'parent-direct', expectedRevision: 0,
  }, parentContext);
  assert.equal(undone.data.tasks.find(task => task.id === 'parent-direct').done, false);
  assert.equal(undone.profile.coins, created.profile.coins);
  assert.equal(undone.profile.xp, created.profile.xp);
  data = undone.data;
});

check('Parent deletion disappears for the child and cannot affect another child', () => {
  const result = progressTransition(child, data, 'task.delete', {
    id: 'parent-quest', expectedRevision: 'parent-edit-1',
  }, parentContext);
  assert.equal(result.data.tasks.some(task => task.id === 'parent-quest'), false);
  assert.equal(result.data.tasks.some(task => task.id === 'child-quest'), true);
  assert.deepEqual(sibling, {
    profile: { role: 'child', coins: 70, xp: 5, level: 2, current_avatar: 'roblox_ninja' },
    data: { lastActiveDate: day, tasks: [], prizes: ['Cinema'], won_prizes: [], unlocked_avatars: ['roblox_noob', 'roblox_ninja'] },
  });
});



check('Server accepts every reminder hour, including midnight, and rejects invalid time', () => {
  for (let hour = 0; hour < 24; hour++) {
    const time = `${String(hour).padStart(2, '0')}:59`;
    const result = progressTransition(child, { lastActiveDate: day, tasks: [] }, 'task.create', {
      id: `hour-${hour}`, name: 'Read', diff: 'easy', freq: 'daily', reminderTime: time,
    }, parentContext);
    assert.equal(result.data.tasks[0].reminderTime, time);
  }
  assert.throws(() => progressTransition(child, { lastActiveDate: day, tasks: [] }, 'task.create', {
    id: 'bad-hour', name: 'Read', diff: 'easy', freq: 'daily', reminderTime: '24:00',
  }, parentContext), /INVALID_REMINDER/);
});

check('Child undo reverses a recent own completion, rejects expired, spent and parent-reviewed rewards', () => {
  const initial = { lastActiveDate: day, tasks: [{ id: 'undo', name: 'Read', diff: 'easy', freq: 'daily', done: false, date: day }] };
  const complete = progressTransition(child, initial, 'task.complete', { id: 'undo' }, childContext);
  const undone = progressTransition(complete.profile, complete.data, 'task.undo', { id: 'undo' }, { ...childContext, time: now + 1000 });
  assert.equal(undone.data.tasks[0].done, false);
  assert.equal(undone.profile.coins, child.coins);
  for (const context of [{ ...childContext, time: now + 31000 }, { ...childContext, actorUid: 'other-child' }]) {
    assert.throws(() => progressTransition(complete.profile, complete.data, 'task.undo', { id: 'undo' }, context), /PARENT_REQUIRED/);
  }
  assert.throws(() => progressTransition({ ...complete.profile, coins: 0 }, complete.data, 'task.undo', { id: 'undo' }, childContext), /PARENT_REQUIRED/);
  assert.throws(() => progressTransition(complete.profile, { ...complete.data, lastSpinDate: day }, 'task.undo', { id: 'undo' }, childContext), /PARENT_REQUIRED/);
  const parentComplete = progressTransition(child, initial, 'task.complete', { id: 'undo' }, parentContext);
  assert.throws(() => progressTransition(parentComplete.profile, parentComplete.data, 'task.undo', { id: 'undo' }, childContext), /PARENT_REQUIRED/);
});

check('Family challenge excludes rest days, future quests and previous-day completions', () => {
  const { familyQuestCounts } = require('../backend/functions/lib/backend/functions/src/accounts');
  const task = { id: 'a', name: 'Read', freq: 'daily', date: day, done: true };
  assert.deepEqual(familyQuestCounts({ tasks: [task] }, day), { total: 1, done: 1 });
  assert.deepEqual(familyQuestCounts({ isSick: true, tasks: [task] }, day), { total: 0, done: 0 });
  assert.deepEqual(familyQuestCounts({ tasks: [{ ...task, date: '2020-01-01' }] }, day), { total: 1, done: 0 });
  assert.deepEqual(familyQuestCounts({ tasks: [{ ...task, postponedUntil: '2099-01-01' }] }, day), { total: 0, done: 0 });
  assert.deepEqual(familyQuestCounts({ tasks: [{ ...task, pendingApproval: true }] }, day), { total: 1, done: 0 });
});

console.log(`${checks} family synchronization checks passed without network writes.`);
