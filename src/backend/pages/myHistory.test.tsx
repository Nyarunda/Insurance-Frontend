import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFetch, json } from '../../test/fetchFake';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import type { HistoryRow } from '../workflow/types';
import { NO_HISTORY_TEXT } from './WorkQueuePage';

const CHECKER: Me = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'checker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions: ['workflow.task.view'],
  branches: [{ id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'OWN' }],
};
const INSTANCE = '33333333-3333-4333-8333-333333333333';

const row = (over: Partial<HistoryRow> = {}): HistoryRow => ({
  workflow_instance_id: INSTANCE, definition_code: 'POLICY_RENEWAL_APPROVAL', definition_name: 'Policy renewal approval',
  resource_type: 'POLICY_RENEWAL', resource_reference: 'REN0000002', status: 'REJECTED', completed_at: '2026-10-08T09:00:00Z',
  stage: 'RENEWAL_CHECK', stage_label: 'Renewal check', reason_code: 'DOCS_INSUFFICIENT',
  reason_label: 'Supporting documents are insufficient', reason_text: 'Logbook copy missing.', my_action: 'REJECT',
  acted_at: '2026-10-08T09:00:00Z', on_behalf: false, ...over,
});

function historyBackend(byRole: Record<string, HistoryRow[]>, count?: number) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path === '/work-queue') return json(200, { results: [] });
    if (path.startsWith('/workflows/my-history?')) {
      const role = new URL(`http://x${path}`).searchParams.get('role') ?? 'DECIDED';
      const results = byRole[role] ?? [];
      return json(200, { role, results, count: count ?? results.length, page: 1, page_size: 25 });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return network;
}

function renderAt(path: string, me: Me = CHECKER) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, me);
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
  const router = createMemoryRouter(backendRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
  window.sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('My Work Queue history', () => {
  it('shows what I decided, with the reason in words and where each approval stands now', async () => {
    const user = userEvent.setup();
    historyBackend({ DECIDED: [row(), row({ resource_reference: 'END0000004', resource_type: 'POLICY_ENDORSEMENT', my_action: 'APPROVE', status: 'APPROVED', reason_code: null, reason_label: null, reason_text: null })] });
    const router = renderAt('/my-work/list');
    await user.click(await screen.findByRole('tab', { name: 'History' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=history'));
    const table = await screen.findByRole('table', { name: 'Decided by me' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Policy renewal REN0000002');
    expect(rows[1]).toHaveTextContent('Rejected');
    expect(rows[1]).toHaveTextContent('Supporting documents are insufficient');
    expect(rows[1]).toHaveTextContent('Logbook copy missing.');
    expect(rows[2]).toHaveTextContent('Policy endorsement END0000004');
    expect(rows[2]).toHaveTextContent('Approved');
    await user.click(within(rows[1]).getByText('Policy renewal REN0000002'));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/my-work/list/${INSTANCE}`));
  });

  it('switches to what I asked for, and filters by outcome on the server', async () => {
    const user = userEvent.setup();
    const backend = historyBackend({ REQUESTED: [row({ my_action: undefined, acted_at: undefined, submitted_at: '2026-10-08T08:00:00Z', status: 'PENDING_APPROVAL', reason_code: null, reason_label: null, reason_text: null })] });
    const router = renderAt('/my-work/list?tab=history');
    await user.click(await screen.findByRole('button', { name: 'Requested by me' }));
    const table = await screen.findByRole('table', { name: 'Requested by me' });
    expect(table).toHaveTextContent('Policy renewal approval');
    expect(table).toHaveTextContent('Pending');
    await user.click(screen.getByRole('button', { name: 'Rejected' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=history&view=REQUESTED&outcome=REJECTED'));
    await waitFor(() => expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('role=REQUESTED&page=1&page_size=25&outcome=REJECTED')));
  });

  it('says so when there is nothing yet', async () => {
    historyBackend({});
    renderAt('/my-work/list?tab=history');
    expect(await screen.findByText(NO_HISTORY_TEXT)).toBeInTheDocument();
  });
});
