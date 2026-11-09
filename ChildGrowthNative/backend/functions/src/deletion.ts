import { getAuth } from 'firebase-admin/auth';
import { Query, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { authenticated, db, digest } from './core';

export function requireDeletionConfirmation(authTime: unknown, confirmed: unknown, now = Date.now()) {
  if (confirmed !== true) throw new HttpsError('failed-precondition', 'DELETE_CONFIRM_REQUIRED');
  if (typeof authTime !== 'number' || now / 1000 - authTime > 300 || authTime > now / 1000 + 30) {
    throw new HttpsError('failed-precondition', 'DELETE_RECENT_LOGIN_REQUIRED');
  }
}
export const requestAccountDeletion = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  requireDeletionConfirmation(request.auth.token.auth_time, request.data?.confirmed);
  const uid = request.auth.uid;
  if ((await db.doc(`deletedAccountTokens/${digest(uid)}`).get()).exists) return { accepted: true };
  await authenticated(request);
  // The target is always the authenticated account, never a client-supplied uid.
  const batch = db.batch();
  batch.set(db.doc(`deletedAccountTokens/${digest(uid)}`), { expiresAt: Timestamp.fromMillis(Date.now() + 86400000) });
  batch.set(db.doc(`accountDeletions/${uid}`), { requestedAt: Timestamp.now() }, { merge: true });
  await batch.commit();
  return { accepted: true };
});
async function eraseQuery(query: Query) {
  for (;;) {
    const page = await query.limit(200).get();
    if (page.empty) return;
    await Promise.all(page.docs.map(doc => db.recursiveDelete(doc.ref)));
  }
}
export function withoutDeletedMember(data: Record<string, any>, uid: string, nickname?: string) {
  const keepChild = (child: any) => child?.id !== uid && (!nickname || child?.nickname !== nickname);
  const stripParent = (child: any) => ({ ...child, linkedParents: (child.linkedParents || []).filter((tag: string) => tag !== nickname) });
  const result: Record<string, any> = {};
  for (const field of ['children', 'legacy_family_children']) if (Array.isArray(data[field])) result[field] = data[field].filter(keepChild).map(stripParent);
  if (Array.isArray(data.linked_parents)) result.linked_parents = data.linked_parents.filter((tag: string) => tag !== nickname);
  if (data.parent_email === nickname) result.parent_email = result.linked_parents?.[0] || null;
  if (result.linked_parents) result.approval_status = result.linked_parents.length ? 'approved' : null;
  return result;
}
export async function eraseAccount(uid: string) {
  const job = db.doc(`accountDeletions/${uid}`);
  if (!(await job.get()).exists) return;
  // Removing Auth first prevents any new callable from recreating the account.
  try { await getAuth().deleteUser(uid); } catch (error: any) { if (error.code !== 'auth/user-not-found') throw error; }
  const snapshot = await job.get();
  const stoppedAt = snapshot.data()?.stoppedAt as Timestamp | undefined;
  if (!stoppedAt) await job.set({ stoppedAt: Timestamp.now() }, { merge: true });
  // Drain pre-existing callable invocations (normal functions have a 30s timeout).
  const remaining = 35000 - (Date.now() - (stoppedAt?.toMillis() || Date.now()));
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  const profile = (await db.doc(`profiles/${uid}`).get()).data();
  const nickname = profile?.nickname as string | undefined;
  const links = await db.collection('familyLinks').where('participants', 'array-contains', uid).get();
  for (const link of links.docs) {
    const info = link.data();
    const other = info.parentUid === uid ? info.childUid : info.parentUid;
    await db.runTransaction(async transaction => {
      const ref = db.doc(`user_data/${other}`), otherData = await transaction.get(ref);
      if (otherData.exists) transaction.update(ref, withoutDeletedMember(otherData.data()!, uid, nickname));
      transaction.delete(db.doc(`familyAccess/${info.childUid}/parents/${info.parentUid}`));

    });
    for (const collection of ['notificationOutbox', 'pushJobs']) await eraseQuery(db.collection(collection).where('data.familyLinkId', '==', link.id));
    await link.ref.delete();
  }
  const battles = await db.collection('battles').where('participants', 'array-contains', uid).get();
  const supervised = await db.collection('battles').where('parentId', '==', uid).get();
  for (const battle of [...battles.docs, ...supervised.docs]) {
    for (const collection of ['notificationOutbox', 'pushJobs']) await eraseQuery(db.collection(collection).where('data.battleId', '==', battle.id));
    await db.recursiveDelete(battle.ref);
  }
  for (const [collection, field] of [['nicknames', 'uid'], ['familyCodes', 'uid'], ['pushDevices', 'uid'], ['progressReceipts', 'actorUid'], ['progressReceipts', 'targetUid'], ['notificationOutbox', 'recipient'], ['notificationOutbox', 'data.sourceChildId'], ['pushJobs', 'recipient'], ['pushJobs', 'data.sourceChildId']]) {
    await eraseQuery(db.collection(collection).where(field, '==', uid));
  }
  // Legacy copies are addressed by nickname, but only remove an owned copy.
  if (nickname) {
    const legacy = db.doc(`user_data/usr_${nickname}`);
    const owners = await db.collection('profiles').where('nickname', '==', nickname).get();
    if (owners.docs.every(doc => doc.id === uid)) await db.recursiveDelete(legacy);
  }
  for (const collection of ['user_data', 'profiles', 'familyAccess', 'familyInviteLimits', 'battleLimits']) await db.recursiveDelete(db.doc(`${collection}/${uid}`));
  // Push quotas are hashed, contain no profile data, and expire after two days.
  for (let days = 0; days < 4; days++) await db.doc(`pushLimits/${digest(`${uid}:${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)}`)}`).delete();
  await job.delete();
}
export const completeAccountDeletion = onDocumentCreated({ document: 'accountDeletions/{uid}', retry: true, timeoutSeconds: 540 }, event => eraseAccount(event.params.uid));
