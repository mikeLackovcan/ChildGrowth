import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC5pl38R71Oyp1fzDhbYCcWbReNJzAyqHQ",
  authDomain: "quest-hero-dab6b.firebaseapp.com",
  projectId: "quest-hero-dab6b",
  storageBucket: "quest-hero-dab6b.firebasestorage.app",
  messagingSenderId: "814466475791",
  appId: "1:814466475791:web:4ddfdaa0132bc34a9a407a"
};

// A named app prevents Fast Refresh from retaining QuestBlox's default backend.
const app: FirebaseApp = getApps().some(existing => existing.name === firebaseConfig.projectId)
  ? getApp(firebaseConfig.projectId)
  : initializeApp(firebaseConfig, firebaseConfig.projectId);

let auth: Auth;
try {
  // initializeAuth must run before getAuth so React Native persistence is registered.
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Fast Refresh or a second import can mean Auth already exists for this app.
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
