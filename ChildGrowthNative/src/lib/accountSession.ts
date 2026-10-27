import { readFamilyStatus } from './familyAccounts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCloudState, hasSavedCloudEdits } from './cloudState';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';
import { hasQueuedProgress } from './progressQueue';
import { restoredAccount } from '../utils/accountState';

export async function accountDocumentId(tag: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const result = await httpsCallable<{ tag: string }, { uid: string }>(getFunctions(app, 'europe-west1'), 'resolveFamilyAccount')({ tag });
  if (auth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  return result.data.uid;
}

export async function restoreAuthenticatedAccount(user: { uid: string; email: string | null; displayName: string | null }, role: 'child' | 'parent' = 'child', nickname?: string) {
  const checkAccount = () => { if (auth.currentUser?.uid !== user.uid) throw new Error('ACCOUNT_CHANGED'); };
  checkAccount();
  let profileSnap = await readCloudState('profiles', user.uid);
  if (!profileSnap.exists()) {
    await httpsCallable(getFunctions(app, 'europe-west1'), 'initializeAccount')({ role, ...(nickname ? { nickname } : {}), fullName: user.displayName || '' });
    profileSnap = await readCloudState('profiles', user.uid);
    if (!profileSnap.exists()) throw new Error('ACCOUNT_INITIALIZATION_FAILED');
  }
  let profile = profileSnap.data() || {};
  if (typeof profile.nickname === 'string') {
    const refreshed = await httpsCallable<{}, { nickname: string }>(getFunctions(app, 'europe-west1'), 'updateNickname')({});
    if (refreshed.data.nickname !== profile.nickname) {
    profileSnap = await readCloudState('profiles', user.uid);
    profile = profileSnap.data() || profile;
    }
  }
  const email = user.email || '';
  const chosenNick = profile.nickname;
  let dataSnap = await readCloudState('user_data', user.uid);
  if (!dataSnap.exists()) {
    await httpsCallable(getFunctions(app, 'europe-west1'), 'recoverLegacyProgress')({});
    dataSnap = await readCloudState('user_data', user.uid);
  }
  const family = await readFamilyStatus();
  const data = { ...(dataSnap.data() || {}), ...family };
  // An authenticated account may have offline progress waiting to sync. Keep it
  // separate from other accounts and retry against its original cloud baseline.
  if (await hasSavedCloudEdits(user.uid) || await hasQueuedProgress(user.uid)) {
    const raw = await AsyncStorage.getItem(`mockState_${chosenNick}`);
    const local = raw ? JSON.parse(raw) : null;
    if (local?.userId === user.uid) {
      checkAccount();
      return restoredAccount({ ...profile, coins: local.coins, xp: local.xp, level: local.level, current_avatar: local.currentAvatar },
        { ...local, won_prizes: local.wonPrizes, unlocked_avatars: local.unlockedAvatars, ...family },
        { uid: user.uid, email, name: user.displayName || chosenNick, nickname: chosenNick, role });
    }
  }
  const restored = restoredAccount(profile, data, { uid: user.uid, email, name: user.displayName || chosenNick, nickname: chosenNick, role });
  checkAccount();
  return restored;
}
