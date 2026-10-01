import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Search,
  Sliders,
  Users,
} from 'lucide-react';
import { ScreenId, DensityMode, UserRole } from '../types';
import { HorizonPage, HorizonPageContent, HorizonPageTitle, HorizonToast, WorkspaceTabs } from './horizon';
import { NewUserModal, NewUserPayload } from './modals/NewUserModal';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';
import { recordsStore } from '../data/recordsStore';
import { ALL_ROLES, ModuleId, ROLE_LABELS } from '../data/roleRights';
import {
  getEffectiveRightsForUserSnapshot,
  useEffectiveRightsForUser,
  useHasPermission,
  usePermissionStore,
} from '../store/permissionStore';
import { PermissionMatrixEditor } from './PermissionMatrixEditor';

interface UserPermissionsWorkflowsProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
}

export const UserPermissionsWorkflows: React.FC<UserPermissionsWorkflowsProps> = ({
  onNavigate,
  densityMode,
}) => {
  const auditLog = [
    {
      time: '03 Sep 2026 10:45 EAT',
      actor: 'Marcus Vance (CUO)',
      action: 'Permission Update',
      caseId: 'USR-007',
      details: 'Enabled Reinsurance access for Jane Mwangi.',
    },
    {
      time: '02 Sep 2026 16:12 EAT',
      actor: 'IT Security',
      action: 'Password Reset',
      caseId: 'USR-006',
      details: 'Reset password and required next-login change for Amanda Wright.',
    },
    {
      time: '01 Sep 2026 09:30 EAT',
      actor: 'System Administrator',
      action: 'User Created',
      caseId: 'USR-005',
      details: 'Created finance user profile for David Ochieng.',
    },
  ];

  const permissionModules: Array<{
    id: ModuleId;
    label: string;
    group: string;
    functionality: string;
  }> = [
    {
      id: 'customers',
      label: 'Customers',
      group: 'Customer Operations',
      functionality: 'Create customer, view profiles, KYC checks, relationship workspace',
    },
    {
      id: 'quotations',
      label: 'Quotations',
      group: 'Sales & Distribution',
      functionality: 'Create quotes, compare provider pricing, submit applications',
    },
    {
      id: 'policies',
      label: 'Policies',
      group: 'Policy Administration',
      functionality: 'View policies, endorsements, renewals, cancellations, certificates',
    },
    {
      id: 'claims',
      label: 'Claims',
      group: 'Claims',
      functionality: 'FNOL, assessment, reserve review, settlement and recovery workflows',
    },
    {
      id: 'billing',
      label: 'Billing & Payments',
      group: 'Finance',
      functionality: 'Premium billing, receipts, reconciliation, commissions, journals',
    },
    {
      id: 'reinsurance-treaties',
      label: 'Reinsurance',
      group: 'Reinsurance',
      functionality: 'Treaties, cessions, facultative placements, recoveries, bordereaux',
    },
    {
      id: 'providers',
      label: 'Providers',
      group: 'Customer Operations',
      functionality: 'Loss assessors, garages, medical providers, fraud investigators panel',
    },
    {
      id: 'intermediaries',
      label: 'Intermediaries',
      group: 'Sales & Distribution',
      functionality: 'Brokers, agents, bancassurance partners and commission terms',
    },
    {
      id: 'product-studio',
      label: 'Product Studio',
      group: 'Products',
      functionality: 'Product setup, rating tables, underwriting rules, sandbox testing',
    },
    {
      id: 'regulatory-admin',
      label: 'Admin & Regulatory',
      group: 'Administration',
      functionality: 'Branches, users, DOA, workflows, audit, number series, regulatory packs',
    },
  ];

  const users = recordsStore.getUsers();
  const [, forceRefresh] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState(users[0].id);
  const [userView, setUserView] = useState<'list' | 'workspace'>('list');
  const [activeUserTab, setActiveUserTab] = useState<'overview' | 'permissions' | 'workflows' | 'audit'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const canManagePermissions = useHasPermission('regulatory-admin', 'edit');

  const selectedUser = users.find((user) => user.id === selectedUserId) || users[0];
  const primaryRole: UserRole = selectedUser.assignedRoleCenters[0] ?? 'underwriter';
  const effectiveRights = useEffectiveRightsForUser(selectedUserId, primaryRole);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: selectedUser.name,
    email: selectedUser.email,
    jobTitle: selectedUser.jobTitle,
    department: selectedUser.department,
    branch: selectedUser.branch,
    assignedRoleCenters: selectedUser.assignedRoleCenters as UserRole[],
  });

  useEffect(() => {
    setEditDraft({
      name: selectedUser.name,
      email: selectedUser.email,
      jobTitle: selectedUser.jobTitle,
      department: selectedUser.department,
      branch: selectedUser.branch,
      assignedRoleCenters: selectedUser.assignedRoleCenters,
    });
  }, [selectedUserId]);

  const toggleDraftRoleCenter = (roleCenter: UserRole) => {
    setEditDraft((prev) => ({
      ...prev,
      assignedRoleCenters: prev.assignedRoleCenters.includes(roleCenter)
        ? prev.assignedRoleCenters.filter((r) => r !== roleCenter)
        : [...prev.assignedRoleCenters, roleCenter],
    }));
  };

  const handleSaveUser = () => {
    recordsStore.updateUser(selectedUserId, editDraft);
    forceRefresh((n) => n + 1);
    setToastMessage(`${editDraft.name} updated successfully.`);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleResetPassword = () => {
    setToastMessage(`Password reset link sent to ${selectedUser.email}.`);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const newUserModal = useModalWrapper(MODAL_IDS.NEW_USER);

  const handleUserCreated = (newUser: NewUserPayload, permissions: Record<string, boolean>) => {
    const created = recordsStore.addUser({
      name: newUser.name,
      email: newUser.email,
      jobTitle: newUser.role,
      department: newUser.department,
      branch: newUser.branch,
      status: 'Active',
      assignedRoleCenters: newUser.assignedRoleCenters,
    });
    Object.entries(permissions).forEach(([moduleId, granted]) => {
      if (granted) {
        usePermissionStore.getState().setUserModulePermission(created.id, moduleId as ModuleId, 'view', 'YES');
      }
    });
    forceRefresh((n) => n + 1);
    setToastMessage(`${created.name} added to the directory.`);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const visibleModules = permissionModules.filter((module) => effectiveRights[module.id]?.permissions.view === 'YES');
  const departments = ['All', ...Array.from(new Set(users.map((user) => user.department)))];
  const filteredUsers = users.filter((user) => {
    const matchesDepartment = departmentFilter === 'All' || user.department === departmentFilter;
    const searchTarget = `${user.id} ${user.name} ${user.email} ${user.department} ${user.jobTitle} ${user.branch}`.toLowerCase();
    return matchesDepartment && searchTarget.includes(userSearch.toLowerCase());
  });
  const tableRowClass =
    densityMode === 'compact'
      ? 'h-[var(--hz-table-row-compact)]'
      : densityMode === 'spacious'
      ? 'h-[52px]'
      : 'h-[var(--hz-table-row-default)]';
  const userWorkspaceTabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'permissions' as const, label: 'Permissions', count: visibleModules.length },
    { id: 'workflows' as const, label: 'Workflows', count: 3 },
    { id: 'audit' as const, label: 'Audit', count: auditLog.length },
  ];

  return (
    <HorizonPage id="user-permissions-workflows-view">
      <HorizonPageTitle
        title="Users & Roles"
        subtitle="Administration"
        onBack={() => onNavigate('regulatory-admin')}
      />

      {/* Users Register / User Workspace */}
      <HorizonPageContent>
        {userView === 'list' ? (
          <>
            <div className="hz-toolbar px-5 py-3 justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-[var(--hz-text-primary)] uppercase tracking-wider font-mono">
                  Users
                </h2>
                <span className="text-[11px] text-[var(--hz-text-subtle)]">{filteredUsers.length} records</span>
              </div>
              <button className="hz-button hz-button-primary" onClick={() => newUserModal.open()}>
                <Users className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>

            <div className="hz-toolbar px-5 py-2 justify-between bg-[var(--hz-surface-subtle)]">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <label className="hz-field min-w-[240px] max-w-sm flex flex-1 items-center gap-2 px-3">
                  <Search className="w-4 h-4 text-[var(--hz-text-subtle)]" />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    className="w-full bg-transparent outline-none text-xs"
                    placeholder="Search users"
                  />
                </label>
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="hz-field px-3 text-xs"
                >
                  {departments.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </select>
              </div>
              <button className="hz-button hz-button-secondary">
                <Sliders className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--hz-surface-subtle)] border-b border-[var(--hz-divider)] text-[11px] font-bold text-[var(--hz-text-subtle)] uppercase font-mono">
                    <th className="px-5 py-2.5">User ID</th>
                    <th className="px-5 py-2.5">Name</th>
                    <th className="px-5 py-2.5">Department</th>
                    <th className="px-5 py-2.5">Role</th>
                    <th className="px-5 py-2.5">Branch</th>
                    <th className="px-5 py-2.5">Role Centers</th>
                    <th className="px-5 py-2.5">Permissions</th>
                    <th className="px-5 py-2.5">Last Login</th>
                    <th className="px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hz-divider)]">
                  {filteredUsers.map((user) => {
                    const userRights = getEffectiveRightsForUserSnapshot(user.id, user.assignedRoleCenters[0] ?? 'underwriter');
                    const enabledCount = permissionModules.filter((module) => userRights[module.id]?.permissions.view === 'YES').length;

                    return (
                      <tr
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setActiveUserTab('overview');
                          setUserView('workspace');
                        }}
                        className={`${tableRowClass} hover:bg-[var(--hz-hover)] cursor-pointer`}
                      >
                        <td className="px-5 py-2 font-mono font-bold text-[var(--hz-primary)]">{user.id}</td>
                        <td className="px-5 py-2">
                          <div className="font-bold text-[var(--hz-text-primary)]">{user.name}</div>
                          <div className="text-[11px] text-[var(--hz-text-subtle)]">{user.email}</div>
                        </td>
                        <td className="px-5 py-2 font-semibold text-[var(--hz-text-primary)]">{user.department}</td>
                        <td className="px-5 py-2 text-[var(--hz-text-secondary)]">{user.jobTitle}</td>
                        <td className="px-5 py-2 text-[var(--hz-text-secondary)]">{user.branch}</td>
                        <td className="px-5 py-2">
                          <div className="flex flex-wrap gap-1">
                            {user.assignedRoleCenters.length === 0 ? (
                              <span className="text-[var(--hz-text-subtle)]">—</span>
                            ) : (
                              user.assignedRoleCenters.map((roleCenter) => (
                                <span
                                  key={roleCenter}
                                  className="rounded border border-[var(--hz-border)] bg-[var(--hz-surface-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--hz-text-secondary)]"
                                >
                                  {ROLE_LABELS[roleCenter]}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-2 font-mono font-semibold text-[var(--hz-text-primary)]">
                          {enabledCount}/{permissionModules.length}
                        </td>
                        <td className="px-5 py-2 text-[var(--hz-text-subtle)]">{user.lastLogin}</td>
                        <td className="px-5 py-2">
                          <span className="rounded border border-[var(--hz-success)]/20 bg-[var(--hz-success-bg)] px-1.5 py-0.5 font-semibold text-[var(--hz-success)]">
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="px-5 py-10 text-center text-xs text-[var(--hz-text-subtle)]">
                  No users match the current search or department filter.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-[var(--hz-divider)] bg-[var(--hz-surface)]">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setUserView('list')}
                    className="hz-icon-button"
                    title="Back to users"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-[var(--hz-surface-subtle)] text-[var(--hz-text-secondary)] px-2 py-0.5 rounded border border-[var(--hz-border)]">
                        {selectedUser.id}
                      </span>
                      <span className="font-mono font-bold text-xs text-[var(--hz-primary)]">{selectedUser.department}</span>
                      <span className="rounded border border-[var(--hz-success)]/20 bg-[var(--hz-success-bg)] px-1.5 py-0.5 text-xs font-semibold text-[var(--hz-success)]">
                        {selectedUser.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-[var(--hz-text-primary)] tracking-tight mt-1.5">
                      {selectedUser.name}
                    </h2>
                    <p className="text-xs text-[var(--hz-text-subtle)] mt-1">
                      {selectedUser.jobTitle} • {selectedUser.email} • {selectedUser.branch}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="hz-button hz-button-secondary" onClick={handleResetPassword}>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Reset Password</span>
                  </button>
                  <button className="hz-button hz-button-primary" onClick={handleSaveUser}>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>

            <WorkspaceTabs tabs={userWorkspaceTabs} activeTab={activeUserTab} onChange={setActiveUserTab} />

            <div className="p-5">
              {activeUserTab === 'overview' && (
                <div className="max-w-3xl space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <label className="space-y-1">
                      <span className="block font-medium text-[var(--hz-text-subtle)]">Full Name</span>
                      <input
                        value={editDraft.name}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                        className="hz-field w-full px-3 py-1.5"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block font-medium text-[var(--hz-text-subtle)]">Email</span>
                      <input
                        type="email"
                        value={editDraft.email}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, email: event.target.value }))}
                        className="hz-field w-full px-3 py-1.5"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block font-medium text-[var(--hz-text-subtle)]">Role / Job Title</span>
                      <input
                        value={editDraft.jobTitle}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, jobTitle: event.target.value }))}
                        className="hz-field w-full px-3 py-1.5"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block font-medium text-[var(--hz-text-subtle)]">Department</span>
                      <select
                        value={editDraft.department}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, department: event.target.value }))}
                        className="hz-field w-full px-3 py-1.5"
                      >
                        {departments
                          .filter((department) => department !== 'All')
                          .map((department) => (
                            <option key={department}>{department}</option>
                          ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="block font-medium text-[var(--hz-text-subtle)]">Branch</span>
                      <input
                        value={editDraft.branch}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, branch: event.target.value }))}
                        className="hz-field w-full px-3 py-1.5"
                      />
                    </label>
                    <div className="space-y-1">
                      <span className="block font-medium text-[var(--hz-text-subtle)]">Last Login</span>
                      <div className="hz-field w-full px-3 py-1.5 text-[var(--hz-text-subtle)] bg-[var(--hz-surface-subtle)]">
                        {selectedUser.lastLogin}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--hz-divider)] pt-3">
                    <div className="text-[11px] font-medium text-[var(--hz-text-subtle)] mb-2">Assigned Role Centers</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_ROLES.map((roleCenter) => {
                        const enabled = editDraft.assignedRoleCenters.includes(roleCenter);
                        return (
                          <label
                            key={roleCenter}
                            className={`flex items-center gap-2 px-3 py-2 rounded-[var(--hz-radius-lg)] border cursor-pointer transition-colors ${
                              enabled
                                ? 'bg-[var(--hz-selected)] border-[var(--hz-primary)]/40'
                                : 'border-[var(--hz-border)] hover:bg-[var(--hz-hover)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleDraftRoleCenter(roleCenter)}
                            />
                            <span className="font-semibold text-[var(--hz-text-primary)]">{ROLE_LABELS[roleCenter]}</span>
                          </label>
                        );
                      })}
                    </div>
                    {editDraft.assignedRoleCenters.length === 0 && (
                      <p className="mt-1.5 text-[11px] text-[var(--hz-danger)]">
                        This user will not be able to log in until assigned at least one Role Center.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[var(--hz-divider)] pt-3">
                    <div className="text-[11px] font-medium text-[var(--hz-text-subtle)]">Enabled Modules</div>
                    <div className="mt-1 font-semibold text-[var(--hz-text-primary)]">
                      {visibleModules.length}/{permissionModules.length}
                    </div>
                  </div>
                </div>
              )}

              {activeUserTab === 'permissions' && (
                <div className="space-y-5">
                  <PermissionMatrixEditor
                    userId={selectedUserId}
                    role={primaryRole}
                    canManage={canManagePermissions}
                    onChange={(message) => {
                      setToastMessage(message);
                      window.setTimeout(() => setToastMessage(null), 2500);
                    }}
                  />

                  <div className="border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)] overflow-hidden">
                    <div className="px-4 py-2.5 text-[11px] font-bold uppercase text-[var(--hz-text-subtle)] bg-[var(--hz-surface-subtle)] border-b border-[var(--hz-divider)]">
                      Quick Access — Modules This User Can View
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visibleModules.map((module) => (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => onNavigate(module.id, 'push')}
                          className="w-full flex items-center justify-between gap-3 rounded-[var(--hz-radius-md)] border border-[var(--hz-border)] bg-[var(--hz-surface)] px-3 py-2 text-left hover:bg-[var(--hz-hover)]"
                        >
                          <span>
                            <span className="block text-xs font-bold text-[var(--hz-text-primary)]">{module.label}</span>
                            <span className="block text-[10px] text-[var(--hz-text-subtle)]">{module.group}</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--hz-text-subtle)]" />
                        </button>
                      ))}

                      {visibleModules.length === 0 && (
                        <div className="sm:col-span-2 rounded-[var(--hz-radius-md)] border border-[var(--hz-danger)]/20 bg-[var(--hz-danger-bg)] p-3 text-xs text-[var(--hz-danger)]">
                          No module access assigned.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeUserTab === 'workflows' && (
                <div className="divide-y divide-[var(--hz-divider)] border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)] overflow-hidden">
                  {[
                    ['User creation approval', 'Approved', 'HR Admin → IT Security → Branch Manager'],
                    ['Permission change request', 'Pending', 'Department Head → System Administrator'],
                    ['Password reset audit', 'Completed', 'Service Desk → User Confirmation'],
                  ].map(([name, status, route]) => (
                    <div key={name} className="grid grid-cols-1 md:grid-cols-[1fr_140px_1.2fr] gap-3 px-4 py-3 text-xs">
                      <div className="font-bold text-[var(--hz-text-primary)]">{name}</div>
                      <div className="font-semibold text-[var(--hz-text-secondary)]">{status}</div>
                      <div className="text-[var(--hz-text-subtle)]">{route}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeUserTab === 'audit' && (
                <div className="space-y-3">
                  {auditLog.map((entry, idx) => (
                    <div key={idx} className="p-3 rounded-[var(--hz-radius-md)] bg-[var(--hz-surface-subtle)] border border-[var(--hz-border)] text-xs space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-[var(--hz-text-primary)]">{entry.action}</span>
                        <span className="font-mono text-[var(--hz-text-subtle)] text-[10px]">{entry.time}</span>
                      </div>
                      <div className="text-[11px] text-[var(--hz-primary)] font-medium font-mono">
                        {entry.actor} • Ref: {entry.caseId}
                      </div>
                      <p className="text-[11px] text-[var(--hz-text-secondary)] mt-1">{entry.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </HorizonPageContent>
      <HorizonToast message={toastMessage} tone="success" />

      <NewUserModal
        isOpen={newUserModal.isOpen}
        onClose={newUserModal.close}
        departments={departments.filter((department) => department !== 'All')}
        permissionModules={permissionModules}
        existingUserIds={users.map((user) => user.id)}
        onSuccess={handleUserCreated}
      />
    </HorizonPage>
  );
};
