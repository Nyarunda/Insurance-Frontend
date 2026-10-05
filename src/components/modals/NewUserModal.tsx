import React, { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { UserRole } from '../../types';
import { ALL_ROLES, ModuleId, ROLE_LABELS } from '../../data/roleRights';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, ValidationSummary } from '../horizon';

export interface PermissionModuleOption {
  id: ModuleId;
  label: string;
  group: string;
  functionality: string;
}

export interface NewUserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  branch: string;
  status: string;
  lastLogin: string;
  assignedRoleCenters: UserRole[];
}

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
  permissionModules: PermissionModuleOption[];
  existingUserIds: string[];
  onSuccess: (user: NewUserPayload, permissions: Record<string, boolean>) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const nextUserId = (existingUserIds: string[]): string => {
  const highest = existingUserIds.reduce((max, id) => {
    const match = id.match(/(\d+)$/);
    const value = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, value);
  }, 0);
  return `USR-${String(highest + 1).padStart(3, '0')}`;
};

export const NewUserModal: React.FC<NewUserModalProps> = ({
  isOpen,
  onClose,
  departments,
  permissionModules,
  existingUserIds,
  onSuccess,
}) => {
  const canCreateUser = useHasPermission('regulatory-admin', 'add');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState(departments[0] || '');
  const [branch, setBranch] = useState('Nairobi HQ');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [assignedRoleCenters, setAssignedRoleCenters] = useState<UserRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Full name is required.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!role.trim()) errors.role = 'Job role / title is required.';
  if (!department.trim()) errors.department = 'Select a department.';
  if (!Object.values(permissions).some(Boolean)) errors.permissions = 'Grant access to at least one module.';
  if (assignedRoleCenters.length === 0) errors.assignedRoleCenters = 'Assign at least one Role Center.';
  const hasErrors = Object.keys(errors).length > 0;

  const togglePermission = (moduleId: string) => {
    setPermissions((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const toggleRoleCenter = (roleCenter: UserRole) => {
    setAssignedRoleCenters((prev) =>
      prev.includes(roleCenter) ? prev.filter((r) => r !== roleCenter) : [...prev, roleCenter]
    );
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setRole('');
    setDepartment(departments[0] || '');
    setBranch('Nairobi HQ');
    setPermissions({});
    setAssignedRoleCenters([]);
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (hasErrors) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onSuccess(
        {
          id: nextUserId(existingUserIds),
          name: name.trim(),
          email: email.trim(),
          role: role.trim(),
          department,
          branch: branch.trim(),
          status: 'Active',
          lastLogin: 'Never',
          assignedRoleCenters,
        },
        permissions
      );
      setIsSubmitting(false);
      handleClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                USER DIRECTORY
              </span>
              <h2 className="text-base font-bold text-slate-900">Add New User</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Create an account and grant initial module access.</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.name} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.email} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Role / Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Underwriter"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {attempted && <FieldError message={errors.role} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {departments.map((dept) => (
                  <option key={dept}>{dept}</option>
                ))}
              </select>
              {attempted && <FieldError message={errors.department} />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="hz-panel overflow-hidden">
            <div className="px-4 py-2.5 text-[11px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              Module Access
            </div>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {permissionModules.map((module) => {
                const enabled = Boolean(permissions[module.id]);
                return (
                  <label
                    key={module.id}
                    className={`grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3 px-4 py-2.5 items-start cursor-pointer transition-colors ${
                      enabled ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => togglePermission(module.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-bold text-slate-900 text-xs">{module.label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{module.functionality}</span>
                    </span>
                    <span className="hidden md:inline-flex rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {module.group}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          {attempted && <FieldError message={errors.permissions} />}

          <div className="hz-panel overflow-hidden">
            <div className="px-4 py-2.5 text-[11px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              Assigned Role Centers
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_ROLES.map((roleCenter) => {
                const enabled = assignedRoleCenters.includes(roleCenter);
                return (
                  <label
                    key={roleCenter}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      enabled ? 'bg-teal-50/50 border-teal-200' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input type="checkbox" checked={enabled} onChange={() => toggleRoleCenter(roleCenter)} />
                    <span className="text-xs font-semibold text-slate-800">{ROLE_LABELS[roleCenter]}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {attempted && <FieldError message={errors.assignedRoleCenters} />}

          {attempted && <ValidationSummary errors={Object.values(errors)} />}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !canCreateUser}
            onClick={handleSubmit}
            title={canCreateUser ? undefined : "You don't have permission to create users."}
            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canCreateUser ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Creating User...' : 'Create User'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
