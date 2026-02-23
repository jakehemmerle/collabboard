import { describe, it, expect, beforeEach } from 'vitest';
import { permissionsModule } from '../index.ts';
import { canDo, listCapabilitiesForRole, ROLE_CAPABILITIES } from '../domain/capabilities.ts';
import type { BoardRole, BoardCapability, PermissionsApi } from '../contracts.ts';

const ALL_CAPABILITIES: BoardCapability[] = [
  'board:read',
  'board:write',
  'board:delete',
  'board:manage-members',
  'object:create',
  'object:edit',
  'object:delete',
  'cursor:publish',
  'presence:publish',
];

const COLLABORATOR_ONLY: BoardCapability[] = [
  'board:read',
  'board:write',
  'object:create',
  'object:edit',
  'object:delete',
  'cursor:publish',
  'presence:publish',
];

const OWNER_EXCLUSIVE: BoardCapability[] = [
  'board:delete',
  'board:manage-members',
];

const mockCtx = {
  env: {
    firebaseApiKey: '',
    firebaseAuthDomain: '',
    firebaseProjectId: '',
    firebaseDatabaseUrl: '',
    firebaseStorageBucket: '',
    firebaseMessagingSenderId: '',
    firebaseAppId: '',
    useEmulators: false,
  },
};

describe('integration: permissions module', () => {
  let api: PermissionsApi;

  beforeEach(async () => {
    api = await permissionsModule.init(mockCtx);
  });

  describe('module init returns working API', () => {
    it('returns an object with can and listCapabilities methods', () => {
      expect(api).toBeDefined();
      expect(typeof api.can).toBe('function');
      expect(typeof api.listCapabilities).toBe('function');
    });
  });

  describe('owner has all capabilities', () => {
    it.each(ALL_CAPABILITIES)('owner can %s', (capability) => {
      expect(api.can(capability, { role: 'owner' })).toBe(true);
    });

    it('owner capabilities list contains all known capabilities', () => {
      const caps = api.listCapabilities('owner');
      for (const cap of ALL_CAPABILITIES) {
        expect(caps).toContain(cap);
      }
    });
  });

  describe('collaborator standard capabilities', () => {
    it.each(COLLABORATOR_ONLY)('collaborator can %s', (capability) => {
      expect(api.can(capability, { role: 'collaborator' })).toBe(true);
    });
  });

  describe('collaborator restricted capabilities', () => {
    it.each(OWNER_EXCLUSIVE)('collaborator cannot %s', (capability) => {
      expect(api.can(capability, { role: 'collaborator' })).toBe(false);
    });
  });

  describe('owner is strict superset of collaborator', () => {
    it('every collaborator capability is also an owner capability', () => {
      const ownerCaps = api.listCapabilities('owner');
      const collabCaps = api.listCapabilities('collaborator');

      for (const cap of collabCaps) {
        expect(ownerCaps).toContain(cap);
      }
    });

    it('owner has more capabilities than collaborator', () => {
      const ownerCaps = api.listCapabilities('owner');
      const collabCaps = api.listCapabilities('collaborator');
      expect(ownerCaps.length).toBeGreaterThan(collabCaps.length);
    });
  });

  describe('listCapabilities completeness', () => {
    it('owner list matches expected count', () => {
      expect(api.listCapabilities('owner')).toHaveLength(ALL_CAPABILITIES.length);
    });

    it('collaborator list matches expected count', () => {
      expect(api.listCapabilities('collaborator')).toHaveLength(COLLABORATOR_ONLY.length);
    });
  });

  describe('exhaustive capability check per role', () => {
    it('verifies every capability against owner role', () => {
      for (const cap of ALL_CAPABILITIES) {
        expect(api.can(cap, { role: 'owner' })).toBe(true);
      }
    });

    it('verifies every capability against collaborator role', () => {
      for (const cap of ALL_CAPABILITIES) {
        const expected = COLLABORATOR_ONLY.includes(cap);
        expect(api.can(cap, { role: 'collaborator' })).toBe(expected);
      }
    });
  });

  describe('direct domain function tests', () => {
    it('canDo works directly without module init', () => {
      expect(canDo('board:read', { role: 'collaborator' })).toBe(true);
      expect(canDo('board:delete', { role: 'collaborator' })).toBe(false);
      expect(canDo('board:delete', { role: 'owner' })).toBe(true);
    });

    it('listCapabilitiesForRole works directly', () => {
      const ownerCaps = listCapabilitiesForRole('owner');
      const collabCaps = listCapabilitiesForRole('collaborator');

      expect(ownerCaps.length).toBeGreaterThan(collabCaps.length);
      expect(ownerCaps).toEqual(expect.arrayContaining(collabCaps));
    });

    it('ROLE_CAPABILITIES keys match expected roles', () => {
      const roles = Object.keys(ROLE_CAPABILITIES) as BoardRole[];
      expect(roles).toContain('owner');
      expect(roles).toContain('collaborator');
      expect(roles).toHaveLength(2);
    });
  });

  describe('module dispose is safe', () => {
    it('dispose does not throw', async () => {
      await expect(permissionsModule.dispose()).resolves.toBeUndefined();
    });
  });
});
