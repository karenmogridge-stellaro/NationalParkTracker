import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// firebase/auth's .d.ts targets the browser build; Metro resolves the RN build, which does export this.
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function missingFirebaseConfigKeys(): string[] {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missing.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missing.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.storageBucket) missing.push('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!firebaseConfig.messagingSenderId) missing.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseConfig.appId) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  return missing;
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// initializeAuth throws if called twice (Fast Refresh), so fall back to the existing instance.
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}
export const auth: Auth = createAuth();