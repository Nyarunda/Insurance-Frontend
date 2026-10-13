import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { workflowDefinitionsResult } from '../../test/notificationsFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function setup(permission = true, failure = false) {
  const me: Me = { user: { id: 'u1', email: 'u@example.test' }, tenant: { id: 't1', name: 'Assurance' }, branches: [], permissions: permission ? ['admin.workflow.view'] : [] };
  const net = fakeFetch(c => {
    if (c.url.endsWith('/auth/me')) return json(200, me);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'denied');
    return json(200, workflowDefinitionsResult);
  });
  vi.stubGlobal('fetch', net.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' }); queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/admin/workflows/list'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), net, router };
}

it('renders workflow definitions with readiness status', async () => {
  setup();
  const rows = await screen.findAllByText('Endorsement approval');
  expect(rows[0]).toBeVisible();
  expect(screen.getByText('Proposal approval')).toBeVisible();
  expect(screen.getByText('Active')).toBeVisible();
  expect(screen.getByText('Installed')).toBeVisible();
  expect(screen.getByText('Unstaffed')).toBeVisible();
});

it('shows staffing gaps', async () => {
  setup();
  expect(await screen.findByText('No checker assigned in branch Mombasa')).toBeVisible();
});

it('denies access without permission', async () => {
  setup(false);
  await waitFor(() => expect(screen.queryByText('Workflow definitions')).not.toBeInTheDocument());
});
