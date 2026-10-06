import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import type { CustomerDetail, CustomerIdentifier, CustomerSummary } from '../customers/types';
import { EMPTY_CUSTOMERS_TEXT } from './CustomersPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const CUSTOMER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const BRANCH = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'BRANCH' };
const ETAG = `"customer-${CUSTOMER_ID}-v3"`;

const person = (permissions: string[]): Me => ({
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'maker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [BRANCH],
});
const MAKER = person(['clients.customer.view', 'clients.customer.create', 'clients.customer.edit', 'clients.kyc.view', 'clients.kyc.manage']);
const CHECKER = person(['clients.customer.view', 'clients.kyc.view', 'clients.kyc.verify']);

const summary = (over: Partial<CustomerSummary> = {}): CustomerSummary => ({
  id: CUSTOMER_ID,
  customer_no: 'CUS0000001',
  customer_type: 'INDIVIDUAL',
  display_name: 'Wanjiku Kamau',
  status: 'PROSPECT',
  kyc_status: 'IN_PROGRESS',
  primary_phone: '254712345678',
  primary_email: 'wanjiku@example.co.ke',
  home_branch: { id: BRANCH.id, code: 'NBO', name: 'Nairobi' },
  ...over,
});
const detail = (over: Partial<CustomerDetail> = {}): CustomerDetail => ({
  ...summary(),
  source: '',
  sacco_member_no: null,
  profile: { first_name: 'Wanjiku', middle_name: '', last_name: 'Kamau', date_of_birth: '1990-04-12' },
  preferences: null,
  created_at: '2026-10-06T09:00:00Z',
  updated_at: '2026-10-06T09:30:00Z',
  row_version: 3,
  ...over,
});
const identifier = (over: Partial<CustomerIdentifier> = {}): CustomerIdentifier => ({
  id: 'abababab-abab-4bab-8bab-abababababab',
  identifier_type: 'NATIONAL_ID',
  masked_value: '****5678',
  issuing_country: 'KE',
  issued_date: null,
  expiry_date: null,
  verification_status: 'UNVERIFIED',
  verification_source: '',
  verified_at: null,
  is_primary: true,
  ...over,
});

interface Options {
  list?: CustomerSummary[];
  view?: CustomerDetail;
  kycVisible?: boolean;
  create?: (call: FakeCall) => Response;
  patch?: (call: FakeCall) => Response;
  review?: (call: FakeCall) => Response;
  addIdentifier?: (call: FakeCall) => Response;
}

function customerBackend(options: Options = {}) {
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/clients?')) {
      const results = options.list ?? [summary()];
      return json(200, { results, count: results.length, page: 1, page_size: 25 });
    }
    if (path === '/clients' && call.method === 'POST') return options.create ? options.create(call) : json(201, detail({ customer_no: 'CUS0000002' }));
    const view = options.view ?? detail();
    if (path === `/clients/${CUSTOMER_ID}` && call.method === 'GET') return json(200, view, { ETag: ETAG });
    if (path === `/clients/${CUSTOMER_ID}` && call.method === 'PATCH') return options.patch ? options.patch(call) : json(200, view, { ETag: ETAG });
    if (path === `/clients/${CUSTOMER_ID}/360`) {
      return json(200, {
        customer: view,
        kyc: options.kycVisible === false ? null : { status: view.kyc_status, identifiers: 1, verified_identifiers: 0, primary_identifier: identifier() },
        contacts: [{ id: 'c1', type: 'MOBILE', value: '0712 345 678', normalized_value: '254712345678', is_primary: true, is_verified: false, verified_at: null, effective_from: null, effective_to: null }],
        addresses: [],
        relationships: null,
        documents: null,
        external_references: [],
        insurance_summary: { quotations: 2, active_policies: 1, open_claims: 0, outstanding_premium: '0.00' },
        recent_activity: [],
      });
    }
    if (path === `/clients/${CUSTOMER_ID}/identifiers` && call.method === 'GET') return json(200, { results: [identifier()] });
    if (path === `/clients/${CUSTOMER_ID}/identifiers` && call.method === 'POST') {
      return options.addIdentifier ? options.addIdentifier(call) : json(201, identifier({ id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd' }), { ETag: ETAG });
    }
    if (path.startsWith(`/clients/${CUSTOMER_ID}/identifiers/`) && call.method === 'PATCH') {
      return options.review ? options.review(call) : json(200, identifier({ verification_status: 'VERIFIED' }), { ETag: ETAG });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const commands = (method: string, prefix: string) =>
    network.calls.filter((call) => call.method === method && call.url.replace('/api/v1', '').startsWith(prefix));
  return { ...network, commands };
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

describe('Customers list', () => {
  it('lists what GET /clients returns, in words, with no identifiers, and searches on the server', async () => {
    const user = userEvent.setup();
    const backend = customerBackend();
    const router = renderAt('/customers');
    const row = await screen.findByRole('row', { name: /Wanjiku Kamau/ });
    expect(row).toHaveTextContent('CUS0000001 · Individual');
    expect(row).toHaveTextContent('Nairobi');
    expect(row).toHaveTextContent('KYC in progress');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);

    await user.type(screen.getByLabelText('Find a customer'), ' CUS0000001 ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.search).toBe('?q=CUS0000001'));
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/clients?page=1&page_size=25&q=CUS0000001'));

    await user.click(screen.getByRole('button', { name: 'Verified' }));
    await waitFor(() => expect(router.state.location.search).toBe('?q=CUS0000001&kyc=VERIFIED'));
  });

  it('says so when there is nothing to show, and offers New customer only with create permission', async () => {
    customerBackend({ list: [] });
    renderAt('/customers/list', CHECKER);
    expect(await screen.findByText(EMPTY_CUSTOMERS_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New customer' })).not.toBeInTheDocument();
  });

  it('is refused without clients.customer.view, and the navigation omits it', async () => {
    customerBackend();
    renderAt('/customers/list', person(['policies.policy.view']));
    expect(await screen.findByText(/clients\.customer\.view/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Customers/ })).not.toBeInTheDocument();
  });
});

describe('New customer', () => {
  it('creates an individual with the profile, contacts and primary identifier, then opens it by number', async () => {
    const user = userEvent.setup();
    const backend = customerBackend();
    const router = renderAt('/customers/list/new');
    const dialog = await screen.findByRole('dialog', { name: 'New customer' });
    await user.type(within(dialog).getByLabelText(/First name/), ' Wanjiku ');
    await user.type(within(dialog).getByLabelText(/Last name/), 'Kamau');
    await user.type(within(dialog).getByLabelText('Mobile number'), '0712 345 678');
    await user.type(within(dialog).getByLabelText('Identifier number'), '12345678');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/customers/list/CUS0000002'));
    const [create] = backend.commands('POST', '/clients');
    expect(create.body).toEqual({
      customer_type: 'INDIVIDUAL',
      home_branch_id: BRANCH.id,
      profile: { first_name: 'Wanjiku', last_name: 'Kamau' },
      contacts: [{ type: 'MOBILE', value: '0712 345 678', is_primary: true }],
      identifiers: [{ identifier_type: 'NATIONAL_ID', value: '12345678', is_primary: true }],
    });
    expect(create.headers['x-idempotency-key']).toBeTruthy();
    expect(create.headers['if-match']).toBeUndefined();
  });

  it('shows a duplicate, needs an acknowledgement with a reason, and resends it under a new key', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = customerBackend({
      create: () => {
        attempts += 1;
        return attempts === 1
          ? envelope(409, 'CUSTOMER_DUPLICATE_CANDIDATE', 'an existing customer holds the same identifier', {
              candidates: [{ customer_no: 'CUS0000007', matched: ['NATIONAL_ID'] }],
              hidden_candidates: 1,
            })
          : json(201, detail({ customer_no: 'CUS0000002' }));
      },
    });
    const router = renderAt('/customers/list/new');
    const dialog = await screen.findByRole('dialog', { name: 'New customer' });
    await user.type(within(dialog).getByLabelText(/First name/), 'Wanjiku');
    await user.type(within(dialog).getByLabelText(/Last name/), 'Kamau');
    await user.type(within(dialog).getByLabelText('Identifier number'), '12345678');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('CUS0000007');
    expect(alert).toHaveTextContent('1 more match is outside the branches you can see.');
    expect(within(dialog).getByRole('button', { name: 'Create anyway' })).toBeDisabled();

    await user.click(within(dialog).getByLabelText(/I have checked the matching customers/));
    await user.click(within(dialog).getByRole('button', { name: 'Create anyway' }));
    expect(within(dialog).getByText('Say why this is not the same customer.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Reason/), 'Different person, same ID typed in error at the bank');
    await user.click(within(dialog).getByRole('button', { name: 'Create anyway' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/customers/list/CUS0000002'));
    const [first, second] = backend.commands('POST', '/clients');
    expect(second.body).toMatchObject({ acknowledge_duplicates: true, duplicate_reason: 'Different person, same ID typed in error at the bank' });
    expect(second.headers['x-idempotency-key']).not.toBe(first.headers['x-idempotency-key']);
  });
});

describe('NB1-A-R1', () => {
  it('A2: a user who may create but not manage KYC sees no identifier controls and sends none', async () => {
    const user = userEvent.setup();
    const backend = customerBackend();
    const router = renderAt('/customers/list/new', person(['clients.customer.view', 'clients.customer.create']));
    const dialog = await screen.findByRole('dialog', { name: 'New customer' });
    expect(within(dialog).queryByLabelText('Primary identifier')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Identifier number')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Contact')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/First name/), 'Wanjiku');
    await user.type(within(dialog).getByLabelText(/Last name/), 'Kamau');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/customers/list/CUS0000002'));
    const [create] = backend.commands('POST', '/clients');
    expect(create.body).not.toHaveProperty('identifiers');
  });

  it('A1: adding an identifier that collides shows the evidence, needs an acknowledgement and a reason, and retries under a new key', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = customerBackend({
      addIdentifier: () => {
        attempts += 1;
        return attempts === 1
          ? envelope(409, 'CUSTOMER_DUPLICATE_CANDIDATE', 'an existing customer holds the same identifier', {
              candidates: [{ customer_no: 'CUS0000007', matched: ['NATIONAL_ID'] }],
              hidden_candidates: 2,
            })
          : json(201, identifier({ id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd' }), { ETag: ETAG });
      },
    });
    renderAt(`/customers/list/${CUSTOMER_ID}?tab=kyc`);
    await user.click(await screen.findByRole('button', { name: 'Add identifier' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add identifier' });
    await user.type(within(dialog).getByLabelText(/Number/), '12345678');
    await user.click(within(dialog).getByRole('button', { name: 'Add identifier' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('CUS0000007 · matches on National ID');
    expect(alert).toHaveTextContent('2 more matches are outside the branches you can see.');
    const add = within(dialog).getByRole('button', { name: 'Add anyway' });
    expect(add).toBeDisabled();

    await user.click(within(dialog).getByLabelText(/I have checked the matching customers/));
    await user.click(add);
    expect(within(dialog).getByText('Say why this is not the same customer.')).toBeInTheDocument();
    expect(backend.commands('POST', `/clients/${CUSTOMER_ID}/identifiers`)).toHaveLength(1);
    await user.type(within(dialog).getByLabelText(/Reason/), 'Twin with a similar ID, checked at IPRS');
    await user.click(within(dialog).getByRole('button', { name: 'Add anyway' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add identifier' })).not.toBeInTheDocument());
    const [first, second] = backend.commands('POST', `/clients/${CUSTOMER_ID}/identifiers`);
    expect(first.body).toEqual({ identifier_type: 'NATIONAL_ID', value: '12345678', is_primary: true });
    expect(second.body).toEqual({
      identifier_type: 'NATIONAL_ID',
      value: '12345678',
      is_primary: true,
      acknowledge_duplicates: true,
      duplicate_reason: 'Twin with a similar ID, checked at IPRS',
    });
    expect(second.headers['x-idempotency-key']).not.toBe(first.headers['x-idempotency-key']);
  });
});

describe('The customer record', () => {
  it('opens by number, shows the profile and holdings, and a number the user cannot see is not found', async () => {
    customerBackend();
    renderAt('/customers/list/CUS0000001');
    expect(await screen.findByRole('heading', { name: 'Wanjiku Kamau' })).toBeInTheDocument();
    expect(screen.getByText('CUS0000001 · Individual')).toBeInTheDocument();
    expect(screen.getByText('12 Apr 1990')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer summary')).toHaveTextContent('Active policies1');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);

    customerBackend({ list: [] });
    queryClient.clear();
    renderAt('/customers/list/CUS0000099');
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
  });

  it('edits the profile with the ETag, sending only what changed; a 412 keeps what was typed', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = customerBackend({
      patch: () => {
        attempts += 1;
        return attempts === 1 ? envelope(412, 'CONCURRENCY_CONFLICT', 'changed') : json(200, detail(), { ETag: ETAG });
      },
    });
    renderAt(`/customers/list/${CUSTOMER_ID}`);
    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit profile' });
    await user.type(within(dialog).getByLabelText('Occupation'), 'Teacher');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText(STALE_TEXT)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Occupation')).toHaveValue('Teacher');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit profile' })).not.toBeInTheDocument());

    const patches = backend.commands('PATCH', `/clients/${CUSTOMER_ID}`).filter((call) => !call.url.includes('identifiers'));
    expect(patches[0].body).toEqual({ profile: { occupation: 'Teacher' } });
    expect(patches[0].headers['if-match']).toBe(ETAG);
    expect(patches[1].headers['x-idempotency-key']).toBe(patches[0].headers['x-idempotency-key']);
  });
});

describe('KYC', () => {
  it('offers the maker only the working moves, and sends one with the ETag', async () => {
    const user = userEvent.setup();
    const backend = customerBackend();
    renderAt(`/customers/list/${CUSTOMER_ID}?tab=kyc`);
    expect(await screen.findByRole('table', { name: 'Identifiers' })).toHaveTextContent('****5678');
    expect(screen.queryByRole('button', { name: 'Verify KYC' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send for verification' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send for verification' });
    await user.click(within(dialog).getByRole('button', { name: 'Send for verification' }));
    await waitFor(() => expect(backend.commands('PATCH', `/clients/${CUSTOMER_ID}`)).toHaveLength(1));
    const [patch] = backend.commands('PATCH', `/clients/${CUSTOMER_ID}`);
    expect(patch.body).toEqual({ kyc_status: 'PENDING_VERIFICATION' });
    expect(patch.headers['if-match']).toBe(ETAG);
  });

  it('offers the checker verification, and shows the self-verification refusal in words', async () => {
    const user = userEvent.setup();
    customerBackend({
      view: detail({ kyc_status: 'PENDING_VERIFICATION' }),
      review: () => envelope(403, 'KYC_SELF_VERIFICATION', 'the person who added an identifier cannot verify it'),
    });
    renderAt(`/customers/list/${CUSTOMER_ID}?tab=kyc`, CHECKER);
    expect(await screen.findByRole('button', { name: 'Verify KYC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject KYC' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add identifier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();

    await user.click(within(await screen.findByRole('table', { name: 'Identifiers' })).getByRole('button', { name: 'Verify' }));
    const dialog = await screen.findByRole('dialog', { name: 'Verify identifier' });
    await user.selectOptions(within(dialog).getByLabelText('Checked against'), 'IPRS');
    await user.click(within(dialog).getByRole('button', { name: 'Verify' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The person who added an identifier cannot verify it.');
  });

  it('rejecting KYC needs a reason', async () => {
    const user = userEvent.setup();
    const backend = customerBackend({ view: detail({ kyc_status: 'PENDING_VERIFICATION' }) });
    renderAt(`/customers/list/${CUSTOMER_ID}?tab=kyc`, CHECKER);
    await user.click(await screen.findByRole('button', { name: 'Reject KYC' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject KYC' });
    await user.click(within(dialog).getByRole('button', { name: 'Reject KYC' }));
    expect(within(dialog).getByText('Give the reason.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Reason/), 'ID photo does not match');
    await user.click(within(dialog).getByRole('button', { name: 'Reject KYC' }));
    await waitFor(() => expect(backend.commands('PATCH', `/clients/${CUSTOMER_ID}`)).toHaveLength(1));
    expect(backend.commands('PATCH', `/clients/${CUSTOMER_ID}`)[0].body).toEqual({ kyc_status: 'REJECTED', kyc_reason: 'ID photo does not match' });
  });

  it('says so when the user may not see KYC', async () => {
    customerBackend({ kycVisible: false });
    renderAt(`/customers/list/${CUSTOMER_ID}?tab=kyc`, person(['clients.customer.view']));
    expect(await screen.findByText('KYC is not shown')).toBeInTheDocument();
  });
});
