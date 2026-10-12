import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { diaryReport } from '../../test/diaryFixtures';
import { productionOptions } from '../../test/productionFixtures';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { queryClient } from '../../lib/query/queryClient';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';
import { downloadCsv } from './export';

vi.mock('./export', () => ({ downloadCsv: vi.fn() }));
const me: Me = { user: { id: 'reader', email: 'reader@example.test' }, tenant: { id: 'tenant', name: 'Assurance' }, branches: [], permissions: ['policies.policy.view'] };
beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());
function setup({ denied = false, failure = false } = {}) {
  const person = { ...me, permissions: denied ? [] : me.permissions };
  const network = fakeFetch(call => {
    if (call.url.endsWith('/auth/me')) return json(200, person);
    if (call.url.endsWith('/notifications/system')) return json(200, []);
    if (call.url.endsWith('/renewal-diary/options')) return json(200, productionOptions);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'Report access was removed.');
    return json(200, diaryReport);
  });
  vi.stubGlobal('fetch', network.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' });
  queryClient.setQueryData(ME_QUERY_KEY, person);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/renewals/diary?date_from=2026-10-01&date_to=2026-12-31'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), network, router };
}
describe('Dated renewal diary', () => {
  it('shows expiry totals, stale work and an expired offer with record links', async () => {
    setup();
    expect(await screen.findByTestId('diary-totals')).toHaveTextContent('450250.30');
    expect(screen.getByText('Offer expired (needs refresh)')).toBeVisible();
    expect(screen.getByRole('link', { name: 'POL0000021' })).toHaveAttribute('href', '/policies/list/policy?tab=renewals');
    expect(screen.getByRole('link', { name: 'REN0000007' })).toHaveAttribute('href', '/policies/list/policy/renewals/renewal');
  });
  it('uses server filters and resets pagination after applying the selected work status', async () => {
    const { user, network, router } = setup();
    await screen.findByTestId('diary-totals');
    await user.click(screen.getByTitle('Next page'));
    await waitFor(() => expect(router.state.location.search).toContain('page=2'));
    await user.selectOptions(screen.getByLabelText('Renewal work'), 'OPEN');
    await user.selectOptions(screen.getByLabelText('Branch'), 'branch');
    await user.click(screen.getByRole('button', { name: 'Run report' }));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('work_status=OPEN') && c.url.includes('branch_id=branch') && c.url.includes('page=1'))).toBe(true));
  });
  it('exports the current page with dates and full filtered totals and prints the same scope', async () => {
    const { user } = setup();
    await screen.findByTestId('diary-totals');
    await user.click(screen.getByTestId('diary-export'));
    expect(downloadCsv).toHaveBeenCalledWith('renewal-diary-2026-10-01-2026-12-31-page-1.csv', expect.arrayContaining([
      ['Page', 1, 'Total policies', 26], ['Expiry from', '2026-10-01', 'Expiry to', '2026-12-31'],
    ]));
    await user.click(screen.getByTitle('Print renewal diary page'));
    expect(screen.getByTestId('print-document')).toHaveTextContent('2026-10-01 to 2026-12-31');
    expect(screen.getByTestId('print-document')).toHaveTextContent('Page 1 of 2');
  });
  it('blocks direct navigation without permission', async () => {
    const { network } = setup({ denied: true });
    expect(await screen.findByRole('heading', { name: 'Access restricted' })).toBeVisible();
    expect(network.calls.some(c => c.url.includes('/renewal-diary'))).toBe(false);
  });
  it('shows server errors and disables exports', async () => {
    setup({ failure: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('Report access was removed.');
    expect(screen.getByTestId('diary-export')).toBeDisabled();
  });
});
