import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  GitBranch,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  UserCheck,
} from 'lucide-react';
import { DensityMode, ScreenId } from '../types';

/**
 * The shell's top bar. It holds no data of its own: the mock demo and the backend mode each pass
 * what they have, and a section with nothing passed is not shown.
 */

export interface TopBarOption {
  id: string;
  name: string;
  detail?: string;
}

export interface TopBarTenant {
  name: string;
  /** Only the mock demo can switch tenants; in backend mode the tenant is the page's host. */
  options?: TopBarOption[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

export interface TopBarBranch {
  label: string;
  heading: string;
  options: TopBarOption[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  /** When set, an option that clears the choice. */
  allLabel?: string;
  /** Shown in the menu when there is nothing to choose. */
  emptyText?: string;
}

export interface TopBarRoleCenter {
  currentLabel: string;
  options: TopBarOption[];
  activeId: string;
  onSelect: (id: string) => void;
}

export interface TopBarNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  urgent: boolean;
  screen: ScreenId;
}

export interface TopBarQuickAction {
  label: string;
  screen: ScreenId;
  icon: React.ElementType;
}

interface GlobalTopBarProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenCommandPalette?: () => void;
  onToggleSidebar: () => void;
  tenant: TopBarTenant;
  branch: TopBarBranch;
  user: { name: string; email?: string };
  roleCenter?: TopBarRoleCenter;
  densityMode: DensityMode;
  onDensityChange: (density: DensityMode) => void;
  notifications?: { items: TopBarNotification[]; unread: number; badge?: string };
  quickActions?: TopBarQuickAction[];
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

type MenuId = 'tenant' | 'branch' | 'new' | 'alerts' | 'help' | 'user' | null;

const SHORTCUTS: Array<{ keys: string; action: string; needsSearch?: boolean }> = [
  { keys: 'Ctrl + K', action: 'Search customers, policies, claims, vouchers', needsSearch: true },
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
  tenant,
  branch,
  user,
  roleCenter,
  densityMode,
  onDensityChange,
  notifications,
  quickActions,
  onOpenProfile,
  onLogout,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const barRef = useRef<HTMLElement>(null);
  const shortcuts = SHORTCUTS.filter((shortcut) => !shortcut.needsSearch || onOpenCommandPalette);

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

  const userName = user.name || 'Signed-in user';
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
          {tenant.options?.length ? (
            <button type="button" onClick={() => toggle('tenant')} className={barButton} aria-haspopup="menu" aria-expanded={openMenu === 'tenant'}>
              <Building2 className="h-3.5 w-3.5 text-[var(--hz-sidebar-muted)]" />
              <span className="max-w-[180px] truncate font-semibold text-white">{tenant.name}</span>
              <ChevronDown className="h-3 w-3 text-[var(--hz-sidebar-muted)]" />
            </button>
          ) : (
            <span className={barButton} data-testid="tenant-name">
              <Building2 className="h-3.5 w-3.5 text-[var(--hz-sidebar-muted)]" />
              <span className="max-w-[180px] truncate font-semibold text-white">{tenant.name}</span>
            </span>
          )}
          {openMenu === 'tenant' && tenant.options && (
            <MenuPanel align="left">
              <MenuHeading>Switch tenant</MenuHeading>
              {tenant.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    tenant.onSelect?.(option.id);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <span>
                    <span className="block font-semibold">{option.name}</span>
                    {option.detail && <span className="block text-[12px] text-[var(--hz-text-muted)]">{option.detail}</span>}
                  </span>
                  {tenant.activeId === option.id && <Check className="mt-0.5 h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                </button>
              ))}
            </MenuPanel>
          )}
        </div>

        {/* Branch */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => toggle('branch')}
            className={barButton}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'branch'}
            aria-label={`Branch: ${branch.label}`}
          >
            <GitBranch className="h-3.5 w-3.5 text-[var(--hz-sidebar-muted)]" />
            <span className="max-w-[170px] truncate">{branch.label}</span>
            <ChevronDown className="h-3 w-3 text-[var(--hz-sidebar-muted)]" />
          </button>
          {openMenu === 'branch' && (
            <MenuPanel align="left">
              <MenuHeading>{branch.heading}</MenuHeading>
              {branch.options.length === 0 && branch.emptyText && (
                <div className="px-3 py-2 text-[12px] text-[var(--hz-text-muted)]">{branch.emptyText}</div>
              )}
              {branch.allLabel && branch.options.length > 0 && (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={branch.activeId === null}
                  onClick={() => {
                    branch.onSelect(null);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <span className="block font-semibold">{branch.allLabel}</span>
                  {branch.activeId === null && <Check className="mt-0.5 h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                </button>
              )}
              {branch.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={branch.activeId === option.id}
                  onClick={() => {
                    branch.onSelect(option.id);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--hz-surface-subtle)]"
                >
                  <span>
                    <span className="block font-semibold">{option.name}</span>
                    {option.detail && <span className="block text-[12px] text-[var(--hz-text-muted)]">{option.detail}</span>}
                  </span>
                  {branch.activeId === option.id && <Check className="mt-0.5 h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                </button>
              ))}
            </MenuPanel>
          )}
        </div>

        {/* Global search trigger */}
        {onOpenCommandPalette && (
        <>
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
        </>
        )}
      </div>

      {/* Right: new record, alerts, help, user */}
      <div className="flex shrink-0 items-center gap-0.5">
        {quickActions && quickActions.length > 0 && (
        <div className="relative">
          <button type="button" onClick={() => toggle('new')} className={barButton} title="Create a new record" aria-haspopup="menu">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">New</span>
          </button>
          {openMenu === 'new' && (
            <MenuPanel width="w-60">
              <MenuHeading>Create</MenuHeading>
              {quickActions.map(({ label, screen, icon: Icon }) => (
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
        )}

        {notifications && (
        <div className="relative">
          <button type="button" onClick={() => toggle('alerts')} className={barButton} title="Notifications" aria-haspopup="menu">
            <Bell className="h-4 w-4" />
            <span className="rounded-[3px] bg-white/15 px-1 text-xs font-semibold tabular-nums text-white">{notifications.unread}</span>
          </button>
          {openMenu === 'alerts' && (
            <MenuPanel width="w-80">
              <div className="flex items-center justify-between border-b border-[var(--hz-border-grid)] px-3 py-1.5">
                <span className="hz-section-label">Notifications</span>
                {notifications.badge && (
                  <span className="rounded-[3px] border border-[var(--hz-danger-border)] bg-[var(--hz-danger-bg)] px-1.5 text-xs font-semibold text-[var(--hz-danger-text)]">
                    {notifications.badge}
                  </span>
                )}
              </div>
              <div className="max-h-80 divide-y divide-[var(--hz-border-grid)] overflow-y-auto">
                {notifications.items.map((notification) => (
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
        )}

        <div className="relative">
          <button type="button" onClick={() => toggle('help')} className={`${barButton} w-8 justify-center`} title="Keyboard shortcuts and help">
            <HelpCircle className="h-4 w-4" />
          </button>
          {openMenu === 'help' && (
            <MenuPanel width="w-80">
              <MenuHeading>Keyboard shortcuts</MenuHeading>
              <dl className="px-3 py-1.5">
                {shortcuts.map((shortcut) => (
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
          <button type="button" onClick={() => toggle('user')} className={barButton} aria-haspopup="menu" aria-label="Account menu">
            <span className="hidden max-w-[140px] truncate font-semibold text-white sm:inline">{shortName}</span>
            <UserCheck className="h-4 w-4 sm:hidden" />
            <ChevronDown className="h-3 w-3 text-[var(--hz-sidebar-muted)]" />
          </button>
          {openMenu === 'user' && (
            <MenuPanel width="w-72">
              <div className="border-b border-[var(--hz-border-grid)] px-3 py-2">
                <div className="font-semibold">{userName}</div>
                {user.email && <div className="text-[12px] text-[var(--hz-text-muted)]">{user.email}</div>}
                {roleCenter && (
                  <div className="mt-1 text-[12px] text-[var(--hz-text-secondary)]">
                    Role center: <span className="font-semibold text-[var(--hz-text-primary)]">{roleCenter.currentLabel}</span>
                  </div>
                )}
              </div>

              {roleCenter && (
                <>
                  <MenuHeading>Switch role center</MenuHeading>
                  {roleCenter.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        roleCenter.onSelect(option.id);
                        setOpenMenu(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[var(--hz-surface-subtle)]"
                    >
                      <span>{option.name}</span>
                      {roleCenter.activeId === option.id && <Check className="h-3.5 w-3.5 text-[var(--hz-primary-700)]" />}
                    </button>
                  ))}
                </>
              )}

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
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      onOpenProfile();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--hz-surface-subtle)]"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-[var(--hz-text-secondary)]" />
                    My Profile
                  </button>
                )}
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
