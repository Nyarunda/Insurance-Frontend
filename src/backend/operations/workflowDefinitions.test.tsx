import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const pendingMonitor = {
  pending_instances: 2,
  pending_slots: 3,
  by_definition: [{ definition_code: 'ENDORSEMENT_APPROVAL', pending_instances: 2, pending_slots: 3 }],
  results: [{
    assignment_id: 'a1', workflow_instance_id: 'w1', definition_code: 'ENDORSEMENT_APPROVAL',
    resource_type: 'ENDORSEMENT', resource_reference: 'END0000042', stage: 'CHECK',
    stage_label: 'Checker review', slot_no: 1, branch_name: 'Nairobi',
    assigned_to: { kind: 'ROLE_POOL', user_id: null, email: null, role_id: 'r1', role_name: 'ENDORSEMENT_CHECKER',
      eligible_users: [{ user_id: 'u2', email: 'checker@example.test' }] },
    assigned_at: '2026-10-13T09:00:00Z',
  }],
};

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function setup(permission = true, failure = false) {
  const me: Me = { user: { id: 'u1', email: 'u@example.test' }, tenant: { id: 't1', name: 'Assurance' }, branches: [], permissions: permission ? ['admin.workflow.view'] : [] };
  const net = fakeFetch(c => {
    if (c.url.endsWith('/auth/me')) return json(200, me);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'denied');
    if (c.url.endsWith('/workflows/pending-monitor')) return json(200, pendingMonitor);
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

it('shows pending workflow counts and who can approve without exposing decision buttons', async () => {
  setup();
  expect(await screen.findByText('END0000042')).toBeVisible();
  const summary = within(screen.getByTestId('workflow-pending-summary'));
  expect(summary.getByText('2')).toBeVisible();
  expect(summary.getByText('3')).toBeVisible();
  expect(screen.getByText(/ENDORSEMENT_CHECKER/)).toBeVisible();
  expect(screen.getByText(/checker@example.test/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
});

it('denies access without permission', async () => {
  setup(false);
  await waitFor(() => expect(screen.queryByText('Workflow definitions')).not.toBeInTheDocument());
});
