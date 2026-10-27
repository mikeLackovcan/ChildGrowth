import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { authenticated, db, digest, linkId, queueNotice, text } from './core';
import { pushText, pushLanguages } from '../../../src/i18n/pushMessages';
import { familyChanges, quietUntil, retryAt, validZone } from './pushPolicy';

const day = 86400000;
export const registerPushDevice = onCall(async request => {
  const uid = authenticated(request), token = text(request.data?.token, 200);
  if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)) throw new HttpsError('invalid-argument', 'INVALID_PUSH_TOKEN');
  const language = request.data?.language, timeZone = request.data?.timeZone;
  if (!pushLanguages.includes(language) || !validZone(timeZone) || typeof request.data?.sound !== 'boolean' || (request.data?.enabled !== undefined && typeof request.data.enabled !== 'boolean')) throw new HttpsError('invalid-argument', 'INVALID_PREFERENCES');
  const enabled = request.data.enabled !== false;
  const id = digest(token), ref = db.doc(`pushDevices/${id}`);
  await db.runTransaction(async transaction => {
    const devices = await transaction.get(db.collection('pushDevices').where('uid', '==', uid).where('enabled', '==', true));
    if (enabled && devices.size >= 8 && !devices.docs.some(device => device.id === id)) throw new HttpsError('resource-exhausted', 'DEVICE_LIMIT');
    transaction.set(ref, { uid, token, language, timeZone, sound: request.data.sound, enabled, updatedAt: Timestamp.now() });
  });
  return { id };
});
export const unregisterPushDevice = onCall(async request => {
  const uid = authenticated(request), id = text(request.data?.id);
  await db.runTransaction(async transaction => {
    const ref = db.doc(`pushDevices/${id}`), device = await transaction.get(ref);
    if (device.data()?.uid === uid) transaction.update(ref, { enabled: false, updatedAt: Timestamp.now() });
  });
  return { ok: true };
});

export async function enqueueFamilyChanges(uid: string, before: any, after: any, eventId: string) {
  const notices = familyChanges(before, after);
  if (!notices.length) return;
  const profile = await db.doc(`profiles/${uid}`).get();
  if (profile.data()?.role !== 'child') return;
  const links = await db.collection('familyLinks').where('childUid', '==', uid).where('status', '==', 'accepted').get();
  if (links.empty) return;
  // One event can contain a full family sync. Bound its fan-out and aggregate
  // repeated changes of one kind rather than alerting once per task.
  const kinds = [...new Map(notices.map(notice => [notice.kind, notice])).values()];
  await db.runTransaction(async transaction => {
    const marker = db.doc(`pushEvents/${digest(eventId)}`);
    if ((await transaction.get(marker)).exists) return;
    transaction.set(marker, { createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 7 * day) });
    for (const notice of kinds) {
      const recipients = notice.toParent ? links.docs.slice(0, 8).map(link => link.data().parentUid as string) : [uid];
      for (const recipient of recipients) queueNotice(transaction, `${eventId}:${recipient}:${notice.kind}`, recipient, notice.kind,
        { sourceChildId: uid, ...(notice.taskId ? { taskId: notice.taskId } : {}), ...(notice.prizeId ? { prizeId: notice.prizeId } : {}) });
    }
  });
}
export const notifyFamilyProgress = onDocumentWritten({ document: 'user_data/{uid}', retry: true }, async event => {
  if (event.data?.after.exists) await enqueueFamilyChanges(event.params.uid, event.data.before.data(), event.data.after.data(), event.id);
});

export async function fanOutNotice(id: string) {
  const noticeRef = db.doc(`notificationOutbox/${id}`), snapshot = await noticeRef.get(), notice = snapshot.data();
  if (!notice || notice.status !== 'pending') return;
  const devices = await db.collection('pushDevices').where('uid', '==', notice.recipient).where('enabled', '==', true).limit(8).get();
  await db.runTransaction(async transaction => {
    const current = (await transaction.get(noticeRef)).data();
    if (current?.status !== 'pending') return;
    const time = Date.now();
    if (!pushText(notice.kind, 'en') || time - notice.createdAt.toMillis() > day) {
      transaction.update(noticeRef, { status: 'expired' }); return;
    }
    for (const device of devices.docs) transaction.create(db.doc(`pushJobs/${digest(`${id}:${device.id}`)}`), {
      recipient: notice.recipient, deviceId: device.id, kind: notice.kind, data: notice.data || {},
      createdAt: Timestamp.fromMillis(time), expiresAt: Timestamp.fromMillis(notice.createdAt.toMillis() + day),
      status: 'pending', nextAttemptAt: Timestamp.fromMillis(time), attempts: 0,
    });
    transaction.update(noticeRef, { status: devices.empty ? 'no_devices' : 'queued', deviceCount: devices.size });
  });
}
export const preparePush = onDocumentCreated({ document: 'notificationOutbox/{id}', retry: true }, event => fanOutNotice(event.params.id));

export type PushTransport = (operation: 'send' | 'getReceipts', payload: object) => Promise<any>;
class TransportError extends Error { constructor(public permanent: boolean) { super('PUSH_TRANSPORT'); } }
const expoTransport: PushTransport = async (operation, payload) => {
  if (process.env.GCLOUD_PROJECT?.startsWith('demo-') || process.env.FUNCTIONS_EMULATOR === 'true') throw new TransportError(true);
  const response = await fetch(`https://exp.host/--/api/v2/push/${operation}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new TransportError(response.status < 500 && response.status !== 429);
  return response.json();
};
async function stillRelevant(job: any) {
  if (job.data.battleId) {
    const battle = (await db.doc(`battles/${job.data.battleId}`).get()).data();
    if (!battle?.participants.includes(job.recipient)) return false;
    const links = await Promise.all(battle.participants.map((uid: string) => db.doc(`familyLinks/${linkId(battle.parentId, uid)}`).get()));
    if (links.some(link => link.data()?.status !== 'accepted')) return false;
    if (job.kind === 'battle_turn') return battle.status === 'active' && battle.expiresAt.toMillis() > Date.now() && battle.participants[battle.duel.active] === job.recipient;
    if (job.kind === 'battle_invite') return battle.status === 'invited' && battle.expiresAt.toMillis() > Date.now();
    return ['finished', 'declined', 'cancelled'].includes(battle.status);
  }
  if (job.data.sourceChildId) {
    const child = job.data.sourceChildId;
    if (job.recipient !== child && (await db.doc(`familyLinks/${linkId(job.recipient, child)}`).get()).data()?.status !== 'accepted') return false;
    const data = (await db.doc(`user_data/${child}`).get()).data();
    const task = data?.tasks?.find((task: any) => task.id === job.data.taskId);
    const prize = data?.won_prizes?.find((prize: any) => prize.id === job.data.prizeId);
    switch (job.kind) {
      case 'quest_review': return task?.pendingApproval === true;
      case 'quest_help': return task?.helpRequested === true && !task.done;
      case 'quest_approved': return task?.done === true || (task?.lastReview?.approved === true && !task.pendingApproval);
      case 'quest_retry': return !!task && !task.done && !task.pendingApproval && task.lastReview?.approved !== true;
      case 'prize_review': return prize?.status === 'requested' && !prize.redeemed;
      case 'prize_approved': return prize?.status === 'approved' && !prize.redeemed;
    }
  }
  if (job.data.familyLinkId) return (await db.doc(`familyLinks/${job.data.familyLinkId}`).get()).data()?.status === job.kind.replace('family_', '');
  return false;
}
export async function processPushJob(id: string, transport: PushTransport = expoTransport) {
  const ref = db.doc(`pushJobs/${id}`), time = Date.now();
  const claim = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref), job = snapshot.data();
    if (!job?.nextAttemptAt || job.nextAttemptAt.toMillis() > time) return null;
    const deviceRef = db.doc(`pushDevices/${job.deviceId}`), device = (await transaction.get(deviceRef)).data();
    const quotaRef = db.doc(`pushLimits/${digest(`${job.recipient}:${new Date(time).toISOString().slice(0, 10)}`)}`);
    const quota = (await transaction.get(quotaRef)).data();
    if (!device?.enabled || device.uid !== job.recipient || job.expiresAt.toMillis() <= time || time - device.updatedAt.toMillis() > 30 * day) {
      transaction.update(ref, { status: 'cancelled', nextAttemptAt: FieldValue.delete() }); return null;
    }
    const receipt = !!job.ticketId;
    if (!receipt) {
      const next = quietUntil(time, device.timeZone);
      if (next > time) { transaction.update(ref, { status: 'pending', nextAttemptAt: Timestamp.fromMillis(next) }); return null; }
      if (job.attempts >= 5 || (quota?.count || 0) >= 40) {
        transaction.update(ref, { status: 'limited', nextAttemptAt: FieldValue.delete() }); return null;
      }
      transaction.set(quotaRef, { count: (quota?.count || 0) + 1, expiresAt: Timestamp.fromMillis(time + 2 * day) });
    }
    // A lease prevents concurrent trigger/scheduler workers sending the same job.
    const lease = digest(`${id}:${time}:${Math.random()}`);
    transaction.update(ref, { lease, status: receipt ? 'checking' : 'sending', attempts: job.attempts + (receipt ? 0 : 1), nextAttemptAt: Timestamp.fromMillis(time + 120000) });
    return { job, device, lease, receipt };
  });
  if (!claim) return;
  const { job, device, lease, receipt } = claim;
  const finish = async (changes: object, disableDevice = false) => db.runTransaction(async transaction => {
    const current = (await transaction.get(ref)).data();
    const deviceRef = db.doc(`pushDevices/${job.deviceId}`);
    const currentDevice = disableDevice ? (await transaction.get(deviceRef)).data() : null;
    if (current?.lease !== lease) return;
    transaction.update(ref, changes);
    if (currentDevice?.uid === job.recipient) transaction.update(deviceRef, { enabled: false });
  });
  const close = (status: string, reason?: string) => ({ status, ...(reason ? { reason } : {}), nextAttemptAt: FieldValue.delete() });
  try {
    if (!receipt && !await stillRelevant(job)) { await finish(close('cancelled')); return; }
    const content = pushText(job.kind, device.language);
    if (!content) { await finish(close('failed', 'unknown_kind')); return; }
    const response = receipt ? await transport('getReceipts', { ids: [job.ticketId] }) : await transport('send', [{
      to: device.token, ...content, sound: device.sound ? 'default' : null,
      channelId: device.sound ? 'quest-family-sound-v1' : 'quest-family-quiet-v1',
      ttl: Math.max(0, Math.floor((job.expiresAt.toMillis() - Date.now()) / 1000)),
      data: { questbloxPush: true, recipient: job.recipient, kind: job.kind, notificationId: id, ...job.data },
    }]);
    const result = receipt ? response?.data?.[job.ticketId] : response?.data?.[0];
    if (result?.status === 'ok' && (receipt || typeof result.id === 'string')) {
      await finish(receipt ? close('delivered') : { status: 'receipt', ticketId: result.id, nextAttemptAt: Timestamp.fromMillis(Date.now() + 15 * 60000) });
    } else if (result?.status === 'error') {
      const reason = result.details?.error;
      if (reason === 'MessageRateExceeded') {
        await finish({ status: 'pending', ticketId: FieldValue.delete(), nextAttemptAt: Timestamp.fromMillis(retryAt(Date.now(), job.attempts + 1)) });
      } else await finish(close('failed', ['DeviceNotRegistered', 'InvalidCredentials', 'MessageTooBig'].includes(reason) ? reason : 'provider_error'), reason === 'DeviceNotRegistered');
    } else if (receipt) {
      await finish({ status: 'receipt', nextAttemptAt: Timestamp.fromMillis(Date.now() + 15 * 60000) });
    } else throw new TransportError(false);
  } catch (error) {
    await finish(error instanceof TransportError && error.permanent ? close('failed', 'transport_configuration') : {
      status: receipt ? 'receipt' : 'pending', nextAttemptAt: Timestamp.fromMillis(retryAt(Date.now(), job.attempts + 1)),
    });
  }
}
export const deliverPush = onDocumentCreated({ document: 'pushJobs/{id}', retry: true }, event => processPushJob(event.params.id));
export const retryPushDelivery = onSchedule({ schedule: 'every 5 minutes', timeoutSeconds: 300, maxInstances: 1 }, async () => {
  const jobs = await db.collection('pushJobs').where('nextAttemptAt', '<=', Timestamp.now()).orderBy('nextAttemptAt').limit(50).get();
  for (let offset = 0; offset < jobs.size; offset += 5) await Promise.all(jobs.docs.slice(offset, offset + 5).map(job => processPushJob(job.id)));
});
export async function cleanupPushRecords(time = Date.now()) {
  for (const [collection, field, cutoff] of [
    ['notificationOutbox', 'createdAt', time - 7 * day], ['pushJobs', 'createdAt', time - 7 * day],
    ['pushEvents', 'expiresAt', time], ['pushLimits', 'expiresAt', time],
    ['pushDevices', 'updatedAt', time - 30 * day],
  ] as const) {
    const expired = await db.collection(collection).where(field, '<=', Timestamp.fromMillis(cutoff)).limit(200).get();
    if (expired.empty) continue;
    // Recheck timestamps in the transaction so a device refreshed after the
    // query cannot be deleted by retention cleanup.
    await db.runTransaction(async transaction => {
      const current = await Promise.all(expired.docs.map(item => transaction.get(item.ref)));
      for (const item of current) {
        const timestamp = item.data()?.[field];
        if (timestamp && timestamp.toMillis() <= cutoff) transaction.delete(item.ref);
      }
    });
  }
}
export const cleanPushHistory = onSchedule({ schedule: 'every 24 hours', timeoutSeconds: 300, maxInstances: 1 }, () => cleanupPushRecords());
