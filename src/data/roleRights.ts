import { ScreenId, UserRole } from '../types';

export type ModuleId =
  | 'customers'
  | 'quotations'
  | 'policies'
  | 'claims'
  | 'billing'
  | 'reinsurance-treaties'
  | 'product-studio'
  | 'regulatory-admin'
  | 'providers'
  | 'intermediaries'
  | 'operations'
  | 'reporting';

/** The screen a module opens, or null for a module with no screen of its own (Operations, Reporting). */
export const moduleScreen = (id: ModuleId): ScreenId | null => (id === 'operations' || id === 'reporting' ? null : id);

export const ALL_MODULE_IDS: ModuleId[] = [
  'customers',
  'quotations',
  'policies',
  'claims',
  'billing',
  'reinsurance-treaties',
  'product-studio',
  'regulatory-admin',
  'providers',
  'intermediaries',
  'operations',
  'reporting',
];

export const MODULE_LABELS: Record<ModuleId, string> = {
  customers: 'Customers',
  quotations: 'Quotations',
  policies: 'Policies',
  claims: 'Claims',
  billing: 'Billing & Payments',
  'reinsurance-treaties': 'Reinsurance',
  'product-studio': 'Product Studio',
  'regulatory-admin': 'Admin & Regulatory',
  providers: 'Providers',
  intermediaries: 'Intermediaries',
  operations: 'Operations',
  reporting: 'Reporting',
};

export const ALL_ROLES: UserRole[] = ['executive', 'underwriter', 'claims', 'finance', 'agent'];

export const ROLE_LABELS: Record<UserRole, string> = {
  executive: 'CEO / Executive',
  underwriter: 'Senior Underwriter',
  claims: 'Claims Manager',
  finance: 'Finance Officer',
  agent: 'Broker / Field Agent',
};

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'execute';

export const ALL_PERMISSION_ACTIONS: PermissionAction[] = ['view', 'add', 'edit', 'delete', 'approve', 'execute'];

export type YesNo = 'YES' | 'NO';

export interface ApprovalLevelConfig {
  mfa: YesNo;
  password: YesNo;
  pin: YesNo;
}

export interface ModuleRights {
  permissions: Record<PermissionAction, YesNo>;
  approval_levels: Record<string, ApprovalLevelConfig>;
}

const NONE: Record<PermissionAction, YesNo> = {
  view: 'NO',
  add: 'NO',
  edit: 'NO',
  delete: 'NO',
  approve: 'NO',
  execute: 'NO',
};

const level = (mfa: YesNo = 'NO', password: YesNo = 'YES', pin: YesNo = 'NO'): ApprovalLevelConfig => ({
  mfa,
  password,
  pin,
});

function rights(
  permissions: Partial<Record<PermissionAction, YesNo>>,
  approvalLevels: Record<string, ApprovalLevelConfig> = {}
): ModuleRights {
  return { permissions: { ...NONE, ...permissions }, approval_levels: approvalLevels };
}

export type RoleRightsMap = Partial<Record<ModuleId, ModuleRights>>;

const ALL_ACTIONS_YES: Record<PermissionAction, YesNo> = {
  view: 'YES',
  add: 'YES',
  edit: 'YES',
  delete: 'YES',
  approve: 'YES',
  execute: 'YES',
};

/**
 * A per-user deviation from their Role Center's default rights for one module.
 * `permissions` overrides individual actions; `canInitiate` overrides whether
 * the user holds Delegation-of-Authority Level 0 for that module. Anything left
 * undefined falls back to the Role Center default.
 */
export interface UserPermissionOverride {
  permissions?: Partial<Record<PermissionAction, YesNo>>;
  canInitiate?: boolean;
}

export type UserPermissionOverrides = Partial<Record<ModuleId, UserPermissionOverride>>;

export const ROLE_RIGHTS: Record<UserRole, RoleRightsMap> = {
  // CEO / Executive holds full authority — every action, on every module, at every DOA level.
  executive: {
    customers: rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    quotations: rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    policies: rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    claims: rights(ALL_ACTIONS_YES, { '0': level(), '3': level('YES', 'YES', 'YES') }),
    billing: rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    'reinsurance-treaties': rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    'product-studio': rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    'regulatory-admin': rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    providers: rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    intermediaries: rights(ALL_ACTIONS_YES, { '0': level(), '2': level('YES', 'YES', 'NO') }),
    operations: rights(ALL_ACTIONS_YES, { '0': level() }),
    reporting: rights(ALL_ACTIONS_YES, { '0': level() }),
  },
  underwriter: {
    customers: rights({ view: 'YES', edit: 'YES' }, { '0': level() }),
    quotations: rights({ view: 'YES', add: 'YES', edit: 'YES', approve: 'YES' }, { '0': level(), '1': level('NO', 'YES', 'NO') }),
    policies: rights({ view: 'YES', add: 'YES', edit: 'YES', approve: 'YES' }, { '0': level(), '1': level('NO', 'YES', 'NO') }),
    claims: rights({ view: 'YES' }, { '0': level() }),
    'reinsurance-treaties': rights({ view: 'YES' }, { '0': level() }),
    'product-studio': rights({ view: 'YES' }, { '0': level() }),
    intermediaries: rights({ view: 'YES', add: 'YES', edit: 'YES' }, { '0': level() }),
    operations: rights({ view: 'YES' }, { '0': level() }),
    reporting: rights({ view: 'YES' }, { '0': level() }),
  },
  claims: {
    customers: rights({ view: 'YES' }, { '0': level() }),
    policies: rights({ view: 'YES' }, { '0': level() }),
    claims: rights({ view: 'YES', add: 'YES', edit: 'YES', approve: 'YES' }, { '0': level(), '1': level('NO', 'YES', 'NO'), '2': level('YES', 'YES', 'NO') }),
    providers: rights({ view: 'YES', add: 'YES', edit: 'YES', delete: 'YES' }, { '0': level() }),
    reporting: rights({ view: 'YES' }, { '0': level() }),
  },
  finance: {
    customers: rights({ view: 'YES' }, { '0': level() }),
    policies: rights({ view: 'YES' }, { '0': level() }),
    claims: rights({ view: 'YES' }, { '0': level() }),
    billing: rights({ view: 'YES', add: 'YES', edit: 'YES', approve: 'YES' }, { '0': level(), '1': level('NO', 'YES', 'NO') }),
    'reinsurance-treaties': rights({ view: 'YES' }, { '0': level() }),
    intermediaries: rights({ view: 'YES' }, { '0': level() }),
    operations: rights({ view: 'YES' }, { '0': level() }),
    reporting: rights({ view: 'YES' }, { '0': level() }),
  },
  agent: {
    customers: rights({ view: 'YES', add: 'YES' }, { '0': level() }),
    quotations: rights({ view: 'YES', add: 'YES' }, { '0': level() }),
    policies: rights({ view: 'YES' }, { '0': level() }),
    claims: rights({ view: 'YES' }, { '0': level() }),
    intermediaries: rights({ view: 'YES' }, { '0': level() }),
  },
};
