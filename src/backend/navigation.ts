/**
 * Backend mode's navigation (FI1-Q2): only screens integrated with the backend, each shown only
 * when `/me.permissions` holds what it needs. Hiding an entry is a convenience; the route checks
 * the permission again, and the backend checks every call.
 *
 * Later slices add their screens here (FI1-B: My work, FI1-C: Policies, FI1-D: endorsements).
 */

import { FileCheck2, Inbox, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { POLICY_VIEW, TASK_VIEW } from './permissions';
import type { NavGroup, NavigationCountersResponse } from '../data/navigation';
import type { ScreenId } from '../types';

export interface BackendNavItem {
  screen: ScreenId;
  label: string;
  path: string;
  /** The permission code the screen needs; none for screens every signed-in user has. */
  permission?: string;
  icon?: LucideIcon;
  /** The counter shown beside the item (the shell supplies the number). */
  counter?: keyof NavigationCountersResponse;
}

export interface BackendNavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: BackendNavItem[];
}

export const BACKEND_NAV: BackendNavGroup[] = [
  {
    id: 'daily-desk',
    title: 'Daily Desk',
    icon: LayoutDashboard,
    items: [
      { screen: 'dashboard', label: 'Home', path: '/', icon: LayoutDashboard },
      { screen: 'my-work', label: 'My Work Queue', path: '/my-work/list', permission: TASK_VIEW, icon: Inbox, counter: 'pending_tasks' },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    icon: FileCheck2,
    items: [{ screen: 'policies', label: 'Policy Directory', path: '/policies/list', permission: POLICY_VIEW, icon: FileCheck2 }],
  },
];

/** The groups and items this user may see; groups left empty are dropped. */
export function visibleNav(registry: BackendNavGroup[], permissions: readonly string[]): NavGroup[] {
  return registry
    .map((group) => ({
      id: group.id,
      title: group.title,
      icon: group.icon,
      items: group.items
        .filter((item) => !item.permission || permissions.includes(item.permission))
        .map((item) => ({ id: item.screen, label: item.label, icon: item.icon, counter: item.counter })),
    }))
    .filter((group) => group.items.length > 0);
}

const allItems = (registry: BackendNavGroup[]) => registry.flatMap((group) => group.items);

export const pathForScreen = (screen: ScreenId, registry: BackendNavGroup[] = BACKEND_NAV): string | null =>
  allItems(registry).find((item) => item.screen === screen)?.path ?? null;

export const screenForPath = (pathname: string, registry: BackendNavGroup[] = BACKEND_NAV): ScreenId | null => {
  const items = allItems(registry);
  const exact = items.find((item) => item.path === pathname);
  if (exact) return exact.screen;
  // A list lives at `/<module>/list` and its records at `/<module>/<number>`: both belong to the list's item.
  const section = (path: string) => path.replace(/\/list$/, '');
  const nested = items
    .filter((item) => item.path !== '/' && pathname.startsWith(`${section(item.path)}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return nested?.screen ?? null;
};
