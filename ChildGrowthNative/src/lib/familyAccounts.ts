import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';

// Membership and consent are server-owned. Never grant access by writing
// linked_parents or a child's isApproved flag from a client device.
export async function familyAction(otherTag: string, action: 'invite' | 'accept' | 'decline' | 'unlink') {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const call = httpsCallable(getFunctions(app, 'europe-west1'), 'manageFamily');
  const response = await call(action === 'invite' ? { connectionCode: otherTag, action } : { otherTag, action });
  if (auth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  return (response.data as { status?: string }).status;
}

export async function readChildConnectionCode() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const response = await httpsCallable<{}, { connection_code: string | null }>(getFunctions(app, 'europe-west1'), 'getFamilyStatus')({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (auth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  if (!response.data.connection_code) throw new Error('CHILD_ACCOUNT_REQUIRED');
  return response.data.connection_code;
}

export async function readFamilyStatus() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const response = await httpsCallable<{}, { familyChallenge?: { day: string; total: number; done: number; members: number } | null; children: import('../types/progress').ChildProfile[]; linked_parents: string[]; parent_email: string | null; connection_code: string | null; approval_status: 'approved' | 'pending' | null; pending_invitation: { name: string; nickname: string; sentByMe: boolean } | null; familyReconnectTags: string[] }>(getFunctions(app, 'europe-west1'), 'getFamilyStatus')({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (auth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  return { ...response.data, familyVerifiedUid: uid };
}
