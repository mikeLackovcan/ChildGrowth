import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';

export async function changeAccountNickname(nickname: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const call = httpsCallable<{ nickname: string }, { nickname: string }>(getFunctions(app, 'europe-west1'), 'updateNickname');
  const result = await call({ nickname });
  if (auth.currentUser?.uid !== uid) throw new Error('ACCOUNT_CHANGED');
  return result.data.nickname;
}
