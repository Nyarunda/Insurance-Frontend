import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ScreenId } from '../types';
import { ModuleId } from '../data/roleRights';
import { NAV_COUNTERS, NAV_GROUPS, NavGroup, findNavLocation, resolveNavScreen } from '../data/navigation';
import { useCanAccessApplication } from '../store/permissionStore';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const OPEN_GROUPS_KEY = 'hz-sidebar-open-groups';
const MOBILE_QUERY = '(max-width: 767px)';

const readOpenGroups = (): Set<string> => {
  try {
    const stored = window.localStorage.getItem(OPEN_GROUPS_KEY);
    return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set<string>(['daily-desk']);
  } catch {
    return new Set<string>(['daily-desk']);
  }
};

const writeOpenGroups = (groups: Set<string>) => {
  try {
    window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...groups]));
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

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate, collapsed, onToggleCollapse }) => {
  // Fixed set of hook calls (rules-of-hooks safe): a live permission snapshot per module.
  const moduleAccess: Record<ModuleId, boolean> = {
    customers: useCanAccessApplication('customers'),
    quotations: useCanAccessApplication('quotations'),
    policies: useCanAccessApplication('policies'),
    claims: useCanAccessApplication('claims'),
    billing: useCanAccessApplication('billing'),
    'reinsurance-treaties': useCanAccessApplication('reinsurance-treaties'),
    'product-studio': useCanAccessApplication('product-studio'),
    'regulatory-admin': useCanAccessApplication('regulatory-admin'),
    providers: useCanAccessApplication('providers'),
    intermediaries: useCanAccessApplication('intermediaries'),
    operations: useCanAccessApplication('operations'),
    reporting: useCanAccessApplication('reporting'),
  };
  const accessKey = JSON.stringify(moduleAccess);

  const visibleGroups: NavGroup[] = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const moduleId = item.moduleId ?? group.moduleId;
          return !moduleId || moduleAccess[moduleId];
        }),
      })).filter((group) => group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessKey]
  );

  const isMobile = useIsMobile();
  const activeScreen = resolveNavScreen(currentScreen);
  const activeGroupId = findNavLocation(currentScreen)?.group.id ?? 'daily-desk';

  // Groups the user opened explicitly are remembered. The active group opens automatically
  // without being remembered, so the menu does not grow as the user moves between modules.
  const [userOpenGroups, setUserOpenGroups] = useState<Set<string>>(readOpenGroups);
  const [activeGroupClosed, setActiveGroupClosed] = useState(false);
  useEffect(() => setActiveGroupClosed(false), [activeGroupId]);

  const isGroupOpen = (groupId: string) =>
    userOpenGroups.has(groupId) || (groupId === activeGroupId && !activeGroupClosed);

  const toggleGroup = (groupId: string) => {
    const open = isGroupOpen(groupId);
    if (groupId === activeGroupId) setActiveGroupClosed(open);
    setUserOpenGroups((prev) => {
      const next = new Set<string>(prev);
      if (open) next.delete(groupId);
      else next.add(groupId);
      writeOpenGroups(next);
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
      className={`flex shrink-0 flex-col border-r border-[var(--hz-sidebar-border)] bg-[var(--hz-sidebar-bg)] text-[var(--hz-sidebar-text)] transition-[width] duration-150 select-none ${
        isMobile ? 'fixed bottom-0 left-0 z-40 shadow-lg' : 'z-20'
      }`}
      style={{
        width: showLabels ? 'var(--hz-sidebar-width)' : 'var(--hz-sidebar-collapsed)',
        top: isMobile ? 'var(--hz-topbar-height)' : undefined,
      }}
    >
      <nav className="flex-1 overflow-y-auto py-2">
        {visibleGroups.map((group) => {
          const Icon = group.icon;
          const isOpen = isGroupOpen(group.id);
          const isActiveGroup = group.id === activeGroupId;

          if (!showLabels) {
            return (
              <button
                key={group.id}
                type="button"
                title={group.title}
                aria-label={group.title}
                onClick={() => {
                  if (!isOpen) toggleGroup(group.id);
                  onToggleCollapse();
                }}
                className={`relative mx-auto my-0.5 flex h-9 w-10 items-center justify-center rounded-[3px] transition-colors ${
                  isActiveGroup
                    ? 'bg-[var(--hz-sidebar-active)] text-white'
                    : 'text-[var(--hz-sidebar-muted)] hover:bg-[var(--hz-sidebar-bg-hover)] hover:text-white'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            );
          }

          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="flex h-7 w-full items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--hz-sidebar-muted)] hover:text-[var(--hz-sidebar-text)]"
              >
                <span className={isActiveGroup ? 'text-[var(--hz-sidebar-text)]' : ''}>{group.title}</span>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {isOpen && (
                <ul className="pb-1">
                  {group.items.map((item) => {
                    const active = item.id === activeScreen;
                    const count = item.counter ? NAV_COUNTERS[item.counter] : undefined;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-path={item.id}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => navigate(item.id)}
                          className={`relative flex h-8 w-full items-center justify-between pl-7 pr-4 text-left text-[13px] transition-colors ${
                            active
                              ? 'bg-[var(--hz-sidebar-active)] font-semibold text-white'
                              : 'text-[var(--hz-sidebar-text)] hover:bg-[var(--hz-sidebar-bg-hover)]'
                          }`}
                        >
                          {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-white" aria-hidden />}
                          <span className="truncate">{item.label}</span>
                          {count !== undefined && count > 0 && (
                            <span
                              className={`ml-2 min-w-[22px] rounded-[3px] px-1.5 py-px text-center text-xs font-semibold tabular-nums ${
 active ? 'bg-white/20 text-white' : 'bg-white/10 text-[var(--hz-sidebar-text)]'
 }`}
                            >
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
        <div className="border-t border-[var(--hz-sidebar-border)] p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className={`flex h-8 w-full items-center gap-2 rounded-[3px] px-2 text-[12px] text-[var(--hz-sidebar-muted)] hover:bg-[var(--hz-sidebar-bg-hover)] hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );

  if (!isMobile) return panel;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-30 bg-[var(--hz-scrim)]"
        style={{ top: 'var(--hz-topbar-height)' }}
        onClick={onToggleCollapse}
        aria-hidden
      />
      {panel}
    </>
  );
};
