/**
 * Backend mode's navigation (FI1-Q2): only screens integrated with the backend, each shown only
 * when `/me.permissions` holds what it needs. Hiding an entry is a convenience; the route checks
 * the permission again, and the backend checks every call.
 *
 * Later slices add their screens here (FI1-B: My work, FI1-C: Policies, FI1-D: endorsements).
 */

import { Boxes, Car, ClipboardList, FileBadge, FileCheck2, FilePlus2, FileText, Inbox, LayoutDashboard, RefreshCcw, Settings2, UsersRound, type LucideIcon } from 'lucide-react';
import { CERT_STOCK, CERT_VIEW, CUSTOMER_VIEW, POLICY_VIEW, PROPOSAL_VIEW, QUOTATION_CREATE, QUOTATION_VIEW, REFERENCE_MANAGE, TASK_VIEW } from './permissions';
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
      // WFH-1 R1: for everyone signed in (History: the approvals they asked for); the queue, its count and
      // reminders stay with workflow.task.view, which the page and the shell check.
      { screen: 'my-work', label: 'My Work Queue', path: '/my-work/list', icon: Inbox, counter: 'pending_tasks' },
    ],
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: UsersRound,
    items: [{ screen: 'customers', label: 'Customers', path: '/customers/list', permission: CUSTOMER_VIEW, icon: UsersRound }],
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: FileText,
    items: [
      // NB1-D: the guide through the steps; for those who can start one (a quotation's maker).
      { screen: 'new-policy', label: 'New policy', path: '/new-policy', permission: QUOTATION_CREATE, icon: FilePlus2 },
      { screen: 'quotations', label: 'Quotations', path: '/quotations/list', permission: QUOTATION_VIEW, icon: FileText },
      { screen: 'proposals', label: 'Proposals', path: '/proposals/list', permission: PROPOSAL_VIEW, icon: ClipboardList },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    icon: FileCheck2,
    items: [
      { screen: 'policies', label: 'Policy Directory', path: '/policies/list', permission: POLICY_VIEW, icon: FileCheck2 },
      // RS-C: policies due for renewal, and renewals across policies.
      { screen: 'renewals', label: 'Renewals', path: '/renewals/list', permission: POLICY_VIEW, icon: RefreshCcw },
      // CS-B: find an issued certificate by vehicle or serial.
      { screen: 'certificates', label: 'Certificates', path: '/certificates/list', permission: CERT_VIEW, icon: FileBadge },
      // CS-C: types, batches, stock and allocation, for stock managers.
      { screen: 'certificate-stock', label: 'Certificate stock', path: '/certificates/stock', permission: CERT_STOCK, icon: Boxes },
    ],
  },
  {
    id: 'setup',
    title: 'Setup',
    icon: Settings2,
    items: [
      // SD-C: the vehicle makes and models quotations choose from, for tenant-wide reference data managers.
      { screen: 'vehicle-makes', label: 'Vehicle makes', path: '/vehicle-makes/list', permission: REFERENCE_MANAGE, icon: Car },
    ],
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
