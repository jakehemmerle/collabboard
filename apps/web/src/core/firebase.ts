import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getDatabase,
  connectDatabaseEmulator,
  type Database,
} from 'firebase/database';
import type { AppEnv } from './module-system.ts';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;

export function initFirebase(env: AppEnv): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  rtdb: Database;
} {
  if (app) return { app, auth: auth!, db: db!, rtdb: rtdb! };

  app = initializeApp({
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    projectId: env.firebaseProjectId,
    databaseURL: env.firebaseDatabaseUrl,
    storageBucket: env.firebaseStorageBucket,
    messagingSenderId: env.firebaseMessagingSenderId,
    appId: env.firebaseAppId,
  });

  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);

  if (env.useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
    console.log('[Firebase] Connected to emulators');
  }

  console.log('[Firebase] Initialized');
  return { app, auth, db, rtdb };
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase not initialized');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

export function getFirebaseRtdb(): Database {
  if (!rtdb) throw new Error('Firebase not initialized');
  return rtdb;
}
