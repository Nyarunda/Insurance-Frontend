import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { queryClient } from '../../lib/query/queryClient';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';
import { BACKEND_NAV, visibleNav } from '../navigation';
import { operationsKey } from './data';
import { amountOf, cents } from './money';
import { NewReceipt, ReceiptJournal } from '../pages/BillingPages';

const branch = { id: 'branch-1', code: 'NBO', name: 'Nairobi', scope: 'ALL' };
const me: Me = { user: { id: 'actor', email: 'admin@demo.test' }, tenant: { id: 'tenant-a', name: 'Demo' }, branches: [branch], permissions: ['admin.users.view', 'admin.users.manage', 'admin.roles.manage', 'billing.document.view', 'billing.receipt.create', 'billing.receipt.reverse', 'billing.setup.manage'] };
const member = { user_id: 'person', email: 'staff@demo.test', status: 'ACTIVE', default_branch: branch, member_from: '2026-01-01', member_to: null, identity_active: true, profile_status: 'ACTIVE', roles: [{ name: 'Cashier', scope: 'BRANCH', branch_code: 'NBO' }], branch_access: [] };
function init() { setAccessToken('access'); queryClient.setQueryData(ME_QUERY_KEY, me); useSessionStore.setState({ status: 'signed-in' }); useBranchStore.getState().hydrate(me.user.id, me.branches); }
function at(path: string) { init(); const router = createMemoryRouter(backendRoutes, { initialEntries: [path] }); render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>); return router; }
beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); });
afterEach(() => vi.unstubAllGlobals());

describe('Tenant operations', () => {
  it('keys cached records by tenant, user and branch and does not advertise unauthorized surfaces', () => {
    expect(operationsKey('a:u:b', '/admin/users')).not.toEqual(operationsKey('b:u:b', '/admin/users'));
    expect(operationsKey('a:u:b', '/admin/users')).not.toEqual(operationsKey('a:v:b', '/admin/users'));
    expect(operationsKey('a:u:b', '/admin/users')).not.toEqual(operationsKey('a:u:c', '/admin/users'));
    const hidden = visibleNav(BACKEND_NAV, []).flatMap(g => g.items.map(i => i.id));
    expect(hidden).not.toContain('admin-users-roles'); expect(hidden).not.toContain('billing');
    expect(visibleNav(BACKEND_NAV, ['billing.document.view']).flatMap(g => g.items.map(i => i.id))).toContain('billing');
  });

  it('opens a user workspace with tabbed access views and uses server pagination', async () => {
    const user = userEvent.setup();
    const network = fakeFetch(c => {
      if (c.url.endsWith('/auth/me')) return json(200, me);
      if (c.url.includes('/admin/users?')) return json(200, { results: [member], count: 26, page: 1, page_size: 25 });
      if (c.url.endsWith('/admin/user-options')) return json(200, { branches: [branch], roles: [], permissions: [] });
      if (c.url.endsWith('/admin/users/person/access')) return json(200, { roles: [], branches: [], overrides: [], proposals: [] });
      if (c.url.endsWith('/admin/users/person')) return json(200, member);
      return json(200, {});
    }); vi.stubGlobal('fetch', network.fn);
    at('/admin/users/list');
    await user.click(await screen.findByTitle('Next page'));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('page=2'))).toBe(true));
    await user.click(await screen.findByRole('link', { name: member.email }));
    await user.click(await screen.findByRole('tab', { name: 'Roles' }));
    expect(network.calls.some(c => c.url.endsWith('/admin/users/person/access'))).toBe(true);
    await user.click(await screen.findByRole('tab', { name: 'Branch access' }));
    await user.click(await screen.findByRole('tab', { name: 'Restrictions' }));
    await user.click(await screen.findByRole('tab', { name: /Approvals/ }));
  });

  it('proposes a checkbox change with an idempotency key instead of silently granting it', async () => {
    const user = userEvent.setup();
    const role = { id: 'role', name: 'Cashier', description: '', origin: 'TENANT', editable: true, permissions: [] };
    const network = fakeFetch(c => {
      if (c.url.endsWith('/auth/me')) return json(200, me);
      if (c.method === 'POST') return json(200, { status: 'PENDING' });
      if (c.url.endsWith('/permission-proposals')) return json(200, []);
      if (c.url.endsWith('/admin/roles/role')) return json(200, role);
      if (c.url.endsWith('/admin/permissions')) return json(200, [{ id: 'permission', code: 'billing.document.view', module: 'billing', description: 'View receipts', grantable: true }]);
      return json(200, {});
    }); vi.stubGlobal('fetch', network.fn);
    at('/admin/roles/list/role');
    const checkbox = await screen.findByRole('checkbox', { name: 'View receipts and statements' });
    expect(screen.getByText('Billing & collections')).toBeVisible();
    expect(screen.queryByText('billing.document.view')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Show technical codes' }));
    expect(screen.getByText('billing.document.view')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: 'Show technical codes' }));
    await waitFor(() => expect(checkbox).toBeEnabled()); await user.click(checkbox);
    await user.type(screen.getByLabelText('Reason *'), 'Cashier duties');
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }));
    await waitFor(() => expect(network.calls.filter(c => c.method === 'POST')).toHaveLength(1));
    const sent = network.calls.find(c => c.method === 'POST')!;
    expect(sent.url).toContain('/permission-proposals');
    expect(sent.body).toEqual({ permission_id: 'permission', action: 'ADD', reason: 'Cashier duties' });
    expect(sent.headers['x-idempotency-key']).toBeTruthy();
    expect(checkbox).not.toBeChecked();
  });

  it('routes protected role removal through a second-administrator proposal', async () => {
    const user = userEvent.setup();
    const network = fakeFetch(c => {
      if (c.url.endsWith('/auth/me')) return json(200, me);
      if (c.method === 'POST') return json(200, { status: 'PENDING' });
      if (c.url.endsWith('/admin/user-options')) return json(200, { branches: [branch], roles: [{ id: 'checker-role', name: 'Checker', requires_approval: true }], permissions: [] });
      if (c.url.endsWith('/access')) return json(200, { roles: [{ id: 'assignment', role_id: 'checker-role', name: 'Checker', branch_id: branch.id, branch_name: branch.name, scope: 'BRANCH', effective_from: '2026-01-01', effective_to: null }], branches: [], overrides: [], proposals: [] });
      return json(200, member);
    }); vi.stubGlobal('fetch', network.fn);
    at('/admin/users/list/person?tab=roles');
    const end = await screen.findByRole('button', { name: 'End assignment' });
    await waitFor(() => expect(end).toBeEnabled()); await user.click(end);
    await user.type(screen.getByLabelText('Reason *'), 'Changed duties');
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }));
    await waitFor(() => expect(network.calls.filter(c => c.method === 'POST')).toHaveLength(1));
    const request = network.calls.find(c => c.method === 'POST')!;
    expect(request.url).toContain('/role-proposals');
    expect(request.body).toEqual({ role_id: 'checker-role', branch_id: branch.id, scope: 'BRANCH', action: 'REMOVE', reason: 'Changed duties' });
  });

  it('shows pending role proposals on the approvals tab and lets a different admin approve', async () => {
    const user = userEvent.setup();
    const pendingProposal = { id: 'prop-1', name: 'Checker', scope: 'BRANCH', branch_name: 'Nairobi', action: 'ASSIGN', reason: 'New duties', proposed_by: 'other-admin', status: 'PENDING' };
    const selfProposal = { id: 'prop-2', name: 'Auditor', scope: 'ALL', branch_name: null, action: 'REMOVE', reason: 'Left team', proposed_by: 'actor', status: 'PENDING' };
    const network = fakeFetch(c => {
      if (c.url.endsWith('/auth/me')) return json(200, me);
      if (c.method === 'POST') return json(200, { status: 'APPROVED' });
      if (c.url.endsWith('/admin/user-options')) return json(200, { branches: [branch], roles: [], permissions: [] });
      if (c.url.endsWith('/access')) return json(200, { roles: [], branches: [], overrides: [], proposals: [pendingProposal, selfProposal] });
      return json(200, member);
    }); vi.stubGlobal('fetch', network.fn);
    at('/admin/users/list/person?tab=approvals');
    expect(await screen.findByText('Assign: Checker')).toBeVisible();
    expect(screen.getByText('Remove: Auditor')).toBeVisible();
    expect(screen.getByText('You proposed — another admin must decide')).toBeVisible();
    const approveBtn = screen.getByTitle('Approve Checker');
    await user.click(approveBtn);
    await user.type(screen.getByLabelText('Reason *'), 'Confirmed');
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(network.calls.filter(c => c.method === 'POST')).toHaveLength(1));
    const sent = network.calls.find(c => c.method === 'POST')!;
    expect(sent.url).toContain('/role-proposals/prop-1/approve');
    expect(sent.body).toEqual({ reason: 'Confirmed' });
  });

  it('blocks direct navigation without fetching user records when permission is absent', async () => {
    const limited = { ...me, permissions: [] };
    const network = fakeFetch(() => json(200, limited)); vi.stubGlobal('fetch', network.fn);
    init(); queryClient.setQueryData(ME_QUERY_KEY, limited);
    const router = createMemoryRouter(backendRoutes, { initialEntries: ['/admin/users/list'] });
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Users' })).not.toBeInTheDocument());
    expect(network.calls.filter(c => c.url.includes('/admin/users'))).toHaveLength(0);
  });

  it('keeps a stale account form open and sends the exact version originally read', async () => {
    const user = userEvent.setup();
    const account = { id: 'bank', code: 'BANK01', name: 'Bank', kind: 'BANK', currency: 'KES', is_active: true, external_mapping: '', etag: '"bank-v1"' };
    const network = fakeFetch(c => {
      if (c.url.endsWith('/auth/me')) return json(200, me);
      if (c.method === 'PATCH') return envelope(412, 'CONCURRENCY_CONFLICT', 'Changed by another user; refresh the account.');
      if (c.url.endsWith('/billing/accounts')) return json(200, { results: [account] });
      if (c.url.endsWith('/billing/account-kinds')) return json(200, [{ code: 'BANK', name: 'Bank' }]);
      return json(200, {});
    }); vi.stubGlobal('fetch', network.fn);
    at('/billing/accounts/list');
    await user.click(await screen.findByTitle('Edit BANK01'));
    await user.clear(screen.getByLabelText('Name *')); await user.type(screen.getByLabelText('Name *'), 'Changed');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Name *')).toHaveValue('Changed');
    expect(network.calls.find(c => c.method === 'PATCH')?.headers['if-match']).toBe('"bank-v1"');
  });

  it('records exact decimal allocations and refuses cross-customer selection', async () => {
    const user = userEvent.setup();
    const done = vi.fn();
    const p = { id: 'policy-1', policy_no: 'POL001', customer_id: 'customer', customer_name: 'ABC Logistics', branch_id: branch.id, branch_name: branch.name, currency: 'KES' };
    const network = fakeFetch(c => {
      if (c.url.endsWith('/auth/me')) return json(200, me);
      if (c.url.includes('receipt-options/policies')) return json(200, { results: [p, { ...p, id: 'policy-2', policy_no: 'POL002', customer_id: 'other' }], count: 2 });
      if (c.url.endsWith('receipt-options/accounts')) return json(200, { results: [{ id: 'bank', code: 'BANK', name: 'Main bank', kind: 'BANK', currency: 'KES' }, { id: 'recv', code: 'RECV', name: 'Receivables', kind: 'CLIENT_RECEIVABLE', currency: 'KES' }] });
      return json(201, { id: 'receipt' });
    }); vi.stubGlobal('fetch', network.fn); init();
    render(<QueryClientProvider client={queryClient}><NewReceipt close={() => {}} done={done} /></QueryClientProvider>);
    await user.click(await screen.findByTitle('Allocate to POL001'));
    expect(screen.getByTitle('Allocate to POL002')).toBeDisabled();
    await user.type(screen.getByLabelText('Receipt amount *'), '0.30');
    await user.type(screen.getByLabelText('Payment date *'), '2026-10-11');
    await user.selectOptions(screen.getByLabelText('Payment account *'), 'bank');
    await user.selectOptions(screen.getByLabelText('Receivable account *'), 'recv');
    await user.type(screen.getByLabelText('Allocation for POL001'), '0.20');
    await user.click(screen.getByRole('button', { name: 'Post receipt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Allocate the full receipt');
    expect(network.calls.filter(c => c.method === 'POST')).toHaveLength(0);
    await user.clear(screen.getByLabelText('Allocation for POL001')); await user.type(screen.getByLabelText('Allocation for POL001'), '0.30');
    await user.click(screen.getByRole('button', { name: 'Post receipt' }));
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(network.calls.find(c => c.method === 'POST')?.body).toMatchObject({ amount: '0.30', allocations: [{ policy_id: 'policy-1', amount: '0.30', account_id: 'recv' }] });
  });

  it('keeps server receipt filters when changing pages', async () => {
    const user = userEvent.setup();
    const network = fakeFetch(c => c.url.endsWith('/auth/me') ? json(200, me) : json(200, { results: [], count: 26, page: 1, page_size: 25 }));
    vi.stubGlobal('fetch', network.fn);
    at('/billing/receipts/list?q=ABC&date_from=2026-01-01&date_to=2026-12-31');
    await user.click(await screen.findByTitle('Next page'));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('page=2') && c.url.includes('q=ABC') && c.url.includes('date_from=2026-01-01') && c.url.includes('date_to=2026-12-31'))).toBe(true));
  });

  it('shows exact server journal totals without editable posting controls', async () => {
    const network = fakeFetch(() => json(200, {
      posting_date: '2026-10-11', currency: 'KES', action: 'POST', description: 'Premium receipt',
      total_debit: '125.30', total_credit: '125.30', lines: [
        { line_no: 1, account_code: 'BANK', account_name: 'Bank', debit: '125.30', credit: '0.00', memo: '' },
        { line_no: 2, account_code: 'RECV', account_name: 'Receivable', debit: '0.00', credit: '125.30', memo: '' },
      ],
    })); vi.stubGlobal('fetch', network.fn); init();
    render(<QueryClientProvider client={queryClient}><ReceiptJournal receiptId="receipt" /></QueryClientProvider>);
    expect(await screen.findByRole('row', { name: 'Total KES 125.30 KES 125.30' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /edit|save/i })).not.toBeInTheDocument();
  });

  it('uses report filters and pagination without adding different currencies together', async () => {
    const user = userEvent.setup();
    const total = { currency: 'KES', receipt_count: 2, reversal_count: 1, gross: '12.30', reversed: '0.30', net: '12.00' };
    const network = fakeFetch(c => c.url.endsWith('/auth/me') ? json(200, me) : json(200, {
      results: [{ ...total, bucket: '2026-10-01', label: '2026-10-01' }],
      totals: [total, { ...total, currency: 'USD', gross: '10.00', reversed: '0.00', net: '10.00' }],
      count: 26, page: 1, page_size: 25, date_from: '2026-10-01', date_to: '2026-10-31', group_by: 'day', date_basis: 'POSTING_DATE',
    }));
    vi.stubGlobal('fetch', network.fn);
    at('/billing/reports/collections?date_from=2026-10-01&date_to=2026-10-31');
    await screen.findByRole('tab', { name: 'Period totals' });
    await user.click(screen.getByRole('tab', { name: 'Period totals' }));
    const totals = await screen.findByTestId('collections-totals');
    expect(within(totals).getByRole('row', { name: 'KES 2 1 12.30 0.30 12.00' })).toBeVisible();
    expect(within(totals).getByRole('row', { name: 'USD 2 1 10.00 0.00 10.00' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: /Posting date/i }));
    await user.click(screen.getByTitle('Next page'));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('page=2') && c.url.includes('date_from=2026-10-01'))).toBe(true));
    await user.selectOptions(screen.getByLabelText('Group collections by'), 'branch');
    await user.click(screen.getByRole('button', { name: 'Run report' }));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('group_by=branch') && c.url.includes('page=1'))).toBe(true));
    await user.click(screen.getByTitle('Print report page'));
    expect(await screen.findByTestId('print-document')).toHaveTextContent('Posting dates: 2026-10-01 to 2026-10-31');
  });
});

describe('Receipt amounts', () => {
  it('formats signed journal values correctly', () => { expect(amountOf(-30n)).toBe('-0.30'); expect(amountOf(-12530n)).toBe('-125.30'); expect(amountOf(0n)).toBe('0.00'); });
  it('keeps cents exact, including amounts beyond Number precision', () => { expect(amountOf(cents('0.10')! + cents('0.20')!)).toBe('0.30'); expect(amountOf(cents('9999999999999999.99')!)).toBe('9999999999999999.99'); });
  it.each(['-1', '1e3', 'NaN', 'Infinity', '1.001', '', '10000000000000000'])('refuses invalid amount %s', value => expect(cents(value)).toBeNull());
});
