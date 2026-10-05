import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import { ScreenId } from '../types';
import { NavGroup, NavigationCountersResponse, findNavLocation, resolveNavScreen } from '../data/navigation';

interface SidebarProps {
  /** The groups this user may see, already filtered by the caller's permission source. */
  groups: NavGroup[];
  /** Item counters; items without a value show none. */
  counters?: Partial<NavigationCountersResponse>;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** The product mark at the top; the subtitle is usually the tenant. */
  brand?: { title: string; subtitle?: string };
  /** The bottom slot (the signed-in user), told whether the rail is collapsed. */
  footer?: (collapsed: boolean) => React.ReactNode;
}

const DEFAULT_BRAND: { title: string; subtitle?: string } = { title: 'Insurance Cloud' };
const CLOSED_GROUPS_KEY = 'hz-sidebar-closed-groups';
const MOBILE_QUERY = '(max-width: 767px)';

const readClosedGroups = (): Set<string> => {
  try {
    const stored = window.localStorage.getItem(CLOSED_GROUPS_KEY);
    return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

const writeClosedGroups = (groups: Set<string>) => {
  try {
    window.localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify([...groups]));
  } catch {
    // Storage unavailable (private window, blocked site data): open state just isn't remembered.
  }
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return isMobile;
};

/**
 * The navigation sidebar, in the Studio Admin form: a light full-height panel with the product
 * mark, labelled groups of icon items, and the signed-in user at the bottom. Collapsed, it is an
 * icon rail; on phones it is an off-canvas drawer.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  counters,
  currentScreen,
  onNavigate,
  collapsed,
  onToggleCollapse,
  brand = DEFAULT_BRAND,
  footer,
}) => {
  const isMobile = useIsMobile();
  const activeScreen = resolveNavScreen(currentScreen);
  const activeGroupId = findNavLocation(currentScreen, groups)?.group.id;

  // Every group is open unless the user closed it; the active group always shows its items.
  const [closedGroups, setClosedGroups] = useState<Set<string>>(readClosedGroups);
  const isGroupOpen = (groupId: string) => groupId === activeGroupId || !closedGroups.has(groupId);

  const toggleGroup = (groupId: string) => {
    setClosedGroups((prev) => {
      const next = new Set<string>(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      writeClosedGroups(next);
      return next;
    });
  };

  const navigate = (screen: ScreenId) => {
    onNavigate(screen, 'none');
    if (isMobile) onToggleCollapse();
  };

  // Phones: the sidebar is an off-canvas drawer. Collapsed means hidden entirely.
  if (isMobile && collapsed) return null;

  const showLabels = isMobile || !collapsed;

  const panel = (
    <aside
      id="insure-erp-sidebar"
      aria-label="Primary navigation"
      className={`flex shrink-0 flex-col border-r border-[var(--hz-sidebar-border)] bg-[var(--hz-sidebar-bg)] text-[var(--hz-sidebar-text)] transition-[width] duration-200 ease-linear select-none ${
        isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-xl' : 'z-20 h-full'
      }`}
      style={{ width: showLabels ? 'var(--hz-sidebar-width)' : 'var(--hz-sidebar-collapsed)' }}
    >
      {/* Product mark */}
      <div className={`flex items-center p-2 ${showLabels ? '' : 'justify-center'}`}>
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          title={brand.title}
          className={`flex min-w-0 items-center gap-2 rounded-md p-1.5 text-left hover:bg-[var(--hz-sidebar-bg-hover)] ${showLabels ? 'flex-1' : ''}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--hz-primary-700)] text-[var(--hz-text-inverse)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          {showLabels && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold">{brand.title}</span>
              {brand.subtitle && <span className="block truncate text-xs text-[var(--hz-sidebar-muted)]">{brand.subtitle}</span>}
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {groups.map((group) => {
          const isOpen = isGroupOpen(group.id);

          if (!showLabels) {
            return (
              <ul key={group.id} className="flex flex-col items-center gap-1 border-b border-[var(--hz-sidebar-border)] py-2 last:border-b-0">
                {group.items.map((item) => {
                  const Icon = item.icon ?? group.icon;
                  const active = item.id === activeScreen;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-path={item.id}
                        title={item.label}
                        aria-label={item.label}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => navigate(item.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                          active
                            ? 'bg-[var(--hz-sidebar-active)] text-[var(--hz-sidebar-text)]'
                            : 'text-[var(--hz-sidebar-muted)] hover:bg-[var(--hz-sidebar-bg-hover)] hover:text-[var(--hz-sidebar-text)]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            );
          }

          return (
            <div key={group.id} className="py-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="group/label flex h-8 w-full items-center justify-between rounded-md px-2 text-xs font-medium text-[var(--hz-sidebar-muted)] hover:text-[var(--hz-sidebar-text)]"
              >
                <span>{group.title}</span>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/label:opacity-100" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {isOpen && (
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon ?? group.icon;
                    const active = item.id === activeScreen;
                    const count = item.counter ? counters?.[item.counter] : undefined;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-path={item.id}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => navigate(item.id)}
                          className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                            active
                              ? 'bg-[var(--hz-sidebar-active)] font-medium text-[var(--hz-sidebar-text)]'
                              : 'text-[var(--hz-sidebar-text)] hover:bg-[var(--hz-sidebar-bg-hover)]'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {count !== undefined && count > 0 && (
                            <span className="ml-2 min-w-[20px] rounded-full bg-[var(--hz-surface-main)] px-1.5 text-center text-xs font-medium tabular-nums text-[var(--hz-text-secondary)] ring-1 ring-[var(--hz-sidebar-border)]">
                              {count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {!isMobile && (
        <div className={`px-2 pb-1 ${showLabels ? '' : 'flex justify-center'}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className={`flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-[var(--hz-sidebar-muted)] hover:bg-[var(--hz-sidebar-bg-hover)] hover:text-[var(--hz-sidebar-text)] ${
              collapsed ? 'w-8 justify-center' : 'w-full'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}

      {footer && <div className="border-t border-[var(--hz-sidebar-border)] p-2">{footer(!showLabels)}</div>}
    </aside>
  );

  if (!isMobile) return panel;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-[var(--hz-scrim)]" onClick={onToggleCollapse} aria-hidden />
      {panel}
    </>
  );
};
