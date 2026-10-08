import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { detail, ENDORSEMENT_ID, MAKER, POLICY_ETAG, POLICY_ID, summary, V1, version } from '../../test/policyFixtures';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';

const PRODUCT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const V_ID = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
const ENDORSER: Me = { ...MAKER, permissions: ['policies.policy.view', 'policies.endorsement.create', 'products.product.view'] };
const CANCELLER: Me = { ...ENDORSER, permissions: [...ENDORSER.permissions, 'policies.policy.cancel'] };

const created = { id: ENDORSEMENT_ID, endorsement_no: 'END0000009', policy: { id: POLICY_ID, policy_no: 'POL0000001' } };

function typesBackend(onCreate: (call: FakeCall) => Response = () => json(201, created, { ETag: '"e1"' })) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/policies?')) return json(200, { results: [summary()], count: 1, page: 1, page_size: 5 });
    if (path === `/policies/${POLICY_ID}`) return json(200, detail(), { ETag: POLICY_ETAG });
    if (path === `/policies/${POLICY_ID}/versions`) return json(200, { policy_no: 'POL0000001', results: [V1, version()] });
    if (path === `/policies/${POLICY_ID}/endorsements` && call.method === 'GET') return json(200, { policy_no: 'POL0000001', results: [] });
    if (path === `/policies/${POLICY_ID}/endorsements` && call.method === 'POST') return onCreate(call);
    if (path === `/products/${PRODUCT_ID}`) {
      return json(200, { id: PRODUCT_ID, versions: [{ id: V_ID, version_no: 1, status: 'PUBLISHED', effective_from: '2020-01-01', effective_to: null }] });
    }
    if (path === `/products/${PRODUCT_ID}/versions/${V_ID}`) {
      return json(200, { id: V_ID, version_no: 1, status: 'PUBLISHED', effective_from: '2020-01-01', effective_to: null, content: {
        rating_factors: [
          { code: 'sum_insured', name: 'Sum insured', data_type: 'DECIMAL', choices: [], min_value: '0', max_value: null, is_required: true, unit: 'KES' },
          { code: 'vehicle_use', name: 'Use', data_type: 'CHOICE', choices: ['PRIVATE_USE', 'COMMERCIAL'], min_value: null, max_value: null, is_required: true, unit: '' },
        ],
        benefits: [
          { code: 'WINDSCREEN', name: 'Windscreen cover', is_optional: false, limit_amount: '75000' },
          { code: 'COURTESY_CAR', name: 'Courtesy car', is_optional: true, limit_amount: null },
          { code: 'RADIO', name: 'Radio cassette', is_optional: true, limit_amount: '30000' },
        ] } });
    }
    if (path.startsWith(`/endorsements/${ENDORSEMENT_ID}`)) return json(404, { error: { code: 'NOT_FOUND', message: 'x', correlation_id: 'c' } });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return { ...network, posted: () => network.calls.filter((call) => call.method === 'POST').map((call) => call.body as Record<string, unknown>) };
}

function renderAt(me: Me) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, me);
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createMemoryRouter(backendRoutes, { initialEntries: ['/policies/list/POL0000001/endorsements/new'] })} />
    </QueryClientProvider>,
  );
}

const form = async () => within(await screen.findByRole('dialog'));
const fill = async (user: ReturnType<typeof userEvent.setup>, kind: string, reason = 'Customer request') => {
  const dialog = await form();
  await user.selectOptions(await dialog.findByLabelText('What changes'), kind);
  await user.type(dialog.getByLabelText(/^Reason/), reason);
  return dialog;
};

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Endorsements of every type', () => {
  it('offers every type the server can price, never risk items, and cancellation only to those who may cancel', async () => {
    typesBackend();
    renderAt(ENDORSER);
    const select = await (await form()).findByLabelText('What changes');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Change a limit', 'Change the sum insured', 'Change the cover', 'Change the geographical limit', 'Change the policy period']);
  });

  it('changes the sum insured, sent as plain digits with the policy ETag', async () => {
    const user = userEvent.setup();
    const backend = typesBackend();
    renderAt(ENDORSER);
    const dialog = await fill(user, 'CHANGE_SUM_INSURED');
    await user.type(dialog.getByLabelText(/New sum insured/), '2,200,000');
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    await waitFor(() => expect(backend.posted()).toHaveLength(1));
    expect(backend.posted()[0]).toMatchObject({ endorsement_type: 'CHANGE_SUM_INSURED', reason: 'Customer request', changes: { sum_insured: '2200000' } });
    expect(backend.calls.find((call) => call.method === 'POST')!.headers['if-match']).toBe(POLICY_ETAG);
  });

  it('changes the cover from the tariff the policy was priced on, sending only what differs', async () => {
    const user = userEvent.setup();
    const backend = typesBackend();
    renderAt(ENDORSER);
    const dialog = await fill(user, 'CHANGE_COVER');
    expect(await dialog.findByText(/the tariff this policy was priced on/)).toBeInTheDocument();
    expect(dialog.queryByLabelText('Sum insured')).not.toBeInTheDocument();   // that is its own type
    await user.selectOptions(dialog.getByLabelText('Use'), 'COMMERCIAL');
    await user.click(dialog.getByLabelText('Radio cassette'));
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    await waitFor(() => expect(backend.posted()).toHaveLength(1));
    expect(backend.posted()[0]).toMatchObject({ endorsement_type: 'CHANGE_COVER', changes: { factors: { vehicle_use: 'COMMERCIAL' }, add_benefits: ['RADIO'] } });
  });

  it('a cover change that changes nothing is refused before sending', async () => {
    const user = userEvent.setup();
    const backend = typesBackend();
    renderAt(ENDORSER);
    const dialog = await fill(user, 'CHANGE_COVER');
    await dialog.findByText(/the tariff this policy was priced on/);
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    expect(dialog.getByText('Change a rating detail or an optional cover.')).toBeInTheDocument();
    expect(backend.posted()).toHaveLength(0);
  });

  it('changes the geographical limit and the policy period', async () => {
    const user = userEvent.setup();
    const backend = typesBackend();
    renderAt(ENDORSER);
    let dialog = await fill(user, 'CHANGE_GEOGRAPHICAL_LIMIT');
    expect(dialog.getByText('Now Kenya, Uganda and Tanzania.')).toBeInTheDocument();
    await user.type(dialog.getByLabelText(/New geographical limit/), 'East Africa');
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    await waitFor(() => expect(backend.posted()).toHaveLength(1));
    expect(backend.posted()[0]).toMatchObject({ endorsement_type: 'CHANGE_GEOGRAPHICAL_LIMIT', changes: { geographical_limit: 'East Africa' } });

    vi.unstubAllGlobals();
    queryClient.clear();
    document.body.innerHTML = '';
    const again = typesBackend();
    renderAt(ENDORSER);
    dialog = await fill(user, 'CHANGE_POLICY_PERIOD');
    await user.type(dialog.getByLabelText(/New expiry date/), '2027-03-31');
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    await waitFor(() => expect(again.posted()).toHaveLength(1));
    expect(again.posted()[0]).toMatchObject({ endorsement_type: 'CHANGE_POLICY_PERIOD', changes: { expiry_date: '2027-03-31' } });
  });

  it('cancels the policy with no change to give, for someone who may cancel', async () => {
    const user = userEvent.setup();
    const backend = typesBackend();
    renderAt(CANCELLER);
    const dialog = await fill(user, 'CANCELLATION', 'Vehicle sold');
    expect(dialog.getByText(/Cover ends the day before the effective date/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    await waitFor(() => expect(backend.posted()).toHaveLength(1));
    expect(backend.posted()[0]).toMatchObject({ endorsement_type: 'CANCELLATION', reason: 'Vehicle sold', changes: {} });
  });

  it("shows the server's refusal under the field it names", async () => {
    const user = userEvent.setup();
    typesBackend(() => envelope(422, 'ENDORSEMENT_CHANGE_INVALID', 'the expiry must be from the effective date and within 732 days of inception', { field: 'expiry_date' }));
    renderAt(ENDORSER);
    const dialog = await fill(user, 'CHANGE_POLICY_PERIOD');
    await user.type(dialog.getByLabelText(/New expiry date/), '2030-01-01');
    await user.click(dialog.getByRole('button', { name: 'Create endorsement' }));
    expect(await dialog.findByText(/The expiry must be from the effective date and within 732 days of inception/)).toBeInTheDocument();
  });
});
