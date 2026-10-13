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
    user: { id: 'u1', email: 'viewer@example.test' },
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

it('renders scoped KYC readiness and offers only record drill-through', async () => {
  at('/customers/kyc', ['clients.kyc.view'], url =>
    url.includes('/clients/kyc-desk') ? json(200, {
      summary: { PENDING_VERIFICATION: 1, REVIEW_DUE: 0, REJECTED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, VERIFIED: 0 },
      results: [{
        id: 'c1', customer_no: 'CUS0001', display_name: 'Amina Kamau', customer_type: 'INDIVIDUAL',
        kyc_status: 'PENDING_VERIFICATION', home_branch: { id: 'b1', code: 'NBO', name: 'Nairobi' },
        updated_at: '2026-10-13T09:00:00Z', identifiers: 2, verified_identifiers: 1,
        documents: 3, verified_documents: 2, problem_documents: 0, due_documents: 1,
      }], count: 1, page: 1, page_size: 50,
    }) : json(200, {}));
  expect(await screen.findByText(/CUS0001/)).toBeVisible();
  expect(screen.getByText('1/2 verified')).toBeVisible();
  expect(screen.queryByRole('button', { name: /verify|approve|reject/i })).not.toBeInTheDocument();
  expect(screen.getByText(/read-only/i)).toBeVisible();
});

it('renders underwriting readiness and keeps decisions workflow-only', async () => {
  at('/underwriting/workbench', ['underwriting.proposal.view'], url =>
    url.includes('/underwriting/workbench') ? json(200, {
      summary: { REFERRED: 1, UNDER_REVIEW: 0, DRAFT: 0, READY_TO_BIND: 0, BOUND: 0, DECLINED: 0, CANCELLED: 0 },
      decisions: 'WORKFLOW_ONLY',
      results: [{
        id: 'p1', proposal_no: 'UWP0001', status: 'REFERRED',
        customer: { id: 'c1', customer_no: 'CUS0001', display_name: 'Amina Kamau' },
        branch: { id: 'b1', code: 'NBO', name: 'Nairobi' },
        insurer: { code: 'APA', name: 'APA Insurance' }, product: { code: 'MOTOR', name: 'Private Motor' },
        currency: 'KES', total_premium: '12500', created_at: '2026-10-13T08:00:00Z',
        updated_at: '2026-10-13T09:00:00Z', open_requirements: 1, open_exceptions: 2, routed_exceptions: 2,
      }], count: 1, page: 1, page_size: 50,
    }) : json(200, {}));
  expect(await screen.findByText('UWP0001')).toBeVisible();
  expect(screen.getByText('2 open · 2 in workflow')).toBeVisible();
  expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
  expect(screen.getByText(/workflow task\/instance action surface/i)).toBeVisible();
});
