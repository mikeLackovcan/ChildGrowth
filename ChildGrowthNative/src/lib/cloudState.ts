import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

// Legacy snapshot backups are retained for explicit recovery, never uploaded as
// authoritative balances. All new writes go through applyProgress callables.
export async function hasSavedCloudEdits(id: string) {
  const entries = await Promise.all(['profiles', 'user_data'].map(collection => AsyncStorage.getItem(`pending-cloud:${collection}/${id}`)));
  return entries.some(Boolean) || !!await AsyncStorage.getItem(`pending-family:${id}`);
}
export async function readCloudState(collection: string, id: string) {
  const ref = doc(db, collection, id);
  try {
    // Parent actions are often made on another signed-in phone. Force a server
    // read first so a child never boots from Firestore's older account cache.
    return await getDocFromServer(ref);
  } catch {
    return getDoc(ref);
  }
}
