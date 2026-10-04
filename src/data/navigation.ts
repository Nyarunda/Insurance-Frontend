import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Cpu,
  FileCheck2,
  Landmark,
  Layers,
  LayoutDashboard,
  ShieldAlert,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ScreenId } from '../types';
import type { ModuleId } from './roleRights';

/**
 * Insurance Cloud navigation registry.
 *
 * Follows the ten visual sidebar groups of the frozen Navigation Route Map. Screens the
 * prototype already implements are mapped onto the closest locked item; screens with no
 * locked equivalent yet (for example intermediaries or product studio) stay reachable under
 * their nearest group so no existing access is lost.
 */

export interface NavItem {
  id: ScreenId;
  label: string;
  moduleId?: ModuleId;
  /** Key of NavigationCountersResponse; counters are neutral, never business-state colored. */
  counter?: keyof NavigationCountersResponse;
}

export interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  moduleId?: ModuleId;
  items: NavItem[];
}

/** GET /api/v1/navigation/counters response (Navigation Route Map Revision 1.2). */
export interface NavigationCountersResponse {
  pending_tasks: number;
  unread_notifs: number;
  kyc_pending: number;
  open_leads: number;
  expiring_quotes: number;
  pending_endors: number;
  renewals_30d: number;
  low_stock_flag: number;
  active_claims: number;
  high_reserves: number;
  pending_vch: number;
  unalloc_receipt: number;
  unposted_gl: number;
  overdue_ipf: number;
  pending_payout: number;
  dlq_count: number;
}

/** Placeholder values until the counters API exists. */
export const NAV_COUNTERS: NavigationCountersResponse = {
  pending_tasks: 12,
  unread_notifs: 4,
  kyc_pending: 7,
  open_leads: 18,
  expiring_quotes: 5,
  pending_endors: 8,
  renewals_30d: 24,
  low_stock_flag: 0,
  active_claims: 34,
  high_reserves: 3,
  pending_vch: 6,
  unalloc_receipt: 11,
  unposted_gl: 3,
  overdue_ipf: 0,
  pending_payout: 0,
  dlq_count: 0,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'daily-desk',
    title: 'Daily Desk',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'my-work', label: 'My Work Queue', counter: 'pending_tasks' },
      { id: 'notifications', label: 'Notifications', counter: 'unread_notifs' },
    ],
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: Users,
    moduleId: 'customers',
    items: [
      { id: 'customers', label: 'Customers' },
      { id: 'organizations', label: 'Organizations' },
      { id: 'kyc-compliance', label: 'KYC Compliance', counter: 'kyc_pending' },
      { id: 'intermediaries', label: 'Intermediaries', moduleId: 'intermediaries' },
      { id: 'providers', label: 'Service Providers', moduleId: 'providers' },
    ],
  },
  {
    id: 'sales-underwriting',
    title: 'Sales & Underwriting',
    icon: TrendingUp,
    moduleId: 'quotations',
    items: [
      { id: 'leads', label: 'Leads', moduleId: 'customers', counter: 'open_leads' },
      { id: 'quotations', label: 'Quotations', counter: 'expiring_quotes' },
      { id: 'underwriting-workbench', label: 'Underwriting' },
      { id: 'referrals', label: 'Referrals' },
      { id: 'risk-assessments', label: 'Risk Assessments' },
      { id: 'inspections', label: 'Inspections' },
      { id: 'products', label: 'Products', moduleId: 'product-studio' },
      { id: 'product-studio', label: 'Product Studio', moduleId: 'product-studio' },
      { id: 'underwriting-rules', label: 'Underwriting Rules', moduleId: 'product-studio' },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    icon: FileCheck2,
    moduleId: 'policies',
    items: [
      { id: 'policies', label: 'Policy Directory' },
      { id: 'endorsements', label: 'Endorsements', counter: 'pending_endors' },
      { id: 'renewals', label: 'Renewals', counter: 'renewals_30d' },
      { id: 'cancellations', label: 'Cancellations' },
      { id: 'certificates', label: 'Certificates' },
    ],
  },
  {
    id: 'claims',
    title: 'Claims',
    icon: ShieldAlert,
    moduleId: 'claims',
    items: [
      { id: 'claims', label: 'Claims', counter: 'active_claims' },
      { id: 'fnol', label: 'FNOL' },
      { id: 'assessments', label: 'Assessments' },
      { id: 'reserves', label: 'Reserves', counter: 'high_reserves' },
      { id: 'settlements', label: 'Payment Vouchers', counter: 'pending_vch' },
      { id: 'recoveries', label: 'Recoveries & Salvage' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: Landmark,
    moduleId: 'billing',
    items: [
      { id: 'payments', label: 'Receipts', counter: 'unalloc_receipt' },
      { id: 'accounting', label: 'GL Journals', counter: 'unposted_gl' },
      { id: 'billing', label: 'Billing' },
      { id: 'receivables', label: 'Receivables' },
      { id: 'reconciliation', label: 'Reconciliation' },
      { id: 'commissions', label: 'Commissions' },
      { id: 'period-close', label: 'Period Close' },
    ],
  },
  {
    id: 'reinsurance',
    title: 'Reinsurance',
    icon: Layers,
    moduleId: 'reinsurance-treaties',
    items: [
      { id: 'reinsurance-treaties', label: 'Treaties' },
      { id: 'reinsurance-facultative', label: 'Facultative' },
      { id: 'reinsurance-cessions', label: 'Cessions' },
      { id: 'reinsurance-recoveries', label: 'Recoveries' },
      { id: 'reinsurance-bordereaux', label: 'Bordereaux' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: BarChart3,
    moduleId: 'reporting',
    items: [
      { id: 'reporting-operational', label: 'Operational' },
      { id: 'reporting-financial', label: 'Financial' },
      { id: 'reporting-claims', label: 'Claims' },
      { id: 'reporting-underwriting', label: 'Underwriting' },
      { id: 'reporting-regulatory', label: 'Regulatory' },
      { id: 'reporting-bi', label: 'Business Intelligence' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Cpu,
    moduleId: 'operations',
    items: [
      { id: 'integration-hub', label: 'Integration Endpoints' },
      { id: 'activity-logs', label: 'Execution Logs' },
      { id: 'failed-transactions', label: 'Dead-Letter Queue', counter: 'dlq_count' },
      { id: 'background-jobs', label: 'Background Jobs' },
      { id: 'workflows', label: 'Workflow Monitor' },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    icon: Settings,
    moduleId: 'regulatory-admin',
    items: [
      { id: 'admin-users-roles', label: 'Users & Profiles' },
      { id: 'admin-branches', label: 'Branch Hierarchy' },
      { id: 'admin-doa', label: 'Roles & Authority' },
      { id: 'admin-workflows', label: 'Workflow Definitions' },
      { id: 'admin-organization', label: 'Organization' },
      { id: 'admin-number-series', label: 'Number Series' },
      { id: 'admin-documents', label: 'Documents' },
      { id: 'admin-integrations', label: 'Integrations' },
      { id: 'admin-audit', label: 'Audit Logs' },
      { id: 'regulatory-admin', label: 'Regulatory Desk' },
      { id: 'admin-subscription', label: 'Subscription' },
    ],
  },
];

/**
 * Screens that are not sidebar items themselves but belong under one (record workspaces,
 * aliases, and legacy entry points). Used for active-state highlighting and breadcrumbs.
 */
const SCREEN_ALIASES: Partial<Record<ScreenId, ScreenId>> = {
  'underwriter-dashboard': 'dashboard',
  'customer-workspace': 'customers',
  'provider-workspace': 'providers',
  'broker-workspace': 'intermediaries',
  brokers: 'intermediaries',
  agents: 'intermediaries',
  'quote-workspace': 'quotations',
  applications: 'quotations',
  bancassurance: 'quotations',
  'policy-workspace': 'policies',
  'claim-workspace': 'claims',
  'claims-landing': 'claims',
  salvage: 'recoveries',
  'treaty-workspace': 'reinsurance-treaties',
  'product-workspace': 'products',
  'product-factory': 'product-studio',
  'product-factory-designer': 'product-studio',
  'product-versions': 'products',
  rating: 'product-studio',
  'product-sandbox': 'product-studio',
  'finance-landing': 'accounting',
  'accounting-workbench': 'accounting',
  'user-permissions-workflows': 'admin-users-roles',
  'authority-doa': 'admin-doa',
};

export function resolveNavScreen(screen: ScreenId): ScreenId {
  return SCREEN_ALIASES[screen] ?? screen;
}

export function findNavLocation(
  screen: ScreenId,
  groups: NavGroup[] = NAV_GROUPS,
): { group: NavGroup; item: NavItem } | null {
  const target = resolveNavScreen(screen);
  for (const group of groups) {
    const item = group.items.find((candidate) => candidate.id === target);
    if (item) return { group, item };
  }
  return null;
}

/** Record workspaces show the record reference as the last breadcrumb segment. */
export const RECORD_WORKSPACE_SCREENS: ReadonlySet<ScreenId> = new Set<ScreenId>([
  'customer-workspace',
  'provider-workspace',
  'broker-workspace',
  'quote-workspace',
  'policy-workspace',
  'claim-workspace',
  'treaty-workspace',
  'product-workspace',
]);
