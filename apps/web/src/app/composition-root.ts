import { loadEnv, validateEnv } from '../core/env.ts';
import { initFirebase } from '../core/firebase.ts';
import type { AppEnv } from '../core/module-system.ts';

let appEnv: AppEnv | null = null;

export function initApp(): AppEnv {
  if (appEnv) return appEnv;
  appEnv = loadEnv();
  validateEnv(appEnv);
  initFirebase(appEnv);
  return appEnv;
}

export function getEnv(): AppEnv {
  if (!appEnv) throw new Error('App not initialized. Call initApp() first.');
  return appEnv;
}
