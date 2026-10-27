const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const backendRequire = require('node:module').createRequire(require('node:path').resolve(__dirname, '../functions/package.json'));
const { Timestamp } = backendRequire('firebase-admin/firestore');
const { db, digest, linkId } = require('../functions/lib/backend/functions/src/core');
const { registerPushDevice, unregisterPushDevice, enqueueFamilyChanges, fanOutNotice, processPushJob, cleanupPushRecords } = require('../functions/lib/backend/functions/src/push');
const { quietUntil, validZone, familyChanges } = require('../functions/lib/backend/functions/src/pushPolicy');
const { pushText } = require('../functions/lib/src/i18n/pushMessages');
const call = (fn, uid, data) => fn.run({ auth: uid ? { uid } : undefined, data });
const get = async (collection, id) => (await db.doc(`${collection}/${id}`).get()).data();
after(() => db.terminate());
const time = Date.now();
const daytimeZone = Array.from({ length: 25 }, (_, index) => `Etc/GMT${index - 12 >= 0 ? '+' : ''}${index - 12}`)
  .find(zone => validZone(zone) && Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(time))) === 12);

test('quiet hours follow local time and daylight saving', () => {
  assert.equal(quietUntil(Date.parse('2026-10-24T18:00:00Z'), 'Europe/Prague'), Date.parse('2026-10-25T06:00:00Z'));
  assert.equal(quietUntil(Date.parse('2026-03-28T19:00:00Z'), 'Europe/Prague'), Date.parse('2026-03-29T05:00:00Z'));
  assert.equal(quietUntil(Date.parse('2026-10-23T10:00:00Z'), 'Europe/Prague'), Date.parse('2026-10-23T10:00:00Z'));
  assert.equal(validZone('not/a/timezone'), false);
  assert.ok(daytimeZone);
});
test('daily reset is not a rejection and notification languages are complete', () => {
  assert.deepEqual(familyChanges({ lastActiveDate: '2026-10-22', tasks: [{ id: 'q', pendingApproval: true }] },
    { lastActiveDate: '2026-10-23', tasks: [{ id: 'q', pendingApproval: false }] }), []);
  assert.equal(familyChanges({ tasks: [] }, { tasks: [{ id: 'q', helpRequested: true }] })[0].kind, 'quest_help');
  assert.deepEqual(familyChanges({ tasks: [{ id: 'q', date: '2026-10-22', pendingApproval: true }] },
    { tasks: [{ id: 'q', date: '2026-10-23', pendingApproval: false }] }), []);
  for (const language of ['en', 'cs', 'es', 'de']) assert.ok(pushText('quest_review', language).body);
  assert.equal(pushText('unknown', 'en'), null);
});
test('push registration, outbox, receipts and retries use real Firestore with a fake transport', async t => {
  const parent = 'push-parent', child = 'push-child';
  await db.doc(`profiles/${child}`).set({ role: 'child' });
  await db.doc(`familyLinks/${linkId(parent, child)}`).set({ parentUid: parent, childUid: child, status: 'accepted' });
  const before = { lastActiveDate: '2026-10-23', tasks: [{ id: 'private-task', name: 'Private child task' }] };
  const current = { ...before, tasks: [{ ...before.tasks[0], pendingApproval: true }] };
  await db.doc(`user_data/${child}`).set(current);
  const token = 'ExpoPushToken[synthetic-test-token]', deviceId = digest(token);
  await t.test('requires auth and valid preferences; another user cannot disable a device', async () => {
    await assert.rejects(call(registerPushDevice, null, {}), /AUTH_REQUIRED/);
    await assert.rejects(call(registerPushDevice, parent, { token: 'broken' }), /INVALID_PUSH_TOKEN/);
    await assert.rejects(call(registerPushDevice, parent, { token, language: 'fr', timeZone: 'UTC', sound: true }), /INVALID_PREFERENCES/);
    await call(registerPushDevice, parent, { token, language: 'es', timeZone: daytimeZone, sound: false });
    await call(unregisterPushDevice, child, { id: deviceId });
    assert.equal((await get('pushDevices', deviceId)).enabled, true);
  });
  const noticeId = digest(`push-event-1:${parent}:quest_review`);
  let jobId;
  await t.test('deduplicates repeated events and fan-out without including child text', async () => {
    await enqueueFamilyChanges(child, before, current, 'push-event-1');
    await enqueueFamilyChanges(child, before, current, 'push-event-1');
    await Promise.all([fanOutNotice(noticeId), fanOutNotice(noticeId)]);
    jobId = digest(`${noticeId}:${deviceId}`);
    const job = await get('pushJobs', jobId);
    assert.equal(job.kind, 'quest_review');
    assert.equal(JSON.stringify(job).includes('Private child task'), false);
    assert.equal((await get('notificationOutbox', noticeId)).deviceCount, 1);
  });
  await t.test('concurrent workers send once, then wait for provider receipt', async () => {
    let sent = 0;
    const transport = async (operation, payload) => {
      assert.equal(operation, 'send'); sent++;
      assert.equal(payload[0].body, pushText('quest_review', 'es').body);
      assert.equal(payload[0].sound, null);
      assert.equal(payload[0].data.recipient, parent);
      assert.equal(JSON.stringify(payload).includes('Private child task'), false);
      return { data: [{ status: 'ok', id: 'synthetic-ticket' }] };
    };
    await Promise.all([processPushJob(jobId, transport), processPushJob(jobId, transport)]);
    assert.equal(sent, 1);
    assert.equal((await get('pushJobs', jobId)).status, 'receipt');
    await db.doc(`pushJobs/${jobId}`).update({ nextAttemptAt: Timestamp.fromMillis(0) });
    await processPushJob(jobId, async operation => {
      assert.equal(operation, 'getReceipts');
      return { data: { 'synthetic-ticket': { status: 'ok' } } };
    });
    assert.equal((await get('pushJobs', jobId)).status, 'delivered');
    await processPushJob(jobId, async () => { throw Error('Completed jobs must not contact Expo again'); });
  });
  async function makeJob(id, changes = {}) {
    await db.doc(`pushJobs/${id}`).set({ recipient: parent, deviceId, kind: 'quest_review', data: { sourceChildId: child, taskId: 'private-task' },
      status: 'pending', attempts: 0, nextAttemptAt: Timestamp.fromMillis(0), createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000), ...changes });
  }
  await t.test('network failures retry without pretending delivery succeeded', async () => {
    await makeJob('push-retry');
    await processPushJob('push-retry', async () => { throw Error('offline'); });
    const job = await get('pushJobs', 'push-retry');
    assert.equal(job.status, 'pending'); assert.equal(job.attempts, 1);
    assert.ok(job.nextAttemptAt.toMillis() > Date.now());
  });
  await t.test('quiet hours defer without sending; stale requests are cancelled', async () => {
    const nightZone = Array.from({ length: 25 }, (_, index) => `Etc/GMT${index - 12 >= 0 ? '+' : ''}${index - 12}`)
      .find(zone => validZone(zone) && quietUntil(Date.now(), zone) > Date.now() + 3600000);
    await db.doc(`pushDevices/${deviceId}`).update({ timeZone: nightZone });
    await makeJob('push-night');
    let calls = 0;
    await processPushJob('push-night', async () => { calls++; });
    assert.equal(calls, 0); assert.equal((await get('pushJobs', 'push-night')).attempts, 0);
    await db.doc(`pushDevices/${deviceId}`).update({ timeZone: daytimeZone });
    await db.doc(`user_data/${child}`).set(before);
    await makeJob('push-stale');
    await processPushJob('push-stale', async () => { calls++; });
    assert.equal(calls, 0); assert.equal((await get('pushJobs', 'push-stale')).status, 'cancelled');
    await db.doc(`user_data/${child}`).set(current);
  });
  await t.test('account changes prevent sending queued notifications to the previous account', async () => {
    await makeJob('push-switch');
    await call(registerPushDevice, child, { token, language: 'en', timeZone: daytimeZone, sound: true });
    let calls = 0;
    await processPushJob('push-switch', async () => { calls++; });
    assert.equal(calls, 0); assert.equal((await get('pushJobs', 'push-switch')).status, 'cancelled');
    await call(registerPushDevice, parent, { token, language: 'de', timeZone: daytimeZone, sound: true });
  });
  await t.test('invalid provider receipts disable the device', async () => {
    await makeJob('push-invalid-device', { ticketId: 'bad-ticket', status: 'receipt' });
    await processPushJob('push-invalid-device', async () => ({ data: { 'bad-ticket': { status: 'error', details: { error: 'DeviceNotRegistered' } } } }));
    assert.equal((await get('pushJobs', 'push-invalid-device')).status, 'failed');
    assert.equal((await get('pushDevices', deviceId)).enabled, false);
  });
  await t.test('retention cleanup removes expired records and preserves recent registrations', async () => {
    await db.doc('pushJobs/retention-old').set({ createdAt: Timestamp.fromMillis(Date.now() - 8 * 86400000) });
    await db.doc('pushEvents/retention-old').set({ expiresAt: Timestamp.fromMillis(0) });
    await cleanupPushRecords();
    assert.equal(await get('pushJobs', 'retention-old'), undefined);
    assert.equal(await get('pushEvents', 'retention-old'), undefined);
    assert.ok(await get('pushDevices', deviceId));
    assert.ok(await get('pushJobs', jobId));
  });
});
