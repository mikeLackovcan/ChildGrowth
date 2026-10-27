import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, limit, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { app, auth, db } from './firebase';
import type { Duel, DuelMove } from '../utils/duel';

export interface FamilyOpponent { uid: string; nickname: string; fighter: string }
export interface FamilyBattle {
  id: string; participants: [string, string]; names: [string, string]; fighters: [string, string | null];
  challenger: string; opponent: string; status: 'invited' | 'active' | 'declined' | 'cancelled' | 'finished';
  outfits?: [string, string];
  duel?: Duel; revision: number; expiresAt: Timestamp; updatedAt: Timestamp;
}
const functions = getFunctions(app, 'europe-west1');
async function invoke<T>(name: string, data: object = {}): Promise<T> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const result = await httpsCallable<object, T>(functions, name)(data);
  if (auth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  return result.data;
}
export const battleRequestId = () => `battle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const familyOpponents = () => invoke<FamilyOpponent[]>('listFamilyOpponents');
export const challengeFamily = (opponentUid: string, fighter: string, requestId: string) => invoke<{ id: string }>('createFamilyBattle', { opponentUid, fighter, requestId });
export const respondToBattle = (battleId: string, accept: boolean, fighter: string) => invoke('respondFamilyBattle', { battleId, accept, fighter });
export const sendBattleMove = (battleId: string, move: DuelMove, expectedTurn: number, requestId: string) => invoke('playFamilyBattleMove', { battleId, move, expectedTurn, requestId });
export const leaveBattle = (battleId: string) => invoke('leaveFamilyBattle', { battleId });
export function watchFamilyBattles(uid: string, update: (rooms: FamilyBattle[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'battles'), where('participants', 'array-contains', uid), orderBy('updatedAt', 'desc'), limit(30)), snapshot => {
    if (auth.currentUser?.uid !== uid) return;
    update(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as FamilyBattle))
      .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()));
  }, fail);
}
export function watchFamilyBattle(id: string, update: (room: FamilyBattle | null) => void, fail: (error: Error) => void) {
  const uid = auth.currentUser?.uid;
  return onSnapshot(doc(db, 'battles', id), snapshot => {
    if (auth.currentUser?.uid !== uid) return;
    update(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as FamilyBattle : null);
  }, fail);
}
export function battleErrorKey(error: unknown) {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message;
  if (message === 'NOT_YOUR_TURN') return 'online_turn_changed';
  if (message === 'BATTLE_EXPIRED') return 'online_expired';
  if (message === 'FAMILY_REQUIRED') return 'online_family_required';
  if (code === 'functions/resource-exhausted') return 'online_limit';
  if (code === 'functions/unauthenticated' || message === 'AUTH_REQUIRED') return 'online_sign_in';
  return 'online_error';
}
