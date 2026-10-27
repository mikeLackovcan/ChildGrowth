import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';

export interface LegacyProgressBackup {
  savedAt: string;
  userId: string;
  local: Record<string, any>;
  pending: Record<string, string>;
}
const key = (uid: string) => `questblox-legacy-progress-backup:${uid}`;
const markers = (uid: string) => [`pending-cloud:profiles/${uid}`, `pending-cloud:user_data/${uid}`, `pending-family:${uid}`];
const check = (uid: string) => { if (auth.currentUser?.uid !== uid) throw Error('ACCOUNT_CHANGED'); };
let queue: Promise<unknown> = Promise.resolve();
export async function readLegacyBackups(uid: string): Promise<LegacyProgressBackup[]> {
  check(uid);
  const raw = await AsyncStorage.getItem(key(uid));
  check(uid);
  const backups = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(backups)) throw Error('INVALID_RECOVERY_BACKUP');
  return backups;
}

// Called only from the user's explicit "keep backup and use cloud save" action.
// Save the exact old fields before releasing the legacy synchronization block.
export function preserveLegacySave(uid: string, local: Record<string, any>) {
  const snapshot = JSON.parse(JSON.stringify(local));
  if (snapshot.userId !== uid) return Promise.reject(Error('ACCOUNT_CHANGED'));
  const work = queue.catch(() => {}).then(async () => {
    check(uid);
    const pending: Record<string, string> = {};
    for (const marker of markers(uid)) {
      const value = await AsyncStorage.getItem(marker);
      if (value !== null) pending[marker] = value;
    }
    if (!Object.keys(pending).length) return;
    const backups = await readLegacyBackups(uid);
    check(uid);
    await AsyncStorage.setItem(key(uid), JSON.stringify([...backups, { userId: uid, local: snapshot, pending, savedAt: new Date().toISOString() }]));
    for (const [marker, saved] of Object.entries(pending)) {
      check(uid);
      if (await AsyncStorage.getItem(marker) !== saved) throw Error('LEGACY_SAVE_CHANGED');
      await AsyncStorage.removeItem(marker);
    }
  });
  queue = work;
  return work;
}

// Preserve historical family snapshots before hiding unverified memberships at
// startup. This never releases pending progress markers or changes cloud data.
export function preserveFamilyCache(uid: string, local: Record<string, any>) {
  const snapshot = JSON.parse(JSON.stringify(local));
  if (snapshot.userId !== uid) return Promise.reject(Error('ACCOUNT_CHANGED'));
  const work = queue.catch(() => {}).then(async () => {
    check(uid);
    const backups = await readLegacyBackups(uid);
    if (backups.some(backup => backup.pending.familyVerification === uid)) return;
    check(uid);
    await AsyncStorage.setItem(key(uid), JSON.stringify([...backups, {
      userId: uid, local: snapshot, pending: { familyVerification: uid }, savedAt: new Date().toISOString(),
    }]));
    check(uid);
  });
  queue = work;
  return work;
}
