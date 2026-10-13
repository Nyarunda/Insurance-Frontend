import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { productionOptions, productionPolicies, productionReport } from '../../test/productionFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';
import { downloadCsv } from './export';

vi.mock('./export', () => ({ downloadCsv: vi.fn() }));
const me: Me = { user: { id: 'reader', email: 'reader@example.test' }, tenant: { id: 'tenant', name: 'Assurance' }, branches: [], permissions: ['policies.policy.view'] };
beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());
function setup({ permission = true, failure = false } = {}) {
  const person = { ...me, permissions: permission ? me.permissions : [] };
  const network = fakeFetch(call => {
    if (call.url.endsWith('/auth/me')) return json(200, person);
    if (call.url.endsWith('/production/options')) return json(200, productionOptions);
    if (failure) return envelope(403, 'PERMISSION_DENIED', 'Report access was removed.');
    if (call.url.includes('view=policies')) return json(200, productionPolicies);
    return json(200, productionReport);
  });
  vi.stubGlobal('fetch', network.fn); setAccessToken('test'); useSessionStore.setState({ status: 'signed-in' });
  queryClient.setQueryData(ME_QUERY_KEY, person);
  const router = createMemoryRouter(backendRoutes, { initialEntries: ['/reports/production?date_from=2026-10-01&date_to=2026-10-31'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), network, router };
}

describe('Production reporting', () => {
  it('keeps agent filters across policy drill-down, paging and export', async () => {
    const { user, network, router } = setup();
    await screen.findByTestId('production-totals');
    await user.selectOptions(screen.getByLabelText('Production agent'), 'agent');
    await user.selectOptions(screen.getByLabelText('Production sub-agent'), 'sub-agent');
    await user.selectOptions(screen.getByLabelText('Group production by'), 'sub_agent');
    await user.click(screen.getByRole('button', { name: 'Run report' }));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('group_by=sub_agent') && c.url.includes('agent_id=agent') && c.url.includes('sub_agent_id=sub-agent'))).toBe(true));
    await user.click(screen.getByTitle('Next page'));
    expect(router.state.location.search).toContain('agent_id=agent');
    await user.click(screen.getByRole('tab', { name: 'Policies' }));
    await screen.findByRole('link', { name: 'POL0000021' });
    expect(router.state.location.search).toContain('sub_agent_id=sub-agent');
    await user.click(screen.getByTestId('production-export'));
    expect(downloadCsv).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
      expect.arrayContaining(['Scope', 'Karibu Agency', 'Karibu Sub-agent']),
      expect.arrayContaining(['Policy', 'Agent', 'Sub-agent']),
    ]));
  });
  it('shows separate currencies and exports only the displayed page with full filtered totals', async () => {
    const { user } = setup();
    const totals = await screen.findByTestId('production-totals');
    expect(totals).toHaveTextContent('KES'); expect(totals).toHaveTextContent('USD');
    expect(totals).toHaveTextContent('45250.30'); expect(totals).toHaveTextContent('101.00');
    await user.click(screen.getByTestId('production-export'));
    expect(downloadCsv).toHaveBeenCalledWith('production-summary-2026-10-01-2026-10-31-page-1.csv', expect.arrayContaining([
      ['Page', 1, 'Total records', 26], ['Full filtered totals', 'Currency', 'Policies', 'Basic premium', 'Levies', 'Bound premium'],
      ['Premium basis', 'Original bound; excludes endorsement adjustments'],
    ]));
  });

  it('applies filters only on submit and resets pagination; policy links open the real workspace', async () => {
    const { user, network, router } = setup();
    await screen.findByTestId('production-totals');
    await user.click(screen.getByTitle('Next page'));
    await waitFor(() => expect(router.state.location.search).toContain('page=2'));
    await user.selectOptions(screen.getByLabelText('Production product'), 'motor');
    expect(network.calls.some(c => c.url.includes('product_id=motor'))).toBe(false);
    await user.selectOptions(screen.getByLabelText('Group production by'), 'insurer');
    await user.click(screen.getByRole('button', { name: 'Run report' }));
    await waitFor(() => expect(network.calls.some(c => c.url.includes('group_by=insurer') && c.url.includes('product_id=motor') && c.url.includes('page=1'))).toBe(true));
    await user.click(screen.getByRole('tab', { name: 'Policies' }));
    expect(await screen.findByRole('link', { name: 'POL0000021' })).toHaveAttribute('href', '/policies/list/policy');
    expect(screen.getByLabelText('Group production by')).toBeDisabled();
  });

  it('validates dates without sending a bad request and prints the actual report scope', async () => {
    const { user, network } = setup();
    await screen.findByTestId('production-totals');
    const before = network.calls.length;
    await user.clear(screen.getByLabelText('Binding date to'));
    await user.type(screen.getByLabelText('Binding date to'), '2026-09-01');
    await user.click(screen.getByRole('button', { name: 'Run report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at most 366 days');
    expect(network.calls.length).toBe(before);
    await user.click(screen.getByTitle('Print production page'));
    const printed = within(screen.getByTestId('print-document'));
    expect(printed.getByText('Production: original bound premiums')).toBeVisible();
    expect(printed.getByText(/2026-10-01 to 2026-10-31/)).toBeVisible();
    expect(printed.getByText('Page 1 of 2')).toBeVisible();
  });

  it('blocks direct navigation without policy permission and never requests the report', async () => {
    const { network } = setup({ permission: false });
    expect(await screen.findByRole('heading', { name: 'Access restricted' })).toBeVisible();
    expect(network.calls.some(c => c.url.includes('/policies/reports/production'))).toBe(false);
  });

  it('does not export unavailable results when the server denies access', async () => {
    setup({ failure: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('Report access was removed.');
    expect(screen.getByTestId('production-export')).toBeDisabled();
    expect(screen.queryByTestId('production-totals')).not.toBeInTheDocument();
  });
});
