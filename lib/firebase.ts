import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = !!firebaseConfig.apiKey;

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getClientAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getClientDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export function getClientStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getApp());
  return _storage;
}
