import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import { BACKEND_NAV, visibleNav } from '../navigation';
import type { RenewalSettingsList, RenewalSettingsPeriod } from '../renewals/settings';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const ME_ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const SEED = 'aaaaaaaa-0000-4000-8000-000000000001';
const DRAFT = 'aaaaaaaa-0000-4000-8000-000000000002';
const BRANCH = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'BRANCH' };

const person = (permissions: string[]): Me => ({
  user: { id: ME_ID, email: 'setup@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [BRANCH],
});
const MANAGER = person(['policies.renewal_settings.manage']);
const PUBLISHER = person(['products.config.publish']);
const RENEWER = person(['policies.policy.view', 'policies.renewal.create']);
const QUOTER = person(['quotations.quotation.view']);

const period = (over: Partial<RenewalSettingsPeriod>): RenewalSettingsPeriod => ({
  id: SEED, status: 'PUBLISHED', effective_from: '2000-01-01', effective_to: null,
  early_window_days: 90, late_window_days: 90, offer_validity_days: 30, offer_max_validity_days: 90,
  created_by: OTHER, published_by: OTHER, published_at: '2000-01-01T00:00:00Z', ...over,
});

const LIST = (results: RenewalSettingsPeriod[] = [period({})]): RenewalSettingsList => ({
  in_force: { early_window_days: 90, late_window_days: 90, offer_validity_days: 30, offer_max_validity_days: 90, on: '2026-10-08' },
  results,
});

function settingsBackend(list: RenewalSettingsList = LIST(), command?: (call: FakeCall) => Response | null) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (call.method === 'GET' && path === '/renewal-settings') return json(200, list);
    if (call.method === 'POST' && path.startsWith('/renewal-settings')) return command?.(call) ?? json(201, period({ id: DRAFT, status: 'DRAFT' }));
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return { ...network, sent: () => network.calls.filter((call) => call.method !== 'GET') };
}

function renderAt(path: string, me: Me) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, me);
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createMemoryRouter(backendRoutes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Renewal settings (SD-E)', () => {
  it('shows the values in force and every period, with no ids, and nothing to change for a reader', async () => {
    settingsBackend(LIST([period({ id: DRAFT, status: 'DRAFT', effective_from: '2026-11-01', early_window_days: 60, created_by: OTHER, published_by: null, published_at: null }), period({})]));
    renderAt('/renewal-settings/list', RENEWER);
    const now = await screen.findByRole('region', { name: 'In force today' });
    expect(now).toHaveTextContent('Renewable before expiry');
    expect(now).toHaveTextContent('90 days');
    const table = screen.getByRole('table', { name: 'Renewal settings periods' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('01 Nov 2026');
    expect(rows[1]).toHaveTextContent('Draft');
    expect(rows[1]).toHaveTextContent('60 days');
    expect(rows[2]).toHaveTextContent('01 Jan 2000');
    expect(rows[2]).toHaveTextContent('Open');
    expect(rows[2]).toHaveTextContent('Published');
    expect(screen.queryByRole('button', { name: 'New period' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Publish/ })).not.toBeInTheDocument();
    expect(document.querySelector('main')?.textContent ?? '').not.toMatch(UUID_IN_TEXT);
  });

  it('drafts a period starting from the values in force, checks them first, and puts a server field error on its field', async () => {
    const user = userEvent.setup();
    let refuse = true;
    const backend = settingsBackend(LIST(), () => {
      if (!refuse) return json(201, period({ id: DRAFT, status: 'DRAFT', effective_from: '2026-12-01' }));
      refuse = false;
      return envelope(422, 'RENEWAL_SETTING_INVALID', 'the late window is 0 to 365 days', { field: 'late_window_days' });
    });
    renderAt('/renewal-settings/list', MANAGER);
    await user.click(await screen.findByRole('button', { name: 'New period' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/Renewable before expiry/)).toHaveValue('90');
    const offer = within(dialog).getByLabelText(/Offer open for/);
    await user.clear(offer);
    await user.type(offer, '120');
    await user.click(within(dialog).getByRole('button', { name: 'Save draft' }));
    expect(within(dialog).getByText('The offer cannot be open longer than the longest offer.')).toBeInTheDocument();
    expect(backend.sent()).toHaveLength(0);

    await user.clear(offer);
    await user.type(offer, '14');
    const from = within(dialog).getByLabelText(/Starts on/);
    await user.clear(from);
    await user.type(from, '2026-12-01');
    await user.click(within(dialog).getByRole('button', { name: 'Save draft' }));
    expect(await within(dialog).findByText(/late window is 0 to 365 days/i)).toBeInTheDocument();
    expect(backend.sent()[0].url).toMatch(/\/renewal-settings$/);
    expect(backend.sent()[0].body).toEqual({
      effective_from: '2026-12-01', early_window_days: 90, late_window_days: 90, offer_validity_days: 14, offer_max_validity_days: 90,
    });

    await user.click(within(dialog).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/drafted; someone else publishes it/)).toBeInTheDocument();
  });

  it("offers Publish only to a publisher who did not draft it, and sends it with no body", async () => {
    const user = userEvent.setup();
    const draft = period({ id: DRAFT, status: 'DRAFT', effective_from: '2026-11-01', created_by: OTHER, published_by: null, published_at: null });
    const backend = settingsBackend(LIST([draft, period({})]), () => json(200, { ...draft, status: 'PUBLISHED' }));
    renderAt('/renewal-settings/list', PUBLISHER);
    await user.click(await screen.findByRole('button', { name: 'Publish the period from 01 Nov 2026' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Once published, it never changes.');
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(backend.sent()[0].url).toContain(`/renewal-settings/${DRAFT}/publish`);
    expect(backend.sent()[0].body).toEqual({});
    expect(await screen.findByText('Period from 01 Nov 2026 published')).toBeInTheDocument();
  });

  it('never offers Publish on your own draft, and puts a too-soon refusal in words', async () => {
    const user = userEvent.setup();
    const both = person(['policies.renewal_settings.manage', 'products.config.publish']);
    const mine = period({ id: DRAFT, status: 'DRAFT', effective_from: '2026-11-01', created_by: ME_ID, published_by: null, published_at: null });
    const theirs = period({ id: 'aaaaaaaa-0000-4000-8000-000000000003', status: 'DRAFT', effective_from: '2026-10-08', created_by: OTHER, published_by: null, published_at: null });
    settingsBackend(LIST([mine, theirs, period({})]), () => envelope(422, 'EFFECTIVE_DATE_TOO_SOON', 'a replacement takes effect after today', { field: 'effective_from' }));
    renderAt('/renewal-settings/list', both);
    expect(await screen.findByText('Someone else publishes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish the period from 01 Nov 2026' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish the period from 08 Oct 2026' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));
    expect(await within(dialog).findByText(/Today is already decided by the settings in force/)).toBeInTheDocument();
  });

  it('is in Setup for those who draft or publish, and the route lets renewal staff read it but not others', async () => {
    const setup = (permissions: string[]) => visibleNav(BACKEND_NAV, permissions).find((group) => group.id === 'setup');
    expect(setup(['policies.renewal_settings.manage'])?.items.map((item) => item.label)).toEqual(['Renewal settings']);
    expect(setup(['products.config.publish'])?.items.map((item) => item.label)).toEqual(['Renewal settings']);
    expect(setup(['policies.renewal.create'])).toBeUndefined();
    settingsBackend();
    renderAt('/renewal-settings/list', QUOTER);
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
  });
});
