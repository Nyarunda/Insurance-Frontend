import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { detail, MAKER, POLICY_ETAG, POLICY_ID, summary, V1, version } from '../../test/policyFixtures';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import { NO_RENEWALS_TEXT } from '../renewals/PolicyRenewalsTab';
import type { RenewalDetail, RenewalSummary } from '../renewals/types';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const R_ID = 'abababab-abab-4bab-8bab-abababababab';
const ETAG = (row: number) => `"renewal-${R_ID}-v${row}"`;
const RECORD = '/policies/list/POL0000001/renewals/REN0000001';

const as = (...permissions: string[]): Me => ({ ...MAKER, permissions: ['policies.policy.view', ...permissions] });
const RENEWER = as('policies.renewal.create');
const CHECKER = as('policies.renewal.approve');
const VIEWER = as();

const renewalSummary = (over: Partial<RenewalSummary> = {}): RenewalSummary => ({
  id: R_ID, renewal_no: 'REN0000001', renewal_type: 'AS_IS', status: 'DRAFT', effective_status: 'DRAFT',
  inception_date: '2027-01-01', expiry_date: '2027-12-31', renewal_total_premium: null, ...over,
});

const PRICING = {
  version_no: 2, rating_date: '2027-01-01', currency: 'KES', priced_at: '2026-11-20T09:00:00Z',
  expiring_annual: { basic_premium: '50000', levies_total: '2000', total_premium: '52000' },
  renewal_annual: { basic_premium: '55000', levies_total: '2200', total_premium: '57200' },
  premium_difference: '5200', movement_percent: '10',
};

const renewal = (over: Partial<RenewalDetail> = {}): RenewalDetail => ({
  ...renewalSummary(), policy: { id: POLICY_ID, policy_no: 'POL0000001' }, source_version_no: 2, requested_changes: {}, pricing: null,
  check: { required: false, reasons: [], approved_by: null, approved_at: null }, offer_valid_until: null, offered_at: null,
  decision_reason: '', decided_at: null, resulting_version_no: null, renewed_at: null, workflow: null, row_version: 1, ...over,
});

type Handler = (call: FakeCall) => Response;

function renewalBackend(options: { list?: RenewalSummary[]; view?: RenewalDetail; views?: RenewalDetail[]; commands?: Record<string, Handler>; prepare?: Handler } = {}) {
  let reads = 0;
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/policies?')) return json(200, { results: [summary()], count: 1, page: 1, page_size: 5 });
    if (path === `/policies/${POLICY_ID}`) return json(200, detail(), { ETag: POLICY_ETAG });
    if (path === `/policies/${POLICY_ID}/versions`) return json(200, { policy_no: 'POL0000001', results: [V1, version()] });
    if (path === `/policies/${POLICY_ID}/renewals` && call.method === 'GET') {
      return json(200, { policy_no: 'POL0000001', results: options.list ?? [renewalSummary()] });
    }
    if (path === `/policies/${POLICY_ID}/renewals` && call.method === 'POST') return (options.prepare ?? (() => json(201, renewal(), { ETag: ETAG(1) })))(call);
    if (path === `/renewals/${R_ID}` && call.method === 'GET') {
      const views = options.views ?? [options.view ?? renewal()];
      const served = views[Math.min(reads, views.length - 1)];
      reads += 1;
      return json(200, served, { ETag: ETAG(served.row_version) });
    }
    if (path.startsWith(`/renewals/${R_ID}`)) {
      const action = path.slice(`/renewals/${R_ID}`.length).replace(/^\//, '') || 'update';
      const handler = options.commands?.[action];
      if (handler) return handler(call);
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const sent = (action: string) => network.calls.filter((call) => call.method !== 'GET' && call.url.endsWith(action));
  return { ...network, sent };
}

function renderAt(path: string, me: Me = RENEWER) {
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

const dialog = () => screen.getAllByRole('dialog').at(-1)!;

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe("The policy's Renewals tab", () => {
  it('lists the renewals in words and offers Prepare only to a renewal maker without one in progress', async () => {
    renewalBackend({ list: [renewalSummary({ status: 'DECLINED', effective_status: 'DECLINED', renewal_total_premium: '57200' })] });
    renderAt('/policies/list/POL0000001?tab=renewals');
    const table = await screen.findByRole('table', { name: 'Renewals' });
    expect(within(table).getByText('REN0000001')).toBeInTheDocument();
    expect(within(table).getByText('Declined by the customer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prepare renewal' })).toBeInTheDocument();
    expect(document.querySelector('main')?.textContent ?? '').not.toMatch(UUID_IN_TEXT);
  });

  it('hides Prepare while a renewal is in progress, and from a viewer', async () => {
    renewalBackend({ list: [renewalSummary({ status: 'OFFERED', effective_status: 'OFFERED' })] });
    renderAt('/policies/list/POL0000001?tab=renewals');
    await screen.findByRole('table', { name: 'Renewals' });
    expect(screen.queryByRole('button', { name: 'Prepare renewal' })).not.toBeInTheDocument();
  });

  it('says so when there are none, and a viewer sees no Prepare', async () => {
    renewalBackend({ list: [] });
    renderAt('/policies/list/POL0000001?tab=renewals', VIEWER);
    expect(await screen.findByText(NO_RENEWALS_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prepare renewal' })).not.toBeInTheDocument();
  });
});

describe('Prepare renewal', () => {
  it("sends AS_IS with the policy's ETag, the server's default dates when left empty, and opens the renewal by number", async () => {
    const user = userEvent.setup();
    const backend = renewalBackend({ list: [] });
    const router = renderAt('/policies/list/POL0000001/renewals/new');
    expect(await screen.findByText('Empty: the day after expiry, 01 Jan 2027.')).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Prepare renewal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(RECORD));
    const [post] = backend.calls.filter((call) => call.method === 'POST');
    expect(post.body).toEqual({ renewal_type: 'AS_IS' });
    expect(post.headers['if-match']).toBe(POLICY_ETAG);
  });

  it('warns of a gap in cover before a later start, and shows the window refusal in the server words', async () => {
    const user = userEvent.setup();
    renewalBackend({
      list: [],
      prepare: () => envelope(409, 'RENEWAL_WINDOW_CLOSED', 'a renewal is prepared from 90 days before expiry (2026-12-31) to 90 after'),
    });
    renderAt('/policies/list/POL0000001/renewals/new');
    const start = await screen.findByLabelText('New period starts');
    await user.type(start, '2027-01-10');
    expect(within(dialog()).getByText(/The days from 01 Jan 2027 to 09 Jan 2027 are not covered/)).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Prepare renewal' }));
    expect(await within(dialog()).findByText(/A renewal is prepared from 90 days before expiry \(2026-12-31\) to 90 after\./)).toBeInTheDocument();
    expect(within(dialog()).queryByText(/RENEWAL_WINDOW_CLOSED/)).not.toBeInTheDocument();
  });
});

describe('A renewal', () => {
  it("prices a draft with the renewal's ETag and shows the figures as information", async () => {
    const user = userEvent.setup();
    const priced = renewal({ status: 'PRICED', effective_status: 'PRICED', pricing: PRICING, row_version: 2 });
    const backend = renewalBackend({ views: [renewal(), priced], commands: { price: () => json(200, priced, { ETag: ETAG(2) }) } });
    renderAt(RECORD);
    await user.click(await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Price' }));
    await waitFor(() => expect(backend.sent('/price')).toHaveLength(1));
    expect(backend.sent('/price')[0].headers['if-match']).toBe(ETAG(1));
    const premium = await screen.findByRole('table', { name: 'Premium' });
    expect(premium).toHaveTextContent('57,200');
    expect(screen.getByText(/Difference .*5,200.* \(\+10%\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Offer' })).toBeInTheDocument();
  });

  it('a renewal needing a checker is approved here by an approver where not governed, and waits in My Work Queue where governed', async () => {
    const needs = renewal({ status: 'PRICED', effective_status: 'PRICED', pricing: PRICING,
      check: { required: true, reasons: ['COVER_GAP'], approved_by: null, approved_at: null } });
    renewalBackend({ view: needs });
    renderAt(RECORD, RENEWER);
    expect(await screen.findByText(/the days between are not covered/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByText('Needs a checker')).toBeInTheDocument();
  });

  it('an approver sees Approve where the tenant does not govern renewals', async () => {
    const user = userEvent.setup();
    const needs = renewal({ status: 'PRICED', effective_status: 'PRICED', pricing: PRICING,
      check: { required: true, reasons: ['BACKDATED_INCEPTION'], approved_by: null, approved_at: null } });
    const backend = renewalBackend({ view: needs, commands: { approve: () => json(200, { ...needs, check: { ...needs.check, approved_at: '2026-11-20T10:00:00Z' } }, { ETag: ETAG(2) }) } });
    renderAt(RECORD, CHECKER);
    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(backend.sent('/approve')).toHaveLength(1));
  });

  it('where governed, shows who it waits for and offers no Approve', async () => {
    renewalBackend({
      view: renewal({ status: 'PRICED', effective_status: 'PRICED', pricing: PRICING,
        check: { required: true, reasons: ['LIMIT_INCREASE'], approved_by: null, approved_at: null },
        workflow: { instance_id: 'i', definition_code: 'POLICY_RENEWAL_APPROVAL', status: 'PENDING_APPROVAL', stage: 'RENEWAL_CHECK', lock_version: 1, waiting_on: ['Renewal Checker'] } }),
    });
    renderAt(RECORD, CHECKER);
    expect(await screen.findByText(/Waiting for: Renewal Checker\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it("records the customer's answer: accepted, or declined with a required reason", async () => {
    const user = userEvent.setup();
    const offered = renewal({ status: 'OFFERED', effective_status: 'OFFERED', pricing: PRICING, offer_valid_until: '2026-12-20' });
    const backend = renewalBackend({ view: offered, commands: {
      decline: (call) => json(200, { ...offered, status: 'DECLINED', effective_status: 'DECLINED', decision_reason: String((call.body as { reason: string }).reason) }, { ETag: ETAG(2) }),
    } });
    renderAt(RECORD);
    expect(await screen.findByRole('button', { name: 'Customer accepted' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Customer declined' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Record the decline' }));
    expect(within(dialog()).getByText('Give a reason.')).toBeInTheDocument();
    expect(backend.sent('/decline')).toHaveLength(0);
    await user.type(within(dialog()).getByLabelText(/Reason/), 'Moved to another insurer');
    await user.click(within(dialog()).getByRole('button', { name: 'Record the decline' }));
    await waitFor(() => expect(backend.sent('/decline')).toHaveLength(1));
    expect(backend.sent('/decline')[0].body).toEqual({ reason: 'Moved to another insurer' });
  });

  it('an expired offer can only be withdrawn', async () => {
    renewalBackend({ view: renewal({ status: 'OFFERED', effective_status: 'EXPIRED', pricing: PRICING, offer_valid_until: '2026-11-01' }) });
    renderAt(RECORD);
    expect(await screen.findByText(/and the customer did not answer\. Withdraw it and prepare it again\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Customer accepted' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('an accepted renewal is held until its start, and every refusal to renew is in words', async () => {
    const user = userEvent.setup();
    const accepted = renewal({ status: 'ACCEPTED', effective_status: 'ACCEPTED', pricing: PRICING, inception_date: '2999-01-01', expiry_date: '2999-12-31' });
    let calls = 0;
    renewalBackend({ view: accepted, commands: {
      renew: () => {
        calls += 1;
        return calls === 1
          ? envelope(409, 'RENEWAL_NOT_YET_EFFECTIVE', 'the renewal is held until its inception (2999-01-01); renew it on or after that day')
          : envelope(409, 'RENEWAL_NOT_RENEWABLE', 'the renewal cannot be completed as it stands', {
            problems: [{ code: 'CUSTOMER_KYC_NOT_VERIFIED', message: "the customer's KYC is not verified" }] });
      },
    } });
    renderAt(RECORD);
    expect(await screen.findByText('Held until 01 Jan 2999')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Renew' }));
    expect(await screen.findByText(/The renewal is held until its inception \(2999-01-01\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Renew' }));
    expect(await screen.findByText("the customer's KYC is not verified")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/RENEWAL_NOT_RENEWABLE|CUSTOMER_KYC_NOT_VERIFIED/);
  });

  it('a stale price reloads the renewal and the same press resends with the same key and the new ETag', async () => {
    const user = userEvent.setup();
    let calls = 0;
    const priced = renewal({ status: 'PRICED', effective_status: 'PRICED', pricing: PRICING, row_version: 3 });
    const backend = renewalBackend({
      views: [renewal(), renewal({ row_version: 2 })],
      commands: { price: () => (++calls === 1 ? envelope(412, 'CONCURRENCY_CONFLICT', 'the renewal was changed by someone else; refresh it') : json(200, priced, { ETag: ETAG(3) })) },
    });
    renderAt(RECORD);
    await user.click(await screen.findByRole('button', { name: 'Price' }));
    expect(await screen.findByText(STALE_TEXT)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Price' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Price' }));
    await waitFor(() => expect(backend.sent('/price')).toHaveLength(2));
    const [first, second] = backend.sent('/price');
    expect([first.headers['if-match'], second.headers['if-match']]).toEqual([ETAG(1), ETAG(2)]);
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
  });

  it('a renewal number that is not on the policy is not found', async () => {
    renewalBackend({ list: [] });
    renderAt('/policies/list/POL0000001/renewals/REN0000099');
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
  });
});
