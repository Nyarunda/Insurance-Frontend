import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { ledgerOptions, ledgerReport, ledgerEntry, journalDetail } from '../../test/ledgerFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';
import { downloadCsv } from './export';

vi.mock('./export', () => ({ downloadCsv: vi.fn() }));
beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());
function setup(permission = true, failure = false) {
  const me: Me = { user: { id: 'reader', email: 'reader@example.test' }, tenant: { id: 'tenant', name: 'Assurance' }, branches: [], permissions: permission ? ['billing.document.view'] : [] };
  const net = fakeFetch(c => {
    if (c.url.endsWith('/auth/me')) return json(200, me);
    if (c.url.endsWith('/ledger/options')) return json(200, ledgerOptions);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'Ledger access removed.');
    if (c.url.includes('/journals/')) return json(200, journalDetail);
    if (c.url.includes('view=cashbook')) return json(200, { ...ledgerReport, view: 'cashbook', results: [ledgerEntry] });
    return json(200, ledgerReport);
  });
  vi.stubGlobal('fetch', net.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' }); queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/billing/ledger?date_from=2026-10-01&date_to=2026-10-31'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), net, router };
}

it('opens a posted journal and links its receipt and account movements', async () => {
  const { user } = setup();
  await user.click(await screen.findByRole('link', { name: 'RCT00001' }));
  expect(await screen.findByRole('link', { name: 'Open RCT00001' })).toHaveAttribute('href', '/billing/receipts/list/receipt');
  expect(screen.getByRole('link', { name: 'BANK-01' }).getAttribute('href')).toContain('account_id=bank');
  expect(screen.getByText('Total')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

it('retains account filters through paging, banking and decimal CSV export', async () => {
  const { user, net, router } = setup();
  await screen.findByTestId('ledger-totals');
  await user.selectOptions(screen.getByLabelText('Ledger account'), 'bank');
  await user.click(screen.getByRole('button', { name: 'Run report' }));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('account_id=bank'))).toBe(true));
  await user.click(screen.getByRole('tab', { name: 'Bank & cash book' }));
  expect(await screen.findAllByText('133.45', { selector: 'td' })).toHaveLength(2);
  expect(screen.getByText(/not confirmed bank balances/)).toBeVisible();
  await user.click(screen.getByTitle('Next page'));
  expect(router.state.location.search).toContain('account_id=bank');
  await user.click(screen.getByRole('button', { name: 'Export page' }));
  expect(downloadCsv).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
    expect.arrayContaining(['RCT00001', '123.45', '133.45']),
  ]));
});

it('denies direct routes without billing permission', async () => {
  const { net } = setup(false);
  expect(await screen.findByRole('heading', { name: 'Access restricted' })).toBeVisible();
  expect(net.calls.some(c => c.url.includes('/billing/ledger'))).toBe(false);
});

it('does not export a denied report', async () => {
  setup(true, true);
  expect(await screen.findByRole('alert')).toHaveTextContent('Ledger access removed.');
  expect(screen.getByRole('button', { name: 'Export page' })).toBeDisabled();
});
