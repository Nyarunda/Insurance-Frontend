/**
 * Backend mode's navigation (FI1-Q2): only screens integrated with the backend, each shown only
 * when `/me.permissions` holds what it needs. Hiding an entry is a convenience; the route checks
 * the permission again, and the backend checks every call.
 *
 * Later slices add their screens here (FI1-B: My work, FI1-C: Policies).
 */

import { LayoutDashboard, type LucideIcon } from 'lucide-react';
import type { NavGroup } from '../data/navigation';
import type { ScreenId } from '../types';

export interface BackendNavItem {
  screen: ScreenId;
  label: string;
  path: string;
  /** The permission code the screen needs; none for screens every signed-in user has. */
  permission?: string;
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
    items: [{ screen: 'dashboard', label: 'Home', path: '/' }],
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
        .map((item) => ({ id: item.screen, label: item.label })),
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
  const nested = items
    .filter((item) => item.path !== '/' && pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return nested?.screen ?? null;
};
