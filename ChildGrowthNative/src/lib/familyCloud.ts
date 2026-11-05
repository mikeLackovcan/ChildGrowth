import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { auth, db } from './firebase';
import { deleteManagedFamily, getDeviceLink, listManagedChildren } from './devicePairing';

export type CloudRole = 'parent' | 'child';

export interface CloudProfile {
  managed?: boolean;
  managedOwner?: boolean;
  uid: string;
  nickname: string;
  full_name: string;
  role: CloudRole;
}

export interface FamilyInvite {
  id: string;
  child_uid: string;
  parent_uid: string;
  child_nickname: string;
  parent_nickname: string;
  participant_uids: string[];
  created_by: string;
  status: 'pending' | 'approved' | 'denied';
}

function cleanNickname(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '');
}

function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to connect family accounts.');
  return uid;
}

export async function findProfileByNickname(nickname: string): Promise<CloudProfile | null> {
  const clean = cleanNickname(nickname);
  if (!clean) return null;
  const result = await getDocs(query(collection(db, 'profiles'), where('nickname', '==', clean)));
  if (result.empty) return null;
  const snapshot = result.docs[0];
  return { uid: snapshot.id, ...(snapshot.data() as Omit<CloudProfile, 'uid'>) };
}

export async function saveCloudProfile(input: Omit<CloudProfile, 'uid'>): Promise<void> {
  if (auth.currentUser?.isAnonymous) return;
  const uid = currentUid();
  await setDoc(doc(db, 'profiles', uid), {
    nickname: cleanNickname(input.nickname),
    full_name: input.full_name,
    role: input.role,
    updated_at: serverTimestamp(),
  }, { merge: true });
}

export async function saveOwnCloudData(data: Record<string, unknown>, expectedChildUid?: string): Promise<void> {
  const uid = currentUid();
  const link = await getDeviceLink();
  if (auth.currentUser?.uid !== uid) throw new Error('pair_session_changed');
  if (auth.currentUser?.isAnonymous && !link) throw new Error('pair_not_connected');
  if (expectedChildUid && link?.child_uid !== expectedChildUid) throw new Error('pair_session_changed');
  await setDoc(doc(db, link ? 'family_progress' : 'user_data', link?.child_uid || uid), {
    ...data,
    owner_uid: link?.child_uid || uid,
    updated_at: serverTimestamp(),
  }, { merge: true });
}

export async function saveLinkedChildData(childUid: string, data: Record<string, unknown>, managed = false): Promise<void> {
  await setDoc(doc(db, managed ? 'family_progress' : 'user_data', childUid), {
    ...data,
    updated_at: serverTimestamp(),
  }, { merge: true });
}

export async function loadOwnCloudData(expectedChildUid?: string): Promise<Record<string, any> | null> {
  const uid = currentUid();
  const link = await getDeviceLink();
  if (auth.currentUser?.uid !== uid) throw new Error('pair_session_changed');
  if (auth.currentUser?.isAnonymous && !link) throw new Error('pair_not_connected');
  if (expectedChildUid && link?.child_uid !== expectedChildUid) throw new Error('pair_session_changed');
  const snapshot = await getDoc(doc(db, link ? 'family_progress' : 'user_data', link?.child_uid || uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function createFamilyInvite(targetNickname: string, ownRole: CloudRole): Promise<FamilyInvite> {
  const uid = currentUid();
  const target = await findProfileByNickname(targetNickname);
  if (!target) throw new Error('family_account_not_found');
  if (target.uid === uid) throw new Error('family_same_account');
  if (target.role === ownRole) throw new Error('family_wrong_role');

  const ownProfileSnapshot = await getDoc(doc(db, 'profiles', uid));
  if (!ownProfileSnapshot.exists()) throw new Error('family_profile_not_ready');
  const own = ownProfileSnapshot.data() as Omit<CloudProfile, 'uid'>;
  const childUid = ownRole === 'child' ? uid : target.uid;
  const parentUid = ownRole === 'parent' ? uid : target.uid;
  const childNickname = ownRole === 'child' ? own.nickname : target.nickname;
  const parentNickname = ownRole === 'parent' ? own.nickname : target.nickname;
  const invite: FamilyInvite = {
    id: `${childUid}_${parentUid}`,
    child_uid: childUid,
    parent_uid: parentUid,
    child_nickname: childNickname,
    parent_nickname: parentNickname,
    participant_uids: [childUid, parentUid],
    created_by: uid,
    status: 'pending',
  };
  const inviteRef = doc(db, 'family_invites', invite.id);
  const existingInvite = await getDoc(inviteRef);
  if (existingInvite.exists()) await deleteDoc(inviteRef);
  await setDoc(inviteRef, {
    ...invite,
    updated_at: serverTimestamp(),
  }, { merge: true });
  return invite;
}

export async function listFamilyInvites(): Promise<FamilyInvite[]> {
  if (auth.currentUser?.isAnonymous) return [];
  const uid = currentUid();
  const snapshots = await getDocs(query(collection(db, 'family_invites'), where('participant_uids', 'array-contains', uid)));
  return snapshots.docs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<FamilyInvite, 'id'>) }));
}

export async function answerFamilyInvite(inviteId: string, approved: boolean): Promise<FamilyInvite> {
  const uid = currentUid();
  const inviteRef = doc(db, 'family_invites', inviteId);
  const inviteSnapshot = await getDoc(inviteRef);
  if (!inviteSnapshot.exists()) throw new Error('This family invite no longer exists.');
  const invite = { id: inviteSnapshot.id, ...(inviteSnapshot.data() as Omit<FamilyInvite, 'id'>) };
  if (!invite.participant_uids.includes(uid)) throw new Error('This invite belongs to another family.');

  const status = approved ? 'approved' : 'denied';
  await updateDoc(inviteRef, { status, answered_by: uid, updated_at: serverTimestamp() });
  if (approved) {
    await setDoc(doc(db, 'user_data', invite.child_uid), {
      linked_parent_uids: arrayUnion(invite.parent_uid),
      linked_parent_nicknames: arrayUnion(invite.parent_nickname),
      updated_at: serverTimestamp(),
    }, { merge: true });
  }
  return { ...invite, status };
}

export async function unlinkFamily(childUid: string, parentUid: string, parentNickname: string): Promise<void> {
  const uid = currentUid();
  if (uid !== childUid && uid !== parentUid) throw new Error('This family link belongs to another account.');
  await setDoc(doc(db, 'user_data', childUid), {
    linked_parent_uids: arrayRemove(parentUid),
    linked_parent_nicknames: arrayRemove(cleanNickname(parentNickname)),
    updated_at: serverTimestamp(),
  }, { merge: true });
  const inviteRef = doc(db, 'family_invites', `${childUid}_${parentUid}`);
  const invite = await getDoc(inviteRef);
  if (invite.exists()) {
    await updateDoc(inviteRef, { status: 'denied', answered_by: uid, updated_at: serverTimestamp() });
  }
}

export async function loadLinkedChildren(): Promise<Array<{ profile: CloudProfile; data: Record<string, any> }>> {
  const uid = currentUid();
  const inviteSnapshots = await getDocs(query(
    collection(db, 'family_invites'),
    where('participant_uids', 'array-contains', uid),
  ));
  const childUids = Array.from(new Set(inviteSnapshots.docs
    .map((snapshot) => snapshot.data() as Omit<FamilyInvite, 'id'>)
    .filter((invite) => invite.parent_uid === uid && invite.status === 'approved')
    .map((invite) => invite.child_uid)));
  const rows = await Promise.all(childUids.map(async (uid) => {
    const [profileSnapshot, dataSnapshot] = await Promise.all([
      getDoc(doc(db, 'profiles', uid)),
      getDoc(doc(db, 'user_data', uid)),
    ]);
    if (!profileSnapshot.exists() || !dataSnapshot.exists()) return null;
    return {
      profile: { uid, ...(profileSnapshot.data() as Omit<CloudProfile, 'uid'>) },
      data: dataSnapshot.data(),
    };
  }));
  const legacy = rows.filter((row): row is { profile: CloudProfile; data: Record<string, any> } => Boolean(row));
  const own = await getDoc(doc(db, 'user_data', uid));
  if (!own.data()?.managed_family_enabled) return legacy;
  const managed = await listManagedChildren();
  return [...legacy, ...managed.map(row => ({
    ...row,
    profile: { ...row.profile, managed: true, managedOwner: row.profile.owner === true },
  }))];
}

/**
 * Permanently removes the signed-in user's Quest Champ cloud data and
 * Firebase Authentication account. Firestore documents are deleted first so
 * the user's security-rule authorization is still available for cleanup.
 */
export async function deleteOwnCloudAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again before deleting this account.');
  const uid = user.uid;
  const ownData = await getDoc(doc(db, 'user_data', uid));
  if (ownData.data()?.managed_family_enabled) await deleteManagedFamily();
  const inviteSnapshots = await getDocs(query(
    collection(db, 'family_invites'),
    where('participant_uids', 'array-contains', uid),
  ));
  await Promise.all([
    ...inviteSnapshots.docs.map((snapshot) => deleteDoc(snapshot.ref)),
    deleteDoc(doc(db, 'profiles', uid)),
    deleteDoc(doc(db, 'user_data', uid)),
  ]);
  await deleteUser(user);
}
