import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBO1MM4BuAqeORW3o9tG4EMS7lEyrQHviQ",
  authDomain: "questblox-10c14.firebaseapp.com",
  projectId: "questblox-10c14",
  storageBucket: "questblox-10c14.firebasestorage.app",
  messagingSenderId: "35992182600",
  appId: "1:35992182600:web:63ccce0b2653a3450d9d7d",
  measurementId: "G-XLE1BS1JLN"
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let auth: Auth;
// React Native requires using initializeAuth with getReactNativePersistence
if (!getApps().length || !getAuth(app)) {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
