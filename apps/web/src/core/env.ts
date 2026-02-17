import type { AppEnv } from './module-system.ts';

export function loadEnv(): AppEnv {
  const env: AppEnv = {
    firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    firebaseDatabaseUrl: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
    firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    useEmulators: import.meta.env.VITE_USE_EMULATORS === 'true',
  };
  return env;
}

export function validateEnv(env: AppEnv): void {
  const required: (keyof AppEnv)[] = [
    'firebaseApiKey',
    'firebaseAuthDomain',
    'firebaseProjectId',
  ];
  for (const key of required) {
    if (!env[key]) {
      console.warn(`Missing environment variable for: ${key}`);
    }
  }
}
