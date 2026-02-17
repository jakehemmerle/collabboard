import type { AppModule, ModuleContext } from '../core/module-system.ts';

const modules = new Map<string, AppModule<unknown>>();
const apis = new Map<string, unknown>();

export function registerModule<T>(mod: AppModule<T>): void {
  modules.set(mod.id, mod);
}

export async function initModules(ctx: ModuleContext): Promise<void> {
  for (const [moduleId, mod] of modules) {
    const api = await mod.init(ctx);
    apis.set(moduleId, api);
  }
}

export function getModuleApi<T>(id: string): T {
  const api = apis.get(id);
  if (!api) throw new Error(`Module "${id}" not initialized`);
  return api as T;
}

export async function disposeModules(): Promise<void> {
  for (const mod of [...modules.values()].reverse()) {
    await mod.dispose();
  }
  modules.clear();
  apis.clear();
}
