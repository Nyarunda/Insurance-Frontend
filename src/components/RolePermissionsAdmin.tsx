import React, { useState } from 'react';
import { RefreshCcw, ShieldAlert, User as UserIcon } from 'lucide-react';
import { ScreenId, DensityMode, UserRole } from '../types';
import { ALL_MODULE_IDS, ALL_PERMISSION_ACTIONS, ALL_ROLES, MODULE_LABELS, PermissionAction, ROLE_LABELS } from '../data/roleRights';
import { recordsStore } from '../data/recordsStore';
import { useHasPermission, useRoleRightsMap, usePermissionStore } from '../store/permissionStore';
import { HorizonAlert, HorizonPage, HorizonPageContent, HorizonPageTitle, HorizonToast, WorkspaceTabs } from './horizon';
import { PermissionMatrixEditor } from './PermissionMatrixEditor';

interface RolePermissionsAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  execute: 'Execute',
};

type ViewMode = 'role' | 'user';

export const RolePermissionsAdmin: React.FC<RolePermissionsAdminProps> = ({ onNavigate }) => {
  const canManagePermissions = useHasPermission('regulatory-admin', 'edit');
  const roleRightsMap = useRoleRightsMap();
  const [viewMode, setViewMode] = useState<ViewMode>('user');
  const [activeRole, setActiveRole] = useState<UserRole>('underwriter');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const users = recordsStore.getUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id ?? '');
  const selectedUser = recordsStore.getUser(selectedUserId);
  const primaryRole: UserRole = selectedUser?.assignedRoleCenters[0] ?? 'underwriter';

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const roleMap = roleRightsMap[activeRole] ?? {};

  const togglePermission = (moduleId: (typeof ALL_MODULE_IDS)[number], action: PermissionAction, checked: boolean) => {
    if (!canManagePermissions) return;
    usePermissionStore.getState().setModulePermission(activeRole, moduleId, action, checked ? 'YES' : 'NO');
    showToast(`${MODULE_LABELS[moduleId]} → ${ACTION_LABELS[action]} ${checked ? 'granted' : 'revoked'} for ${ROLE_LABELS[activeRole]} (default).`);
  };

  const toggleCanInitiate = (moduleId: (typeof ALL_MODULE_IDS)[number], checked: boolean) => {
    if (!canManagePermissions) return;
    usePermissionStore.getState().setApprovalLevel(
      activeRole,
      moduleId,
      '0',
      checked ? { mfa: 'NO', password: 'YES', pin: 'NO' } : null
    );
    showToast(`${MODULE_LABELS[moduleId]} initiate authority ${checked ? 'granted' : 'revoked'} for ${ROLE_LABELS[activeRole]} (default).`);
  };

  const handleResetRole = () => {
    if (!canManagePermissions) return;
    usePermissionStore.getState().resetRoleToDefaults(activeRole);
    showToast(`${ROLE_LABELS[activeRole]} default permissions reset.`);
  };

  const roleTabs = ALL_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }));

  return (
    <HorizonPage id="role-permissions-admin-view">
      <HorizonPageTitle
        title="Delegation of Authority & Role Permissions"
        subtitle="Administration"
        onBack={() => onNavigate('regulatory-admin')}
      />

      <HorizonPageContent>
        <div className="p-4 border-b border-[var(--hz-divider)] space-y-3">
          {!canManagePermissions && (
            <HorizonAlert tone="warning" title="Read-only">
              You don't have permission to edit role permissions. Switch to a Role Center with Admin & Regulatory edit rights to make changes.
            </HorizonAlert>
          )}

          <div className="inline-flex rounded-[var(--hz-radius-lg)] border border-[var(--hz-border)] bg-[var(--hz-surface-subtle)] p-1 text-xs font-semibold">
            <button
              onClick={() => setViewMode('user')}
              className={`px-3 py-1.5 rounded-[var(--hz-radius-md)] transition-colors ${
                viewMode === 'user' ? 'bg-[var(--hz-surface)] text-[var(--hz-text-primary)] shadow-sm' : 'text-[var(--hz-text-subtle)]'
              }`}
            >
              By Individual User
            </button>
            <button
              onClick={() => setViewMode('role')}
              className={`px-3 py-1.5 rounded-[var(--hz-radius-md)] transition-colors ${
                viewMode === 'role' ? 'bg-[var(--hz-surface)] text-[var(--hz-text-primary)] shadow-sm' : 'text-[var(--hz-text-subtle)]'
              }`}
            >
              By Role Center (Defaults)
            </button>
          </div>
        </div>

        {viewMode === 'role' ? (
          <>
            <WorkspaceTabs tabs={roleTabs} activeTab={activeRole} onChange={(role: UserRole) => setActiveRole(role)} />

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-[var(--hz-text-subtle)]">
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    Sets the <strong className="text-[var(--hz-text-primary)]">default</strong> rights for everyone assigned to{' '}
                    <strong className="text-[var(--hz-text-primary)]">{ROLE_LABELS[activeRole]}</strong>. Individual users can
                    still have their own overrides — see "By Individual User".
                  </span>
                </div>
                <button
                  onClick={handleResetRole}
                  disabled={!canManagePermissions}
                  className="hz-button hz-button-secondary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>Reset to Defaults</span>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hz-divider)]">
                    {ALL_MODULE_IDS.map((moduleId) => {
                      const moduleRights = roleMap[moduleId];
                      const canInitiate = !!moduleRights?.approval_levels['0'];
                      return (
                        <tr key={moduleId} className="hover:bg-[var(--hz-hover)]">
                          <td className="px-4 py-2 font-bold text-[var(--hz-text-primary)]">{MODULE_LABELS[moduleId]}</td>
                          {ALL_PERMISSION_ACTIONS.map((action) => {
                            const checked = moduleRights?.permissions[action] === 'YES';
                            return (
                              <td key={action} className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!canManagePermissions}
                                  onChange={(e) => togglePermission(moduleId, action, e.target.checked)}
                                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={canInitiate}
                              disabled={!canManagePermissions}
                              onChange={(e) => toggleCanInitiate(moduleId, e.target.checked)}
                              className="disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-[var(--hz-text-subtle)]">
                "Can Initiate" grants Delegation-of-Authority Level 0 — required alongside "Add" to originate new records (e.g.
                issuing a quotation, registering a claim) rather than just acting on existing ones.
              </p>
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <label className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[var(--hz-text-secondary)] shrink-0">User</span>
              <span className="hz-field flex items-center gap-2 px-3 min-w-[260px]">
                <UserIcon className="w-3.5 h-3.5 text-[var(--hz-text-subtle)] shrink-0" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full outline-none text-xs bg-transparent py-1.5"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.jobTitle}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            {selectedUser && (
              <PermissionMatrixEditor userId={selectedUserId} role={primaryRole} canManage={canManagePermissions} onChange={showToast} />
            )}
          </div>
        )}
      </HorizonPageContent>

      <HorizonToast message={toastMessage} tone="success" />
    </HorizonPage>
  );
};
