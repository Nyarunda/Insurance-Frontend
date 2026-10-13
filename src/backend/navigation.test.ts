import { resolveNavScreen } from '../data/navigation';
import { LayoutDashboard } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { BACKEND_NAV, BackendNavGroup, pathForScreen, screenForPath, visibleNav } from './navigation';

const REGISTRY: BackendNavGroup[] = [
  {
    id: 'daily-desk',
    title: 'Daily Desk',
    icon: LayoutDashboard,
    items: [
      { screen: 'dashboard', label: 'Home', path: '/' },
      { screen: 'my-work', label: 'My work', path: '/my-work', permission: 'workflow.task.view' },
    ],
  },
  {
    id: 'policy-admin',
    title: 'Policy Admin',
    icon: LayoutDashboard,
    items: [{ screen: 'policies', label: 'Policies', path: '/policies', permission: 'policies.policy.view' }],
  },
];

describe('permission-driven navigation', () => {
  it('shows an item only when /me.permissions holds its permission', () => {
    const groups = visibleNav(REGISTRY, ['workflow.task.view']);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([['dashboard', 'my-work']]);
  });

  it('drops a group with nothing visible', () => {
    expect(visibleNav(REGISTRY, []).map((group) => group.id)).toEqual(['daily-desk']);
  });

  it('shows everything the permissions allow', () => {
    expect(visibleNav(REGISTRY, ['workflow.task.view', 'policies.policy.view']).flatMap((group) => group.items)).toHaveLength(3);
  });

  it('maps screens and paths both ways, including record paths', () => {
    expect(pathForScreen('my-work', REGISTRY)).toBe('/my-work');
    expect(screenForPath('/policies', REGISTRY)).toBe('policies');
    expect(screenForPath('/policies/abc', REGISTRY)).toBe('policies');
    expect(screenForPath('/nowhere', REGISTRY)).toBeNull();
  });

  it('puts every list at /<module>/list, and its records under the list, on the same item', () => {
    expect(pathForScreen('my-work')).toBe('/my-work/list');
    expect(pathForScreen('policies')).toBe('/policies/list');
    expect(screenForPath('/policies/list')).toBe('policies');
    expect(screenForPath('/policies/list/POL0000001')).toBe('policies');
    expect(screenForPath('/policies/list/POL0000001/endorsements/END0000001')).toBe('policies');
    expect(screenForPath('/my-work/list')).toBe('my-work');
    expect(screenForPath('/my-work/list/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe('my-work');
  });

  it('every item is its own screen: no demo-era alias folds it into another item (Proposals, New policy)', () => {
    for (const item of BACKEND_NAV.flatMap((group) => group.items)) expect(resolveNavScreen(item.screen), item.label).toBe(item.screen);
    expect(screenForPath('/proposals/list/UWP0000002')).toBe('proposals');
    expect(screenForPath('/certificates/list')).toBe('certificates');
    expect(screenForPath('/certificates/list/CK0000011')).toBe('certificates');
    expect(screenForPath('/certificates/stock')).toBe('certificate-stock');
    expect(screenForPath('/vehicle-makes/list')).toBe('vehicle-makes');
    expect(screenForPath('/renewals/list')).toBe('renewals');
    expect(screenForPath('/renewals/list/REN0000001')).toBe('renewals');
    expect(screenForPath('/approval-reasons/list')).toBe('approval-reasons');
    expect(screenForPath('/new-policy')).toBe('new-policy');
    expect(screenForPath('/billing/ledger')).toBe('finance-ledger');
    expect(screenForPath('/billing/journals/record')).toBe('finance-ledger');
    expect(screenForPath('/quotations/list/QUO0000002')).toBe('quotations');
  });

  it('integrates all nav items including setup surfaces (insurers, insurance classes, levy/commission rates), workflow and admin screens', () => {
    expect(BACKEND_NAV.flatMap((group) => group.items).map((item) => [item.screen, item.permission ?? null])).toEqual([
      ['dashboard', null],
      ['my-work', null],
      ['notifications', null],
      ['customers', 'clients.customer.view'],
      ['kyc-compliance', 'clients.kyc.view'],
      ['new-policy', 'quotations.quotation.create'],
      ['quotations', 'quotations.quotation.view'],
      ['intermediaries', 'intermediaries.agent.view'],
      ['leads', 'intermediaries.sales.view'],
      ['proposals', 'underwriting.proposal.view'],
      ['underwriting-workbench', 'underwriting.proposal.view'],
      ['products', 'products.product.view'],
      ['policies', 'policies.policy.view'],
      ['endorsements', 'policies.policy.view'],
      ['reporting-operational', 'policies.policy.view'],
      ['renewals', 'policies.policy.view'],
      ['certificates', 'certificates.cert.view'],
      ['certificate-stock', 'certificates.stock.manage'],
      ['insurers', 'insurers.insurer.view'],
      ['insurance-classes', 'products.product.view'],
      ['levy-rates', 'products.product.view'],
      ['commission-rates', 'products.commission.view'],
      ['vehicle-makes', 'products.reference.manage'],
      ['approval-reasons', 'admin.workflow.manage'],
      ['renewal-settings', ['policies.renewal_settings.manage', 'products.config.publish', 'policies.renewal.create', 'policies.renewal.approve']],
      ['approval-notifications', 'admin.workflow.view'],
      ['admin-workflows', 'admin.workflow.view'],
      ['billing', 'billing.document.view'],
      ['finance-ledger', 'billing.document.view'],
      ['commissions', 'intermediaries.commission.view'],
      ['reporting-financial', 'billing.document.view'],
      ['accounting', 'billing.setup.manage'],
      ['receivables', 'billing.setup.manage'],
      ['admin-users-roles', 'admin.users.view'],
      ['admin-branches', 'admin.users.view'],
      ['admin-delegations', ['admin.delegation.view', 'admin.delegation.manage']],
      ['admin-audit', 'admin.audit.view'],
      ['admin-doa', 'admin.roles.manage'],
      ['admin-integrations', 'admin.integrations.manage'],
      ['admin-subscription', 'admin.users.view'],
      ['platform-tenants', 'admin.users.view'],
    ]);
  });
});
