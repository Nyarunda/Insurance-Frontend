import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeFetch, json } from '../../test/fetchFake';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { queryClient } from '../../lib/query/queryClient';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function at(path: string, permissions: string[], responder: (url: string, method: string, body: unknown) => Response) {
  const me: Me = { user: { id: 'u1', email: 'admin@example.test' }, tenant: { id: 't1', name: 'Demo' }, branches: [], permissions };
  const network = fakeFetch(call => {
    if (call.url.endsWith('/auth/me')) return json(200, me);
    return responder(call.url, call.method, call.body);
  });
  vi.stubGlobal('fetch', network.fn);
  setAccessToken('test');
  useSessionStore.setState({ status: 'signed-in' });
  queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: [path] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), network };
}

const hierarchy = {
  regions: [{ id: 'r1', code: 'NRB', name: 'Nairobi', is_active: true, etag: '"region-1"' }],
  branches: [{ id: 'b1', code: 'HO', name: 'Head Office', is_head_office: true, is_active: true,
    etag: '"branch-1"', region: { id: 'r1', code: 'NRB', name: 'Nairobi' } }],
};

it('shows branch hierarchy read-only to viewers', async () => {
  at('/admin/branches/list', ['admin.users.view'], url =>
    url.endsWith('/admin/branch-hierarchy') ? json(200, hierarchy) : json(200, {}));
  expect(await screen.findByText('Head Office')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'New branch' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

it('sends the branch ETag when a tenant-wide manager edits the hierarchy', async () => {
  const { user, network } = at('/admin/branches/list', ['admin.users.view', 'admin.users.manage'], (url, method) => {
    if (url.endsWith('/admin/branch-hierarchy')) return json(200, hierarchy);
    if (method === 'PATCH') return json(200, { ...hierarchy.branches[0], name: 'HQ' });
    return json(200, {});
  });
  await screen.findByText('Head Office');
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  const dialog = screen.getByRole('dialog');
  const name = within(dialog).getByLabelText('Name *');
  await user.clear(name); await user.type(name, 'HQ');
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(network.calls.some(c => c.method === 'PATCH')).toBe(true));
  const call = network.calls.find(c => c.method === 'PATCH')!;
  expect(call.headers['if-match']).toBe('"branch-1"');
});

it('delegations can be revoked but never approved or rejected from administration', async () => {
  const row = {
    id: 'd1', delegator_email: 'maker@example.test', delegate_email: 'checker@example.test',
    max_amount: null, currency: 'KES', branch_id: null,
    effective_from: '2026-10-13T10:00:00Z', effective_to: '2026-10-14T10:00:00Z',
    reason: 'Leave', status: 'ACTIVE', definitions: ['ENDORSEMENT_APPROVAL'], etag: '"delegation-1"',
  };
  const { user, network } = at('/admin/delegations/list', ['admin.delegation.view', 'admin.delegation.manage'], (url, method) => {
    if (url.endsWith('/workflows/delegations/options')) return json(200, {
      users: [{ id: 'u1', email: 'maker@example.test' }, { id: 'u2', email: 'checker@example.test' }],
      definitions: [{ code: 'ENDORSEMENT_APPROVAL', name: 'Endorsement approval' }],
      branches: [], delegation_max_days: 30,
    });
    if (url.endsWith('/workflows/delegations')) return json(200, { results: [row] });
    if (method === 'POST' && url.endsWith('/workflows/delegations/d1/revoke')) return json(200, { ...row, status: 'REVOKED', etag: '"delegation-2"' });
    return json(200, {});
  });
  expect(await screen.findByText('maker@example.test')).toBeVisible();
  expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Revoke' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Reason *'), 'Returned');
  await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
  await waitFor(() => expect(network.calls.some(c => c.url.endsWith('/workflows/delegations/d1/revoke'))).toBe(true));
  const call = network.calls.find(c => c.url.endsWith('/workflows/delegations/d1/revoke'))!;
  expect(call.headers['if-match']).toBe('"delegation-1"');
  expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
});

it('renders the append-only audit directory for audit viewers', async () => {
  at('/admin/audit-logs/list', ['admin.audit.view'], url =>
    url.includes('/admin/audit-logs?') ? json(200, { count: 1, page: 1, page_size: 50, results: [{
      id: 'a1', actor_id: 'u1', actor_email: 'admin@example.test', timestamp: '2026-10-13T10:00:00Z',
      ip_address: null, correlation_id: 'corr-1', action: 'BRANCH_UPDATED', resource_type: 'BRANCH', resource_id: 'b1',
    }] }) : json(200, {}));
  expect(await screen.findByText('BRANCH_UPDATED')).toBeVisible();
  expect(screen.getByText('admin@example.test')).toBeVisible();
});


it('audit detail shows metadata only, even if an upstream adds sensitive JSON', async () => {
  at('/admin/audit-logs/list/a1', ['admin.audit.view'], url =>
    url.endsWith('/admin/audit-logs/a1')
      ? json(200, {
          id: 'a1', actor_id: 'u1', actor_email: 'admin@example.test',
          timestamp: '2026-10-13T10:00:00Z', ip_address: null,
          correlation_id: 'trace-a1', action: 'BRANCH_UPDATED',
          resource_type: 'BRANCH', resource_id: 'b1',
          payloads_exposed: false,
          before_state: { private: 'DO_NOT_SHOW_AUDIT_SECRET' },
          after_state: { private: 'DO_NOT_SHOW_AUDIT_SECRET' },
        })
      : json(200, {}));
  expect(await screen.findByText('Audit event')).toBeVisible();
  expect(screen.getByText(/payloads are not disclosed/i)).toBeVisible();
  expect(screen.queryByText(/DO_NOT_SHOW_AUDIT_SECRET/)).not.toBeInTheDocument();
});
