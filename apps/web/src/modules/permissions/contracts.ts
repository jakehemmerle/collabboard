export type BoardRole = 'owner' | 'collaborator';

export type BoardCapability =
  | 'board:read'
  | 'board:write'
  | 'board:delete'
  | 'board:manage-members'
  | 'object:create'
  | 'object:edit'
  | 'object:delete'
  | 'cursor:publish'
  | 'presence:publish';

export interface PermissionContext {
  role: BoardRole;
}

export interface PermissionsApi {
  can(capability: BoardCapability, ctx: PermissionContext): boolean;
  listCapabilities(role: BoardRole): BoardCapability[];
}
