import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { endorsementListResult, emptyEndorsementList } from '../../test/endorsementListFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function setup(permission = true, failure = false) {
  const me: Me = { user: { id: 'u1', email: 'u@example.test' }, tenant: { id: 't1', name: 'Assurance' }, branches: [], permissions: permission ? ['policies.policy.view'] : [] };
  const net = fakeFetch(c => {
    if (c.url.endsWith('/auth/me')) return json(200, me);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'denied');
    if (c.url.includes('status=DRAFT')) return json(200, { ...endorsementListResult, results: [endorsementListResult.results[1]], count: 1 });
    if (c.url.includes('q=POL')) return json(200, { ...endorsementListResult, results: [endorsementListResult.results[0]], count: 1 });
    return json(200, endorsementListResult);
  });
  vi.stubGlobal('fetch', net.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' }); queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/endorsements/list'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), net, router };
}

it('renders endorsement list with links to policy workspace', async () => {
  setup();
  expect(await screen.findByText('END0001')).toBeVisible();
  expect(screen.getByText('END0002')).toBeVisible();
  const policyLink = screen.getByRole('link', { name: 'POL0000001' });
  expect(policyLink).toHaveAttribute('href', '/policies/list/POL0000001');
  const endLink = screen.getByRole('link', { name: 'END0001' });
  expect(endLink).toHaveAttribute('href', '/policies/list/POL0000001/endorsements/e1');
});

it('filters by status tab', async () => {
  const { user, net } = setup();
  await screen.findByText('END0001');
  await user.click(screen.getByRole('tab', { name: 'Draft' }));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('status=DRAFT'))).toBe(true));
  expect(await screen.findByText('END0002')).toBeVisible();
});

it('searches by endorsement or policy number', async () => {
  const { user, net } = setup();
  await screen.findByText('END0001');
  const searchInput = screen.getByPlaceholderText('Search by endorsement or policy number');
  await user.type(searchInput, 'POL');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('q=POL'))).toBe(true));
});

it('denies access without permission', async () => {
  setup(false);
  await waitFor(() => expect(screen.queryByText('Endorsements')).not.toBeInTheDocument());
});
