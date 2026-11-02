import { signInAnonymously } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, where, writeBatch } from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import { auth, db } from './firebase';
import storage from './projectStorage';
import { importGuestProgress } from './familyProgress';
import { reconnectProgress } from './reconnectProgress';

export interface ManagedChild {
  owner?: boolean;
  uid: string;
  parent_uid: string;
  nickname: string;
  full_name: string;
  role: 'child';
}
export interface DeviceLink { parent_uid: string; child_uid: string; code: string }
export interface ManagedGuardian { child_uid: string; parent_uid: string; parent_name: string; code: string; status: 'active' }

function parentUid(): string {
  if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error('pair_parent_required');
  return auth.currentUser.uid;
}

async function randomFamilyCode(): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = await Crypto.getRandomBytesAsync(12);
  return [...bytes].map(byte => alphabet[byte % 32]).join('');
}

export async function createManagedChild(name: string, heroId: string): Promise<ManagedChild> {
  const parent = parentUid();
  const clean = name.trim().slice(0, 30);
  if (!clean) throw new Error('pair_name_required');
  const baseNickname = clean.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18) || 'champ';
  const siblings = await getDocs(query(collection(db, 'family_children'), where('parent_uid', '==', parent)));
  const used = new Set(siblings.docs.map(snapshot => String(snapshot.data().nickname || '').toLowerCase()));
  let nickname = baseNickname;
  for (let suffix = 2; used.has(nickname); suffix += 1) nickname = `${baseNickname.slice(0, 15)}-${suffix}`;
  const ref = doc(collection(db, 'family_children'));
  const profile: ManagedChild = { uid: ref.id, parent_uid: parent, nickname, full_name: clean, role: 'child' };
  const batch = writeBatch(db);
  batch.set(ref, profile);
  batch.set(doc(db, 'family_progress', ref.id), {
    tasks: [], coins: 0, total_earned: 0, xp: 0, level: 1,
    current_avatar: heroId, starter_avatar: heroId, unlocked_avatars: ['default', heroId], won_prizes: [],
    updated_at: serverTimestamp(),
  });
  batch.set(doc(db, 'user_data', parent), { managed_family_enabled: true }, { merge: true });
  await batch.commit();
  return profile;
}

export async function listManagedChildren(): Promise<{ profile: ManagedChild; data: Record<string, any> }[]> {
  const parent = parentUid();
  const [owned, shared] = await Promise.all([
    getDocs(query(collection(db, 'family_children'), where('parent_uid', '==', parent))),
    getDocs(query(collection(db, 'family_guardians'), where('parent_uid', '==', parent), where('status', '==', 'active'))),
  ]);
  const childIds = Array.from(new Set([...owned.docs.map(row => row.id), ...shared.docs.map(row => String(row.data().child_uid))]));
  const rows = await Promise.all(childIds.map(async childUid => {
    const [profile, data] = await Promise.all([
      getDoc(doc(db, 'family_children', childUid)),
      getDoc(doc(db, 'family_progress', childUid)),
    ]);
    return profile.exists() ? {
      profile: { ...(profile.data() as ManagedChild), owner: profile.data().parent_uid === parent },
      data: data.data() || {},
    } : null;
  }));
  return rows.flatMap(row => row ? [{
    profile: row.profile as ManagedChild,
    data: row.data as Record<string, any>,
  }] : []);
}

export async function createPairingCode(childUid: string): Promise<string> {
  const parent = parentUid();
  const child = await getDoc(doc(db, 'family_children', childUid));
  if (!child.exists() || child.data().parent_uid !== parent) throw new Error('pair_child_missing');
  // Twelve base32 characters provide 60 bits of random code space; not enumerable.
  const code = await randomFamilyCode();
  await setDoc(doc(db, 'family_codes', code), {
    child_uid: childUid, parent_uid: parent,
    expires_at: Timestamp.fromMillis(Date.now() + 15 * 60_000), claimed_by: '',
  });
  return code.match(/.{1,4}/g)!.join('-');
}

/** A trusted linked child device creates a short-lived invitation for one additional parent. */
export async function createGuardianCode(): Promise<string> {
  const link = await getDeviceLink();
  if (!auth.currentUser?.isAnonymous || !link) throw new Error('pair_use_child_device');
  const code = await randomFamilyCode();
  await setDoc(doc(db, 'family_guardian_codes', code), {
    child_uid: link.child_uid,
    device_uid: auth.currentUser.uid,
    expires_at: Timestamp.fromMillis(Date.now() + 15 * 60_000),
    claimed_by: '',
  });
  return code.match(/.{1,4}/g)!.join('-');
}

/** A signed-in parent claims a child-generated one-use invitation. */
export async function claimGuardianCode(rawCode: string): Promise<string> {
  const parent = parentUid();
  const code = rawCode.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw new Error('pair_invalid_code');
  const profile = await getDoc(doc(db, 'profiles', parent));
  const parentName = String(profile.data()?.full_name || profile.data()?.nickname || 'Parent').slice(0, 30);
  const ticketRef = doc(db, 'family_guardian_codes', code);
  const childUid = await runTransaction(db, async transaction => {
    const ticket = await transaction.get(ticketRef);
    if (!ticket.exists()) throw new Error('pair_invalid_code');
    const data = ticket.data();
    if (data.claimed_by || data.expires_at.toMillis() <= Date.now()) throw new Error('pair_expired_code');
    const guardianRef = doc(db, 'family_guardians', `${data.child_uid}_${parent}`);
    const existingGuardian = await transaction.get(guardianRef);
    if (existingGuardian.exists()) throw new Error('pair_already_connected');
    transaction.update(ticketRef, { claimed_by: parent });
    transaction.set(guardianRef, {
      child_uid: data.child_uid, parent_uid: parent, parent_name: parentName,
      code, status: 'active', created_at: serverTimestamp(),
    });
    transaction.set(doc(db, 'user_data', parent), { managed_family_enabled: true }, { merge: true });
    return String(data.child_uid);
  });
  return childUid;
}

export async function listManagedGuardians(childUid: string): Promise<ManagedGuardian[]> {
  const link = await getDeviceLink();
  if (!link || link.child_uid !== childUid) return [];
  const rows = await getDocs(query(collection(db, 'family_guardians'), where('child_uid', '==', childUid), where('status', '==', 'active')));
  const primary = await getDoc(doc(db, 'family_children', childUid));
  const ownerUid = String(primary.data()?.parent_uid || '');
  const ownerName = String(primary.data()?.parent_name || 'Parent');
  const guardians = rows.docs.map(row => row.data() as ManagedGuardian);
  if (ownerUid && !guardians.some(item => item.parent_uid === ownerUid)) {
    guardians.unshift({ child_uid: childUid, parent_uid: ownerUid, parent_name: ownerName, code: '', status: 'active' });
  }
  return guardians;
}

/** Revoke every old device for one child before recovering the profile on a new phone. */
export async function replaceChildDevice(childUid: string): Promise<string> {
  const parent = parentUid();
  const child = await getDoc(doc(db, 'family_children', childUid));
  if (!child.exists() || child.data().parent_uid !== parent) throw new Error('pair_child_missing');
  for (const name of ['family_devices', 'family_codes']) {
    const snapshots = await getDocs(query(collection(db, name), where('parent_uid', '==', parent)));
    const batch = writeBatch(db);
    let changed = false;
    for (const snapshot of snapshots.docs) {
      if (snapshot.data().child_uid === childUid) {
        batch.delete(snapshot.ref);
        changed = true;
      }
    }
    if (changed) await batch.commit();
  }
  return createPairingCode(childUid);
}

export async function getDeviceLink(): Promise<DeviceLink | null> {
  if (!auth.currentUser?.isAnonymous) return null;
  const snapshot = await getDoc(doc(db, 'family_devices', auth.currentUser.uid));
  return snapshot.exists() ? snapshot.data() as DeviceLink : null;
}

/** Release an unfinished pairing without deleting either child's progress. */
export async function releaseDeviceLink(): Promise<void> {
  if (!auth.currentUser?.isAnonymous) throw new Error('pair_use_child_device');
  await deleteDoc(doc(db, 'family_devices', auth.currentUser.uid));
}

/** Revoke child-device access before removing profiles; keep the parent identity until cleanup succeeds. */
export async function deleteManagedChild(childUid: string): Promise<void> {
  const parent = parentUid();
  const child = await getDoc(doc(db, 'family_children', childUid));
  if (!child.exists() || child.data().parent_uid !== parent) throw new Error('pair_child_missing');
  for (const name of ['family_devices', 'family_codes']) {
    const snapshots = await getDocs(query(collection(db, name), where('parent_uid', '==', parent)));
    for (const snapshot of snapshots.docs) {
      if (snapshot.data().child_uid === childUid) await deleteDoc(snapshot.ref);
    }
  }
  for (const name of ['family_guardian_codes', 'family_guardians']) {
    const snapshots = await getDocs(query(collection(db, name), where('child_uid', '==', childUid)));
    for (const snapshot of snapshots.docs) await deleteDoc(snapshot.ref);
  }
  // Atomic deletion closes the window in which a concurrent save could recreate progress.
  const batch = writeBatch(db);
  batch.delete(doc(db, 'family_progress', childUid));
  batch.delete(child.ref);
  await batch.commit();
}

/** Remove all managed family records before deleting the parent account. */
export async function deleteManagedFamily(): Promise<void> {
  const parent = parentUid();
  const guardianLinks = await getDocs(query(collection(db, 'family_guardians'), where('parent_uid', '==', parent)));
  for (const link of guardianLinks.docs) await deleteDoc(link.ref);
  for (const name of ['family_devices', 'family_codes']) {
    const snapshots = await getDocs(query(collection(db, name), where('parent_uid', '==', parent)));
    for (const snapshot of snapshots.docs) await deleteDoc(snapshot.ref);
  }
  const children = await getDocs(query(collection(db, 'family_children'), where('parent_uid', '==', parent)));
  for (const child of children.docs) {
    const guardianCodes = await getDocs(query(collection(db, 'family_guardian_codes'), where('child_uid', '==', child.id)));
    for (const code of guardianCodes.docs) await deleteDoc(code.ref);
    const guardians = await getDocs(query(collection(db, 'family_guardians'), where('child_uid', '==', child.id)));
    for (const guardian of guardians.docs) await deleteDoc(guardian.ref);
    // The child's profile supplies ownership authorization for progress deletion.
    await deleteDoc(doc(db, 'family_progress', child.id));
    await deleteDoc(child.ref);
  }
}

export async function pairDevice(rawCode: string, guest: Record<string, any>, resume?: {
  childUid: string; baseline: Record<string, any> | null;
}): Promise<{ profile: ManagedChild; data: Record<string, any> }> {
  const code = rawCode.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw new Error('pair_invalid_code');
  await auth.authStateReady();
  if (auth.currentUser && !auth.currentUser.isAnonymous) throw new Error('pair_use_child_device');
  // This device identity has no email/password and only gains access via a parent's code.
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  let importId = await storage.getItem('guest_import_id');
  if (!importId) {
    importId = Crypto.randomUUID();
    await storage.setItem('guest_import_id', importId);
  }
  await storage.setItem('guest_pairing_backup', JSON.stringify(guest));
  const codeRef = doc(db, 'family_codes', code);
  const deviceRef = doc(db, 'family_devices', user.uid);
  const link = await runTransaction(db, async transaction => {
    const existing = await transaction.get(deviceRef);
    if (existing.exists()) {
      if (existing.data().code !== code) throw new Error('pair_already_connected');
      return existing.data() as DeviceLink;
    }
    const ticket = await transaction.get(codeRef);
    if (!ticket.exists()) throw new Error('pair_invalid_code');
    const data = ticket.data();
    if (data.claimed_by || data.expires_at.toMillis() <= Date.now()) throw new Error('pair_expired_code');
    const binding: DeviceLink = { parent_uid: data.parent_uid, child_uid: data.child_uid, code };
    transaction.update(codeRef, { claimed_by: user.uid });
    transaction.set(deviceRef, binding);
    return binding;
  });
  const progressRef = doc(db, 'family_progress', link.child_uid);
  const data = await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(progressRef);
    const cloud = snapshot.data() || {};
    if (resume?.childUid === link.child_uid && !resume.baseline) throw new Error('pair_progress_conflict');
    const result = resume?.childUid === link.child_uid
      ? reconnectProgress(resume.baseline!, cloud, guest)
      : importGuestProgress(cloud, guest, importId!);
    transaction.set(progressRef, { ...result, updated_at: serverTimestamp() }, { merge: true });
    return result;
  });
  const profile = await getDoc(doc(db, 'family_children', link.child_uid));
  if (!profile.exists()) throw new Error('pair_child_missing');
  return { profile: profile.data() as ManagedChild, data };
}
