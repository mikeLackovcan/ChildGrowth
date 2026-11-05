import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import storage from './projectStorage';

export interface AccountIdentity {
  role: 'parent' | 'child';
  nickname?: string;
  fullName?: string;
}

export async function loadAccountIdentity(uid: string): Promise<AccountIdentity> {
  const stillCurrent = () => auth.currentUser?.uid === uid && !auth.currentUser?.isAnonymous;
  if (!stillCurrent()) throw new Error('pair_session_changed');
  let role: 'parent' | 'child' = 'parent';
  let nickname: string | undefined;
  let fullName: string | undefined;
  // Cache by UID, never nickname: the same nickname can belong to another account.
  try {
    const cached = await storage.getItem(`account_role_${uid}`);
    if (cached === 'parent' || cached === 'child') role = cached;
  } catch { /* Cloud lookup can still recover the role. */ }
  try {
    const profile = await getDoc(doc(db, 'profiles', uid));
    const data = profile.exists() ? profile.data() : null;
    const saved = data?.role;
    if (saved === 'parent' || saved === 'child') role = saved;
    if (typeof data?.nickname === 'string' && data.nickname.trim()) nickname = data.nickname.trim();
    if (typeof data?.full_name === 'string' && data.full_name.trim()) fullName = data.full_name.trim();
  } catch { /* Retain the UID-scoped offline cache. */ }
  if (!stillCurrent()) throw new Error('pair_session_changed');
  await storage.setItem(`account_role_${uid}`, role);
  if (!stillCurrent()) throw new Error('pair_session_changed');
  return { role, nickname, fullName };
}

export async function loadAccountRole(uid: string): Promise<'parent' | 'child'> {
  return (await loadAccountIdentity(uid)).role;
}
