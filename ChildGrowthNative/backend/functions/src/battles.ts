import { normalizeOutfits } from '../../../src/utils/fighterOutfits';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { db, authenticated, text, requestKey, digest, requireFamily, queueNotice } from './core';
import { newDuel, duelTurn, DUEL_SKILLS, Duel, DuelMove } from '../../../src/utils/duel';
const day = 86400000;
function owned(data: any, fighter: string) {
  if (!DUEL_SKILLS[fighter] || (fighter !== 'roblox_noob' && !(data?.unlocked_avatars || []).includes(fighter))) throw new HttpsError('permission-denied', 'FIGHTER_NOT_OWNED');
}
async function acceptedParents(uid: string) {
  const links = await db.collection('familyLinks').where('childUid', '==', uid).where('status', '==', 'accepted').get();
  return links.docs.map(doc => doc.data().parentUid as string);
}
export const listFamilyOpponents = onCall(async request => {
  const uid = authenticated(request);
  const parents = await acceptedParents(uid);
  const opponents = new Set<string>();
  for (const parent of parents) {
    const links = await db.collection('familyLinks').where('parentUid', '==', parent).where('status', '==', 'accepted').get();
    links.docs.forEach(doc => { if (doc.data().childUid !== uid) opponents.add(doc.data().childUid); });
  }
  const profiles = await Promise.all([...opponents].slice(0, 30).map(id => db.doc(`profiles/${id}`).get()));
  return profiles.filter(profile => profile.exists).map(profile => ({ uid: profile.id, nickname: profile.data()!.nickname, fighter: profile.data()!.current_avatar || 'roblox_noob' }));
});
export const createFamilyBattle = onCall(async request => {
  const uid = authenticated(request), opponent = text(request.data?.opponentUid), fighter = text(request.data?.fighter);
  const key = requestKey(request.data?.requestId), id = digest(`${uid}:${key}`);
  if (uid === opponent) throw new HttpsError('invalid-argument', 'SELF_BATTLE');
  const parents = await acceptedParents(uid), otherParents = await acceptedParents(opponent);
  const parentId = parents.find(parent => otherParents.includes(parent));
  if (!parentId) throw new HttpsError('permission-denied', 'FAMILY_REQUIRED');
  await db.runTransaction(async transaction => {
    const ref = db.doc(`battles/${id}`), limitRef = db.doc(`battleLimits/${uid}`);
    const [existing, collection, profile, opponentProfile, limits] = await Promise.all([
      transaction.get(ref), transaction.get(db.doc(`user_data/${uid}`)), transaction.get(db.doc(`profiles/${uid}`)),
      transaction.get(db.doc(`profiles/${opponent}`)), transaction.get(limitRef),
    ]);
    await requireFamily(transaction, parentId, uid, opponent);
    if (existing.exists) return;
    owned(collection.data(), fighter);
    const time = Date.now(), today = new Date(time).toISOString().slice(0, 10);
    const used = limits.data()?.day === today ? limits.data()!.count : 0;
    if (used >= 20 || time - (limits.data()?.lastCreatedAt || 0) < 5000) throw new HttpsError('resource-exhausted', 'BATTLE_LIMIT');
    transaction.set(ref, { participants: [uid, opponent], parentId, challenger: uid, opponent,
      names: [profile.data()?.nickname || 'Player 1', opponentProfile.data()?.nickname || 'Player 2'],
      outfits: [normalizeOutfits(collection.data()?.fighterOutfits)[fighter] || 'original', 'original'],
      fighters: [fighter, null], status: 'invited', createdAt: Timestamp.fromMillis(time), updatedAt: Timestamp.fromMillis(time),
      expiresAt: Timestamp.fromMillis(time + 2 * day), revision: 0, lastRequestByUid: {} });
    transaction.set(limitRef, { day: today, count: used + 1, lastCreatedAt: time });
    queueNotice(transaction, `${id}:invite`, opponent, 'battle_invite', { battleId: id });
  });
  return { id };
});
export const respondFamilyBattle = onCall(async request => {
  const uid = authenticated(request), id = text(request.data?.battleId), decision = request.data?.accept;
  if (typeof decision !== 'boolean') throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  const fighter = decision ? text(request.data?.fighter) : 'roblox_noob';
  await db.runTransaction(async transaction => {
    const ref = db.doc(`battles/${id}`), snapshot = await transaction.get(ref), battle = snapshot.data();
    if (!battle || battle.opponent !== uid) throw new HttpsError('permission-denied', 'NOT_PARTICIPANT');
    await requireFamily(transaction, battle.parentId, battle.challenger, uid);
    if (battle.status === (decision ? 'active' : 'declined')) return;
    if (battle.status !== 'invited' || battle.expiresAt.toMillis() <= Date.now()) throw new HttpsError('failed-precondition', 'BATTLE_EXPIRED');
    let outfit = 'original';
    if (decision) { const collection = await transaction.get(db.doc(`user_data/${uid}`)); owned(collection.data(), fighter); outfit = normalizeOutfits(collection.data()?.fighterOutfits)[fighter] || 'original'; }
    transaction.update(ref, { status: decision ? 'active' : 'declined', updatedAt: Timestamp.now(), revision: battle.revision + 1,
      ...(decision ? { outfits: [battle.outfits?.[0] || 'original', outfit], fighters: [battle.fighters[0], fighter], duel: newDuel(battle.fighters[0], fighter), expiresAt: Timestamp.fromMillis(Date.now() + day) } : {}) });
    queueNotice(transaction, `${id}:response`, battle.challenger, decision ? 'battle_turn' : 'battle_declined', { battleId: id });
  });
  return { ok: true };
});
export const playFamilyBattleMove = onCall(async request => {
  const uid = authenticated(request), id = text(request.data?.battleId), key = requestKey(request.data?.requestId);
  const move = request.data?.move as DuelMove, turn = request.data?.expectedTurn;
  if (!['attack', 'guard', 'skill'].includes(move) || !Number.isInteger(turn)) throw new HttpsError('invalid-argument', 'INVALID_MOVE');
  await db.runTransaction(async transaction => {
    const ref = db.doc(`battles/${id}`), snapshot = await transaction.get(ref), battle = snapshot.data();
    if (!battle || !battle.participants.includes(uid)) throw new HttpsError('permission-denied', 'NOT_PARTICIPANT');
    await requireFamily(transaction, battle.parentId, battle.participants[0], battle.participants[1]);
    if (battle.lastRequestByUid[uid] === key) return;
    const duel = battle.duel as Duel;
    if (battle.status !== 'active' || battle.expiresAt.toMillis() <= Date.now()) throw new HttpsError('failed-precondition', 'BATTLE_EXPIRED');
    if (battle.participants[duel.active] !== uid || duel.turn !== turn) throw new HttpsError('failed-precondition', 'NOT_YOUR_TURN');
    const next = duelTurn(duel, move);
    if (next === duel) throw new HttpsError('failed-precondition', 'SKILL_COOLDOWN');
    const finished = next.winner !== null || next.turn >= 200;
    transaction.update(ref, { duel: next, status: finished ? 'finished' : 'active', revision: battle.revision + 1,
      lastRequestByUid: { ...battle.lastRequestByUid, [uid]: key }, updatedAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + day) });
    const recipients = finished ? battle.participants : [battle.participants[next.active]];
    for (const recipient of recipients) queueNotice(transaction, `${id}:${next.turn}:${recipient}`, recipient, finished ? 'battle_result' : 'battle_turn', { battleId: id });
  });
  return { ok: true };
});
export const leaveFamilyBattle = onCall(async request => {
  const uid = authenticated(request), id = text(request.data?.battleId);
  await db.runTransaction(async transaction => {
    const ref = db.doc(`battles/${id}`), snapshot = await transaction.get(ref), battle = snapshot.data();
    if (!battle || !battle.participants.includes(uid)) throw new HttpsError('permission-denied', 'NOT_PARTICIPANT');
    if (!['active', 'invited'].includes(battle.status)) return;
    const winner = battle.participants[0] === uid ? 1 : 0;
    transaction.update(ref, { status: battle.status === 'invited' ? 'cancelled' : 'finished', updatedAt: Timestamp.now(), revision: battle.revision + 1,
      ...(battle.duel ? { duel: { ...battle.duel, winner } } : {}) });
    queueNotice(transaction, `${id}:left`, battle.participants[winner], 'battle_result', { battleId: id });
  });
  return { ok: true };
});
