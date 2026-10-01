import { create } from 'zustand';
import {
  ApprovalLevelConfig,
  ModuleId,
  ModuleRights,
  PermissionAction,
  ROLE_RIGHTS,
  RoleRightsMap,
  UserPermissionOverride,
  UserPermissionOverrides,
} from '../data/roleRights';
import { UserRole } from '../types';
import { recordsStore } from '../data/recordsStore';

const EMPTY_PERMISSIONS: ModuleRights['permissions'] = {
  view: 'NO',
  add: 'NO',
  edit: 'NO',
  delete: 'NO',
  approve: 'NO',
  execute: 'NO',
};

const DEFAULT_INITIATE_LEVEL: ApprovalLevelConfig = { mfa: 'NO', password: 'YES', pin: 'NO' };

const cloneRoleRightsMap = (): Record<UserRole, RoleRightsMap> => JSON.parse(JSON.stringify(ROLE_RIGHTS));

const buildUserOverridesMap = (): Record<string, UserPermissionOverrides> => {
  const map: Record<string, UserPermissionOverrides> = {};
  recordsStore.getUsers().forEach((user) => {
    map[user.id] = user.permissionOverrides ? JSON.parse(JSON.stringify(user.permissionOverrides)) : {};
  });
  return map;
};

function mergeModuleRights(base: ModuleRights | undefined, override: UserPermissionOverride | undefined): ModuleRights {
  const permissions = { ...(base?.permissions ?? EMPTY_PERMISSIONS), ...(override?.permissions ?? {}) };
  const approval_levels = { ...(base?.approval_levels ?? {}) };
  if (override?.canInitiate === true) {
    approval_levels['0'] = approval_levels['0'] ?? DEFAULT_INITIATE_LEVEL;
  } else if (override?.canInitiate === false) {
    delete approval_levels['0'];
  }
  return { permissions, approval_levels };
}

function computeEffectiveRights(
  roleRightsMap: Record<UserRole, RoleRightsMap>,
  role: UserRole,
  userId: string | null | undefined,
  userOverridesMap: Record<string, UserPermissionOverrides>
): RoleRightsMap {
  const roleMap = roleRightsMap[role] ?? {};
  const overrides = userId ? userOverridesMap[userId] : undefined;
  if (!overrides || Object.keys(overrides).length === 0) return roleMap;
  const result: RoleRightsMap = { ...roleMap };
  (Object.keys(overrides) as ModuleId[]).forEach((moduleId) => {
    result[moduleId] = mergeModuleRights(roleMap[moduleId], overrides[moduleId]);
  });
  return result;
}

interface PermissionStoreState {
  activeRole: UserRole | null;
  activeUserId: string | null;
  roleRightsMap: Record<UserRole, RoleRightsMap>;
  userOverridesMap: Record<string, UserPermissionOverrides>;
  permissionRights: RoleRightsMap;

  initialize: (role: UserRole, userId?: string | null) => void;
  reset: () => void;
  resetRoleToDefaults: (role: UserRole) => void;

  setModulePermission: (role: UserRole, moduleId: ModuleId, action: PermissionAction, value: 'YES' | 'NO') => void;
  setApprovalLevel: (role: UserRole, moduleId: ModuleId, level: string, config: ApprovalLevelConfig | null) => void;

  setUserModulePermission: (userId: string, moduleId: ModuleId, action: PermissionAction, value: 'YES' | 'NO') => void;
  setUserCanInitiate: (userId: string, moduleId: ModuleId, checked: boolean) => void;
  clearUserModuleOverride: (userId: string, moduleId: ModuleId) => void;
  resetUserOverrides: (userId: string) => void;

  canAccessApplication: (moduleId: ModuleId) => boolean;
  canAccessApplications: (moduleIds: ModuleId[]) => boolean;
  hasApplicationPermissionType: (moduleId: ModuleId, action: PermissionAction) => boolean;
  hasApplicationApprovalLevel: (moduleId: ModuleId, level: string) => boolean;
  canInitiate: (moduleId: ModuleId, action: PermissionAction) => boolean;
  getApplicationApprovalLevelConfig: (moduleId: ModuleId, level: string) => ModuleRights['approval_levels'][string] | undefined;
}

export const usePermissionStore = create<PermissionStoreState>((set, get) => ({
  activeRole: null,
  activeUserId: null,
  roleRightsMap: cloneRoleRightsMap(),
  userOverridesMap: buildUserOverridesMap(),
  permissionRights: {},

  initialize: (role, userId = null) =>
    set((state) => ({
      activeRole: role,
      activeUserId: userId,
      permissionRights: computeEffectiveRights(state.roleRightsMap, role, userId, state.userOverridesMap),
    })),
  reset: () => set({ activeRole: null, activeUserId: null, permissionRights: {} }),

  resetRoleToDefaults: (role) => {
    set((state) => {
      const defaults: RoleRightsMap = JSON.parse(JSON.stringify(ROLE_RIGHTS[role] ?? {}));
      const roleRightsMap = { ...state.roleRightsMap, [role]: defaults };
      return {
        roleRightsMap,
        permissionRights:
          state.activeRole === role
            ? computeEffectiveRights(roleRightsMap, role, state.activeUserId, state.userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  setModulePermission: (role, moduleId, action, value) => {
    set((state) => {
      const roleRightsMap = { ...state.roleRightsMap };
      const roleMap = { ...(roleRightsMap[role] ?? {}) };
      const existing = roleMap[moduleId];
      const nextModuleRights: ModuleRights = existing
        ? { ...existing, permissions: { ...existing.permissions, [action]: value } }
        : { permissions: { ...EMPTY_PERMISSIONS, [action]: value }, approval_levels: {} };
      roleMap[moduleId] = nextModuleRights;
      roleRightsMap[role] = roleMap;

      return {
        roleRightsMap,
        permissionRights:
          state.activeRole === role
            ? computeEffectiveRights(roleRightsMap, role, state.activeUserId, state.userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  setApprovalLevel: (role, moduleId, level, config) => {
    set((state) => {
      const roleRightsMap = { ...state.roleRightsMap };
      const roleMap = { ...(roleRightsMap[role] ?? {}) };
      const existing = roleMap[moduleId] ?? { permissions: { ...EMPTY_PERMISSIONS }, approval_levels: {} };
      const nextApprovalLevels = { ...existing.approval_levels };
      if (config === null) {
        delete nextApprovalLevels[level];
      } else {
        nextApprovalLevels[level] = config;
      }
      roleMap[moduleId] = { ...existing, approval_levels: nextApprovalLevels };
      roleRightsMap[role] = roleMap;

      return {
        roleRightsMap,
        permissionRights:
          state.activeRole === role
            ? computeEffectiveRights(roleRightsMap, role, state.activeUserId, state.userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  setUserModulePermission: (userId, moduleId, action, value) => {
    set((state) => {
      const userOverridesMap = { ...state.userOverridesMap };
      const userOverrides = { ...(userOverridesMap[userId] ?? {}) };
      const moduleOverride: UserPermissionOverride = { ...(userOverrides[moduleId] ?? {}) };
      moduleOverride.permissions = { ...(moduleOverride.permissions ?? {}), [action]: value };
      userOverrides[moduleId] = moduleOverride;
      userOverridesMap[userId] = userOverrides;
      recordsStore.updateUser(userId, { permissionOverrides: userOverrides });

      return {
        userOverridesMap,
        permissionRights:
          state.activeUserId === userId && state.activeRole
            ? computeEffectiveRights(state.roleRightsMap, state.activeRole, userId, userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  setUserCanInitiate: (userId, moduleId, checked) => {
    set((state) => {
      const userOverridesMap = { ...state.userOverridesMap };
      const userOverrides = { ...(userOverridesMap[userId] ?? {}) };
      const moduleOverride: UserPermissionOverride = { ...(userOverrides[moduleId] ?? {}) };
      moduleOverride.canInitiate = checked;
      userOverrides[moduleId] = moduleOverride;
      userOverridesMap[userId] = userOverrides;
      recordsStore.updateUser(userId, { permissionOverrides: userOverrides });

      return {
        userOverridesMap,
        permissionRights:
          state.activeUserId === userId && state.activeRole
            ? computeEffectiveRights(state.roleRightsMap, state.activeRole, userId, userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  clearUserModuleOverride: (userId, moduleId) => {
    set((state) => {
      const userOverridesMap = { ...state.userOverridesMap };
      const userOverrides = { ...(userOverridesMap[userId] ?? {}) };
      delete userOverrides[moduleId];
      userOverridesMap[userId] = userOverrides;
      recordsStore.updateUser(userId, { permissionOverrides: userOverrides });

      return {
        userOverridesMap,
        permissionRights:
          state.activeUserId === userId && state.activeRole
            ? computeEffectiveRights(state.roleRightsMap, state.activeRole, userId, userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  resetUserOverrides: (userId) => {
    set((state) => {
      const userOverridesMap = { ...state.userOverridesMap, [userId]: {} };
      recordsStore.updateUser(userId, { permissionOverrides: {} });

      return {
        userOverridesMap,
        permissionRights:
          state.activeUserId === userId && state.activeRole
            ? computeEffectiveRights(state.roleRightsMap, state.activeRole, userId, userOverridesMap)
            : state.permissionRights,
      };
    });
  },

  canAccessApplication: (moduleId) => !!get().permissionRights[moduleId],

  canAccessApplications: (moduleIds) => moduleIds.some((moduleId) => get().canAccessApplication(moduleId)),

  hasApplicationPermissionType: (moduleId, action) => {
    const rights = get().permissionRights[moduleId];
    return !!rights && rights.permissions[action] === 'YES';
  },

  hasApplicationApprovalLevel: (moduleId, level) => {
    const rights = get().permissionRights[moduleId];
    return !!rights && !!rights.approval_levels[level];
  },

  canInitiate: (moduleId, action) =>
    get().hasApplicationApprovalLevel(moduleId, '0') && get().hasApplicationPermissionType(moduleId, action),

  getApplicationApprovalLevelConfig: (moduleId, level) => {
    if (!get().hasApplicationApprovalLevel(moduleId, level)) return undefined;
    return get().permissionRights[moduleId]?.approval_levels[level];
  },
}));

export function useHasPermission(moduleId: ModuleId, action: PermissionAction): boolean {
  return usePermissionStore((state) => {
    const rights = state.permissionRights[moduleId];
    return !!rights && rights.permissions[action] === 'YES';
  });
}

export function useCanInitiate(moduleId: ModuleId, action: PermissionAction): boolean {
  return usePermissionStore((state) => {
    const rights = state.permissionRights[moduleId];
    return !!rights && !!rights.approval_levels['0'] && rights.permissions[action] === 'YES';
  });
}

export function useCanAccessApplication(moduleId: ModuleId): boolean {
  return usePermissionStore((state) => !!state.permissionRights[moduleId]);
}

export function useRoleRightsMap(): Record<UserRole, RoleRightsMap> {
  return usePermissionStore((state) => state.roleRightsMap);
}

export function useUserOverrides(userId: string): UserPermissionOverrides {
  return usePermissionStore((state) => state.userOverridesMap[userId] ?? {});
}

export function useEffectiveRightsForUser(userId: string, role: UserRole): RoleRightsMap {
  return usePermissionStore((state) => computeEffectiveRights(state.roleRightsMap, role, userId, state.userOverridesMap));
}

/**
 * Non-reactive snapshot of a user's effective rights (role default + personal overrides).
 * Use this for one-off reads outside a component's own render subscription — e.g. inside a
 * list row computed for many different users at once, where calling the hook per-row would
 * violate the rules of hooks.
 */
export function getEffectiveRightsForUserSnapshot(userId: string, role: UserRole): RoleRightsMap {
  const state = usePermissionStore.getState();
  return computeEffectiveRights(state.roleRightsMap, role, userId, state.userOverridesMap);
}
