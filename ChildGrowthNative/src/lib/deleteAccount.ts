import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { app, auth } from './firebase';
import { useAppStore } from '../store/useAppStore';
import { useReminderStore } from '../store/useReminderStore';
import { useFighterGoal } from '../store/useFighterGoal';
import { reminderAccount, syncQuestReminders } from './notifications';
import { discardDeletedAccountQueue } from './progressQueue';

export async function requestOwnAccountDeletion() {
  const user = auth.currentUser, state = useAppStore.getState();
  if (!user || user.uid !== state.userId) throw Error('AUTH_REQUIRED');
  const uid = user.uid, account = reminderAccount(), nickname = state.nickname;
  await httpsCallable(getFunctions(app, 'europe-west1'), 'requestAccountDeletion')({ confirmed: true });
  // Do not call logout(): it intentionally backs up account progress for normal sign-out.
  useAppStore.setState({ ...useAppStore.getInitialState(), language: state.language });
  await signOut(auth);
  await discardDeletedAccountQueue(uid);
  const keys = await AsyncStorage.getAllKeys();
  const ownKeys = keys.filter(key => key.endsWith(`:${uid}`) || key === `pending-cloud:profiles/${uid}` || key === `pending-cloud:user_data/${uid}` || key === `pending-family:${uid}` || key === `mockState_${nickname}` || key === 'mockState' || key === 'active_user_tag');
  await AsyncStorage.multiRemove(ownKeys);
  useReminderStore.setState(current => { const accounts = { ...current.accounts }; delete accounts[account]; return { accounts }; });
  useFighterGoal.setState(current => { const goals = { ...current.goals }; delete goals[uid]; return { goals }; });
  await syncQuestReminders();
}
