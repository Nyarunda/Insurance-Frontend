import { ScreenId } from '../types';
import { ModuleId } from './roleRights';

/**
 * The permission module required to view each screen. Screens absent from this map
 * (Overview, My Profile, auth/onboarding) are accessible to any authenticated user.
 *
 * This must stay aligned with the section → moduleId groupings in Sidebar.tsx — the
 * sidebar decides what's linked, this map decides what's actually allowed to render,
 * so a screen reached by hash or stale link is guarded the same as one reached by click.
 */
export const SCREEN_MODULE_MAP: Partial<Record<ScreenId, ModuleId>> = {
  // CUSTOMERS
  customers: 'customers',
  organizations: 'customers',
  'kyc-compliance': 'customers',
  leads: 'customers',
  'customer-workspace': 'customers',
  providers: 'providers',
  'provider-workspace': 'providers',
  intermediaries: 'intermediaries',
  brokers: 'intermediaries',
  agents: 'intermediaries',
  'broker-workspace': 'intermediaries',

  // SALES & DISTRIBUTION + UNDERWRITING (share the quotations module, same as Sidebar)
  quotations: 'quotations',
  applications: 'quotations',
  bancassurance: 'quotations',
  'quote-workspace': 'quotations',
  'underwriting-workbench': 'quotations',
  referrals: 'quotations',
  'risk-assessments': 'quotations',
  inspections: 'quotations',
  'authority-doa': 'quotations',

  // POLICIES
  policies: 'policies',
  endorsements: 'policies',
  renewals: 'policies',
  cancellations: 'policies',
  certificates: 'policies',
  'policy-workspace': 'policies',

  // CLAIMS
  'claims-landing': 'claims',
  fnol: 'claims',
  assessments: 'claims',
  reserves: 'claims',
  settlements: 'claims',
  recoveries: 'claims',
  salvage: 'claims',
  'claim-workspace': 'claims',
  claims: 'claims',

  // FINANCE
  'finance-landing': 'billing',
  billing: 'billing',
  receivables: 'billing',
  payments: 'billing',
  reconciliation: 'billing',
  commissions: 'billing',
  accounting: 'billing',
  'accounting-workbench': 'billing',
  'period-close': 'billing',

  // REINSURANCE
  'reinsurance-treaties': 'reinsurance-treaties',
  'treaty-workspace': 'reinsurance-treaties',
  'reinsurance-facultative': 'reinsurance-treaties',
  'reinsurance-cessions': 'reinsurance-treaties',
  'reinsurance-recoveries': 'reinsurance-treaties',
  'reinsurance-bordereaux': 'reinsurance-treaties',

  // PRODUCTS
  products: 'product-studio',
  'product-studio': 'product-studio',
  'product-versions': 'product-studio',
  rating: 'product-studio',
  'underwriting-rules': 'product-studio',
  'product-sandbox': 'product-studio',
  'product-workspace': 'product-studio',
  'product-factory-designer': 'product-studio',
  'product-factory': 'product-studio',

  // OPERATIONS
  'integration-hub': 'operations',
  workflows: 'operations',
  'background-jobs': 'operations',
  'failed-transactions': 'operations',
  'activity-logs': 'operations',

  // REPORTING
  'reporting-operational': 'reporting',
  'reporting-financial': 'reporting',
  'reporting-claims': 'reporting',
  'reporting-underwriting': 'reporting',
  'reporting-regulatory': 'reporting',
  'reporting-bi': 'reporting',

  // ADMINISTRATION
  'admin-organization': 'regulatory-admin',
  'admin-branches': 'regulatory-admin',
  'admin-users-roles': 'regulatory-admin',
  'user-permissions-workflows': 'regulatory-admin',
  'admin-doa': 'regulatory-admin',
  'admin-workflows': 'regulatory-admin',
  'admin-documents': 'regulatory-admin',
  'admin-number-series': 'regulatory-admin',
  'regulatory-admin': 'regulatory-admin',
  'admin-integrations': 'regulatory-admin',
  'admin-audit': 'regulatory-admin',
  'admin-subscription': 'regulatory-admin',
};
