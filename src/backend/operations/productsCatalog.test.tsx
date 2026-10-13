import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { productsResult } from '../../test/notificationsFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function setup(permission = true, failure = false) {
  const me: Me = { user: { id: 'u1', email: 'u@example.test' }, tenant: { id: 't1', name: 'Assurance' }, branches: [], permissions: permission ? ['products.product.view'] : [] };
  const net = fakeFetch(c => {
    if (c.url.endsWith('/auth/me')) return json(200, me);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'denied');
    if (c.url.includes('status=ACTIVE')) return json(200, { results: [productsResult.results[0]] });
    if (c.url.includes('q=TPO')) return json(200, { results: [productsResult.results[1]] });
    return json(200, productsResult);
  });
  vi.stubGlobal('fetch', net.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' }); queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/products/list'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), net, router };
}

it('renders product catalog with insurer and class', async () => {
  setup();
  expect(await screen.findByText('MOT-COMP')).toBeVisible();
  expect(screen.getByText('Motor Comprehensive')).toBeVisible();
  expect(screen.getAllByText('APA Insurance')).toHaveLength(2);
  expect(screen.getAllByText('Motor (MOT)')).toHaveLength(2);
});

it('filters by status tab', async () => {
  const { user, net } = setup();
  await screen.findByText('MOT-COMP');
  await user.click(screen.getByRole('tab', { name: 'Active' }));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('status=ACTIVE'))).toBe(true));
});

it('searches by code or name', async () => {
  const { user, net } = setup();
  await screen.findByText('MOT-COMP');
  await user.type(screen.getByPlaceholderText('Search by code or name'), 'TPO');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('q=TPO'))).toBe(true));
});

it('denies access without permission', async () => {
  setup(false);
  await waitFor(() => expect(screen.queryByText('Products')).not.toBeInTheDocument());
});
