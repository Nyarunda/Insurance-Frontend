import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { UserRole } from '../types';
import { ALL_MODULE_IDS, ALL_PERMISSION_ACTIONS, MODULE_LABELS, PermissionAction, ROLE_LABELS } from '../data/roleRights';
import { recordsStore } from '../data/recordsStore';
import { useEffectiveRightsForUser, useUserOverrides, usePermissionStore } from '../store/permissionStore';

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  execute: 'Execute',
};

interface PermissionMatrixEditorProps {
  userId: string;
  role: UserRole;
  canManage: boolean;
  onChange?: (message: string) => void;
  onResetAll?: () => void;
}

export const PermissionMatrixEditor: React.FC<PermissionMatrixEditorProps> = ({ userId, role, canManage, onChange, onResetAll }) => {
  const user = recordsStore.getUser(userId);
  const overrides = useUserOverrides(userId);
  const effectiveRights = useEffectiveRightsForUser(userId, role);

  const isPermissionOverridden = (moduleId: (typeof ALL_MODULE_IDS)[number], action: PermissionAction) =>
    overrides[moduleId]?.permissions?.[action] !== undefined;
  const isCanInitiateOverridden = (moduleId: (typeof ALL_MODULE_IDS)[number]) => overrides[moduleId]?.canInitiate !== undefined;
  const moduleHasOverride = (moduleId: (typeof ALL_MODULE_IDS)[number]) =>
    !!overrides[moduleId] && Object.keys(overrides[moduleId] || {}).length > 0;

  const toggleUserPermission = (moduleId: (typeof ALL_MODULE_IDS)[number], action: PermissionAction, checked: boolean) => {
    if (!canManage || !user) return;
    usePermissionStore.getState().setUserModulePermission(userId, moduleId, action, checked ? 'YES' : 'NO');
    onChange?.(`${MODULE_LABELS[moduleId]} → ${ACTION_LABELS[action]} ${checked ? 'granted' : 'revoked'} for ${user.name} only.`);
  };

  const toggleUserCanInitiate = (moduleId: (typeof ALL_MODULE_IDS)[number], checked: boolean) => {
    if (!canManage || !user) return;
    usePermissionStore.getState().setUserCanInitiate(userId, moduleId, checked);
    onChange?.(`${MODULE_LABELS[moduleId]} initiate authority ${checked ? 'granted' : 'revoked'} for ${user.name} only.`);
  };

  const clearModuleOverride = (moduleId: (typeof ALL_MODULE_IDS)[number]) => {
    if (!canManage) return;
    usePermissionStore.getState().clearUserModuleOverride(userId, moduleId);
    onChange?.(`${MODULE_LABELS[moduleId]} reverted to ${ROLE_LABELS[role]} default for ${user?.name}.`);
  };

  const handleResetAll = () => {
    if (!canManage || !user) return;
    usePermissionStore.getState().resetUserOverrides(userId);
    onChange?.(`All overrides cleared for ${user.name} — now following ${ROLE_LABELS[role]} defaults.`);
    onResetAll?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--hz-text-subtle)] max-w-2xl">
          Effective rights for <strong className="text-[var(--hz-text-primary)]">{user?.name}</strong>, inheriting from the{' '}
          <strong className="text-[var(--hz-text-primary)]">{ROLE_LABELS[role]}</strong> default. Amber cells are personal
          overrides that no longer follow the Role Center default.
        </p>
        <button
          onClick={handleResetAll}
          disabled={!canManage}
          className="hz-button hz-button-secondary !min-h-8 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          <span>Clear All Overrides</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--hz-surface-subtle)] border-b border-[var(--hz-divider)] text-[10px] font-bold text-[var(--hz-text-subtle)] uppercase font-mono">
              <th className="px-4 py-2.5">Module</th>
              {ALL_PERMISSION_ACTIONS.map((action) => (
                <th key={action} className="px-3 py-2.5 text-center">
                  {ACTION_LABELS[action]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center">Can Initiate</th>
              <th className="px-3 py-2.5 text-center">Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hz-divider)]">
            {ALL_MODULE_IDS.map((moduleId) => {
              const moduleRights = effectiveRights[moduleId];
              const canInitiateChecked = !!moduleRights?.approval_levels['0'];
              return (
                <tr key={moduleId} className="hover:bg-[var(--hz-hover)]">
                  <td className="px-4 py-2 font-bold text-[var(--hz-text-primary)]">{MODULE_LABELS[moduleId]}</td>
                  {ALL_PERMISSION_ACTIONS.map((action) => {
                    const checked = moduleRights?.permissions[action] === 'YES';
                    const overridden = isPermissionOverridden(moduleId, action);
                    return (
                      <td key={action} className={`px-3 py-2 text-center ${overridden ? 'bg-[var(--hz-warning-bg)]' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canManage}
                          onChange={(e) => toggleUserPermission(moduleId, action, e.target.checked)}
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                  <td className={`px-3 py-2 text-center ${isCanInitiateOverridden(moduleId) ? 'bg-[var(--hz-warning-bg)]' : ''}`}>
                    <input
                      type="checkbox"
                      checked={canInitiateChecked}
                      disabled={!canManage}
                      onChange={(e) => toggleUserCanInitiate(moduleId, e.target.checked)}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {moduleHasOverride(moduleId) && (
                      <button
                        onClick={() => clearModuleOverride(moduleId)}
                        disabled={!canManage}
                        title="Revert this module to the Role Center default"
                        className="text-[10px] font-bold uppercase text-[var(--hz-warning)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
