import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { STALE_TEXT } from '../../lib/api/commandErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import { CANCELLATION_GOVERNED_TEXT, NO_CERTIFICATES_TEXT, todayIso } from '../certificates/PolicyCertificatesTab';
import type { Certificate, CertificateType } from '../certificates/types';
import type { PolicyDetail } from '../policies/types';
import { detail, MAKER, POLICY_ETAG, POLICY_ID, summary, version } from '../../test/policyFixtures';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const PRODUCT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MOTOR_CLASS = { id: '15151515-1515-4151-8151-151515151515', code: 'MOTOR' };
const MARINE_CLASS = { id: '16161616-1616-4161-8161-161616161616', code: 'MARINE' };
const C_ID = '17171717-1717-4171-8171-171717171717';
const OLD_ID = '18181818-1818-4181-8181-181818181818';
const certEtag = (id: string, v = 1) => `"certificate-${id}-v${v}"`;

const person = (permissions: string[]): Me => ({ ...MAKER, permissions });
/** As CERTIFICATE_ISSUER (CS-P0). */
const ISSUER = person(['certificates.cert.view', 'certificates.cert.issue', 'policies.policy.view', 'products.product.view']);
/** As CERTIFICATE_CANCELLER (CS-P0). */
const CANCELLER = person(['certificates.cert.view', 'certificates.cert.cancel', 'policies.policy.view']);

const motorType = (over: Partial<CertificateType> = {}): CertificateType => ({
  id: '19191919-1919-4191-8191-191919191919', code: 'MOT-A', name: 'Motor certificate', category: 'MOTOR',
  insurance_class: MOTOR_CLASS, is_active: true, ...over,
});
const TYPES: CertificateType[] = [
  motorType(),
  motorType({ id: '20202020-2020-4202-8202-202020202020', code: 'MOT-OLD', name: 'Old motor', is_active: false }),
  motorType({ id: '21212121-2121-4212-8212-212121212121', code: 'MAR-A', name: 'Marine certificate', category: 'MARINE', insurance_class: MARINE_CLASS }),
];

const certificate = (over: Partial<Certificate> = {}): Certificate => ({
  id: C_ID,
  serial_no: 'CK0000011',
  status: 'ISSUED',
  certificate_type: { id: TYPES[0].id, code: 'MOT-A', category: 'MOTOR' },
  insurer: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'JUB' },
  batch_no: 'CBT0000001',
  policy: { id: POLICY_ID, policy_no: 'POL0000001' },
  version_no: 2,
  effective_from: '2026-06-02',
  effective_to: '2026-12-31',
  insured_name: 'Wanjiku Holdings',
  vehicle: { registration: 'KDA 123A', chassis_number: '', engine_number: '' },
  marine_details: null,
  replaces: null,
  replaced_by: null,
  issued_at: '2026-06-02T09:00:00Z',
  printed_at: null,
  closed_reason: '',
  closed_at: null,
  cover: { fully_covered: true, covered_through: '2026-12-31' },
  cancellation_request: null,
  workflow: null,
  row_version: 1,
  ...over,
});

const motorPolicy = (registrations: string[] = ['KDA 123A']): PolicyDetail =>
  detail({ current_version: version({ risk: { factors: {}, identifiers: registrations.map((value) => ({ identifier_type: 'VEHICLE_REGISTRATION', value })) } }) });

interface Options {
  policy?: PolicyDetail;
  certificates?: Certificate[];
  productClass?: { id: string; code: string };
  command?: (call: FakeCall, action: string) => Response | null;
  /** The policy's ETag on each GET, in order; the last repeats. */
  policyEtags?: string[];
}

function certificateBackend(options: Options = {}) {
  let list = options.certificates ?? [];
  let policyGets = 0;
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path.startsWith('/policies?')) return json(200, { results: [summary()], count: 1, page: 1, page_size: 25 });
    if (path === `/policies/${POLICY_ID}` && call.method === 'GET') {
      const etags = options.policyEtags ?? [POLICY_ETAG];
      const etag = etags[Math.min(policyGets, etags.length - 1)];
      policyGets += 1;
      return json(200, options.policy ?? motorPolicy(), { ETag: etag });
    }
    if (path === `/policies/${POLICY_ID}/certificates` && call.method === 'GET') return json(200, { policy_no: 'POL0000001', results: list });
    if (path === `/policies/${POLICY_ID}/certificates` && call.method === 'POST') {
      const answer = options.command?.(call, 'issue');
      if (answer) return answer;
      const made = certificate({ id: '22222222-2222-4222-8222-222222222222', serial_no: 'CK0000012' });
      list = [...list, made];
      return json(201, made, { ETag: certEtag(made.id) });
    }
    if (path === '/certificate-types') return json(200, { results: TYPES });
    if (path === `/products/${PRODUCT_ID}`) return json(200, { id: PRODUCT_ID, insurance_class: options.productClass ?? MOTOR_CLASS });
    const one = /^\/certificates\/([^/]+)(?:\/([a-z-]+))?$/.exec(path);
    if (one) {
      const found = list.find((c) => c.id === one[1]);
      if (!found) return envelope(404, 'CERTIFICATE_NOT_FOUND', 'certificate not found');
      if (call.method === 'GET') return json(200, found, { ETag: certEtag(found.id, found.row_version) });
      const answer = options.command?.(call, one[2]);
      if (answer) return answer;
      const status = { print: 'PRINTED', cancel: 'CANCELLED', spoil: 'SPOILT' }[one[2] as 'print'] as Certificate['status'];
      const after = { ...found, status, row_version: found.row_version + 1 };
      list = list.map((c) => (c.id === found.id ? after : c));
      return json(200, after, { ETag: certEtag(found.id, after.row_version) });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const sent = (suffix: string) => network.calls.filter((call) => call.method === 'POST' && call.url.endsWith(suffix));
  return { ...network, sent };
}

function renderAt(path: string, me: Me = ISSUER) {
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
const AT = '/policies/list/POL0000001';

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Policy certificates: who sees what', () => {
  it('shows no Certificates tab and no Issue certificate without a certificate permission', async () => {
    certificateBackend();
    renderAt(AT, MAKER);
    const tabs = within(await screen.findByRole('tablist', { name: 'Policy sections' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).not.toContain('Certificates');
    expect(screen.queryByRole('button', { name: 'Issue certificate' })).not.toBeInTheDocument();
  });

  it('the canceller sees the tab but cannot issue, mark printed or replace', async () => {
    certificateBackend({ certificates: [certificate()] });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`, CANCELLER);
    expect(await screen.findByRole('heading', { name: 'CK0000011' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Issue certificate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as printed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel certificate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spoil' })).toBeInTheDocument();
  });

  it('offers no issue on a cancelled policy', async () => {
    certificateBackend({ policy: { ...motorPolicy(), lifecycle_status: 'CANCELLED', coverage_status: 'CANCELLED' } });
    renderAt(`${AT}?tab=certificates`);
    expect(await screen.findByText(NO_CERTIFICATES_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Issue certificate' })).not.toBeInTheDocument();
  });
});

describe('Issuing', () => {
  it('Issue certificate on the Overview opens the form; only active types of the policy class; sent with the policy ETag; opens by serial', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend();
    const router = renderAt(AT);
    await user.click(await screen.findByRole('button', { name: 'Issue certificate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Issue a certificate' });
    expect(router.state.location.search).toBe('?tab=certificates');
    const type = within(dialog).getByLabelText(/Certificate type/) as HTMLSelectElement;
    expect([...type.options].map((o) => o.textContent)).toEqual(['Choose…', 'Motor certificate (MOT-A)']);   // class + active only
    expect(type.value).toBe(TYPES[0].id);                                                                        // the only one: chosen
    expect((within(dialog).getByLabelText('Valid from') as HTMLInputElement).value).toBe(todayIso());
    expect(within(dialog).queryByLabelText(/Vehicle/)).not.toBeInTheDocument();                                  // one vehicle: not asked
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=certificates&certificate=CK0000012'));
    const [issue] = backend.sent(`/policies/${POLICY_ID}/certificates`);
    expect(issue.headers['if-match']).toBe(POLICY_ETAG);
    expect(issue.body).toEqual({ certificate_type_id: TYPES[0].id, effective_from: todayIso() });
    expect(await screen.findByRole('heading', { name: 'CK0000012' })).toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('asks for the vehicle only when the policy names several, and needs it', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend({ policy: motorPolicy(['KDA 123A', 'KDB 456B']) });
    renderAt(`${AT}?tab=certificates&issue=1`);
    const dialog = await screen.findByRole('dialog', { name: 'Issue a certificate' });
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    expect(within(dialog).getByText('Choose the vehicle to certify.')).toBeInTheDocument();
    expect(backend.sent('/certificates')).toHaveLength(0);
    await user.selectOptions(within(dialog).getByLabelText(/Vehicle/), 'KDB 456B');
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    await waitFor(() => expect(backend.sent(`/policies/${POLICY_ID}/certificates`)).toHaveLength(1));
    expect(backend.sent(`/policies/${POLICY_ID}/certificates`)[0].body).toMatchObject({ vehicle_registration: 'KDB 456B' });
  });

  it('a marine type asks for the shipment and sends it', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend({ productClass: MARINE_CLASS });
    renderAt(`${AT}?tab=certificates&issue=1`);
    const dialog = await screen.findByRole('dialog', { name: 'Issue a certificate' });
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    expect(within(dialog).getByText('Enter the shipment reference.')).toBeInTheDocument();
    for (const [name, value] of [['Shipment reference', 'BL-77'], ['Conveyance', 'MV Jambo'], ['Voyage from', 'Mombasa'], ['Voyage to', 'Kampala'], ['Goods', 'Tea']]) {
      await user.type(within(dialog).getByLabelText(new RegExp(`^${name}`)), value);
    }
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    await waitFor(() => expect(backend.sent(`/policies/${POLICY_ID}/certificates`)).toHaveLength(1));
    expect(backend.sent(`/policies/${POLICY_ID}/certificates`)[0].body).toMatchObject({
      certificate_type_id: TYPES[2].id,
      marine_details: { shipment_reference: 'BL-77', conveyance: 'MV Jambo', voyage_from: 'Mombasa', voyage_to: 'Kampala', goods_description: 'Tea' },
    });
  });

  it('a second live certificate for the vehicle is refused in words, and Replace it sends the replacement with a reason', async () => {
    const user = userEvent.setup();
    const old = certificate({ id: OLD_ID, serial_no: 'CK0000003' });
    let refused = false;
    const backend = certificateBackend({
      certificates: [old],
      command: (call, action) => {
        if (action !== 'issue' || refused) return null;
        refused = true;
        return envelope(409, 'CERTIFICATE_VEHICLE_ALREADY_CERTIFIED', 'certificate CK0000003 already certifies this vehicle then',
          { serial_no: 'CK0000003', certificate_id: OLD_ID });
      },
    });
    renderAt(`${AT}?tab=certificates&issue=1`);
    const dialog = await screen.findByRole('dialog', { name: 'Issue a certificate' });
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Certificate CK0000003 already certifies this vehicle for those dates. Replace it instead of issuing a second one.');
    expect(alert).not.toHaveTextContent('CERTIFICATE_VEHICLE_ALREADY_CERTIFIED');
    await user.click(within(alert).getByRole('button', { name: 'Replace it' }));
    const replace = await screen.findByRole('dialog', { name: 'Replace the certificate' });
    await user.click(within(replace).getByRole('button', { name: 'Issue replacement' }));
    expect(within(replace).getByText('Give the reason for the replacement.')).toBeInTheDocument();
    await user.type(within(replace).getByLabelText(/Reason for the replacement/), 'windscreen sticker lost');
    await user.click(within(replace).getByRole('button', { name: 'Issue replacement' }));
    await waitFor(() => expect(backend.sent(`/policies/${POLICY_ID}/certificates`)).toHaveLength(2));
    const second = backend.sent(`/policies/${POLICY_ID}/certificates`)[1];
    expect(second.headers['if-match']).toBe(POLICY_ETAG);
    expect(second.body).toEqual({ certificate_type_id: TYPES[0].id, replaces_certificate_id: OLD_ID, reason: 'windscreen sticker lost' });
  });

  it('a stale policy ETag reloads the policy and the retry keeps its key with the new ETag', async () => {
    const user = userEvent.setup();
    let first = true;
    const fresh = `"policy-${POLICY_ID}-v4"`;
    const backend = certificateBackend({
      policyEtags: [POLICY_ETAG, fresh],
      command: (_call, action) => {
        if (action === 'issue' && first) {
          first = false;
          return envelope(412, 'PRECONDITION_FAILED', 'the policy changed');
        }
        return null;
      },
    });
    renderAt(`${AT}?tab=certificates&issue=1`);
    const dialog = await screen.findByRole('dialog', { name: 'Issue a certificate' });
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    expect(await within(dialog).findByText(STALE_TEXT)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    await waitFor(() => expect(backend.sent(`/policies/${POLICY_ID}/certificates`)).toHaveLength(2));
    const [a, b] = backend.sent(`/policies/${POLICY_ID}/certificates`);
    expect(b.headers['if-match']).toBe(fresh);
    expect(b.headers['x-idempotency-key']).toBe(a.headers['x-idempotency-key']);
  });

  it('says so when no stock is held', async () => {
    const user = userEvent.setup();
    certificateBackend({
      command: (_call, action) => (action === 'issue' ? envelope(409, 'CERTIFICATE_STOCK_UNAVAILABLE', 'no available stock') : null),
    });
    renderAt(`${AT}?tab=certificates&issue=1`);
    const dialog = await screen.findByRole('dialog', { name: 'Issue a certificate' });
    await user.click(within(dialog).getByRole('button', { name: 'Issue certificate' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No certificates are held for this insurer and type, by you or your branch. Ask your stock manager.');
  });
});

describe('Printing', () => {
  it('the print view changes nothing; Mark as printed is the explicit attestation with the certificate ETag', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend({ certificates: [certificate()] });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`);
    await user.click(await screen.findByRole('button', { name: 'Print view' }));
    const sheet = await screen.findByRole('dialog', { name: 'Certificate of motor insurance' });
    expect(sheet).toHaveTextContent('CK0000011');
    expect(sheet).toHaveTextContent('Wanjiku Holdings');
    expect(sheet).toHaveTextContent('Jubilee Insurance');
    expect(sheet).toHaveTextContent('KDA 123A');
    expect(sheet.textContent).not.toMatch(UUID_IN_TEXT);
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(backend.sent('/print')).toHaveLength(0);                                   // opening it records nothing

    await user.click(screen.getByRole('button', { name: 'Mark as printed' }));
    const confirm = await screen.findByRole('dialog', { name: 'Mark as printed' });
    await user.click(within(confirm).getByRole('button', { name: 'Mark as printed' }));
    await waitFor(() => expect(backend.sent('/print')).toHaveLength(1));
    expect(backend.sent('/print')[0].headers['if-match']).toBe(certEtag(C_ID));
    expect(await screen.findByText('Certificate CK0000011 marked as printed')).toBeInTheDocument();
  });

  it('a print refused because the terms changed says so with both versions, and offers Replace', async () => {
    const user = userEvent.setup();
    certificateBackend({
      certificates: [certificate()],
      command: (_call, action) =>
        action === 'print'
          ? envelope(409, 'CERTIFICATE_POLICY_TERMS_CHANGED', 'the terms changed', { version_no: 2, current_version_no: 3 })
          : null,
    });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`);
    await user.click(await screen.findByRole('button', { name: 'Mark as printed' }));
    const confirm = await screen.findByRole('dialog', { name: 'Mark as printed' });
    await user.click(within(confirm).getByRole('button', { name: 'Mark as printed' }));
    const alert = await within(confirm).findByRole('alert');
    expect(alert).toHaveTextContent("The policy's terms changed after this certificate was issued, so it cannot be printed.");
    expect(alert).toHaveTextContent('It names version 2; version 3 is now in force for its start date.');
    await user.click(within(alert).getByRole('button', { name: 'Replace it' }));
    expect(await screen.findByRole('dialog', { name: 'Replace the certificate' })).toBeInTheDocument();
  });

  it('warns when the policy no longer covers the whole validity', async () => {
    certificateBackend({ certificates: [certificate({ cover: { fully_covered: false, covered_through: '2026-09-30' } })] });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`);
    expect(await screen.findByText("The policy no longer covers this certificate's whole validity")).toBeInTheDocument();
    expect(mainText()).toMatch(/Covered through 30 Sept? 2026/);
  });
});

describe('Cancelling and spoiling', () => {
  it('cancels with a reason and the certificate ETag', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend({ certificates: [certificate({ status: 'PRINTED', printed_at: '2026-06-02T10:00:00Z' })] });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`, CANCELLER);
    expect(await screen.findByRole('heading', { name: 'CK0000011' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spoil' })).not.toBeInTheDocument();     // printed: not spoilable
    await user.click(screen.getByRole('button', { name: 'Cancel certificate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel the certificate' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel certificate' }));
    expect(within(dialog).getByText('Give the reason.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Reason/), 'vehicle sold');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel certificate' }));
    await waitFor(() => expect(backend.sent('/cancel')).toHaveLength(1));
    expect(backend.sent('/cancel')[0].body).toEqual({ reason: 'vehicle sold' });
    expect(backend.sent('/cancel')[0].headers['if-match']).toBe(certEtag(C_ID));
  });

  it('spoils an issued, unprinted certificate with a reason', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend({ certificates: [certificate()] });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`, CANCELLER);
    await user.click(await screen.findByRole('button', { name: 'Spoil' }));
    const dialog = await screen.findByRole('dialog', { name: 'Spoil the certificate' });
    await user.type(within(dialog).getByLabelText(/Reason/), 'jammed in the printer');
    await user.click(within(dialog).getByRole('button', { name: 'Spoil' }));
    await waitFor(() => expect(backend.sent('/spoil')).toHaveLength(1));
    expect(backend.sent('/spoil')[0].body).toEqual({ reason: 'jammed in the printer' });
  });

  it('where the tenant governs cancellation, the refusal says so and nothing else is sent', async () => {
    const user = userEvent.setup();
    const backend = certificateBackend({
      certificates: [certificate()],
      command: (_call, action) => (action === 'cancel' ? envelope(409, 'WORKFLOW_APPROVAL_REQUIRED', 'approval required') : null),
    });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`, CANCELLER);
    await user.click(await screen.findByRole('button', { name: 'Cancel certificate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel the certificate' });
    await user.type(within(dialog).getByLabelText(/Reason/), 'stolen');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel certificate' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(CANCELLATION_GOVERNED_TEXT);
    expect(within(dialog).getByRole('button', { name: 'Cancel certificate' })).toBeDisabled();
    expect(backend.sent('/request-cancellation')).toHaveLength(0);
  });

  it('a pending cancellation request shows who it waits for', async () => {
    certificateBackend({
      certificates: [certificate({
        cancellation_request: { reason: 'stolen', requested_at: '2026-06-03T09:00:00Z' },
        workflow: { instance_id: '23232323-2323-4232-8232-232323232323', status: 'PENDING_APPROVAL', waiting_on: ['Certificate Checker'] },
      })],
    });
    renderAt(`${AT}?tab=certificates&certificate=CK0000011`, CANCELLER);
    expect(await screen.findByText('Cancellation requested')).toBeInTheDocument();
    expect(mainText()).toContain('Waiting for: Certificate Checker.');
    expect(screen.queryByRole('button', { name: 'Cancel certificate' })).not.toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });
});
