import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import type { PolicyDetail, PolicySummary, PolicyVersion } from '../policies/types';
import { EMPTY_POLICIES_TEXT } from './PoliciesPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const POLICY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ENDORSEMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const POLICY_ETAG = `"policy-${POLICY_ID}-v3"`;

const MAKER: Me = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'maker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions: ['policies.policy.view'],
  branches: [{ id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'OWN' }],
};

const summary = (over: Partial<PolicySummary> = {}): PolicySummary => ({
  id: POLICY_ID,
  policy_no: 'POL0000001',
  insurer_policy_no: '',
  lifecycle_status: 'BOUND',
  coverage_status: 'ACTIVE',
  customer: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', customer_no: 'CUS0000001', display_name: 'Wanjiku Holdings' },
  product: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', code: 'MOTOR_PVT', name: 'Private Motor' },
  insurer: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'JUB', name: 'Jubilee Insurance' },
  branch: { id: MAKER.branches[0].id, code: 'NBO', name: 'Nairobi' },
  inception_date: '2026-01-01',
  expiry_date: '2026-12-31',
  version_no: 2,
  currency: 'KES',
  total_premium: '52000.00',
  ...over,
});

const version = (over: Partial<PolicyVersion> = {}): PolicyVersion => ({
  version_no: 2,
  source_type: 'ENDORSEMENT',
  endorsement_id: ENDORSEMENT_ID,
  effective_from: '2026-06-01',
  effective_to: null,
  inception_date: '2026-01-01',
  expiry_date: '2026-12-31',
  terminated: false,
  annual_premium: {
    currency: 'KES',
    basic_premium: '50000.00',
    levies_total: '2000.00',
    total_premium: '52000.00',
    levies: [
      { code: 'TL', name: 'Training levy', basis: 'PERCENT', rate: '0.2000', amount: '100.00' },
      { code: 'STAMP', name: 'Stamp duty', basis: 'FIXED', rate: '40.00', amount: '40.00' },
    ],
    rating_date: '2026-01-01',
  },
  risk: {
    factors: { sum_insured: '2500000.00', vehicle_use: 'PRIVATE_USE', rate_table_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    details: { make: 'Toyota', model: 'Prado', owner_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    identifiers: [{ identifier_type: 'REGISTRATION_NUMBER', value: 'KDA 123A' }],
    items: [{ code: 'TRAILER', description: 'Box trailer', identifier: 'ZD 4411', value: '150000.00' }],
  },
  cover: {
    cover_sections: [{ code: 'OWN_DAMAGE', name: 'Own damage', description: '', is_mandatory: true }],
    benefits: [
      {
        code: 'WINDSCREEN',
        name: 'Windscreen cover',
        section: 'OWN_DAMAGE',
        description: 'Repair or replacement',
        limit_amount: '75000.00',
        limit_description: 'Per occurrence',
        is_optional: false,
      },
      {
        code: 'COURTESY_CAR',
        name: 'Courtesy car',
        section: 'OWN_DAMAGE',
        description: '',
        limit_amount: null,
        limit_description: '',
        is_optional: true,
      },
    ],
    exclusions: [{ code: 'RACING', section: null, text: 'Racing, pace-making or speed testing' }],
  },
  terms: { geographical_limit: 'Kenya, Uganda and Tanzania' },
  sum_insured: '2500000.00',
  underwriting_details: { excess_note: 'Standard excess applies', approver_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
  created_at: '2026-05-20T08:00:00Z',
  ...over,
});

const V1 = version({ version_no: 1, source_type: 'BIND', endorsement_id: null, effective_from: '2026-01-01', effective_to: '2026-05-31' });

const detail = (over: Partial<PolicyDetail> = {}): PolicyDetail => ({
  ...summary(),
  source: {
    quotation: { id: '12121212-1212-4121-8121-121212121212', quotation_no: 'QUO0000007' },
    proposal: { id: '13131313-1313-4131-8131-131313131313', proposal_no: 'PRP0000004' },
  },
  agreement: { id: '14141414-1414-4141-8141-141414141414', agreement_type: 'BINDER', reference_no: 'BND-2026-01' },
  sum_insured: '2500000.00',
  bound_at: '2025-12-20T10:00:00Z',
  current_version: version(),
  cancellation: null,
  row_version: 3,
  ...over,
});

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

  it('opens a policy from its row', async () => {
    const user = userEvent.setup();
    policyBackend();
    const router = renderAt('/policies');
    await user.click(await screen.findByRole('row', { name: /POL0000001/ }));
    expect(router.state.location.pathname).toBe(`/policies/${POLICY_ID}`);
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
    const listed = '/policies?coverage=ACTIVE&q=POL0000001&page=2';
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

    expect(router.state.location.pathname).toBe('/policies');
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
    const router = renderAt(`/policies/${POLICY_ID}`);
    await user.click(await screen.findByTitle('Back to Policy Directory'));
    expect(router.state.location.pathname).toBe('/policies');
    expect(router.state.location.search).toBe('');
  });

  it('returns only to the directory, never to another path or origin', () => {
    expect(directoryFrom(directoryReturnState('/policies', '?coverage=ACTIVE&page=2'))).toBe('/policies?coverage=ACTIVE&page=2');
    expect(directoryFrom(directoryReturnState('/policies', ''))).toBe('/policies');
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
    ]) {
      expect(directoryFrom(state)).toBe('/policies');
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
    renderAt(`/policies/${POLICY_ID}`);
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
    renderAt(`/policies/${POLICY_ID}`);
    await screen.findByRole('heading', { name: 'POL0000001' });
    expect(queryClient.getQueryData<LoadedPolicy>(POLICY_KEYS.detail(POLICY_ID))?.etag).toBeNull();
  });

  it('offers only the sections the backend provides', async () => {
    policyBackend();
    renderAt(`/policies/${POLICY_ID}`);
    const tabs = within(await screen.findByRole('tablist', { name: 'Policy sections' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Overview', 'Risk Schedule', 'Coverage', 'Premium & Levies', 'Versions']);
    for (const absent of ['Claims', 'Billing', 'Documents', 'Accounting', 'Audit Timeline', 'Endorsements']) {
      expect(screen.queryByRole('tab', { name: absent })).not.toBeInTheDocument();
    }
  });

  it('shows the risk schedule without identifiers', async () => {
    const user = userEvent.setup();
    policyBackend();
    renderAt(`/policies/${POLICY_ID}`);
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
    renderAt(`/policies/${POLICY_ID}`);
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
    renderAt(`/policies/${POLICY_ID}`);
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
    renderAt(`/policies/${POLICY_ID}`);
    await user.click(await screen.findByRole('tab', { name: 'Premium & Levies' }));
    expect(mainText()).toContain('CommissionKES 5,000.00');
  });

  it('loads the versions from /versions only when that tab opens', async () => {
    const user = userEvent.setup();
    const backend = policyBackend();
    const router = renderAt(`/policies/${POLICY_ID}`);
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
    renderAt(`/policies/${POLICY_ID}`);
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(mainText()).toContain('Reference corr-404');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(mainText()).not.toContain('POL0000001');
  });

  it('shows other load errors with their Reference', async () => {
    policyBackend({ detail: () => envelope(403, 'PERMISSION_DENIED', 'You may not view this policy.', {}, 'corr-403') });
    renderAt(`/policies/${POLICY_ID}`);
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
    renderAt(`/policies/${POLICY_ID}`);
    await screen.findByRole('heading', { name: 'POL0000001' });
    expect(mainText()).toContain('Cancelled from01 Jul 2026');
    expect(mainText()).toContain('Vehicle sold');
  });
});
