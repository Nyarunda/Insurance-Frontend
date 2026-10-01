import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  GitBranch,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { AuthSession, DensityMode, ScreenId, UserRole } from '../types';
import { ROLE_LABELS } from '../data/roleRights';
import { recordsStore } from '../data/recordsStore';
import { NAV_COUNTERS } from '../data/navigation';

interface GlobalTopBarProps {
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

type MenuId = 'tenant' | 'branch' | 'new' | 'alerts' | 'help' | 'user' | null;

const NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'SLA breach warning — 15 minutes remaining',
    desc: 'Underwriting referral Q-10292, ABC Logistics, KES 18,500,000.00, awaiting CUO decision.',
    time: '12m ago',
    urgent: true,
    screen: 'underwriting-workbench' as ScreenId,
  },
  {
    id: 'notif-2',
    title: 'M-Pesa receipt confirmed',
    desc: 'KES 182,450.00 received via Paybill 89104 for POL/MTR/2026/001239.',
    time: '24m ago',
    urgent: false,
    screen: 'policy-workspace' as ScreenId,
  },
  {
    id: 'notif-3',
    title: 'Assessor report uploaded',
    desc: 'CLM/MTR/2026/0081 assessment report finalised by Peter Githinji.',
    time: '1h ago',
    urgent: false,
    screen: 'claim-workspace' as ScreenId,
  },
];

const QUICK_ACTIONS: Array<{ label: string; screen: ScreenId; icon: React.ElementType }> = [
  { label: 'New Motor Quotation', screen: 'quote-workspace', icon: FileText },
  { label: 'Onboard Customer', screen: 'customer-workspace', icon: UserPlus },
  { label: 'Register FNOL', screen: 'claim-workspace', icon: AlertTriangle },
  { label: 'Receipt M-Pesa Payment', screen: 'accounting-workbench', icon: CreditCard },
];

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Ctrl + K', action: 'Search customers, policies, claims, vouchers' },
  { keys: 'Esc', action: 'Close drawer, dialog or menu' },
  { keys: '↑ / ↓', action: 'Move row selection in a table' },
  { keys: 'Enter', action: 'Open the selected record' },
];

/** Dropdown panel shell shared by every top-bar menu. */
const MenuPanel: React.FC<{ align?: 'left' | 'right'; width?: string; children: React.ReactNode }> = ({
  align = 'right',
  width = 'w-72',
  children,
}) => (
  <div
    role="menu"
    className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-50 mt-1 ${width} rounded-[6px] border border-[var(--hz-border-grid)] bg-white py-1 text-[13px] text-[var(--hz-text-primary)] shadow-lg`}
  >
    {children}
  </div>
);

const MenuHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="hz-section-label border-b border-[var(--hz-border-grid)] px-3 py-1.5">{children}</div>
);

const barButton =
  'flex h-8 items-center gap-1.5 rounded-[3px] px-2 text-[13px] text-[var(--hz-sidebar-text)] hover:bg-white/10 transition-colors';

export const GlobalTopBar: React.FC<GlobalTopBarProps> = ({
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
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const tenants = recordsStore.getTenants();
  const branches = recordsStore.getBranches().filter((branch) => branch.status === 'ACTIVE');
  const [activeTenant, setActiveTenant] = useState(sessionUser?.tenant || tenants[0]?.name || 'Tenant');
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id);
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const barRef = useRef<HTMLElement>(null);

  const assignedRoleCenters = sessionUser?.assignedRoleCenters?.length ? sessionUser.assignedRoleCenters : [currentRole];

  // Close menus on outside click and on Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  const toggle = (menu: MenuId) => setOpenMenu((current) => (current === menu ? null : menu));
  const go = (screen: ScreenId) => {
    setOpenMenu(null);
    onNavigate(screen);
  };

  const userName = sessionUser?.name || 'Signed-in user';
  const shortName = (() => {
    const parts = userName.split(' ').filter(Boolean);
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : userName;
  })();

  return (
    <header
      ref={barRef}
      className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--hz-sidebar-border)] bg-[var(--hz-topbar-bg)] px-2 text-[var(--hz-sidebar-text)]"
      style={{ height: 'var(--hz-topbar-height)' }}
    >
      {/* Left: navigation toggle, product mark, tenant, branch, search */}
      <div className="flex min-w-0 items-center gap-1">
        <button type="button" onClick={onToggleSidebar} className={`${barButton} w-8 justify-center`} title="Toggle navigation">
          <Menu className="h-4 w-4" />
        </button>

        <button type="button" onClick={() => go('dashboard')} className="mr-2 flex items-center gap-2 px-1" title="Dashboard">
          <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-white text-xs font-bold text-[var(--hz-primary-700)]">
            IC
          </span>
          <span className="hidden text-[13px] font-semibold tracking-[0.04em] text-white md:inline">INSURANCE CLOUD</span>
        </button>

        <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" aria-hidden />

        {/* Tenant */}
        <div className="relative hidden sm:block">
          <button type="button" onClick={() => toggle('tenant')} className={barButton} aria-haspopup="menu" aria-expanded={openMenu === 'tenant'}>
            <Building2 className="h-3.5 w-3.5 text-[var(--hz-sidebar-muted)]" />
            <span className="max-w-[180px] truncate font-semibold text-white">{activeTenant}</span>
            <ChevronDown className="h-3 w-3 text-[var(--hz-sidebar-muted)]" />
          </button>
          {openMenu === 'tenant' && (
            <MenuPanel align="left">
              <MenuHeading>Switch tenant</MenuHeading>
              {tenants.map((tenant) => (
                <button
                  key={tenant.code}
                  type="button"
                  onClick={() => {
                    setActiveTenant(tenant.name);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <span>
                    <span className="block font-semibold">{tenant.name}</span>
                    <span className="block text-[12px] text-[var(--hz-text-muted)]">{tenant.region}</span>
                  </span>
                  {activeTenant === tenant.name && <Check className="mt-0.5 h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                </button>
              ))}
            </MenuPanel>
          )}
        </div>

        {/* Branch */}
        <div className="relative hidden sm:block">
          <button type="button" onClick={() => toggle('branch')} className={barButton} aria-haspopup="menu" aria-expanded={openMenu === 'branch'}>
            <GitBranch className="h-3.5 w-3.5 text-[var(--hz-sidebar-muted)]" />
            <span className="max-w-[170px] truncate">{activeBranch?.name ?? 'All branches'}</span>
            <ChevronDown className="h-3 w-3 text-[var(--hz-sidebar-muted)]" />
          </button>
          {openMenu === 'branch' && (
            <MenuPanel align="left">
              <MenuHeading>Active branch scope</MenuHeading>
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    setActiveBranchId(branch.id);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <span>
                    <span className="block font-semibold">{branch.name}</span>
                    <span className="block text-[12px] text-[var(--hz-text-muted)]">{branch.region}</span>
                  </span>
                  {activeBranchId === branch.id && <Check className="mt-0.5 h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                </button>
              ))}
            </MenuPanel>
          )}
        </div>

        {/* Global search trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="ml-2 hidden h-8 w-[300px] items-center gap-2 rounded-[3px] border border-white/15 bg-white/5 px-2.5 text-left text-[13px] text-[var(--hz-sidebar-muted)] hover:border-white/30 hover:bg-white/10 lg:flex"
          title="Search (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">Search customer, policy, claim…</span>
          <kbd className="rounded-[3px] border border-white/20 px-1 font-sans text-xs text-[var(--hz-sidebar-muted)]">Ctrl K</kbd>
        </button>
        <button type="button" onClick={onOpenCommandPalette} className={`${barButton} w-8 justify-center lg:hidden`} title="Search (Ctrl+K)">
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Right: new record, alerts, help, user */}
      <div className="flex shrink-0 items-center gap-0.5">
        <div className="relative">
          <button type="button" onClick={() => toggle('new')} className={barButton} title="Create a new record" aria-haspopup="menu">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">New</span>
          </button>
          {openMenu === 'new' && (
            <MenuPanel width="w-60">
              <MenuHeading>Create</MenuHeading>
              {QUICK_ACTIONS.map(({ label, screen, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => go(screen)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--hz-text-secondary)]" />
                  <span>{label}</span>
                </button>
              ))}
            </MenuPanel>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => toggle('alerts')} className={barButton} title="Notifications" aria-haspopup="menu">
            <Bell className="h-4 w-4" />
            <span className="rounded-[3px] bg-white/15 px-1 text-xs font-semibold tabular-nums text-white">{NAV_COUNTERS.unread_notifs}</span>
          </button>
          {openMenu === 'alerts' && (
            <MenuPanel width="w-80">
              <div className="flex items-center justify-between border-b border-[var(--hz-border-grid)] px-3 py-1.5">
                <span className="hz-section-label">Notifications</span>
                <span className="rounded-[3px] border border-[var(--hz-danger-border)] bg-[var(--hz-danger-bg)] px-1.5 text-xs font-semibold text-[var(--hz-danger-text)]">
                  1 SLA warning
                </span>
              </div>
              <div className="max-h-80 divide-y divide-[var(--hz-border-grid)] overflow-y-auto">
                {NOTIFICATIONS.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => go(notification.screen)}
                    className="block w-full px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`font-semibold ${notification.urgent ? 'text-[var(--hz-danger-text)]' : ''}`}>{notification.title}</span>
                      <span className="shrink-0 text-xs text-[var(--hz-text-muted)]">{notification.time}</span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-[var(--hz-text-secondary)]">{notification.desc}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--hz-border-grid)] px-3 py-1.5">
                <button type="button" onClick={() => go('my-work')} className="text-[12px] font-semibold text-[var(--hz-primary-700)] hover:underline">
                  Open My Work Queue
                </button>
              </div>
            </MenuPanel>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => toggle('help')} className={`${barButton} w-8 justify-center`} title="Keyboard shortcuts and help">
            <HelpCircle className="h-4 w-4" />
          </button>
          {openMenu === 'help' && (
            <MenuPanel width="w-80">
              <MenuHeading>Keyboard shortcuts</MenuHeading>
              <dl className="px-3 py-1.5">
                {SHORTCUTS.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between gap-3 py-1">
                    <dt>
                      <kbd className="rounded-[3px] border border-[var(--hz-border-default)] bg-[var(--hz-surface-subtle)] px-1.5 font-sans text-xs font-semibold">
                        {shortcut.keys}
                      </kbd>
                    </dt>
                    <dd className="text-right text-[12px] text-[var(--hz-text-secondary)]">{shortcut.action}</dd>
                  </div>
                ))}
              </dl>
            </MenuPanel>
          )}
        </div>

        <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" aria-hidden />

        <div className="relative">
          <button type="button" onClick={() => toggle('user')} className={barButton} aria-haspopup="menu">
            <span className="hidden max-w-[140px] truncate font-semibold text-white sm:inline">{shortName}</span>
            <UserCheck className="h-4 w-4 sm:hidden" />
            <ChevronDown className="h-3 w-3 text-[var(--hz-sidebar-muted)]" />
          </button>
          {openMenu === 'user' && (
            <MenuPanel width="w-72">
              <div className="border-b border-[var(--hz-border-grid)] px-3 py-2">
                <div className="font-semibold">{userName}</div>
                <div className="text-[12px] text-[var(--hz-text-muted)]">{sessionUser?.email}</div>
                <div className="mt-1 text-[12px] text-[var(--hz-text-secondary)]">
                  Role center: <span className="font-semibold text-[var(--hz-text-primary)]">{ROLE_LABELS[currentRole]}</span>
                </div>
              </div>

              <MenuHeading>Switch role center</MenuHeading>
              {assignedRoleCenters.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    onRoleChange(role);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <span>{ROLE_LABELS[role]}</span>
                  {currentRole === role && <Check className="h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                </button>
              ))}

              <MenuHeading>Display density</MenuHeading>
              <div className="flex gap-1 px-3 py-2">
                {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map((density) => (
                  <button
                    key={density}
                    type="button"
                    onClick={() => onDensityChange(density)}
                    className={`flex-1 rounded-[3px] border px-2 py-1 text-[12px] capitalize ${
                      densityMode === density
                        ? 'border-[var(--hz-primary-700)] bg-[var(--hz-surface-selected)] font-semibold text-[var(--hz-primary-700)]'
                        : 'border-[var(--hz-border-default)] text-[var(--hz-text-secondary)] hover:bg-[var(--hz-surface-subtle)]'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>

              <div className="border-t border-[var(--hz-border-grid)] py-1">
                <button
                  type="button"
                  onClick={() => go('my-profile')}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[var(--hz-text-secondary)]" />
                  My Profile
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--hz-danger-text)] hover:bg-[var(--hz-danger-bg)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                )}
              </div>
            </MenuPanel>
          )}
        </div>
      </div>
    </header>
  );
};
