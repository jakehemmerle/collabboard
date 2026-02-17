import type { BoardCapability, BoardRole, PermissionContext } from '../contracts.ts';

const COLLABORATOR_CAPABILITIES: BoardCapability[] = [
  'board:read',
  'board:write',
  'object:create',
  'object:edit',
  'object:delete',
  'cursor:publish',
  'presence:publish',
];

const OWNER_CAPABILITIES: BoardCapability[] = [
  ...COLLABORATOR_CAPABILITIES,
  'board:delete',
  'board:manage-members',
];

export const ROLE_CAPABILITIES: Record<BoardRole, BoardCapability[]> = {
  collaborator: COLLABORATOR_CAPABILITIES,
  owner: OWNER_CAPABILITIES,
};

export function canDo(capability: BoardCapability, ctx: PermissionContext): boolean {
  return ROLE_CAPABILITIES[ctx.role].includes(capability);
}

export function listCapabilitiesForRole(role: BoardRole): BoardCapability[] {
  return ROLE_CAPABILITIES[role];
}
