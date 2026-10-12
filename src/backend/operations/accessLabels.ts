/** Presentation only: permission codes remain the authorization and API identifiers. */
const modules: Record<string, string> = {
  intermediaries: 'Agents & partners',
  admin: 'Administration', billing: 'Billing & collections', certificates: 'Certificates',
  claims: 'Claims', clients: 'Customers', finance: 'Finance', insurers: 'Insurers',
  policies: 'Policies', products: 'Products & pricing', quotations: 'Quotations',
  underwriting: 'Underwriting', workflow: 'Approvals & work queues',
};
const resources: Record<string, string> = {
  'intermediaries.agent': 'agents and sub-agents',
  'admin.authority': 'approval limits', 'admin.delegation': 'delegations',
  'admin.roles': 'roles and permissions', 'admin.users': 'users', 'admin.workflow': 'approval workflows',
  'admin.integrations': 'integrations and provider credentials',
  'billing.document': 'receipts and statements', 'billing.receipt': 'receipts',
  'billing.refund': 'customer refunds', 'billing.settlement': 'insurer settlements', 'billing.setup': 'billing setup',
  'certificates.cert': 'certificates', 'certificates.stock': 'certificate stock',
  'claims.payment': 'claim payments', 'finance.payment': 'payments',
  'clients.customer': 'customers', 'clients.document': 'customer documents',
  'clients.kyc': 'KYC records', 'clients.relationship': 'customer relationships',
  'insurers.insurer': 'insurers and agreements', 'policies.endorsement': 'endorsements',
  'policies.policy': 'policies', 'policies.renewal': 'renewals', 'policies.renewal_settings': 'renewal settings',
  'products.commission': 'commission rates', 'products.config': 'product configuration',
  'products.levy': 'taxes and levies', 'products.product': 'products', 'products.rating': 'premiums',
  'products.reference': 'reference data', 'quotations.quotation': 'quotations',
  'underwriting.exception': 'underwriting exceptions', 'underwriting.proposal': 'proposals',
  'underwriting.quotation': 'underwriting quotations', 'workflow.instance': 'approval requests',
  'workflow.requester_identity': 'requester identity', 'workflow.task': 'work items',
};
const actions: Record<string, string> = {
  view: 'View', manage: 'Manage', create: 'Create', edit: 'Edit', approve: 'Approve',
  final_approve: 'Give final approval for', check: 'Review', issue: 'Issue', cancel: 'Cancel',
  reverse: 'Reverse', bind: 'Bind', publish: 'Publish', calculate: 'Calculate',
  download: 'Download', upload: 'Upload', verify: 'Verify', decline: 'Decline',
  activate: 'Activate', reassign: 'Reassign', void: 'Void', release: 'Release', restrict: 'Restrict',
};
const exceptions: Record<string, string> = {
  'admin.users.view': 'View users and invitations',
  'admin.users.manage': 'Manage users and access',
  'clients.document.restricted_download': 'Download restricted customer documents',
  'quotations.quotation.decide': 'Record quotation decisions',
  'workflow.task.view_team': 'View team work items',
  'billing.receipt.create': 'Record receipts',
};
const words = (value: string) => value.replace(/[._-]+/g, ' ').trim();
const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const moduleLabel = (code: string) => modules[code] ?? sentence(words(code));
export function permissionLabel(code: string): string {
  if (exceptions[code]) return exceptions[code];
  const parts = code.split('.');
  if (parts.length !== 3) return sentence(words(code));
  const [module, resource, action] = parts;
  return `${actions[action] ?? sentence(words(action))} ${resources[`${module}.${resource}`] ?? words(resource)}`;
}
