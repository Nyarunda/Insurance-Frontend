import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFetch, json } from '../../test/fetchFake';
import { detail, MAKER, POLICY_ETAG, POLICY_ID, summary } from '../../test/policyFixtures';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import { BACKEND_NAV, visibleNav } from '../navigation';
import type { RenewalListItem } from '../renewals/types';
import { NO_DUE_TEXT, NO_RENEWALS_LISTED_TEXT } from './RenewalsPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const R_ID = 'abababab-abab-4bab-8bab-abababababab';
const as = (...permissions: string[]): Me => ({ ...MAKER, permissions: ['policies.policy.view', ...permissions] });
const VIEWER = as();
const RENEWER = as('policies.renewal.create');

const item = (over: Partial<RenewalListItem> = {}): RenewalListItem => ({
  id: R_ID, renewal_no: 'REN0000001', renewal_type: 'AS_IS', status: 'OFFERED', effective_status: 'OFFERED',
  inception_date: '2027-01-01', expiry_date: '2027-12-31', renewal_total_premium: '57200',
  policy: { id: POLICY_ID, policy_no: 'POL0000001' }, ...over,
});

function listBackend(options: { due?: ReturnType<typeof summary>[]; dueCount?: number; renewals?: RenewalListItem[]; byNumber?: RenewalListItem[] } = {}) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/policies?renewal_due=true')) {
      const due = options.due ?? [summary({ expiry_date: '2026-12-31' })];
      return json(200, { results: due, count: options.dueCount ?? due.length, page: 1, page_size: 25 });
    }
    if (path.startsWith('/renewals?renewal_no=')) {
      const results = options.byNumber ?? [];
      return json(200, { results, count: results.length, page: 1, page_size: 1 });
    }
    if (path.startsWith('/renewals?')) {
      const results = options.renewals ?? [item()];
      return json(200, { results, count: results.length, page: 1, page_size: 25 });
    }
    // The RS-A record a number resolves to.
    if (path.startsWith('/policies?q=')) return json(200, { results: [summary()], count: 1, page: 1, page_size: 5 });
    if (path === `/policies/${POLICY_ID}`) return json(200, detail(), { ETag: POLICY_ETAG });
    if (path === `/policies/${POLICY_ID}/renewals`) return json(200, { policy_no: 'POL0000001', results: [item()] });
    if (path === `/renewals/${R_ID}`) {
      return json(200, { ...item(), source_version_no: 2, requested_changes: {}, pricing: null, check: { required: false, reasons: [], approved_by: null, approved_at: null },
        offer_valid_until: '2026-12-20', offered_at: null, decision_reason: '', decided_at: null, resulting_version_no: null, renewed_at: null,
        workflow: null, row_version: 1 }, { ETag: `"renewal-${R_ID}-v1"` });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return network;
}

function renderAt(path: string, me: Me = RENEWER) {
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

const mainText = () => document.querySelector('main')?.textContent ?? '';

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Renewals', () => {
  it('is under Policies for anyone who can view policies', () => {
    const policies = visibleNav(BACKEND_NAV, ['policies.policy.view']).find((group) => group.id === 'policies');
    expect(policies?.items.map((entry) => entry.label)).toContain('Renewals');
  });

  it("lists the policies due for renewal from the server's due rule, with Prepare for a renewal maker", async () => {
    const user = userEvent.setup();
    const backend = listBackend();
    const router = renderAt('/renewals/list');
    const table = await screen.findByRole('table', { name: 'Due for renewal' });
    expect(within(table).getByText('POL0000001')).toBeInTheDocument();
    expect(within(table).getByText('31 Dec 2026')).toBeInTheDocument();
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/policies?renewal_due=true&page=1&page_size=25'));
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    await user.click(within(table).getByRole('button', { name: 'Prepare a renewal of POL0000001' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000001/renewals/new'));
  });

  it('a viewer sees the due list without Prepare, and an empty list says so', async () => {
    listBackend({ due: [] });
    renderAt('/renewals/list', VIEWER);
    expect(await screen.findByText(NO_DUE_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prepare/ })).not.toBeInTheDocument();
  });

  it('a viewer opens a due policy on its Renewals tab', async () => {
    const user = userEvent.setup();
    listBackend();
    const router = renderAt('/renewals/list', VIEWER);
    const table = await screen.findByRole('table', { name: 'Due for renewal' });
    await user.click(within(table).getByText('POL0000001'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000001'));
    expect(router.state.location.search).toBe('?tab=renewals');
  });

  it('pages on the server and keeps the page in the address', async () => {
    const user = userEvent.setup();
    const backend = listBackend({ dueCount: 30 });
    const router = renderAt('/renewals/list');
    await screen.findByRole('table', { name: 'Due for renewal' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    await waitFor(() => expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('renewal_due=true&page=2&page_size=25')));
  });

  it('lists renewals across policies by effective status, and opens one in its record by number', async () => {
    const user = userEvent.setup();
    const backend = listBackend({ renewals: [item({ effective_status: 'EXPIRED' })] });
    const router = renderAt('/renewals/list?tab=renewals');
    const table = await screen.findByRole('table', { name: 'Renewals' });
    expect(within(table).getByText('Offer expired')).toBeInTheDocument();
    expect(within(table).getByText('POL0000001')).toBeInTheDocument();
    // RS-C review: the list carries no currency, so it shows no amount (the record does).
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Renewal', 'Policy', 'New period', 'Status']);
    expect(table).not.toHaveTextContent('57,200');
    await user.click(screen.getByRole('button', { name: 'Offer expired' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=renewals&status=EXPIRED'));
    await waitFor(() => expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/renewals?page=1&page_size=25&status=EXPIRED')));
    await user.click(within(await screen.findByRole('table', { name: 'Renewals' })).getByText('REN0000001'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000001/renewals/REN0000001'));
  });

  it('says so when no renewal has the status', async () => {
    listBackend({ renewals: [] });
    renderAt('/renewals/list?tab=renewals&status=RENEWED', VIEWER);
    expect(await screen.findByText(NO_RENEWALS_LISTED_TEXT)).toBeInTheDocument();
  });

  it('a renewal number alone opens its record on its policy; one outside reach is not found', async () => {
    const backend = listBackend({ byNumber: [item()] });
    const router = renderAt('/renewals/list/REN0000001', VIEWER);
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000001/renewals/REN0000001'));
    expect(await screen.findByText('Renewal REN0000001')).toBeInTheDocument();
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/renewals?renewal_no=REN0000001'));
  });

  it('a number the user cannot see is not found', async () => {
    listBackend({ byNumber: [] });
    renderAt('/renewals/list/REN0000099', VIEWER);
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
  });
});
