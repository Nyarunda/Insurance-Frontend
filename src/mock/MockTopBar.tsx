import React, { useState } from 'react';
import { AlertTriangle, CreditCard, FileText, UserPlus } from 'lucide-react';
import { AuthSession, DensityMode, ScreenId, UserRole } from '../types';
import { ROLE_LABELS } from '../data/roleRights';
import { recordsStore } from '../data/recordsStore';
import { NAV_COUNTERS } from '../data/navigation';
import { GlobalTopBar, TopBarNotification, TopBarQuickAction } from '../components/GlobalTopBar';

/** Mock demo only: the top bar fed from the mock records, as before FI1-A. */

const NOTIFICATIONS: TopBarNotification[] = [
  {
    id: 'notif-1',
    title: 'SLA breach warning — 15 minutes remaining',
    desc: 'Underwriting referral Q-10292, ABC Logistics, KES 18,500,000.00, awaiting CUO decision.',
    time: '12m ago',
    urgent: true,
    screen: 'underwriting-workbench',
  },
  {
    id: 'notif-2',
    title: 'M-Pesa receipt confirmed',
    desc: 'KES 182,450.00 received via Paybill 89104 for POL/MTR/2026/001239.',
    time: '24m ago',
    urgent: false,
    screen: 'policy-workspace',
  },
  {
    id: 'notif-3',
    title: 'Assessor report uploaded',
    desc: 'CLM/MTR/2026/0081 assessment report finalised by Peter Githinji.',
    time: '1h ago',
    urgent: false,
    screen: 'claim-workspace',
  },
];

const QUICK_ACTIONS: TopBarQuickAction[] = [
  { label: 'New Motor Quotation', screen: 'quote-workspace', icon: FileText },
  { label: 'Onboard Customer', screen: 'customer-workspace', icon: UserPlus },
  { label: 'Register FNOL', screen: 'claim-workspace', icon: AlertTriangle },
  { label: 'Receipt M-Pesa Payment', screen: 'accounting-workbench', icon: CreditCard },
];

interface MockTopBarProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  densityMode: DensityMode;
  onDensityChange: (density: DensityMode) => void;
  sessionUser?: AuthSession;
  onLogout?: () => void;
}

export const MockTopBar: React.FC<MockTopBarProps> = ({
  onNavigate,
  onOpenCommandPalette,
  onToggleSidebar,
  currentRole,
  onRoleChange,
  densityMode,
  onDensityChange,
  sessionUser,
  onLogout,
}) => {
  const tenants = recordsStore.getTenants();
  const branches = recordsStore.getBranches().filter((branch) => branch.status === 'ACTIVE');
  const [activeTenant, setActiveTenant] = useState(sessionUser?.tenant || tenants[0]?.name || 'Tenant');
  const [activeBranchId, setActiveBranchId] = useState<string | null>(branches[0]?.id ?? null);
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const assignedRoleCenters = sessionUser?.assignedRoleCenters?.length ? sessionUser.assignedRoleCenters : [currentRole];

  return (
    <GlobalTopBar
      onNavigate={onNavigate}
      onOpenCommandPalette={onOpenCommandPalette}
      onToggleSidebar={onToggleSidebar}
      tenant={{
        name: activeTenant,
        options: tenants.map((tenant) => ({ id: tenant.name, name: tenant.name, detail: tenant.region })),
        activeId: activeTenant,
        onSelect: setActiveTenant,
      }}
      branch={{
        label: activeBranch?.name ?? 'All branches',
        heading: 'Active branch scope',
        options: branches.map((branch) => ({ id: branch.id, name: branch.name, detail: branch.region })),
        activeId: activeBranchId,
        onSelect: setActiveBranchId,
      }}
      user={{ name: sessionUser?.name ?? '', email: sessionUser?.email }}
      roleCenter={{
        currentLabel: ROLE_LABELS[currentRole],
        options: assignedRoleCenters.map((role) => ({ id: role, name: ROLE_LABELS[role] })),
        activeId: currentRole,
        onSelect: (role) => onRoleChange(role as UserRole),
      }}
      densityMode={densityMode}
      onDensityChange={onDensityChange}
      notifications={{ items: NOTIFICATIONS, unread: NAV_COUNTERS.unread_notifs, badge: '1 SLA warning' }}
      quickActions={QUICK_ACTIONS}
      onOpenProfile={() => onNavigate('my-profile')}
      onLogout={onLogout}
    />
  );
};
