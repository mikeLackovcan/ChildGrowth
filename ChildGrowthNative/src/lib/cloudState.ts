import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Legacy snapshot backups are retained for explicit recovery, never uploaded as
// authoritative balances. All new writes go through applyProgress callables.
export async function hasSavedCloudEdits(id: string) {
  const entries = await Promise.all(['profiles', 'user_data'].map(collection => AsyncStorage.getItem(`pending-cloud:${collection}/${id}`)));
  return entries.some(Boolean) || !!await AsyncStorage.getItem(`pending-family:${id}`);
}
export async function readCloudState(collection: string, id: string) {
  return getDoc(doc(db, collection, id));
}
