import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import storage from './projectStorage';

export async function loadAccountRole(uid: string): Promise<'parent' | 'child'> {
  const stillCurrent = () => auth.currentUser?.uid === uid && !auth.currentUser?.isAnonymous;
  if (!stillCurrent()) throw new Error('pair_session_changed');
  let role: 'parent' | 'child' = 'parent';
  // Cache by UID, never nickname: the same nickname can belong to another account.
  try {
    const cached = await storage.getItem(`account_role_${uid}`);
    if (cached === 'parent' || cached === 'child') role = cached;
  } catch { /* Cloud lookup can still recover the role. */ }
  try {
    const profile = await getDoc(doc(db, 'profiles', uid));
    const saved = profile.exists() ? profile.data().role : null;
    if (saved === 'parent' || saved === 'child') role = saved;
  } catch { /* Retain the UID-scoped offline cache. */ }
  if (!stillCurrent()) throw new Error('pair_session_changed');
  await storage.setItem(`account_role_${uid}`, role);
  if (!stillCurrent()) throw new Error('pair_session_changed');
  return role;
}
