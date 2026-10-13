import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { queryClient } from '../../lib/query/queryClient';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

const me: Me = { user: { id: 'actor', email: 'admin@demo.test' }, tenant: { id: 'tenant', name: 'Demo' }, branches: [{ id: 'branch', code: 'NBO', name: 'Nairobi', scope: 'ALL' }], permissions: ['intermediaries.sales.view', 'intermediaries.sales.manage', 'intermediaries.sales.approve', 'intermediaries.commission.view', 'intermediaries.commission.manage', 'intermediaries.commission.approve'] };
const lead = { id: 'lead-1', reference: 'LEAD-001', name: 'ABC Logistics', email: 'abc@example.test', phone: '', source: 'Referral', status: 'NEW', notes: '', etag: '"lead-v1"' };
const empty = { results: [], count: 0, page: 1, page_size: 25 };
function at(path: string, permissions = me.permissions) {
  setAccessToken('access'); queryClient.setQueryData(ME_QUERY_KEY, { ...me, permissions });
  useSessionStore.setState({ status: 'signed-in' }); useBranchStore.getState().hydrate(me.user.id, me.branches);
  render(<QueryClientProvider client={queryClient}><RouterProvider router={createMemoryRouter(backendRoutes, { initialEntries: [path] })} /></QueryClientProvider>);
}
beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); });
afterEach(() => vi.unstubAllGlobals());

it('opens a persisted lead and its follow-up list', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', fakeFetch(c => c.url.includes('/sales/leads?') ? json(200, { ...empty, results: [lead], count: 1 }) : c.url.endsWith('/sales/leads/lead-1') ? json(200, lead) : c.url.includes('/sales/followups?') ? json(200, empty) : json(200, me)).fn);
  at('/sales/leads');
  await user.click(await screen.findByRole('link', { name: lead.name }));
  expect(await screen.findByRole('heading', { name: lead.name })).toBeVisible();
  expect(await screen.findByRole('button', { name: 'Add follow-up' })).toBeVisible();
});

it('keeps draft values on conflict and sends the captured version', async () => {
  const user = userEvent.setup();
  const net = fakeFetch(c => c.method === 'PATCH' ? envelope(412, 'CONCURRENCY_CONFLICT', 'Record changed. Refresh before editing.') : c.url.endsWith('/sales/leads/lead-1') ? json(200, lead) : c.url.includes('/sales/followups?') ? json(200, empty) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/sales/leads/lead-1');
  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByLabelText('Name *')); await user.type(screen.getByLabelText('Name *'), 'Revised name');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(net.calls.some(c => c.method === 'PATCH')).toBe(true));
  expect(net.calls.find(c => c.method === 'PATCH')!.headers['if-match']).toBe(lead.etag);
  expect(screen.getByLabelText('Name *')).toHaveValue('Revised name');
});

it('does not offer approval to a contributor', async () => {
  vi.stubGlobal('fetch', fakeFetch(c => c.url.includes('/sales/campaigns/c1') ? json(200, { id: 'c1', name: 'October campaign', status: 'PENDING', contributors: ['actor'], etag: '"v2"' }) : json(200, me)).fn);
  at('/sales/campaigns/c1');
  await screen.findByRole('button', { name: 'Withdraw' });
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
});

it('guards commission routes independently from sales permission', async () => {
  const permissions = ['intermediaries.sales.view'];
  const net = fakeFetch(() => json(200, { ...me, permissions })); vi.stubGlobal('fetch', net.fn);
  at('/sales/agreements', permissions);
  expect(await screen.findByText(/do not have access/i)).toBeVisible();
  expect(net.calls.some(c => c.url.includes('/sales/agreements'))).toBe(false);
});

it('keeps Excel commit disabled until a valid preview exists', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', fakeFetch(c => c.url.includes('/sales/leads?') ? json(200, empty) : json(200, me)).fn);
  at('/sales/leads');
  await user.click(await screen.findByRole('button', { name: 'Import Excel' }));
  expect(screen.getByRole('button', { name: 'Import 0 leads' })).toBeDisabled();
  expect(screen.getByLabelText('Excel workbook')).toHaveAttribute('accept', '.xlsx');
});

it('creates a branch premium target with no agent or count goal', async () => {
  const user = userEvent.setup();
  const record = { id: 'target-1', name: 'Branch premium', branch_id: 'branch', branch_name: 'Nairobi', metric: 'PREMIUM', currency: 'KES', premium_goal: '250000.50', lead_goal: 0, etag: '"target-v1"' };
  const net = fakeFetch(c => c.method === 'POST' ? json(201, record) : c.url.includes('/sales/options?') ? json(200, { ...empty, results: [{ id: 'branch', name: 'Nairobi' }], count: 1 }) : c.url.includes('/sales/targets?') ? json(200, empty) : c.url.endsWith('/sales/targets/target-1') ? json(200, record) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/sales/targets');
  await user.click(await screen.findByRole('button', { name: 'New target' }));
  await user.selectOptions(screen.getByLabelText('Assignment'), 'BRANCH');
  await user.type(screen.getByLabelText('Name *'), record.name);
  await user.click(screen.getByRole('button', { name: 'Select branch' }));
  await user.click(await screen.findByRole('button', { name: 'Select' }));
  await user.type(screen.getByLabelText('Start date *'), '2026-10-01');
  await user.type(screen.getByLabelText('End date *'), '2026-12-31');
  await user.selectOptions(screen.getByLabelText('Measure *'), 'PREMIUM');
  expect(screen.queryByLabelText('Count goal *')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Premium goal *'), '250000.50');
  await user.type(screen.getByLabelText('Currency *'), 'kes');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(net.calls.find(c => c.method === 'POST')?.body).toMatchObject({ agent_id: null, branch_id: 'branch', metric: 'PREMIUM', premium_goal: '250000.5', currency: 'KES', lead_goal: 0 }));
});

it('preserves the follow-up queue when paging', async () => {
  const user = userEvent.setup();
  const net = fakeFetch(c => c.url.includes('/sales/followups?') ? json(200, { ...empty, count: 26 }) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/sales/followups');
  await user.selectOptions(await screen.findByLabelText('Follow-up queue'), 'OVERDUE');
  await user.click(await screen.findByTitle('Next page'));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('queue=OVERDUE') && c.url.includes('page=2'))).toBe(true));
});
