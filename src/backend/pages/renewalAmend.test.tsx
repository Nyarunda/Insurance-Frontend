import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { detail, MAKER, POLICY_ETAG, POLICY_ID, summary } from '../../test/policyFixtures';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import type { RenewalDetail } from '../renewals/types';

const R_ID = 'abababab-abab-4bab-8bab-abababababab';
const PRODUCT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const V_OLD = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
const V_NEW = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f';
const RENEWER: Me = { ...MAKER, permissions: ['policies.policy.view', 'policies.renewal.create', 'products.product.view'] };

const FACTORS = [
  { code: 'sum_insured', name: 'Sum insured', data_type: 'DECIMAL', choices: [], min_value: '0', max_value: null, is_required: true, unit: 'KES' },
  { code: 'vehicle_use', name: 'Use', data_type: 'CHOICE', choices: ['PRIVATE_USE', 'COMMERCIAL'], min_value: null, max_value: null, is_required: true, unit: '' },
];
const BENEFITS = [
  { code: 'WINDSCREEN', name: 'Windscreen cover', is_optional: false, limit_amount: '75000' },
  { code: 'COURTESY_CAR', name: 'Courtesy car', is_optional: true, limit_amount: null },
  { code: 'RADIO', name: 'Radio cassette', is_optional: true, limit_amount: '30000' },
];

const renewal = (over: Partial<RenewalDetail> = {}): RenewalDetail => ({
  id: R_ID, renewal_no: 'REN0000001', renewal_type: 'AMENDED', status: 'DRAFT', effective_status: 'DRAFT',
  inception_date: '2027-01-01', expiry_date: '2027-12-31', renewal_total_premium: null,
  policy: { id: POLICY_ID, policy_no: 'POL0000001' }, source_version_no: 2,
  requested_changes: { sum_insured: '2000000', add_benefits: ['RADIO'] }, pricing: null,
  check: { required: false, reasons: [], approved_by: null, approved_at: null }, offer_valid_until: null, offered_at: null,
  decision_reason: '', decided_at: null, resulting_version_no: null, renewed_at: null, workflow: null, row_version: 1, ...over,
});

function amendBackend(options: { prepare?: (call: FakeCall) => Response; update?: (call: FakeCall) => Response } = {}) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/policies?')) return json(200, { results: [summary()], count: 1, page: 1, page_size: 5 });
    if (path === `/policies/${POLICY_ID}`) return json(200, detail(), { ETag: POLICY_ETAG });
    if (path === `/policies/${POLICY_ID}/renewals` && call.method === 'GET') return json(200, { policy_no: 'POL0000001', results: [renewal()] });
    if (path === `/policies/${POLICY_ID}/renewals` && call.method === 'POST') return (options.prepare ?? (() => json(201, renewal(), { ETag: '"r1"' })))(call);
    if (path === `/products/${PRODUCT_ID}`) {
      return json(200, { id: PRODUCT_ID, versions: [
        { id: V_OLD, version_no: 1, status: 'PUBLISHED', effective_from: '2020-01-01', effective_to: '2026-12-31' },
        { id: V_NEW, version_no: 2, status: 'PUBLISHED', effective_from: '2027-01-01', effective_to: null },
      ] });
    }
    if (path === `/products/${PRODUCT_ID}/versions/${V_NEW}`) {
      return json(200, { id: V_NEW, version_no: 2, status: 'PUBLISHED', effective_from: '2027-01-01', effective_to: null, content: { rating_factors: FACTORS, benefits: BENEFITS } });
    }
    if (path === `/renewals/${R_ID}` && call.method === 'GET') return json(200, renewal(), { ETag: '"r1"' });
    if (path === `/renewals/${R_ID}` && call.method === 'PATCH') return (options.update ?? (() => json(200, renewal(), { ETag: '"r2"' })))(call);
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return { ...network, sent: (method: string) => network.calls.filter((call) => call.method === method) };
}

function renderAt(path: string) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, RENEWER);
  useBranchStore.getState().hydrate(RENEWER.user.id, RENEWER.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
  const router = createMemoryRouter(backendRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const dialog = () => screen.getAllByRole('dialog').at(-1)!;

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Amended renewals (RS-B)', () => {
  it('reads the tariff in force at the new start and sends only what changed, with the policy ETag', async () => {
    const user = userEvent.setup();
    const backend = amendBackend();
    const router = renderAt('/policies/list/POL0000001/renewals/new');
    await user.click(await screen.findByLabelText('Amended'));
    expect(await within(dialog()).findByText(/Against product version 2/)).toBeInTheDocument();
    const sum = within(dialog()).getByLabelText('Sum insured');
    expect(sum).toHaveValue('2500000.00');
    await user.clear(sum);
    await user.type(sum, '2,000,000');
    await user.click(within(dialog()).getByLabelText('Courtesy car'));        // held optional cover, removed
    await user.click(within(dialog()).getByLabelText('Radio cassette'));      // optional cover, added
    const windscreen = within(dialog()).getByLabelText('Windscreen cover');
    await user.clear(windscreen);
    await user.type(windscreen, '90000');
    await user.click(within(dialog()).getByRole('button', { name: 'Prepare renewal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000001/renewals/REN0000001'));
    const [post] = backend.sent('POST');
    expect(post.headers['if-match']).toBe(POLICY_ETAG);
    expect(post.body).toEqual({
      renewal_type: 'AMENDED',
      changes: { sum_insured: '2000000', remove_benefits: ['COURTESY_CAR'], add_benefits: ['RADIO'], limits: { WINDSCREEN: '90000' } },
    });
  });

  it('refuses an amended renewal that changes nothing, before sending', async () => {
    const user = userEvent.setup();
    const backend = amendBackend();
    renderAt('/policies/list/POL0000001/renewals/new');
    await user.click(await screen.findByLabelText('Amended'));
    await within(dialog()).findByText(/Against product version 2/);
    await user.click(within(dialog()).getByRole('button', { name: 'Prepare renewal' }));
    expect(within(dialog()).getByText('Change at least one thing, or prepare it as is.')).toBeInTheDocument();
    expect(backend.sent('POST')).toHaveLength(0);
  });

  it("puts the server's refusal under the amendment it names", async () => {
    const user = userEvent.setup();
    amendBackend({ prepare: () => envelope(422, 'RENEWAL_CHANGE_INVALID', 'the cover has no benefit WINDSCREEN', { field: 'limits' }) });
    renderAt('/policies/list/POL0000001/renewals/new');
    await user.click(await screen.findByLabelText('Amended'));
    const windscreen = await within(dialog()).findByLabelText('Windscreen cover');
    await user.clear(windscreen);
    await user.type(windscreen, '90000');
    await user.click(within(dialog()).getByRole('button', { name: 'Prepare renewal' }));
    expect(await within(dialog()).findByText('The cover has no benefit WINDSCREEN.')).toBeInTheDocument();
  });

  it('shows the amendments on the renewal, and can change them or go back to as is', async () => {
    const user = userEvent.setup();
    const backend = amendBackend();
    renderAt('/policies/list/POL0000001/renewals/REN0000001');
    expect(await screen.findByText('Add radio')).toBeInTheDocument();
    expect(screen.getByText('Sum insured 2,000,000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change amendments' }));
    const sum = await within(dialog()).findByLabelText('Sum insured');
    expect(sum).toHaveValue('2000000');                                        // seeded from what was asked
    expect(within(dialog()).getByLabelText('Radio cassette')).toBeChecked();
    await user.click(within(dialog()).getByRole('button', { name: 'Back to as is' }));
    await waitFor(() => expect(backend.sent('PATCH')).toHaveLength(1));
    expect(backend.sent('PATCH')[0].body).toEqual({ renewal_type: 'AS_IS', changes: {} });
    expect(backend.sent('PATCH')[0].headers['if-match']).toBe('"r1"');
  });
});
