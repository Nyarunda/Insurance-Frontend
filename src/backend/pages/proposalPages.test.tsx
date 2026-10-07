import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import type { ProposalDetail, ProposalException, ProposalSummary, Requirement } from '../proposals/types';
import type { QuotationDetail } from '../quotations/types';
import { exceptionState } from './ProposalPage';
import { EMPTY_PROPOSALS_TEXT } from './ProposalsPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const P_ID = '12121212-1212-4212-8212-121212121212';
const Q_ID = '99999999-9999-4999-8999-999999999999';
const INSURER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const AGREEMENT_ID = 'abababab-abab-4bab-8bab-abababababab';
const BINDER_ID = 'bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc';
const EXCEPTION_ID = 'efefefef-efef-4fef-8fef-efefefefefef';
const BRANCH = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'BRANCH' };
const ETAG = `"proposal-${P_ID}-v3"`;
const POLICY_ID = '34343434-3434-4434-8434-343434343434';

const person = (permissions: string[]): Me => ({
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'maker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [BRANCH],
});
/** As NEW_BUSINESS_MAKER (NB1-P0), for the proposal part. */
const MAKER = person([
  'underwriting.proposal.view', 'underwriting.proposal.create', 'underwriting.proposal.edit', 'underwriting.proposal.decline',
  'underwriting.proposal.cancel', 'quotations.quotation.view', 'quotations.quotation.create', 'quotations.quotation.decide',
  'insurers.insurer.view', 'clients.customer.view',
]);
/** As NEW_BUSINESS_MAKER in full: with policies.policy.view and policies.policy.bind (NB1-D). */
const BINDER = person([...[
  'underwriting.proposal.view', 'underwriting.proposal.create', 'underwriting.proposal.edit', 'underwriting.proposal.decline',
  'underwriting.proposal.cancel', 'quotations.quotation.view', 'quotations.quotation.create', 'quotations.quotation.decide',
  'insurers.insurer.view', 'clients.customer.view', 'clients.customer.create',
], 'policies.policy.view', 'policies.policy.bind']);
/** As NEW_BUSINESS_CHECKER: view and approve exceptions, nothing else here. */
const CHECKER = person(['underwriting.proposal.view', 'underwriting.exception.approve', 'quotations.quotation.view']);

const summary = (over: Partial<ProposalSummary> = {}): ProposalSummary => ({
  id: P_ID,
  proposal_no: 'UWP0000001',
  status: 'DRAFT',
  quotation: { id: Q_ID, quotation_no: 'QUO0000001' },
  customer: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', customer_no: 'CUS0000001', display_name: 'Wanjiku Kamau' },
  product: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', code: 'MOTOR_PVT', name: 'Motor Private' },
  insurer: { id: INSURER_ID, code: 'JUB', name: 'Jubilee Insurance' },
  branch: { id: BRANCH.id, code: 'NBO', name: 'Nairobi' },
  proposed_inception_date: '2026-10-10',
  proposed_expiry_date: '2027-10-09',
  currency: 'KES',
  total_premium: '38076.00',
  ...over,
});
const requirement = (over: Partial<Requirement> = {}): Requirement => ({
  code: 'VALUATION',
  name: 'Valuation report',
  source: 'PRODUCT',
  stage: 'UNDERWRITING',
  required: true,
  satisfied: false,
  evidence_reference: '',
  satisfied_by: null,
  satisfied_at: null,
  ...over,
});
const exception = (over: Partial<ProposalException> = {}): ProposalException => ({
  id: EXCEPTION_ID,
  code: 'UNDERWRITER_REFERRAL',
  source: 'UNDERWRITER',
  reason: 'prior total loss on this vehicle',
  details: {},
  status: 'OPEN',
  raised_by: '11111111-1111-4111-8111-111111111111',
  raised_at: '2026-10-06T12:00:00Z',
  approved_by: null,
  approved_at: null,
  approval_note: '',
  workflow: null,
  ...over,
});
const detail = (over: Partial<ProposalDetail> = {}): ProposalDetail => ({
  ...summary(),
  quotation_revision_no: 1,
  product_version_id: 'edededed-eded-4ded-8ded-edededededed',
  quote_valid_until: '2026-11-05',
  agreement: { id: AGREEMENT_ID, agreement_type: 'AGENCY', reference_no: 'AG-001' },
  sum_insured: '1000000.00',
  underwriting_details: { Survey: 'Clean' },
  premium: {
    currency: 'KES', revision_no: 1, rating_date: '2026-10-06', version_no: 1, content_hash: 'h',
    base_premium: '40000.00', loadings: '0.00', discounts: '-2000.00', minimum_premium_adjustment: '0.00', rounding_adjustment: '0.00',
    basic_premium: '38000.00', levies: [{ code: 'TL', name: 'Training levy', amount: '76.00' }], levies_total: '76.00', total_premium: '38076.00', steps: [],
  },
  quoted_risk: { factors: { sum_insured: '1000000', vehicle_use: 'PRIVATE' }, details: { colour: 'Blue' }, identifiers: [{ identifier_type: 'VEHICLE_REGISTRATION', value: 'KAA 001A' }] },
  cover: {
    cover_sections: [{ code: 'OWN_DAMAGE', name: 'Own damage', description: '', is_mandatory: true }],
    benefits: [{ code: 'WINDSCREEN', name: 'Windscreen', section: 'OWN_DAMAGE', limit_amount: '50000.00', limit_description: '', is_optional: false }],
    exclusions: [{ code: 'RACING', section: 'OWN_DAMAGE', text: 'Racing' }],
  },
  requirements: [requirement()],
  exceptions: [],
  blockers: [],
  submitted_at: null,
  ready_at: null,
  policy_no: null,
  bound_at: null,
  decision_reason: '',
  decided_at: null,
  row_version: 3,
  ...over,
});
const AGREEMENTS = [
  { id: AGREEMENT_ID, agreement_type: 'AGENCY', reference_no: 'AG-001', effective_from: '2026-01-01', effective_to: null, status: 'ACTIVE', binder_limit: null },
  { id: BINDER_ID, agreement_type: 'BINDER', reference_no: 'BD-007', effective_from: '2026-01-01', effective_to: null, status: 'ACTIVE', binder_limit: '5000000.00' },
  { id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd', agreement_type: 'BROKERAGE', reference_no: 'OLD-1', effective_from: '2020-01-01', effective_to: null, status: 'TERMINATED', binder_limit: null },
];

interface Options {
  list?: ProposalSummary[];
  view?: ProposalDetail;
  /** The detail (and its ETag) served on each GET, in order; the last repeats. */
  views?: { view: ProposalDetail; etag: string }[];
  accepted?: Partial<QuotationDetail>[];
  command?: (call: FakeCall, action: string) => Response | null;
  /** The answer to `POST /policies` (bind); by default the new policy POL0000009. */
  bind?: (call: FakeCall) => Response;
}

function proposalBackend(options: Options = {}) {
  let gets = 0;
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/underwriting/proposals?')) {
      const results = options.list ?? [summary()];
      return json(200, { results, count: results.length, page: 1, page_size: 25 });
    }
    if (path.startsWith('/quotations?')) {
      const results = options.accepted ?? [{ id: Q_ID, quotation_no: 'QUO0000001', status: 'ACCEPTED', effective_status: 'ACCEPTED', customer: summary().customer, product: summary().product, insurer: summary().insurer, branch: summary().branch }];
      return json(200, { results, count: results.length, page: 1, page_size: 25 });
    }
    if (path === `/insurers/${INSURER_ID}/agreements`) return json(200, { results: AGREEMENTS });
    const view = options.view ?? detail();
    if (path === `/underwriting/proposals/${P_ID}` && call.method === 'GET' && options.views) {
      const served = options.views[Math.min(gets, options.views.length - 1)];
      gets += 1;
      return json(200, served.view, { ETag: served.etag });
    }
    if (path === '/underwriting/proposals' && call.method === 'POST') return json(201, detail({ proposal_no: 'UWP0000002' }), { ETag: ETAG });
    if (path === `/underwriting/proposals/${P_ID}` && call.method === 'GET') return json(200, view, { ETag: ETAG });
    if (path.startsWith(`/underwriting/proposals/${P_ID}`) && call.method !== 'GET') {
      const action = path.slice(`/underwriting/proposals/${P_ID}`.length).replace(/^\//, '') || 'update';
      return options.command?.(call, action) ?? json(200, view, { ETag: ETAG });
    }
    if (path === `/quotations/${Q_ID}` && call.method === 'GET') {
      return json(200, quotationAccepted(), { ETag: `"quotation-${Q_ID}-v9"` });
    }
    if (path === '/policies' && call.method === 'POST') {
      return options.bind ? options.bind(call) : json(201, { id: POLICY_ID, policy_no: 'POL0000009' }, { ETag: `"policy-${POLICY_ID}-v1"` });
    }
    if (path.startsWith('/policies?')) return json(200, { results: [], count: 0, page: 1, page_size: 25 });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const sent = (action: string) =>
    network.calls.filter((call) => call.method !== 'GET' && (call.url.replace(/^.*\/underwriting\/proposals\/[^/]+/, '').replace(/^\//, '') || 'update') === action);
  return { ...network, sent };
}

const quotationAccepted = (): QuotationDetail => ({
  id: Q_ID, quotation_no: 'QUO0000001', status: 'ACCEPTED', effective_status: 'ACCEPTED',
  customer: summary().customer, product: summary().product, insurer: summary().insurer, branch: summary().branch,
  quote_date: '2026-10-06', valid_until: '2026-11-05', current_revision_no: 1, marketer_ref: '', agent_ref: '', sub_agent_ref: '',
  decision_reason: '', decided_at: '2026-10-06T13:00:00Z', row_version: 9,
  current_revision: {
    revision_no: 1, status: 'ISSUED', risk: { factors: {}, details: {}, identifiers: [] }, pricing: null, required_documents: [],
    duplicate_alerts: { visible: [], hidden_count: 0 }, duplicates_acknowledged: false, duplicate_reason: '', workflow: null,
    check: { required: false, status: 'NONE', submitted_at: null, checked_at: null }, issued_at: '2026-10-06T11:00:00Z',
  },
  revisions: [{ revision_no: 1, status: 'ISSUED', issued_at: '2026-10-06T11:00:00Z', total_premium: '38076.00' }],
});

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

describe('Proposals list', () => {
  it("lists the server's proposals in words, searches the exact number on the server, and hides New proposal without create", async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ list: [summary({ status: 'REFERRED' })] });
    const router = renderAt('/proposals', CHECKER);
    const row = await screen.findByRole('row', { name: /UWP0000001/ });
    expect(row).toHaveTextContent('Wanjiku Kamau');
    expect(row).toHaveTextContent('QUO0000001');
    expect(row).toHaveTextContent('Referred');
    expect(row).toHaveTextContent('KES');
    expect(screen.queryByRole('button', { name: 'New proposal' })).not.toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    await user.type(screen.getByLabelText('Proposal number'), 'uwp0000001');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.search).toBe('?q=uwp0000001'));
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/underwriting/proposals?page=1&page_size=25&q=uwp0000001'));
  });

  it('says so when empty', async () => {
    proposalBackend({ list: [] });
    renderAt('/proposals/list');
    expect(await screen.findByText(EMPTY_PROPOSALS_TEXT)).toBeInTheDocument();
  });
});

describe('New proposal', () => {
  it('an accepted quotation hands itself over; the proposal is created from it with the inception and opens by number', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend();
    const router = renderAt(`/quotations/list/${Q_ID}`, MAKER);
    await user.click(await screen.findByRole('button', { name: 'Create proposal' }));
    const dialog = await screen.findByRole('dialog', { name: 'New proposal' });
    expect(within(dialog).getByText('QUO0000001')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Proposed inception'), '2026-10-10');
    await user.click(within(dialog).getByRole('button', { name: 'Create proposal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/proposals/list/UWP0000002'));
    const [create] = backend.calls.filter((call) => call.method === 'POST' && call.url.endsWith('/underwriting/proposals'));
    expect(create.body).toEqual({ quotation_id: Q_ID, proposed_inception_date: '2026-10-10' });
    expect(create.headers['if-match']).toBeUndefined();
  });

  it('finds an accepted quotation by its exact number when none is handed over, and needs one', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend();
    renderAt('/proposals/list/new');
    const dialog = await screen.findByRole('dialog', { name: 'New proposal' });
    await user.click(within(dialog).getByRole('button', { name: 'Create proposal' }));
    expect(within(dialog).getByText('Choose the accepted quotation.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Find the accepted quotation'), 'QUO0000001');
    await user.click(within(dialog).getByRole('button', { name: 'Find' }));
    await user.click(await within(dialog).findByRole('button', { name: /QUO0000001/ }));
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/quotations?page=1&page_size=25&q=QUO0000001&status=ACCEPTED'));
    expect(within(dialog).getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });
});

describe('The draft', () => {
  it('shows the quoted risk (no details), the copied premium and the cover; the insurer’s active agreements are offered', async () => {
    proposalBackend();
    renderAt(`/proposals/list/${P_ID}`);
    const terms = await screen.findByRole('form', { name: 'Terms' });
    expect(await within(terms).findByRole('option', { name: /Binder · BD-007/ })).toBeInTheDocument();
    expect(within(terms).queryByRole('option', { name: /OLD-1/ })).not.toBeInTheDocument();         // terminated, not current
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Risk & premium' }));
    expect(mainText()).toContain('KAA 001A');
    expect(mainText()).not.toContain('Blue');                                                       // risk.details is not shown (NB-D3)
    expect(screen.getByRole('table', { name: 'Premium' })).toHaveTextContent('Training levy');
    expect(screen.getByRole('table', { name: 'Premium' })).not.toHaveTextContent('Commission');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    await user.click(screen.getByRole('tab', { name: 'Cover' }));
    expect(screen.getByRole('region', { name: 'Own damage' })).toHaveTextContent('Windscreen');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('tabs: Terms by default; Exceptions shows how many are still open; the tab is kept in the address', async () => {
    const user = userEvent.setup();
    const referred = detail({ status: 'REFERRED', submitted_at: '2026-10-06T12:00:00Z', exceptions: [exception()] });
    proposalBackend({ view: referred });
    const router = renderAt(`/proposals/list/${P_ID}`);
    expect(await screen.findByRole('tab', { name: 'Terms' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Terms' })).toHaveTextContent('Requirements');
    expect(screen.queryByRole('list', { name: 'Exceptions' })).not.toBeInTheDocument();
    const exceptionsTab = screen.getByRole('tab', { name: /Exceptions/ });
    expect(exceptionsTab).toHaveTextContent('1');
    await user.click(exceptionsTab);
    expect(router.state.location.search).toBe('?tab=exceptions');
    expect(screen.getByRole('listitem', { name: "Underwriter's referral" })).toBeInTheDocument();
    // The banner and the summary stay on every tab.
    expect(screen.getByText('Referred: waiting for an approval')).toBeInTheDocument();
    expect(screen.getByText('Total premium')).toBeInTheDocument();
  });

  it('saves only the changed terms with the ETag: sum insured as canonical digits, the details as a whole', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend();
    renderAt(`/proposals/list/${P_ID}`);
    const terms = await screen.findByRole('form', { name: 'Terms' });
    await within(terms).findByRole('option', { name: /BD-007/ });
    await user.selectOptions(within(terms).getByLabelText('Agreement'), BINDER_ID);
    const sum = within(terms).getByLabelText(/Sum insured/);
    await user.clear(sum);
    await user.type(sum, '1,200,000');
    await user.click(within(terms).getByRole('button', { name: 'Add detail' }));
    await user.type(within(terms).getByLabelText('Detail 2 name'), 'Survey');
    await user.click(within(terms).getByRole('button', { name: 'Save terms' }));
    expect(within(terms).getByText('Each detail needs its own name.')).toBeInTheDocument();
    expect(backend.sent('update')).toHaveLength(0);

    await user.clear(within(terms).getByLabelText('Detail 2 name'));
    await user.type(within(terms).getByLabelText('Detail 2 name'), 'Prior claims');
    await user.type(within(terms).getByLabelText('Detail 2 value'), 'None in 3 years');
    await user.click(within(terms).getByRole('button', { name: 'Save terms' }));
    await waitFor(() => expect(backend.sent('update')).toHaveLength(1));
    const [patch] = backend.sent('update');
    expect(patch.method).toBe('PATCH');
    expect(patch.headers['if-match']).toBe(ETAG);
    expect(patch.body).toEqual({ agreement_id: BINDER_ID, sum_insured: '1200000', underwriting_details: { Survey: 'Clean', 'Prior claims': 'None in 3 years' } });
  });

  it('a stale terms save keeps what was typed and retries the same body and key with the refreshed ETag', async () => {
    const user = userEvent.setup();
    const NEWER = `"proposal-${P_ID}-v4"`;
    let patches = 0;
    const backend = proposalBackend({
      views: [{ view: detail(), etag: ETAG }, { view: detail({ row_version: 4 }), etag: NEWER }],
      command: (_call, action) => {
        if (action !== 'update') return null;
        patches += 1;
        return patches === 1 ? envelope(412, 'CONCURRENCY_CONFLICT', 'the proposal was changed') : json(200, detail({ row_version: 5 }), { ETag: `"proposal-${P_ID}-v5"` });
      },
    });
    renderAt(`/proposals/list/${P_ID}`);
    const terms = await screen.findByRole('form', { name: 'Terms' });
    await user.clear(within(terms).getByLabelText(/Sum insured/));
    await user.type(within(terms).getByLabelText(/Sum insured/), '900000');
    await user.click(within(terms).getByRole('button', { name: 'Save terms' }));
    expect(await screen.findByText(STALE_TEXT)).toBeInTheDocument();                          // the notice sits above the form
    expect(within(terms).getByLabelText(/Sum insured/)).toHaveValue('900000');
    await user.click(within(terms).getByRole('button', { name: 'Save terms' }));
    await waitFor(() => expect(backend.sent('update')).toHaveLength(2));
    const [first, second] = backend.sent('update');
    expect(second.headers['if-match']).toBe(NEWER);
    expect(second.body).toEqual(first.body);
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
  });

  it('a refusal to submit that is not about the terms lists what stops it, in words', async () => {
    const user = userEvent.setup();
    proposalBackend({
      command: (_call, action) =>
        action === 'submit'
          ? envelope(409, 'PROPOSAL_NOT_BINDABLE', 'the proposal cannot be bound as it stands', {
              problems: [{ code: 'PRODUCT_NOT_ACTIVE', message: 'the product is withdrawn' }, { code: 'INSURER_NOT_ACTIVE', message: 'the insurer is suspended' }],
            })
          : null,
    });
    renderAt(`/proposals/list/${P_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    const stops = await screen.findByRole('list', { name: 'What stops it' });
    expect(stops).toHaveTextContent('The product is withdrawn.');
    expect(stops).toHaveTextContent('The insurer is suspended.');
  });

  it('submit guidance: with no saved agreement, nothing is sent; a warning toast and the Agreement field say what to do', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: detail({ agreement: null }) });
    renderAt(`/proposals/list/${P_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('The proposal was not submitted. Choose the agreement, then Save terms.')).toBeInTheDocument();
    const agreement = screen.getByLabelText('Agreement');
    expect(agreement).toHaveAttribute('aria-invalid', 'true');
    expect(within(screen.getByRole('form', { name: 'Terms' })).getByText('Choose the agreement, then Save terms.')).toBeInTheDocument();
    await waitFor(() => expect(agreement).toHaveFocus());
    expect(backend.sent('submit')).toHaveLength(0);
    expect(screen.queryByRole('list', { name: 'What stops it' })).not.toBeInTheDocument();     // no alert box for this
  });

  it('submit guidance: unsaved terms stop Submit until they are saved', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend();
    renderAt(`/proposals/list/${P_ID}`);
    const terms = await screen.findByRole('form', { name: 'Terms' });
    await within(terms).findByRole('option', { name: /BD-007/ });
    await user.selectOptions(within(terms).getByLabelText('Agreement'), BINDER_ID);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Save the terms first: your changes to the terms are not saved yet.')).toBeInTheDocument();
    await waitFor(() => expect(within(terms).getByRole('button', { name: 'Save terms' })).toHaveFocus());
    expect(backend.sent('submit')).toHaveLength(0);

    await user.click(within(terms).getByRole('button', { name: 'Save terms' }));
    await waitFor(() => expect(backend.sent('update')).toHaveLength(1));
  });

  it("submit guidance: the server's refusal about the terms lands on their fields, with a warning toast", async () => {
    const user = userEvent.setup();
    proposalBackend({
      command: (_call, action) =>
        action === 'submit'
          ? envelope(409, 'PROPOSAL_NOT_BINDABLE', 'the proposal cannot be bound as it stands', {
              problems: [{ code: 'AGREEMENT_NOT_IN_FORCE', message: 'the agreement is not in force on the inception date' }],
            })
          : null,
    });
    renderAt(`/proposals/list/${P_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('The proposal was not submitted. The agreement is not in force on the inception date.')).toBeInTheDocument();
    expect(within(screen.getByRole('form', { name: 'Terms' })).getByText('The agreement is not in force on the inception date. Then Save terms.')).toBeInTheDocument();
    expect(screen.getByLabelText('Agreement')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('list', { name: 'What stops it' })).not.toBeInTheDocument();
  });

  it('a checker sees the terms read-only and no maker actions', async () => {
    proposalBackend();
    renderAt(`/proposals/list/${P_ID}`, CHECKER);
    expect(await screen.findByText('AG-001', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Terms' })).not.toBeInTheDocument();
    for (const name of ['Submit', 'Refer', 'Decline', 'Cancel proposal']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record evidence/ })).not.toBeInTheDocument();
  });
});

describe('Submitted', () => {
  const referred = () =>
    detail({
      status: 'REFERRED',
      submitted_at: '2026-10-06T12:00:00Z',
      exceptions: [exception(), exception({ id: 'f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0', code: 'BACKDATED_INCEPTION', source: 'SYSTEM', raised_by: null, reason: 'the inception date is before today', details: { inception: '2026-10-01', today: '2026-10-06' } })],
      requirements: [requirement(), requirement({ code: 'LOGBOOK', name: 'Logbook copy', required: false })],
      blockers: [
        { code: 'EXCEPTION_OPEN', message: 'exception BACKDATED_INCEPTION awaits approval', item: 'BACKDATED_INCEPTION' },
        { code: 'EXCEPTION_OPEN', message: 'exception UNDERWRITER_REFERRAL awaits approval', item: 'UNDERWRITER_REFERRAL' },
        { code: 'REQUIREMENT_OUTSTANDING', message: 'evidence for VALUATION is missing', item: 'VALUATION' },
        { code: 'CUSTOMER_KYC_NOT_VERIFIED', message: 'the customer\'s KYC is pending', item: 'PENDING' },
      ],
    });

  it('says what is outstanding in words: each exception, the missing evidence by name, and the KYC', async () => {
    proposalBackend({ view: referred() });
    renderAt(`/proposals/list/${P_ID}`);
    const outstanding = await screen.findByRole('list', { name: 'Outstanding' });
    expect(outstanding).toHaveTextContent('Inception before today awaits approval');
    expect(outstanding).toHaveTextContent("Underwriter's referral awaits approval");
    expect(outstanding).toHaveTextContent('Evidence missing: Valuation report');
    expect(outstanding).toHaveTextContent("The customer's KYC is pending, not verified");
    expect(screen.getByRole('button', { name: 'Open the customer' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Terms' })).not.toBeInTheDocument();             // terms change only after Reopen
  });

  it('records evidence per requirement with the ETag; the same text for two requirements is two commands', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: referred() });
    renderAt(`/proposals/list/${P_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Record evidence: Valuation report' }));
    let dialog = await screen.findByRole('dialog', { name: 'Record evidence' });
    await user.click(within(dialog).getByRole('button', { name: 'Record evidence' }));
    expect(within(dialog).getByText('Give the evidence reference.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Evidence reference/), 'FILE-77');
    await user.click(within(dialog).getByRole('button', { name: 'Record evidence' }));
    await waitFor(() => expect(backend.sent('requirements/VALUATION/satisfy')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Record evidence' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Record evidence: Logbook copy' }));
    dialog = await screen.findByRole('dialog', { name: 'Record evidence' });
    await user.type(within(dialog).getByLabelText(/Evidence reference/), 'FILE-77');
    await user.click(within(dialog).getByRole('button', { name: 'Record evidence' }));
    await waitFor(() => expect(backend.sent('requirements/LOGBOOK/satisfy')).toHaveLength(1));
    const [valuation] = backend.sent('requirements/VALUATION/satisfy');
    const [logbook] = backend.sent('requirements/LOGBOOK/satisfy');
    expect(valuation.body).toEqual({ evidence_reference: 'FILE-77' });
    expect(valuation.headers['if-match']).toBe(ETAG);
    expect(logbook.headers['x-idempotency-key']).not.toBe(valuation.headers['x-idempotency-key']);
  });

  it('the maker checks again and reopens with the ETag, and cannot approve an exception', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: referred() });
    renderAt(`/proposals/list/${P_ID}?tab=exceptions`);
    await user.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(backend.sent('evaluate')).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    await waitFor(() => expect(backend.sent('reopen')).toHaveLength(1));
    expect(backend.sent('reopen')[0].headers['if-match']).toBe(ETAG);
    expect(screen.queryByRole('button', { name: /^Approve/ })).not.toBeInTheDocument();
  });

  it('a referral, a decline and a cancellation each need a reason', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: referred() });
    renderAt(`/proposals/list/${P_ID}`);
    for (const [button, dialogName, submit, action] of [
      ['Refer', 'Refer the proposal', 'Refer', 'refer'],
      ['Decline', 'Decline the proposal', 'Decline', 'decline'],
      ['Cancel proposal', 'Cancel the proposal', 'Cancel proposal', 'cancel'],
    ] as const) {
      await user.click(await screen.findByRole('button', { name: button }));
      const dialog = await screen.findByRole('dialog', { name: dialogName });
      await user.click(within(dialog).getByRole('button', { name: submit }));
      expect(within(dialog).getByText('Give the reason.')).toBeInTheDocument();
      await user.type(within(dialog).getByLabelText(/Reason/), `Reason to ${action}`);
      await user.click(within(dialog).getByRole('button', { name: submit }));
      await waitFor(() => expect(backend.sent(action)).toHaveLength(1));
      expect(backend.sent(action)[0].body).toEqual({ reason: `Reason to ${action}` });
      await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogName })).not.toBeInTheDocument());
    }
  });

  it('a checker approves an exception here when not governed; when governed it waits in My Work Queue', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: referred() });
    renderAt(`/proposals/list/${P_ID}?tab=exceptions`, CHECKER);
    await user.click(await screen.findByRole('button', { name: "Approve: Underwriter's referral" }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve exception' });
    await user.type(within(dialog).getByLabelText('Note'), 'Checked the loss history');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(backend.sent(`exceptions/${EXCEPTION_ID}/approve`)).toHaveLength(1));
    const [approve] = backend.sent(`exceptions/${EXCEPTION_ID}/approve`);
    expect(approve.body).toEqual({ note: 'Checked the loss history' });
    expect(approve.headers['if-match']).toBe(ETAG);

    cleanup();
    queryClient.clear();
    const governed = referred();
    governed.exceptions = governed.exceptions.map((item) => ({ ...item, workflow: { instance_id: 'w-1', status: 'PENDING_APPROVAL', stage_label: 'Underwriting review', waiting_on: ['Underwriting Checker'] } }));
    proposalBackend({ view: governed });
    renderAt(`/proposals/list/${P_ID}?tab=exceptions`, CHECKER);
    const referral = await screen.findByRole('listitem', { name: "Underwriter's referral" });
    expect(referral).toHaveTextContent('Waiting for: Underwriting Checker (Underwriting review), in My Work Queue.');
    expect(screen.queryByRole('button', { name: /^Approve/ })).not.toBeInTheDocument();
  });

  it('C1: a governed rejection that declined the proposal reads Rejected, with no approval and no My Work Queue link', async () => {
    const declined = referred();
    declined.status = 'DECLINED';
    declined.blockers = [];
    declined.decision_reason = 'Exception UNDERWRITER_REFERRAL rejected: loss history';
    declined.exceptions = [exception({ workflow: { instance_id: 'w-1', status: 'REJECTED', stage_label: 'Underwriting review', waiting_on: [] } })];
    proposalBackend({ view: declined });
    renderAt(`/proposals/list/${P_ID}?tab=exceptions`, person([...CHECKER.permissions, 'workflow.task.view']));
    const referral = await screen.findByRole('listitem', { name: "Underwriter's referral" });
    expect(referral).toHaveTextContent('Rejected');
    expect(referral).toHaveTextContent('Rejected in My Work Queue.');
    expect(referral).not.toHaveTextContent('Awaiting approval');
    expect(within(referral).queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
    expect(within(referral).queryByRole('button', { name: 'Open in My Work Queue' })).not.toBeInTheDocument();
  });

  it('C1: a void governed approval on a still-referred proposal never falls back to the inline approval', async () => {
    const voided = referred();
    voided.exceptions = [exception({ workflow: { instance_id: 'w-2', status: 'VOID', stage_label: null, waiting_on: [] } })];
    proposalBackend({ view: voided });
    renderAt(`/proposals/list/${P_ID}?tab=exceptions`, person([...CHECKER.permissions, 'workflow.task.view']));
    const referral = await screen.findByRole('listitem', { name: "Underwriter's referral" });
    expect(referral).toHaveTextContent('Void');
    expect(referral).not.toHaveTextContent('Awaiting approval');
    expect(within(referral).queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
    expect(within(referral).queryByRole('button', { name: 'Open in My Work Queue' })).not.toBeInTheDocument();
  });

  it('C1: the exception states, one by one', () => {
    const wf = (status: string) => ({ instance_id: 'w', status, stage_label: null, waiting_on: [] });
    expect(exceptionState(exception())).toMatchObject({ kind: 'lightweight', label: 'Awaiting approval' });
    expect(exceptionState(exception({ workflow: wf('PENDING_APPROVAL') }))).toMatchObject({ kind: 'waiting' });
    expect(exceptionState(exception({ workflow: wf('RETURNED_FOR_REWORK') }))).toMatchObject({ kind: 'waiting' });
    for (const [status, label] of [['REJECTED', 'Rejected'], ['VOID', 'Void'], ['CANCELLED', 'Cancelled'], ['EXPIRED', 'Expired']]) {
      expect(exceptionState(exception({ workflow: wf(status) }))).toMatchObject({ kind: 'decided', label });
    }
    expect(exceptionState(exception({ status: 'APPROVED', workflow: wf('APPROVED') }))).toMatchObject({ kind: 'approved' });
  });

  it('ready to bind and bound say so; commission shows only when the server sends it', async () => {
    const ready = detail({ status: 'READY_TO_BIND', ready_at: '2026-10-06T14:00:00Z', submitted_at: '2026-10-06T12:00:00Z' });
    ready.premium = { ...ready.premium, commission: { amount: '3800.00', rate_percent: '10' } };
    proposalBackend({ view: ready });
    renderAt(`/proposals/list/${P_ID}?tab=risk`);
    expect(await screen.findByText(/Nothing is outstanding since/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Premium' })).toHaveTextContent('Commission (10%)');
    expect(screen.getByRole('button', { name: 'Cancel proposal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();

    cleanup();
    queryClient.clear();
    proposalBackend({ view: detail({ status: 'BOUND', policy_no: 'POL0000009', bound_at: '2026-10-06T15:00:00Z' }) });
    renderAt(`/proposals/list/${P_ID}`);
    expect(await screen.findByText(/Policy POL0000009/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Proposal actions' })).not.toBeInTheDocument();
  });
});

describe('NB1-D: bind', () => {
  const ready = () => detail({ status: 'READY_TO_BIND', submitted_at: '2026-10-06T12:00:00Z', ready_at: '2026-10-06T14:00:00Z' });
  const bindCalls = (backend: ReturnType<typeof proposalBackend>) => backend.calls.filter((call) => call.method === 'POST' && call.url.endsWith('/policies'));

  it('binds a ready proposal with its ETag and the insurer policy number, then opens the new policy by number', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: ready() });
    const router = renderAt(`/proposals/list/${P_ID}`, BINDER);
    await user.click(await screen.findByRole('button', { name: 'Bind' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bind into a policy' });
    expect(dialog).toHaveTextContent('KES');
    expect(dialog).toHaveTextContent('AG-001');
    await user.type(within(dialog).getByLabelText('Insurer policy number'), ' JUB/MP/2026/77 ');
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000009'));
    const [bind] = bindCalls(backend);
    expect(bind.body).toEqual({ proposal_id: P_ID, insurer_policy_no: 'JUB/MP/2026/77' });
    expect(bind.headers['if-match']).toBe(ETAG);
    expect(bind.headers['x-idempotency-key']).toBeTruthy();
  });

  it('without an insurer number the body is the proposal alone; a checker is never offered Bind', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ view: ready() });
    renderAt(`/proposals/list/${P_ID}`, BINDER);
    await user.click(await screen.findByRole('button', { name: 'Bind' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bind into a policy' });
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));
    await waitFor(() => expect(bindCalls(backend)).toHaveLength(1));
    expect(bindCalls(backend)[0].body).toEqual({ proposal_id: P_ID });

    cleanup();
    queryClient.clear();
    proposalBackend({ view: ready() });
    renderAt(`/proposals/list/${P_ID}`, CHECKER);
    expect(await screen.findByText(/Nothing is outstanding since/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bind' })).not.toBeInTheDocument();
  });

  it("the server's re-checks at bind are shown in words: the passed inception, and what stops it now", async () => {
    const user = userEvent.setup();
    let answer = envelope(409, 'POLICY_INCEPTION_PASSED', 'the inception date has passed without an approved backdating; cancel the proposal and prepare it again');
    proposalBackend({ view: ready(), bind: () => answer });
    renderAt(`/proposals/list/${P_ID}`, BINDER);
    await user.click(await screen.findByRole('button', { name: 'Bind' }));
    let dialog = await screen.findByRole('dialog', { name: 'Bind into a policy' });
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));
    expect(await within(dialog).findByText(/The inception date has passed and no backdating was approved/)).toBeInTheDocument();

    answer = envelope(409, 'PROPOSAL_NOT_BINDABLE', 'the proposal can no longer be bound as it stands', {
      problems: [{ code: 'CUSTOMER_KYC_NOT_VERIFIED', message: "the customer's KYC is pending_verification" }],
    });
    dialog = screen.getByRole('dialog', { name: 'Bind into a policy' });
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));
    expect(await within(dialog).findByRole('list', { name: 'What stops it' })).toHaveTextContent("The customer's KYC is pending_verification.");

    answer = envelope(409, 'PROPOSAL_NOT_READY_TO_BIND', 'a referred proposal cannot be bound', { status: 'REFERRED' });
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));
    expect(await within(dialog).findByText(/no longer ready to bind: it is referred/)).toBeInTheDocument();
  });

  it('a stale bind keeps the same key and retries under the refreshed proposal ETag', async () => {
    const user = userEvent.setup();
    const NEWER = `"proposal-${P_ID}-v4"`;
    let binds = 0;
    const backend = proposalBackend({
      views: [{ view: ready(), etag: ETAG }, { view: { ...ready(), row_version: 4 }, etag: NEWER }],
      bind: () => {
        binds += 1;
        return binds === 1 ? envelope(412, 'CONCURRENCY_CONFLICT', 'the proposal was changed') : json(201, { id: POLICY_ID, policy_no: 'POL0000009' });
      },
    });
    const router = renderAt(`/proposals/list/${P_ID}`, BINDER);
    await user.click(await screen.findByRole('button', { name: 'Bind' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bind into a policy' });
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));
    expect(await within(dialog).findByText(STALE_TEXT)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Bind' }));                    // the dialog stays open after a 412
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000009'));
    const [first, second] = bindCalls(backend);
    expect(first.headers['if-match']).toBe(ETAG);
    expect(second.headers['if-match']).toBe(NEWER);
    expect(second.body).toEqual(first.body);
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
  });

  it('a bound proposal opens its policy', async () => {
    const user = userEvent.setup();
    proposalBackend({ view: detail({ status: 'BOUND', policy_no: 'POL0000009', bound_at: '2026-10-06T15:00:00Z' }) });
    const router = renderAt(`/proposals/list/${P_ID}`, BINDER);
    await user.click(await screen.findByRole('button', { name: 'Open the policy' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/policies/list/POL0000009'));
  });
});

describe('NB1-D: the New policy guide', () => {
  it('walks the four steps with the screens these permissions open, and lists what the server says is waiting', async () => {
    const user = userEvent.setup();
    const backend = proposalBackend({ list: [summary({ status: 'READY_TO_BIND' })] });
    const router = renderAt('/new-policy', BINDER);
    const steps = await screen.findByRole('list', { name: 'Steps' });
    expect(within(steps).getAllByRole('listitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Step 1: Customer', 'Step 2: Quotation', 'Step 3: Proposal', 'Step 4: Bind',
    ]);
    expect(within(screen.getByRole('listitem', { name: 'Step 1: Customer' })).getByRole('button', { name: 'Add a customer' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Accepted quotations' })).toHaveTextContent('QUO0000001');
    expect(await screen.findByRole('table', { name: 'Ready to bind' })).toHaveTextContent('UWP0000001');
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/quotations?page=1&page_size=25&status=ACCEPTED'));
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/underwriting/proposals?page=1&page_size=25&status=READY_TO_BIND'));
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    await user.click(screen.getByRole('row', { name: /UWP0000001/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/proposals/list/UWP0000001'));
  });

  it('without bind the last step says so and no ready list is asked for', async () => {
    const backend = proposalBackend();
    renderAt('/new-policy', MAKER);
    const bindStep = await screen.findByRole('listitem', { name: 'Step 4: Bind' });
    expect(within(bindStep).queryByRole('button', { name: 'Ready to bind' })).toBeInTheDocument();     // the list is still open to a viewer
    expect(screen.queryByRole('table', { name: 'Ready to bind' })).not.toBeInTheDocument();
    expect(backend.calls.some((call) => call.url.includes('status=READY_TO_BIND'))).toBe(false);
    expect(within(screen.getByRole('listitem', { name: 'Step 1: Customer' })).queryByRole('button', { name: 'Add a customer' })).not.toBeInTheDocument();
  });
});

describe('NB1-D-R1: the guide offers only the routes the permissions open (D1)', () => {
  it('customer create without customer view offers no Add a customer; quotation create without view offers no New quotation', async () => {
    proposalBackend();
    renderAt('/new-policy', person(['clients.customer.create', 'quotations.quotation.create']));
    const customer = await screen.findByRole('listitem', { name: 'Step 1: Customer' });
    expect(within(customer).queryByRole('button', { name: 'Add a customer' })).not.toBeInTheDocument();
    expect(customer).toHaveTextContent('Customers are not among your screens.');
    const quotation = screen.getByRole('listitem', { name: 'Step 2: Quotation' });
    expect(within(quotation).queryByRole('button', { name: 'New quotation' })).not.toBeInTheDocument();
    expect(quotation).toHaveTextContent('Quotations are not among your screens.');

    cleanup();
    queryClient.clear();
    proposalBackend();
    renderAt('/new-policy', person(['clients.customer.view', 'clients.customer.create', 'quotations.quotation.view', 'quotations.quotation.create']));
    expect(within(await screen.findByRole('listitem', { name: 'Step 1: Customer' })).getByRole('button', { name: 'Add a customer' })).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Step 2: Quotation' })).getByRole('button', { name: 'New quotation' })).toBeInTheDocument();
  });

  it('the bind dialog does not promise a later recording of the insurer number', async () => {
    const user = userEvent.setup();
    proposalBackend({ view: detail({ status: 'READY_TO_BIND', submitted_at: '2026-10-06T12:00:00Z', ready_at: '2026-10-06T14:00:00Z' }) });
    renderAt(`/proposals/list/${P_ID}`, BINDER);
    await user.click(await screen.findByRole('button', { name: 'Bind' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bind into a policy' });
    expect(dialog).toHaveTextContent('Optional. If omitted, the policy is created without an insurer policy number.');
    expect(dialog).not.toHaveTextContent(/recorded on the policy later/);
  });
});

describe('Navigation on a proposal', () => {
  it('the sidebar marks Proposals as the current page, not Quotations, and the actions sit in the header', async () => {
    proposalBackend();
    renderAt(`/proposals/list/${P_ID}`);
    await screen.findByRole('heading', { name: 'UWP0000001' });
    const nav = screen.getByRole('complementary', { name: 'Primary navigation' });
    expect(within(nav).getByRole('button', { name: 'Proposals' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: 'Quotations' })).not.toHaveAttribute('aria-current');
    const actions = screen.getByRole('group', { name: 'Proposal actions' });
    expect(actions.parentElement).toContainElement(screen.getByRole('button', { name: 'Back to Proposals' }));
  });
});

describe('Addresses', () => {
  it('a number the user cannot see is not found', async () => {
    proposalBackend({ list: [] });
    renderAt('/proposals/list/UWP0000099');
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
  });
});
