import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

function at(path: string, permissions: string[], responder: (url: string) => Response) {
  const me: Me = {
    user: { id: 'u1', email: 'admin@example.test' },
    tenant: { id: 't1', name: 'Demo' },
    branches: [],
    permissions,
  };
  const network = fakeFetch(call => {
    if (call.url.endsWith('/auth/me')) return json(200, me);
    return responder(call.url);
  });
  vi.stubGlobal('fetch', network.fn);
  setAccessToken('test');
  useSessionStore.setState({ status: 'signed-in' });
  queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: [path] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
}

it('renders the read-only branch hierarchy', async () => {
  at('/admin/branches', ['admin.users.view'], url =>
    url.endsWith('/admin/branch-hierarchy') ? json(200, {
      summary: { regions: 1, branches: 1, active_branches: 1,
        head_office: { id: 'b1', code: 'NBO', name: 'Nairobi', is_head_office: true, is_active: true, default_users: 3 } },
      regions: [{ id: 'r1', code: 'NRB', name: 'Nairobi Region', is_active: true,
        branches: [{ id: 'b1', code: 'NBO', name: 'Nairobi', is_head_office: true, is_active: true, default_users: 3 }] }],
      unassigned_branches: [], read_only: true,
    }) : json(200, {}));
  expect(await screen.findByText('Nairobi Region')).toBeVisible();
  expect(screen.getByText(/read-only by design/i)).toBeVisible();
  expect(screen.queryByRole('button', { name: /create branch|new branch/i })).not.toBeInTheDocument();
});

it('shows delegation ownership and never exposes an approval shortcut', async () => {
  at('/admin/delegations', ['admin.delegation.view'], url => {
    if (url.includes('/workflows/delegations/options')) return json(200, {
      members: [], definitions: [{ code: 'POLICY_ENDORSEMENT_APPROVAL', name: 'Policy endorsement approval' }], branches: [],
    });
    if (url.includes('/workflows/delegations')) return json(200, {
      results: [{
        id: 'd1', delegator_user_id: 'u2', delegator_email: 'maker@example.test',
        delegate_user_id: 'u3', delegate_email: 'delegate@example.test',
        definition_codes: ['POLICY_ENDORSEMENT_APPROVAL'], max_amount: null, currency: 'KES',
        branch_id: null, branch_name: null, effective_from: '2026-10-13T10:00:00Z',
        effective_to: '2026-10-15T10:00:00Z', reason: 'Leave', status: 'ACTIVE',
        created_by: 'u2', created_by_email: 'maker@example.test', created_at: '2026-10-13T09:00:00Z',
        revoked_by: null, revoked_by_email: null, revoked_at: null,
      }], count: 1, page: 1, page_size: 50,
    });
    return json(200, {});
  });
  expect(await screen.findByText('maker@example.test')).toBeVisible();
  expect(screen.getByText('delegate@example.test')).toBeVisible();
  expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'New delegation' })).not.toBeInTheDocument();
});

it('renders audit metadata without before/after payloads', async () => {
  at('/admin/audit', ['admin.audit.view'], url =>
    url.includes('/admin/audit-logs') ? json(200, {
      results: [{
        id: 'a1', timestamp: '2026-10-13T10:00:00Z', actor_id: 'u2', actor_email: 'auditor@example.test',
        ip_address: '127.0.0.1', correlation_id: 'corr-1', action: 'WORKFLOW_DELEGATION_CREATED',
        resource_type: 'WORKFLOW_DELEGATION', resource_id: 'd1',
      }], count: 1, page: 1, page_size: 50, payloads_exposed: false,
    }) : json(200, {}));
  expect(await screen.findByText('WORKFLOW_DELEGATION_CREATED')).toBeVisible();
  expect(screen.getByText('auditor@example.test')).toBeVisible();
  expect(screen.getByText(/before\/after payloads are intentionally not exposed/i)).toBeVisible();
});
