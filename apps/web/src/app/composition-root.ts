import { loadEnv, validateEnv } from '../core/env.ts';
import { initFirebase } from '../core/firebase.ts';
import type { AppEnv } from '../core/module-system.ts';
import { registerModule, initModules } from './module-registry.ts';
import { permissionsModule } from '../modules/permissions/index.ts';
import { authModule } from '../modules/auth/index.ts';
import { boardAccessModule } from '../modules/board-access/index.ts';
import { viewportModule } from '../modules/viewport/index.ts';
import { objectsModule } from '../modules/objects/index.ts';
import { syncModule } from '../modules/sync/index.ts';
import { boardSessionModule } from '../modules/board-session/index.ts';
import { presenceModule } from '../modules/presence/index.ts';
import { aiAgentModule } from '../modules/ai-agent/index.ts';

let appEnv: AppEnv | null = null;

export async function initApp(): Promise<AppEnv> {
  if (appEnv) return appEnv;
  appEnv = loadEnv();
  validateEnv(appEnv);
  initFirebase(appEnv);

  registerModule(permissionsModule);
  registerModule(authModule);
  registerModule(boardAccessModule);
  registerModule(viewportModule);
  registerModule(objectsModule);
  registerModule(syncModule);
  registerModule(boardSessionModule);
  registerModule(presenceModule);
  registerModule(aiAgentModule);
  await initModules({ env: appEnv });

  return appEnv;
}

export function getEnv(): AppEnv {
  if (!appEnv) throw new Error('App not initialized. Call initApp() first.');
  return appEnv;
}
