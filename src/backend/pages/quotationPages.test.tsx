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
import type { Pricing, QuotationDetail, QuotationSummary, RevisionView } from '../quotations/types';
import { versionInForce } from '../quotations/queries';
import { EMPTY_QUOTATIONS_TEXT } from './QuotationsPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const Q_ID = '99999999-9999-4999-8999-999999999999';
const PRODUCT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const VERSION_ID = 'edededed-eded-4ded-8ded-edededededed';
const CUSTOMER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const BRANCH = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'BRANCH' };
const ETAG = `"quotation-${Q_ID}-v4"`;

const person = (permissions: string[]): Me => ({
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'maker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [BRANCH],
});
const MAKER = person([
  'quotations.quotation.view', 'quotations.quotation.create', 'quotations.quotation.edit', 'quotations.quotation.issue',
  'quotations.quotation.decide', 'quotations.quotation.cancel', 'clients.customer.view', 'products.product.view',
]);
const CHECKER = person(['quotations.quotation.view', 'quotations.quotation.check']);

const summary = (over: Partial<QuotationSummary> = {}): QuotationSummary => ({
  id: Q_ID,
  quotation_no: 'QUO0000001',
  status: 'DRAFT',
  effective_status: 'DRAFT',
  customer: { id: CUSTOMER_ID, customer_no: 'CUS0000001', display_name: 'Wanjiku Kamau' },
  product: { id: PRODUCT_ID, code: 'MOTOR_PVT', name: 'Motor Private' },
  insurer: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'JUB', name: 'Jubilee Insurance' },
  branch: { id: BRANCH.id, code: 'NBO', name: 'Nairobi' },
  quote_date: '2026-10-06',
  valid_until: '2026-11-05',
  current_revision_no: 1,
  ...over,
});
const PRICING: Pricing = {
  priced_at: '2026-10-06T10:00:00Z',
  rating_date: '2026-10-06',
  version_no: 1,
  currency: 'KES',
  base_premium: '40000.00',
  loadings: '0.00',
  discounts: '-2000.00',
  minimum_premium_adjustment: '0.00',
  rounding_adjustment: '0.00',
  basic_premium: '38000.00',
  levies: [{ code: 'TL', name: 'Training levy', amount: '76.00' }],
  levies_total: '76.00',
  total_premium: '38076.00',
};
const revision = (over: Partial<RevisionView> = {}): RevisionView => ({
  revision_no: 1,
  status: 'DRAFT',
  risk: { factors: { sum_insured: '1000000', vehicle_use: 'PRIVATE' }, details: { colour: 'Blue' }, identifiers: [] },
  pricing: null,
  required_documents: [],
  duplicate_alerts: { visible: [], hidden_count: 0 },
  duplicates_acknowledged: false,
  duplicate_reason: '',
  workflow: null,
  check: { required: false, status: 'NONE', submitted_at: null, checked_at: null },
  issued_at: null,
  ...over,
});
const detail = (over: Partial<QuotationDetail> = {}, rev: Partial<RevisionView> = {}): QuotationDetail => ({
  ...summary(),
  marketer_ref: '',
  agent_ref: '',
  sub_agent_ref: '',
  decision_reason: '',
  decided_at: null,
  row_version: 4,
  current_revision: revision(rev),
  revisions: [{ revision_no: 1, status: 'DRAFT', issued_at: null, total_premium: null }],
  ...over,
});
const FACTORS = [
  { code: 'sum_insured', name: 'Sum insured', data_type: 'DECIMAL', choices: [], min_value: '100000', max_value: null, is_required: true, unit: 'KES' },
  { code: 'vehicle_use', name: 'Use', data_type: 'CHOICE', choices: ['PRIVATE', 'COMMERCIAL'], min_value: null, max_value: null, is_required: true, unit: '' },
  { code: 'has_tracker', name: 'Tracking device', data_type: 'BOOLEAN', choices: [], min_value: null, max_value: null, is_required: false, unit: '' },
];

interface Options {
  list?: QuotationSummary[];
  view?: QuotationDetail;
  command?: (call: FakeCall, action: string) => Response | null;
}

function quotationBackend(options: Options = {}) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/quotations?')) {
      const results = options.list ?? [summary()];
      return json(200, { results, count: results.length, page: 1, page_size: 25 });
    }
    if (path === '/products?status=ACTIVE') {
      return json(200, { results: [{ id: PRODUCT_ID, code: 'MOTOR_PVT', name: 'Motor Private', insurer: { id: 'x', code: 'JUB', name: 'Jubilee Insurance' }, currency: 'KES', status: 'ACTIVE' }] });
    }
    if (path === `/products/${PRODUCT_ID}`) {
      return json(200, { id: PRODUCT_ID, versions: [{ id: VERSION_ID, version_no: 1, status: 'PUBLISHED', effective_from: '2020-01-01', effective_to: null }] });
    }
    if (path === `/products/${PRODUCT_ID}/versions/${VERSION_ID}`) {
      return json(200, { id: VERSION_ID, version_no: 1, status: 'PUBLISHED', effective_from: '2020-01-01', effective_to: null, content: { rating_factors: FACTORS } });
    }
    if (path.startsWith('/clients?')) {
      return json(200, { results: [{ id: CUSTOMER_ID, customer_no: 'CUS0000001', customer_type: 'INDIVIDUAL', display_name: 'Wanjiku Kamau', status: 'ACTIVE', kyc_status: 'VERIFIED', primary_phone: null, primary_email: null, home_branch: BRANCH }], count: 1, page: 1, page_size: 25 });
    }
    const view = options.view ?? detail();
    if (path === '/quotations' && call.method === 'POST') return json(201, detail({ quotation_no: 'QUO0000002' }), { ETag: ETAG });
    if (path === `/quotations/${Q_ID}` && call.method === 'GET') return json(200, view, { ETag: ETAG });
    if (path.startsWith(`/quotations/${Q_ID}`) && call.method !== 'GET') {
      const action = path.slice(`/quotations/${Q_ID}`.length).replace(/^\//, '') || 'update';
      return options.command?.(call, action) ?? json(200, view, { ETag: ETAG });
    }
    if (path === `/quotations/${Q_ID}/revisions/1/offer`) {
      return json(200, { quotation_no: 'QUO0000001', quote_date: '2026-10-06', valid_until: '2026-11-05', customer: { customer_no: 'CUS0000001', display_name: 'Wanjiku Kamau' }, insurer: { name: 'Jubilee Insurance' }, product: { name: 'Motor Private' }, branch: { name: 'Nairobi' }, revision_no: 1, risk: revision().risk, pricing: PRICING, required_documents: [], issued_at: '2026-10-06T11:00:00Z' });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const sent = (action: string) => network.calls.filter((call) => call.method !== 'GET' && call.url.endsWith(`/quotations/${Q_ID}/${action}`));
  return { ...network, sent };
}

function renderAt(path: string, me: Me = MAKER, state?: unknown) {
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

describe('Quotations list', () => {
  it("lists the server's quotations in words, searches the exact number on the server, and hides New quotation without create", async () => {
    const user = userEvent.setup();
    const backend = quotationBackend({ list: [summary({ status: 'ISSUED', effective_status: 'EXPIRED' })] });
    const router = renderAt('/quotations', CHECKER);
    const row = await screen.findByRole('row', { name: /QUO0000001/ });
    expect(row).toHaveTextContent('Wanjiku Kamau');
    expect(row).toHaveTextContent('Motor Private');
    expect(row).toHaveTextContent('Offer expired');
    expect(screen.queryByRole('button', { name: 'New quotation' })).not.toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    await user.type(screen.getByLabelText('Quotation number'), 'quo0000001');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.search).toBe('?q=quo0000001'));
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/quotations?page=1&page_size=25&q=quo0000001'));
  });

  it('says so when empty', async () => {
    quotationBackend({ list: [] });
    renderAt('/quotations/list');
    expect(await screen.findByText(EMPTY_QUOTATIONS_TEXT)).toBeInTheDocument();
  });
});

describe('New quotation', () => {
  it('takes a customer handed over from the record, a product and the branch, and opens the draft by number', async () => {
    const user = userEvent.setup();
    const backend = quotationBackend();
    const router = renderAt('/quotations/list/new', MAKER, { customer: { id: CUSTOMER_ID, customer_no: 'CUS0000001', display_name: 'Wanjiku Kamau' } });
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    expect(within(dialog).getByText('CUS0000001')).toBeInTheDocument();
    await user.selectOptions(await within(dialog).findByLabelText(/Product/), PRODUCT_ID);
    await user.click(within(dialog).getByRole('button', { name: 'Create quotation' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/quotations/list/QUO0000002'));
    const [create] = backend.calls.filter((call) => call.method === 'POST' && call.url.endsWith('/quotations'));
    expect(create.body).toEqual({ customer_id: CUSTOMER_ID, product_id: PRODUCT_ID, branch_id: BRANCH.id });
    expect(create.headers['if-match']).toBeUndefined();
  });

  it('finds the customer on the server when none is handed over, and needs one', async () => {
    const user = userEvent.setup();
    quotationBackend();
    renderAt('/quotations/list/new');
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await user.click(within(dialog).getByRole('button', { name: 'Create quotation' }));
    expect(within(dialog).getByText('Choose the customer.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Find the customer'), 'Wanjiku');
    await user.click(within(dialog).getByRole('button', { name: 'Find' }));
    await user.click(await within(dialog).findByRole('button', { name: /Wanjiku Kamau/ }));
    expect(within(dialog).getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });
});

describe('The risk, from the product version', () => {
  it('builds the form from the rating factors, validates bounds, and saves typed values with the ETag, keeping details', async () => {
    const user = userEvent.setup();
    const backend = quotationBackend();
    renderAt(`/quotations/list/${Q_ID}`);
    const risk = await screen.findByRole('form', { name: 'Risk' });
    const sum = within(risk).getByLabelText(/Sum insured \(KES\)/);
    expect(within(risk).getByLabelText(/^Use/)).toHaveValue('PRIVATE');
    expect(within(risk).getByLabelText(/Tracking device/)).toBeInTheDocument();

    await user.clear(sum);
    await user.type(sum, '5000');
    await user.click(within(risk).getByRole('button', { name: 'Save risk' }));
    expect(within(risk).getByText('At least 100000 KES.')).toBeInTheDocument();
    expect(backend.sent('risk')).toHaveLength(0);

    await user.clear(sum);
    await user.type(sum, '1200000');
    await user.selectOptions(within(risk).getByLabelText(/Tracking device/), 'true');
    await user.click(within(risk).getByRole('button', { name: 'Add identifier' }));
    await user.type(within(risk).getByLabelText('Identifier 1 number'), 'KDA 123A');
    await user.click(within(risk).getByRole('button', { name: 'Save risk' }));
    await waitFor(() => expect(backend.sent('risk')).toHaveLength(1));
    const [put] = backend.sent('risk');
    expect(put.method).toBe('PUT');
    expect(put.headers['if-match']).toBe(ETAG);
    expect(put.body).toEqual({
      factors: { sum_insured: '1200000', vehicle_use: 'PRIVATE', has_tracker: true },
      details: { colour: 'Blue' },
      identifiers: [{ identifier_type: 'VEHICLE_REGISTRATION', value: 'KDA 123A' }],
    });
  });
});

describe('Pricing and the offer', () => {
  it('prices with the ETag and shows the stored breakdown; commission only when the server sends it', async () => {
    const user = userEvent.setup();
    const backend = quotationBackend({ view: detail({}, { pricing: PRICING }) });
    renderAt(`/quotations/list/${Q_ID}`);
    const premium = await screen.findByRole('table', { name: 'Premium' });
    expect(premium).toHaveTextContent('Training levy');
    expect(premium).toHaveTextContent('KES 38,076.00');
    expect(premium).not.toHaveTextContent('Commission');
    await user.click(screen.getByRole('button', { name: 'Price again' }));
    await waitFor(() => expect(backend.sent('price')).toHaveLength(1));
    expect(backend.sent('price')[0].headers['if-match']).toBe(ETAG);

    cleanup();
    queryClient.clear();
    quotationBackend({ view: detail({}, { pricing: { ...PRICING, commission: { amount: '4750.00', rate_percent: '12.5' } } }) });
    renderAt(`/quotations/list/${Q_ID}`);
    expect(await screen.findByText('Commission (12.5%)')).toBeInTheDocument();
  });

  it('issues with an acknowledgement and a reason when the risk is on other quotations, under a new key after the refusal', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = quotationBackend({
      view: detail({}, { pricing: PRICING }),
      command: (_call, action) => {
        if (action !== 'issue') return null;
        attempts += 1;
        return attempts === 1
          ? envelope(422, 'DUPLICATE_RISK_ACKNOWLEDGEMENT_REQUIRED', 'this risk is on other live quotations', {
              duplicate_alerts: { visible: [{ id: 'a', quotation_no: 'QUO0000009', status: 'ISSUED' }], hidden_count: 1 },
            })
          : json(200, detail({ status: 'ISSUED', effective_status: 'ISSUED' }, { pricing: PRICING, status: 'ISSUED' }), { ETag: ETAG });
      },
    });
    renderAt(`/quotations/list/${Q_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Issue offer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Issue offer' });
    await user.click(within(dialog).getByRole('button', { name: 'Issue offer' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('QUO0000009');
    expect(alert).toHaveTextContent('1 more is outside the branches you can see.');
    expect(within(dialog).getByRole('button', { name: 'Issue anyway' })).toBeDisabled();
    await user.click(within(dialog).getByLabelText(/I have checked the other quotations/));
    await user.click(within(dialog).getByRole('button', { name: 'Issue anyway' }));
    expect(within(dialog).getByText('Say why this offer is issued anyway.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Reason/), 'Replacement quote for the same car');
    await user.click(within(dialog).getByRole('button', { name: 'Issue anyway' }));

    await waitFor(() => expect(backend.sent('issue')).toHaveLength(2));
    const [first, second] = backend.sent('issue');
    expect(first.body).toEqual({});
    expect(second.body).toEqual({ acknowledge_duplicates: true, reason: 'Replacement quote for the same car' });
    expect(second.headers['x-idempotency-key']).not.toBe(first.headers['x-idempotency-key']);
  });

  it('records acceptance with the ETag; a decline needs a reason; the issued offer can be viewed', async () => {
    const user = userEvent.setup();
    const issued = detail(
      { status: 'ISSUED', effective_status: 'ISSUED', revisions: [{ revision_no: 1, status: 'ISSUED', issued_at: '2026-10-06T11:00:00Z', total_premium: '38076.00' }] },
      { pricing: PRICING, status: 'ISSUED' },
    );
    const backend = quotationBackend({ view: issued });
    renderAt(`/quotations/list/${Q_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Customer declined' }));
    const decline = await screen.findByRole('dialog', { name: 'Customer declined' });
    await user.click(within(decline).getByRole('button', { name: 'Record the decline' }));
    expect(within(decline).getByText('Give the reason.')).toBeInTheDocument();
    await user.click(within(decline).getByRole('button', { name: 'Back' }));

    await user.click(screen.getByRole('button', { name: 'Customer accepted' }));
    await waitFor(() => expect(backend.sent('accept')).toHaveLength(1));
    expect(backend.sent('accept')[0].headers['if-match']).toBe(ETAG);
    expect(backend.sent('decline')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'View offer' }));
    const offer = await screen.findByRole('dialog', { name: /Offer QUO0000001, revision 1/ });
    expect(await within(offer).findByRole('table', { name: 'Premium' })).toHaveTextContent('KES 38,076.00');
  });
});

describe('A revision of an expired offer', () => {
  it('the maker submits it for a check and cannot issue it before', async () => {
    const user = userEvent.setup();
    const backend = quotationBackend({ view: detail({ current_revision_no: 2 }, { revision_no: 2, pricing: PRICING, check: { required: true, status: 'NONE', submitted_at: null, checked_at: null } }) });
    renderAt(`/quotations/list/${Q_ID}`);
    expect(await screen.findByText('This revision needs a checker')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Issue offer' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit for a check' }));
    await waitFor(() => expect(backend.sent('submit-revision')).toHaveLength(1));
  });

  it('a checker approves it here when the tenant does not govern it; when governed it waits in My Work Queue', async () => {
    const user = userEvent.setup();
    const pending = { required: true, status: 'PENDING' as const, submitted_at: '2026-10-06T12:00:00Z', checked_at: null };
    const backend = quotationBackend({ view: detail({}, { pricing: PRICING, check: pending }) });
    renderAt(`/quotations/list/${Q_ID}`, CHECKER);
    await user.click(await screen.findByRole('button', { name: 'Approve revision' }));
    await waitFor(() => expect(backend.sent('approve-revision')).toHaveLength(1));

    cleanup();
    queryClient.clear();
    quotationBackend({
      view: detail({}, { pricing: PRICING, check: pending, workflow: { instance_id: 'w', status: 'PENDING_APPROVAL', waiting_on: ['Quotation Checker'] } }),
    });
    renderAt(`/quotations/list/${Q_ID}`, CHECKER);
    expect(await screen.findByText('Waiting for: Quotation Checker')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve revision' })).not.toBeInTheDocument();
  });
});

describe('Addresses', () => {
  it('a number the user cannot see is not found', async () => {
    quotationBackend({ list: [] });
    renderAt('/quotations/list/QUO0000099');
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
  });

  it('picks the published version in force on the day', () => {
    const versions = [
      { id: 'a', version_no: 1, status: 'PUBLISHED' as const, effective_from: '2026-01-01', effective_to: '2026-06-30' },
      { id: 'b', version_no: 2, status: 'PUBLISHED' as const, effective_from: '2026-07-01', effective_to: null },
      { id: 'c', version_no: 3, status: 'DRAFT' as const, effective_from: null, effective_to: null },
    ];
    expect(versionInForce(versions, '2026-03-01')?.id).toBe('a');
    expect(versionInForce(versions, '2026-10-06')?.id).toBe('b');
    expect(versionInForce(versions, '2025-12-31')).toBeNull();
  });
});
