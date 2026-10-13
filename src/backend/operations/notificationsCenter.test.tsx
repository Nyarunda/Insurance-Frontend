import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json } from '../../test/fetchFake';
import { notificationsResult } from '../../test/notificationsFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const me: Me = { user: { id: 'u1', email: 'u@example.test' }, tenant: { id: 't1', name: 'Assurance' }, branches: [], permissions: [] };
  const net = fakeFetch(c => {
    if (c.url.endsWith('/auth/me')) return json(200, me);
    if (c.url.includes('/my-notifications')) return json(200, notificationsResult);
    return json(200, {});
  });
  vi.stubGlobal('fetch', net.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' }); queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/notifications/list'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), net, router };
}

it('renders notifications with outcome badges and resource links', async () => {
  setup();
  expect(await screen.findByText('END0000042')).toBeVisible();
  expect(screen.getByText('UWP0000003')).toBeVisible();
  const endLink = screen.getByRole('link', { name: 'END0000042' });
  expect(endLink).toHaveAttribute('href', '/policies/list/END0000042');
  const propLink = screen.getByRole('link', { name: 'UWP0000003' });
  expect(propLink).toHaveAttribute('href', '/proposals/list/UWP0000003');
});

it('shows unread indicator and reason text', async () => {
  setup();
  await screen.findByText('END0000042');
  expect(screen.getByTitle('Unread')).toBeVisible();
  expect(screen.getByText('Loss ratio exceeds threshold')).toBeVisible();
});

it('filters to unread only', async () => {
  const { user } = setup();
  await screen.findByText('END0000042');
  await user.click(screen.getByRole('tab', { name: 'Unread' }));
  await waitFor(() => {
    expect(screen.getByText('END0000042')).toBeVisible();
    expect(screen.queryByText('UWP0000003')).not.toBeInTheDocument();
  });
});
