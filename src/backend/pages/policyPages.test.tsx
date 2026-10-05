import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import { LoadedPolicy, POLICY_KEYS } from '../policies/queries';
import { directoryFrom, directoryReturnState } from '../policies/returnTo';
import type { PolicySummary } from '../policies/types';
import { POLICY_ID, ENDORSEMENT_ID, POLICY_ETAG, MAKER, summary, version, V1, detail } from '../../test/policyFixtures';
import { EMPTY_POLICIES_TEXT } from './PoliciesPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

interface BackendOptions {
  policies?: PolicySummary[];
  count?: number;
  list?: (call: FakeCall) => Response;
  detail?: () => Response;
}

function policyBackend(options: BackendOptions = {}) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path === '/auth/me') return json(200, MAKER);
    if (path.startsWith('/policies?')) {
      if (options.list) return options.list(call);
      const results = options.policies ?? [summary()];
      return json(200, { results, count: options.count ?? results.length, page: 1, page_size: 25 });
    }
    if (path === `/policies/${POLICY_ID}`) return options.detail ? options.detail() : json(200, detail(), { ETag: POLICY_ETAG });
    if (path === `/policies/${POLICY_ID}/versions`) return json(200, { policy_no: 'POL0000001', results: [V1, version()] });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const paths = () => network.calls.map((call) => call.url.replace('/api/v1', ''));
  return { ...network, paths, listQueries: () => paths().filter((path) => path.startsWith('/policies?')) };
}

function renderAt(path: string, me: Me = MAKER) {
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

describe('Policy Directory', () => {
  it('lists what GET /policies returns, in words, with no identifiers', async () => {
    const backend = policyBackend();
    renderAt('/policies');
    const row = await screen.findByRole('row', { name: /POL0000001/ });
    expect(row).toHaveTextContent('Wanjiku Holdings');
    expect(row).toHaveTextContent('CUS0000001');
    expect(row).toHaveTextContent('Private Motor');
    expect(row).toHaveTextContent('Jubilee Insurance');
    expect(row).toHaveTextContent('01 Jan 2026 – 31 Dec 2026');
    expect(row).toHaveTextContent('KES 52,000.00');
    expect(row).toHaveTextContent('Active');
    expect(screen.getByText('1 policy')).toBeInTheDocument();
    expect(backend.listQueries()).toEqual(['/policies?page=1&page_size=25']);
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('says so when there is nothing to show', async () => {
    policyBackend({ policies: [] });
    renderAt('/policies');
    expect(await screen.findByText(EMPTY_POLICIES_TEXT)).toBeInTheDocument();
  });

  it('shows a load error with its Reference, and no records', async () => {
    policyBackend({ list: () => envelope(403, 'PERMISSION_DENIED', 'You may not view policies.', {}, 'corr-list') });
    renderAt('/policies');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Policies could not be loaded');
    expect(alert).toHaveTextContent('You may not view policies.');
    expect(alert).toHaveTextContent('Reference corr-list');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('filters, searches and pages on the server, and keeps it in the URL', async () => {
    const user = userEvent.setup();
    const backend = policyBackend({ count: 60 });
    const router = renderAt('/policies');
    await screen.findByRole('row', { name: /POL0000001/ });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(backend.listQueries()).toContain('/policies?page=2&page_size=25'));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Active' }));
    await waitFor(() => expect(backend.listQueries()).toContain('/policies?page=1&page_size=25&coverage_status=ACTIVE'));
    expect(router.state.location.search).toBe('?coverage=ACTIVE');

    await user.type(screen.getByLabelText('Policy number'), ' pol0000001 ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(backend.listQueries()).toContain('/policies?page=1&page_size=25&coverage_status=ACTIVE&q=pol0000001'),
    );
  });

  it('the list is /policies/list and a record sits under it; older addresses move there, keeping the query', async () => {
    policyBackend();
    const old = renderAt('/policies?coverage=ACTIVE&page=2');
    await waitFor(() => expect(old.state.location.pathname).toBe('/policies/list'));
    expect(old.state.location.search).toBe('?coverage=ACTIVE&page=2');
    cleanup();
    const outside = renderAt('/policies/POL0000001?tab=coverage');
    await waitFor(() => expect(outside.state.location.pathname).toBe('/policies/list/POL0000001'));
    expect(outside.state.location.search).toBe('?tab=coverage');
    expect(await screen.findByRole('heading', { name: 'POL0000001' })).toBeInTheDocument();
    cleanup();
    // Unmatched under a list: not found, and never moved again.
    const unknown = renderAt('/policies/list/POL0000001/nothing/here');
    expect(await screen.findByText('Not found or not available to you')).toBeInTheDocument();
    expect(unknown.state.location.pathname).toBe('/policies/list/POL0000001/nothing/here');
  });

  it('opens a policy from its row', async () => {
    const user = userEvent.setup();
    policyBackend();
    const router = renderAt('/policies');
    await user.click(await screen.findByRole('row', { name: /POL0000001/ }));
    expect(router.state.location.pathname).toBe('/policies/list/POL0000001');
    expect(await screen.findByRole('heading', { name: 'POL0000001' })).toBeInTheDocument();
  });

  it('is not available without policies.policy.view: no navigation entry, no request, the permission state', async () => {
    const backend = policyBackend();
    renderAt('/policies', { ...MAKER, permissions: [] });
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Policy Directory' })).not.toBeInTheDocument();
    expect(backend.listQueries()).toEqual([]);
  });

  it('Back from a policy returns to the same filtered, searched and paged list (FI1-C-R1)', async () => {
    const user = userEvent.setup();
    const backend = policyBackend({ count: 60 });
    const listed = '/policies/list?coverage=ACTIVE&q=POL0000001&page=2';
    const expectedQuery = '/policies?page=2&page_size=25&coverage_status=ACTIVE&q=POL0000001';
    const router = renderAt(listed);
    await user.click(await screen.findByRole('row', { name: /POL0000001/ }));
    expect(await screen.findByRole('heading', { name: 'POL0000001' })).toBeInTheDocument();

    // A tab change replaces the URL; the originating list must survive it.
    await user.click(screen.getByRole('tab', { name: 'Coverage' }));
    expect(router.state.location.search).toBe('?tab=coverage');

    // Drop the cached list, so the restored URL has to drive a fresh request.
    queryClient.removeQueries({ queryKey: ['policies', 'list'] });
    const before = backend.listQueries().length;
    await user.click(screen.getByTitle('Back to Policy Directory'));

    expect(router.state.location.pathname).toBe('/policies/list');
    expect(router.state.location.search).toBe('?coverage=ACTIVE&q=POL0000001&page=2');
    await screen.findByRole('row', { name: /POL0000001/ });
    expect(backend.listQueries().slice(before)).toEqual([expectedQuery]);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Policy number')).toHaveValue('POL0000001');
  });

  it('Back from a policy opened directly goes to the plain directory', async () => {
    const user = userEvent.setup();
    policyBackend();
    const router = renderAt(`/policies/list/${POLICY_ID}`);
    await user.click(await screen.findByTitle('Back to Policy Directory'));
    expect(router.state.location.pathname).toBe('/policies/list');
    expect(router.state.location.search).toBe('');
  });

  it('returns only to the directory, never to another path or origin', () => {
    expect(directoryFrom(directoryReturnState('/policies/list', '?coverage=ACTIVE&page=2'))).toBe('/policies/list?coverage=ACTIVE&page=2');
    expect(directoryFrom(directoryReturnState('/policies/list', ''))).toBe('/policies/list');
    for (const state of [
      null,
      undefined,
      'policies',
      { directory: 42 },
      { directory: '//evil.example/policies' },
      { directory: 'https://evil.example/policies' },
      { directory: '/my-work' },
      { directory: `/policies/${POLICY_ID}` },
      { directory: '/policiesx' },
      { directory: '/policies?x=1#frag' },
      { directory: '/policies?x=\\evil' },
      { directory: '/policies/listx' },
      { directory: '/policies/list?x=1#frag' },
      { directory: '/policies/list/POL0000001' },
    ]) {
      expect(directoryFrom(state)).toBe('/policies/list');
    }
  });

  it('appears in the navigation with policies.policy.view', async () => {
    policyBackend();
    renderAt('/policies');
    expect(await screen.findByRole('button', { name: 'Policy Directory' })).toBeInTheDocument();
  });
});

describe('the policy workspace', () => {
  it('shows the policy in force, with no identifiers, and keeps the header ETag', async () => {
    policyBackend();
    renderAt(`/policies/list/${POLICY_ID}`);
    expect(await screen.findByRole('heading', { name: 'POL0000001' })).toBeInTheDocument();
    const text = mainText();
    for (const expected of [
      'Wanjiku Holdings (CUS0000001)',
      'Private Motor',
      'Jubilee Insurance',
      'Not recorded yet',
      'Nairobi',
      'Version 2, from 01 Jun 2026',
      'KES 2,500,000.00',
      'KES 52,000.00',
      'QUO0000007',
      'PRP0000004',
      'Binder BND-2026-01',
      'Kenya, Uganda and Tanzania',
      'Standard excess applies',
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toMatch(UUID_IN_TEXT);
    expect(queryClient.getQueryData<LoadedPolicy>(POLICY_KEYS.detail(POLICY_ID))?.etag).toBe(POLICY_ETAG);
  });

  it('never rebuilds the ETag when the header is missing', async () => {
    policyBackend({ detail: () => json(200, detail()) });
    renderAt(`/policies/list/${POLICY_ID}`);
    await screen.findByRole('heading', { name: 'POL0000001' });
    expect(queryClient.getQueryData<LoadedPolicy>(POLICY_KEYS.detail(POLICY_ID))?.etag).toBeNull();
  });

  it('offers only the sections the backend provides (endorsements since FI1-D)', async () => {
    policyBackend();
    renderAt(`/policies/list/${POLICY_ID}`);
    const tabs = within(await screen.findByRole('tablist', { name: 'Policy sections' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Overview',
      'Risk Schedule',
      'Coverage',
      'Premium & Levies',
      'Versions',
      'Endorsements', // FI1-D
    ]);
    for (const absent of ['Claims', 'Billing', 'Documents', 'Accounting', 'Audit Timeline']) {
      expect(screen.queryByRole('tab', { name: absent })).not.toBeInTheDocument();
    }
  });

  it('shows the risk schedule without identifiers', async () => {
    const user = userEvent.setup();
    policyBackend();
    renderAt(`/policies/list/${POLICY_ID}`);
    await user.click(await screen.findByRole('tab', { name: 'Risk Schedule' }));
    const text = mainText();
    for (const expected of ['Sum insured', '2500000.00', 'Private use', 'Toyota', 'Prado', 'Registration number', 'KDA 123A', 'Box trailer', 'ZD 4411']) {
      expect(text).toContain(expected);
    }
    expect(text).not.toContain('Rate table id');
    expect(text).not.toContain('Owner id');
    expect(text).not.toMatch(UUID_IN_TEXT);
  });

  it('shows the cover, benefits and limits of the version in force', async () => {
    const user = userEvent.setup();
    policyBackend();
    renderAt(`/policies/list/${POLICY_ID}`);
    await user.click(await screen.findByRole('tab', { name: 'Coverage' }));
    const benefits = screen.getByRole('table', { name: 'Benefits and limits' });
    const windscreen = within(benefits).getByRole('row', { name: /Windscreen cover/ });
    expect(windscreen).toHaveTextContent('Own damage');
    expect(windscreen).toHaveTextContent('KES 75,000.00');
    expect(windscreen).toHaveTextContent('Per occurrence');
    expect(windscreen).toHaveTextContent('Included');
    const courtesy = within(benefits).getByRole('row', { name: /Courtesy car/ });
    expect(courtesy).toHaveTextContent('No limit stated');
    expect(courtesy).toHaveTextContent('Optional, held');
    expect(mainText()).toContain('Racing, pace-making or speed testing');
  });

  it('shows the premium and levies, and commission only when the backend sends it', async () => {
    const user = userEvent.setup();
    policyBackend();
    renderAt(`/policies/list/${POLICY_ID}`);
    await user.click(await screen.findByRole('tab', { name: 'Premium & Levies' }));
    const levies = screen.getByRole('table', { name: 'Levies' });
    expect(within(levies).getByRole('row', { name: /Training levy/ })).toHaveTextContent('0.2%');
    expect(within(levies).getByRole('row', { name: /Stamp duty/ })).toHaveTextContent('Fixed KES 40.00');
    expect(mainText()).toContain('KES 50,000.00');
    expect(mainText()).not.toContain('Commission');
  });

  it('shows commission when the backend includes it', async () => {
    const user = userEvent.setup();
    const withCommission = version();
    withCommission.annual_premium = { ...withCommission.annual_premium, commission: '5000.00' };
    policyBackend({ detail: () => json(200, detail({ current_version: withCommission }), { ETag: POLICY_ETAG }) });
    renderAt(`/policies/list/${POLICY_ID}`);
    await user.click(await screen.findByRole('tab', { name: 'Premium & Levies' }));
    expect(mainText()).toContain('CommissionKES 5,000.00');
  });

  it('loads the versions from /versions only when that tab opens', async () => {
    const user = userEvent.setup();
    const backend = policyBackend();
    const router = renderAt(`/policies/list/${POLICY_ID}`);
    await screen.findByRole('heading', { name: 'POL0000001' });
    expect(backend.paths()).not.toContain(`/policies/${POLICY_ID}/versions`);

    await user.click(screen.getByRole('tab', { name: 'Versions' }));
    const table = await screen.findByRole('table', { name: 'Policy versions' });
    expect(router.state.location.search).toBe('?tab=versions');
    const [, first, second] = within(table).getAllByRole('row');
    expect(first).toHaveTextContent('Version 1');
    expect(first).toHaveTextContent('Bound');
    expect(first).toHaveTextContent('31 May 2026');
    expect(first).not.toHaveTextContent('In force');
    expect(second).toHaveTextContent('Version 2');
    expect(second).toHaveTextContent('In force');
    expect(second).toHaveTextContent('Endorsement');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('says a policy out of scope is not found or not available, with its Reference and no record', async () => {
    policyBackend({ detail: () => envelope(404, 'POLICY_NOT_FOUND', 'policy not found', {}, 'corr-404') });
    renderAt(`/policies/list/${POLICY_ID}`);
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(mainText()).toContain('Reference corr-404');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(mainText()).not.toContain('POL0000001');
  });

  it('shows other load errors with their Reference', async () => {
    policyBackend({ detail: () => envelope(403, 'PERMISSION_DENIED', 'You may not view this policy.', {}, 'corr-403') });
    renderAt(`/policies/list/${POLICY_ID}`);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The policy could not be loaded');
    expect(alert).toHaveTextContent('Reference corr-403');
  });

  it('shows a cancelled policy as cancelled, with the reason', async () => {
    policyBackend({
      detail: () =>
        json(
          200,
          detail({
            lifecycle_status: 'CANCELLED',
            coverage_status: 'CANCELLED',
            cancellation: { date: '2026-07-01', reason: 'Vehicle sold', cancelled_at: '2026-06-28T10:00:00Z' },
          }),
          { ETag: POLICY_ETAG },
        ),
    });
    renderAt(`/policies/list/${POLICY_ID}`);
    await screen.findByRole('heading', { name: 'POL0000001' });
    expect(mainText()).toContain('Cancelled from01 Jul 2026');
    expect(mainText()).toContain('Vehicle sold');
  });
});
