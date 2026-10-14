import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCffkIqBs-D67W-mL_7cTKR0W2L1tAUPhg",
  authDomain: "questblox-10c14.firebaseapp.com",
  projectId: "questblox-10c14",
  storageBucket: "questblox-10c14.firebasestorage.app",
  messagingSenderId: "35992182600",
  appId: "1:35992182600:web:63ccce0b2653a3450d9d7d",
  measurementId: "G-XLE1BS1JLN"
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

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
