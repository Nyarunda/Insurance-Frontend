import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, fakeFetch, json } from '../../test/fetchFake';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import type { Certificate } from '../certificates/types';
import { BACKEND_NAV, visibleNav } from '../navigation';
import { MAKER, POLICY_ID } from '../../test/policyFixtures';
import { NO_MATCH_TEXT, SEARCH_FIRST_TEXT } from './CertificatesPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const C_ID = '17171717-1717-4171-8171-171717171717';
const OLD_ID = '18181818-1818-4181-8181-181818181818';

const person = (permissions: string[]): Me => ({ ...MAKER, permissions });
/** As CERTIFICATE_ISSUER (CS-P0). */
const ISSUER = person(['certificates.cert.view', 'certificates.cert.issue', 'policies.policy.view', 'products.product.view']);
/** As CERTIFICATE_STOCK_MANAGER (CS-P0): certificates.cert.view, but no policies. */
const STOCK = person(['certificates.stock.manage', 'certificates.cert.view', 'insurers.insurer.view', 'products.product.view']);

const certificate = (over: Partial<Certificate> = {}): Certificate => ({
  id: C_ID,
  serial_no: 'CK0000011',
  status: 'PRINTED',
  certificate_type: { id: '19191919-1919-4191-8191-191919191919', code: 'MOT-A', category: 'MOTOR' },
  insurer: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'JUB' },
  batch_no: 'CBT0000001',
  policy: { id: POLICY_ID, policy_no: 'POL0000001' },
  version_no: 2,
  effective_from: '2026-06-02',
  effective_to: '2026-12-31',
  insured_name: 'Wanjiku Holdings',
  vehicle: { registration: 'KDA 123A', chassis_number: 'JTD123', engine_number: '' },
  marine_details: null,
  replaces: { id: OLD_ID, serial_no: 'CK0000003' },
  replaced_by: null,
  issued_at: '2026-06-02T09:00:00Z',
  printed_at: '2026-06-02T10:00:00Z',
  closed_reason: '',
  closed_at: null,
  cover: { fully_covered: true, covered_through: '2026-12-31' },
  cancellation_request: null,
  workflow: null,
  row_version: 2,
  ...over,
});

function findBackend(results: Certificate[] = [certificate()]) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/certificates?')) {
      const params = new URL(call.url, 'http://x').searchParams;
      const serial = params.get('serial_no');
      return json(200, { results: serial ? results.filter((c) => c.serial_no === serial.toUpperCase()) : results });
    }
    const one = /^\/certificates\/([^/?]+)$/.exec(path);
    if (one) {
      const found = results.find((c) => c.id === one[1]);
      return found ? json(200, found, { ETag: `"certificate-${found.id}-v${found.row_version}"` }) : envelope(404, 'CERTIFICATE_NOT_FOUND', 'certificate not found');
    }
    if (path.startsWith('/policies?')) return json(200, { results: [], count: 0, page: 1, page_size: 25 });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const searches = () => network.calls.map((call) => call.url.replace(/^.*\/api\/v1/, '')).filter((path) => path.startsWith('/certificates?'));
  return { ...network, searches };
}

function renderAt(path: string, me: Me = ISSUER, state?: unknown) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, me);
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
  const router = createMemoryRouter(backendRoutes, { initialEntries: [state ? { pathname: path, state } : path] });
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

describe('Find a certificate', () => {
  it('is in the Policies group for certificates.cert.view only', () => {
    const items = (me: Me) => visibleNav(BACKEND_NAV, me.permissions).flatMap((group) => group.items.map((item) => item.id));
    expect(items(ISSUER)).toContain('certificates');
    expect(items(STOCK)).toContain('certificates');
    expect(items(MAKER)).not.toContain('certificates');
  });

  it('/certificates moves to the list, which asks for a search and fetches nothing until then', async () => {
    const backend = findBackend();
    const router = renderAt('/certificates');
    await waitFor(() => expect(router.state.location.pathname).toBe('/certificates/list'));
    expect(await screen.findByText(SEARCH_FIRST_TEXT)).toBeInTheDocument();
    expect(backend.searches()).toEqual([]);
  });

  it('searches by vehicle on the server, keeps it in the URL, and opens a result by its serial', async () => {
    const user = userEvent.setup();
    const backend = findBackend();
    const router = renderAt('/certificates/list');
    await user.type(await screen.findByLabelText('Registration or chassis number'), ' kda 123a ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.search).toBe('?vehicle=kda+123a'));
    expect(backend.searches()).toEqual(['/certificates?vehicle=kda+123a']);
    const row = await screen.findByRole('row', { name: /CK0000011/ });
    expect(row).toHaveTextContent('KDA 123A');
    expect(row).toHaveTextContent('Wanjiku Holdings');
    expect(row).toHaveTextContent('POL0000001');
    expect(row).toHaveTextContent('Printed');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    await user.click(row);
    expect(router.state.location.pathname).toBe('/certificates/list/CK0000011');
    expect(await screen.findByRole('heading', { name: 'CK0000011' })).toBeInTheDocument();
  });

  it('searches by serial number', async () => {
    const user = userEvent.setup();
    const backend = findBackend();
    const router = renderAt('/certificates/list');
    await user.click(await screen.findByRole('button', { name: 'Serial number' }));
    await user.type(screen.getByLabelText('Serial number'), 'ck0000011');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.search).toBe('?serial=ck0000011'));
    expect(backend.searches()).toEqual(['/certificates?serial_no=ck0000011']);
    expect(await screen.findByRole('row', { name: /CK0000011/ })).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    findBackend([]);
    renderAt('/certificates/list?vehicle=KZZ%20999Z');
    expect(await screen.findByText(NO_MATCH_TEXT)).toBeInTheDocument();
  });
});

describe('The certificate record', () => {
  it('opens by serial, shows the record in words, links its replacement and the policy, and goes back to the search', async () => {
    const user = userEvent.setup();
    findBackend([certificate(), certificate({ id: OLD_ID, serial_no: 'CK0000003', status: 'CANCELLED', replaces: null, replaced_by: { id: C_ID, serial_no: 'CK0000011' }, closed_reason: 'REPLACED: lost', closed_at: '2026-06-02T09:00:00Z', cover: null })]);
    const router = renderAt('/certificates/list/ck0000011', ISSUER, { certificates: '/certificates/list?vehicle=kda' });
    expect(await screen.findByRole('heading', { name: 'CK0000011' })).toBeInTheDocument();
    const text = mainText();
    for (const fact of ['Wanjiku Holdings', 'POL0000001', 'Version 2', 'KDA 123A', 'JTD123', 'CBT0000001', 'MOT-A', 'JUB']) expect(text).toContain(fact);
    expect(text).not.toMatch(UUID_IN_TEXT);

    await user.click(screen.getByRole('button', { name: 'CK0000003' }));
    expect(router.state.location.pathname).toBe('/certificates/list/CK0000003');
    expect(await screen.findByRole('heading', { name: 'CK0000003' })).toBeInTheDocument();
    expect(mainText()).toContain('REPLACED: lost');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(router.state.location.pathname).toBe('/certificates/list');
    expect(router.state.location.search).toBe('?vehicle=kda');
  });

  it('Open on the policy goes to the policy Certificates tab at this certificate, for those who see policies', async () => {
    const user = userEvent.setup();
    findBackend();
    const router = renderAt('/certificates/list/CK0000011');
    await user.click(await screen.findByRole('button', { name: 'Open on the policy' }));
    expect(router.state.location.pathname).toBe('/policies/list/POL0000001');
    expect(router.state.location.search).toBe('?tab=certificates&certificate=CK0000011');
  });

  it('without policies.policy.view there is no link to the policy', async () => {
    findBackend();
    renderAt('/certificates/list/CK0000011', STOCK);
    expect(await screen.findByRole('heading', { name: 'CK0000011' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open on the policy' })).not.toBeInTheDocument();
  });

  it('a serial the user cannot see is not found', async () => {
    findBackend([]);
    renderAt('/certificates/list/CK9999999');
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
  });

  it('shows a pending cancellation request and a cover warning', async () => {
    findBackend([certificate({
      status: 'ISSUED',
      cover: { fully_covered: false, covered_through: '2026-09-30' },
      cancellation_request: { reason: 'stolen', requested_at: '2026-06-03T09:00:00Z' },
      workflow: { instance_id: '23232323-2323-4232-8232-232323232323', status: 'PENDING_APPROVAL', waiting_on: ['Certificate Checker'] },
    })]);
    renderAt('/certificates/list/CK0000011');
    expect(await screen.findByText("The policy no longer covers this certificate's whole validity")).toBeInTheDocument();
    expect(screen.getByText('Cancellation requested')).toBeInTheDocument();
    expect(mainText()).toContain('Waiting for: Certificate Checker.');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });
});

describe('Sidebar', () => {
  it('highlights Certificates on the list and the record', async () => {
    findBackend();
    renderAt('/certificates/list/CK0000011');
    await screen.findByRole('heading', { name: 'CK0000011' });
    const nav = screen.getByRole('complementary', { name: 'Primary navigation' });
    expect(within(nav).getByRole('button', { name: /Certificates/ })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: /Policy Directory/ })).not.toHaveAttribute('aria-current');
  });
});
