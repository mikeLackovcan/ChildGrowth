import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { authenticated, db, linkId, queueNotice, text } from './core';

// Only this trusted endpoint creates accepted family memberships. Mirrored
// profile summaries are for display; they never grant access to battles.
export const manageFamily = onCall(async request => {
  const uid = authenticated(request);
  const action = request.data?.action;
  if (!['invite', 'accept', 'decline', 'unlink'].includes(action)) throw new HttpsError('invalid-argument', 'INVALID_ACTION');
  const tag = text(request.data?.otherTag, 254).toLowerCase().replace(/^@/, '');
  const matches = await db.collection('profiles').where(tag.includes('@') ? 'email' : 'nickname', '==', tag).limit(2).get();
  if (matches.size !== 1) throw new HttpsError('not-found', 'FAMILY_ACCOUNT_NOT_FOUND');
  const otherId = matches.docs[0].id;
  if (uid === otherId) throw new HttpsError('invalid-argument', 'SELF_LINK');

  await db.runTransaction(async transaction => {
    const [actorSnap, otherSnap] = await Promise.all([
      transaction.get(db.doc(`profiles/${uid}`)), transaction.get(db.doc(`profiles/${otherId}`)),
    ]);
    const actor = actorSnap.data(), other = otherSnap.data();
    if (!actor || !other || !['parent', 'child'].includes(actor.role) || !['parent', 'child'].includes(other.role) || actor.role === other.role) {
      throw new HttpsError('failed-precondition', 'FAMILY_ROLE_MISMATCH');
    }
    const parentUid = actor.role === 'parent' ? uid : otherId;
    const childUid = actor.role === 'child' ? uid : otherId;
    const parent = actor.role === 'parent' ? actor : other;
    const child = actor.role === 'child' ? actor : other;
    const ref = db.doc(`familyLinks/${linkId(parentUid, childUid)}`);
    const parentRef = db.doc(`user_data/${parentUid}`), childRef = db.doc(`user_data/${childUid}`);
    const limitRef = db.doc(`familyInviteLimits/${uid}`);
    const [linkSnap, parentSnap, childSnap, limitSnap] = await Promise.all([
      transaction.get(ref), transaction.get(parentRef), transaction.get(childRef), transaction.get(limitRef),
    ]);
    const link = linkSnap.data(), p = parentSnap.data() || {}, c = childSnap.data() || {};
    if ((action === 'invite' || action === 'accept') && link?.status === 'accepted') {
      transaction.set(db.doc(`familyAccess/${childUid}/parents/${parentUid}`), { accepted: true, updatedAt: Timestamp.now() });
      return;
    }
    if (action === 'invite' && link?.status === 'pending') return;
    // Retries are harmless, but the sender can never accept their own invite.
    if (action === 'decline' && link?.status === 'declined') return;
    if (action === 'unlink' && (!link || link.status === 'unlinked')) return;
    if (['accept', 'decline'].includes(action) && (link?.status !== 'pending' || link.invitedBy === uid)) {
      throw new HttpsError('permission-denied', 'INVITATION_NOT_AVAILABLE');
    }
    if (action === 'invite' && link?.updatedAt && Date.now() - link.updatedAt.toMillis() < 60000) {
      throw new HttpsError('resource-exhausted', 'INVITATION_COOLDOWN');
    }
    const day = new Date().toISOString().slice(0, 10);
    const count = limitSnap.data()?.day === day ? limitSnap.data()!.count : 0;
    if (action === 'invite' && count >= 20) throw new HttpsError('resource-exhausted', 'INVITATION_LIMIT');
    const accepted = action === 'accept';
    const removing = action === 'decline' || action === 'unlink';
    const status = accepted ? 'accepted' : action === 'invite' ? 'pending' : action === 'decline' ? 'declined' : 'unlinked';
    const initiatedBy = action === 'invite' ? (actor.role === 'parent' ? 'parent' : 'kid') : link?.initiatedBy;
    const summary = {
      id: childUid, name: child.full_name || child.nickname, nickname: child.nickname,
      level: accepted ? child.level ?? 1 : 1, xp: accepted ? child.xp ?? 0 : 0, coins: accepted ? child.coins ?? 0 : 0,
      tasks: accepted ? c.tasks || [] : [], prizes: accepted ? c.prizes || [] : [], wonPrizes: accepted ? c.won_prizes || [] : [],
      unlockedAvatars: accepted ? c.unlocked_avatars || ['roblox_noob'] : ['roblox_noob'], currentAvatar: accepted ? child.current_avatar || 'roblox_noob' : 'roblox_noob',
      linkedParents: [parent.nickname], isApproved: accepted, initiatedBy,
    };
    const children = (p.children || []).filter((item: any) => item.id !== childUid && item.nickname !== child.nickname);
    const legacyChildren = Array.isArray(p.legacy_family_children) ? [...p.legacy_family_children] : [];
    if (action === 'invite' && !link) {
      const historical = (p.children || []).find((item: any) => item.id === childUid || item.nickname === child.nickname);
      if (historical && !legacyChildren.some((item: any) => item.id === historical.id && item.nickname === historical.nickname)) legacyChildren.push(historical);
    }
    const invitations = (c.children || []).filter((item: any) => !item.linkedParents?.includes(parent.nickname));
    if (!removing) { children.push(summary); invitations.push(summary); }
    const linked = new Set<string>(c.linked_parents || []);
    if (accepted) linked.add(parent.nickname);
    if (removing) linked.delete(parent.nickname);
    const updatedAt = Timestamp.now(), updated_at = updatedAt.toDate().toISOString();
    const revision = (link?.revision || 0) + 1;
    if (action === 'invite') transaction.set(limitRef, { day, count: count + 1 });
    transaction.set(ref, { parentUid, childUid, participants: [parentUid, childUid], status,
      invitedBy: action === 'invite' ? uid : link?.invitedBy || uid,
      initiatedBy: initiatedBy || (actor.role === 'parent' ? 'parent' : 'kid'), updatedAt, revision });
    transaction.set(db.doc(`familyAccess/${childUid}/parents/${parentUid}`), { accepted, updatedAt });
    transaction.set(parentRef, { children, legacy_family_children: legacyChildren, updated_at }, { merge: true });
    transaction.set(childRef, { children: invitations, linked_parents: [...linked],
      parent_email: [...linked][0] || (action === 'invite' ? parent.nickname : null),
      approval_status: linked.size ? 'approved' : action === 'invite' ? 'pending' : null, updated_at }, { merge: true });
    queueNotice(transaction, `${ref.id}:family:${revision}`, otherId, `family_${status}`, { familyLinkId: ref.id });
  });
  return { ok: true };
});
