import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import type { PermissionsApi } from './contracts.ts';
import { canDo, listCapabilitiesForRole } from './domain/capabilities.ts';

export const PERMISSIONS_MODULE_ID = 'permissions';

export const permissionsModule: AppModule<PermissionsApi> = {
  id: PERMISSIONS_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<PermissionsApi> {
    return {
      can: canDo,
      listCapabilities: listCapabilitiesForRole,
    };
  },

  async dispose(): Promise<void> {
    // no-op
  },
};
