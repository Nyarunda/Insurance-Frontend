/**
 * Backend mode's navigation (FI1-Q2): only screens integrated with the backend, each shown only
 * when `/me.permissions` holds what it needs. Hiding an entry is a convenience; the route checks
 * the permission again, and the backend checks every call.
 *
 * Later slices add their screens here (FI1-B: My work, FI1-C: Policies, FI1-D: endorsements).
 */

import { Bell, BellRing, Boxes, Building2, CalendarClock, Car, ClipboardList, CreditCard, FileBadge, FileCheck2, FilePlus2, FileText, Inbox, LayoutDashboard, ListChecks, Package, RefreshCcw, Settings2, UsersRound, Workflow, type LucideIcon } from 'lucide-react';
import { CERT_STOCK, CERT_VIEW, CONFIG_PUBLISH, CUSTOMER_VIEW, POLICY_VIEW, PROPOSAL_VIEW, QUOTATION_CREATE, QUOTATION_VIEW, REFERENCE_MANAGE, RENEWAL_APPROVE, RENEWAL_CREATE, RENEWAL_SETTINGS_MANAGE, TASK_VIEW, WORKFLOW_MANAGE, WORKFLOW_VIEW } from './permissions';
import type { NavGroup, NavigationCountersResponse } from '../data/navigation';
import type { ScreenId } from '../types';

export interface BackendNavItem {
  screen: ScreenId;
  label: string;
  path: string;
  /** The permission code the screen needs (any one of a list); none for screens every signed-in user has. */
  permission?: string | readonly string[];
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
      { screen: 'notifications', label: 'Notifications', path: '/notifications/list', icon: Bell },
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
      { screen: 'intermediaries', label: 'Agents & partners', path: '/agents/list', permission: 'intermediaries.agent.view', icon: UsersRound },
      { screen: 'leads', label: 'Leads & campaigns', path: '/sales/leads', permission: 'intermediaries.sales.view', icon: UsersRound },
      { screen: 'proposals', label: 'Proposals', path: '/proposals/list', permission: PROPOSAL_VIEW, icon: ClipboardList },
      { screen: 'products', label: 'Products', path: '/products/list', permission: 'products.product.view', icon: Package },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    icon: FileCheck2,
    items: [
      { screen: 'policies', label: 'Policy Directory', path: '/policies/list', permission: POLICY_VIEW, icon: FileCheck2 },
      { screen: 'endorsements', label: 'Endorsements', path: '/endorsements/list', permission: POLICY_VIEW, icon: FileText },
      { screen: 'reporting-operational', label: 'Production', path: '/reports/production', permission: POLICY_VIEW, icon: FileText },
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
      // WRC-1: the reasons checkers choose from in My Work Queue, for tenant-wide workflow administrators.
      { screen: 'approval-reasons', label: 'Approval reasons', path: '/approval-reasons/list', permission: WORKFLOW_MANAGE, icon: ListChecks },
      // SD-E: the renewal window and offer validity. Its readers, as the route and the server: those who
      // draft and publish them, and those who prepare or approve renewals (SD-E R1).
      {
        screen: 'renewal-settings', label: 'Renewal settings', path: '/renewal-settings/list', icon: CalendarClock,
        permission: [RENEWAL_SETTINGS_MANAGE, CONFIG_PUBLISH, RENEWAL_CREATE, RENEWAL_APPROVE],
      },
      // NTF-2: which approval outcomes requesters are told about, for workflow administrators.
      { screen: 'approval-notifications', label: 'Approval notifications', path: '/approval-notifications', permission: WORKFLOW_VIEW, icon: BellRing },
      { screen: 'admin-workflows', label: 'Workflow definitions', path: '/admin/workflows/list', permission: WORKFLOW_VIEW, icon: Workflow },
    ],
  },
  {
    id: 'billing', title: 'Finance', icon: FileText,
    items: [
      { screen: 'billing', label: 'Receipts', path: '/billing/receipts/list', permission: 'billing.document.view', icon: FileText },
      { screen: 'finance-ledger', label: 'Finance ledger', path: '/billing/ledger', permission: 'billing.document.view', icon: FileText },
      { screen: 'commissions', label: 'Agent commissions', path: '/sales/agreements', permission: 'intermediaries.commission.view', icon: FileText },
      { screen: 'reporting-financial', label: 'Premium collections', path: '/billing/reports/collections', permission: 'billing.document.view', icon: FileText },
      { screen: 'accounting', label: 'Billing accounts', path: '/billing/accounts/list', permission: 'billing.setup.manage', icon: Settings2 },
      { screen: 'receivables', label: 'Collection agreements', path: '/billing/agreements/list', permission: 'billing.setup.manage', icon: FileCheck2 },
    ],
  },
  {
    id: 'administration', title: 'Administration', icon: UsersRound,
    items: [
      { screen: 'admin-users-roles', label: 'Users', path: '/admin/users/list', permission: 'admin.users.view', icon: UsersRound },
      { screen: 'admin-doa', label: 'Roles & permissions', path: '/admin/roles/list', permission: 'admin.roles.manage', icon: ListChecks },
      { screen: 'admin-integrations', label: 'Integrations', path: '/admin/integrations/list', permission: 'admin.integrations.manage', icon: Settings2 },
      { screen: 'admin-subscription', label: 'Subscription', path: '/admin/subscription', permission: 'admin.users.view', icon: CreditCard },
    ],
  },
  {
    id: 'platform', title: 'Platform', icon: Building2,
    items: [
      { screen: 'platform-tenants', label: 'Tenants', path: '/platform/tenants/list', permission: 'admin.users.view', icon: Building2 },
    ],
  },
];

/** A screen's permission as a list: holding any one of them is enough. */
export const anyOf = (permission: string | readonly string[]): readonly string[] =>
  typeof permission === 'string' ? [permission] : permission;

/** The groups and items this user may see; groups left empty are dropped. */
export function visibleNav(registry: BackendNavGroup[], permissions: readonly string[]): NavGroup[] {
  return registry
    .map((group) => ({
      id: group.id,
      title: group.title,
      icon: group.icon,
      items: group.items
        .filter((item) => !item.permission || anyOf(item.permission).some((code) => permissions.includes(code)))
        .map((item) => ({ id: item.screen, label: item.label, icon: item.icon, counter: item.counter })),
    }))
    .filter((group) => group.items.length > 0);
}

const allItems = (registry: BackendNavGroup[]) => registry.flatMap((group) => group.items);

export const pathForScreen = (screen: ScreenId, registry: BackendNavGroup[] = BACKEND_NAV): string | null =>
  allItems(registry).find((item) => item.screen === screen)?.path ?? null;

export const screenForPath = (pathname: string, registry: BackendNavGroup[] = BACKEND_NAV): ScreenId | null => {
  const items = allItems(registry);
  if (/^\/billing\/journals\//.test(pathname) && items.some(i => i.screen === 'finance-ledger')) return 'finance-ledger';
  if (/^\/sales\/(followups|campaigns|targets)(\/|$)/.test(pathname) && items.some(i => i.screen === 'leads')) return 'leads';
  if (/^\/sales\/payouts(\/|$)/.test(pathname) && items.some(i => i.screen === 'commissions')) return 'commissions';
  const exact = items.find((item) => item.path === pathname);
  if (exact) return exact.screen;
  // A list lives at `/<module>/list` and its records at `/<module>/<number>`: both belong to the list's item.
  const section = (path: string) => path.replace(/\/list$/, '');
  const nested = items
    .filter((item) => item.path !== '/' && pathname.startsWith(`${section(item.path)}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return nested?.screen ?? null;
};
