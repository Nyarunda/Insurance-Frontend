import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import type { Batch, StockRow } from '../certificates/stock';
import { previewSerial } from '../certificates/stock';
import type { CertificateType } from '../certificates/types';
import { BACKEND_NAV, visibleNav } from '../navigation';
import { MAKER } from '../../test/policyFixtures';
import { NO_STOCK_TEXT } from './CertificateStockPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const NBO = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'BRANCH' };
const MSA = { id: '78787878-7878-4787-8787-787878787878', code: 'MSA', name: 'Mombasa', scope: 'BRANCH' };
const INSURER = { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'JUB', name: 'Jubilee Insurance', status: 'ACTIVE' };
const OLD_INSURER = { id: 'efefefef-efef-4efe-8efe-efefefefefef', code: 'OLD', name: 'Old Mutual Legacy', status: 'SUSPENDED' };
const MOTOR_CLASS = { id: '15151515-1515-4151-8151-151515151515', code: 'MOTOR', name: 'Motor', line: 'GENERAL', is_active: true };
const BATCH_ID = '30303030-3030-4303-8303-303030303030';
const USER_ID = '31313131-3131-4313-8313-313131313131';

const person = (permissions: string[], branches = [NBO, MSA]): Me => ({ ...MAKER, permissions, branches });
/** As CERTIFICATE_STOCK_MANAGER (CS-P0). */
const KEEPER = person(['certificates.stock.manage', 'certificates.cert.view', 'insurers.insurer.view', 'products.product.view']);
/** As CERTIFICATE_ISSUER (CS-P0): no stock powers. */
const ISSUER = person(['certificates.cert.view', 'certificates.cert.issue', 'policies.policy.view', 'products.product.view']);

const TYPES: CertificateType[] = [
  { id: '19191919-1919-4191-8191-191919191919', code: 'MOT-A', name: 'Motor certificate', category: 'MOTOR', insurance_class: { id: MOTOR_CLASS.id, code: 'MOTOR' }, is_active: true },
  { id: '20202020-2020-4202-8202-202020202020', code: 'MOT-OLD', name: 'Old motor', category: 'MOTOR', insurance_class: { id: MOTOR_CLASS.id, code: 'MOTOR' }, is_active: false },
];
const batch = (over: Partial<Batch> = {}): Batch => ({
  id: BATCH_ID, batch_no: 'CBT0000001', insurer: { id: INSURER.id, code: 'JUB' }, certificate_type: { id: TYPES[0].id, code: 'MOT-A' },
  prefix: 'CK', first_number: 1, last_number: 50, number_width: 7, first_serial: 'CK0000001', last_serial: 'CK0000050', quantity: 50,
  branch_id: NBO.id, delivery_reference: 'DN-77', received_at: '2026-10-07T08:00:00Z', ...over,
});
const STOCK: StockRow[] = [
  { insurer_id: INSURER.id, certificate_type_id: TYPES[0].id, certificate_type: 'MOT-A', branch_id: NBO.id, holder_user_id: null, available: 40, lowest_serial: 'CK0000011', highest_serial: 'CK0000050' },
  { insurer_id: INSURER.id, certificate_type_id: TYPES[0].id, certificate_type: 'MOT-A', branch_id: MSA.id, holder_user_id: USER_ID, available: 10, lowest_serial: 'CK0000001', highest_serial: 'CK0000010' },
];

interface Options {
  stock?: StockRow[];
  batches?: Batch[];
  command?: (call: FakeCall, path: string) => Response | null;
}

function stockBackend(options: Options = {}) {
  const network = fakeFetch((call) => {
    const path = call.url.replace(/^.*\/api\/v1/, '');
    if (call.method === 'POST') {
      const answer = options.command?.(call, path);
      if (answer) return answer;
      if (path === '/certificate-types') {
        const body = call.body as { code: string; name: string; category: string };
        return json(201, { id: '32323232-3232-4323-8323-323232323232', ...body, insurance_class: { id: MOTOR_CLASS.id, code: 'MOTOR' }, is_active: true, row_version: 1 }, { ETag: '"certificate-type-x-v1"' });
      }
      if (path === '/certificate-batches') return json(201, batch({ batch_no: 'CBT0000002', first_serial: 'MK0000101', last_serial: 'MK0000150', quantity: 50 }));
      if (path === '/certificate-stock/allocate') {
        const body = call.body as { first_number: number; last_number: number; branch_id: string };
        return json(200, { movement_id: '33333333-3333-4333-8333-333333333333', batch_no: 'CBT0000001', first_serial: previewSerial('CK', body.first_number, 7), last_serial: previewSerial('CK', body.last_number, 7), quantity: body.last_number - body.first_number + 1, to_branch_id: body.branch_id, to_user_id: null });
      }
    }
    if (path === '/certificate-stock') return json(200, { results: options.stock ?? STOCK });
    if (path === '/certificate-batches') return json(200, { results: options.batches ?? [batch()] });
    if (path === '/certificate-types') return json(200, { results: TYPES });
    if (path === '/insurers') return json(200, { results: [INSURER, OLD_INSURER] });
    if (path === '/insurance-classes') return json(200, { results: [MOTOR_CLASS, { ...MOTOR_CLASS, id: '16161616-1616-4161-8161-161616161616', code: 'OLDCLS', name: 'Retired', is_active: false }] });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const sent = (path: string) => network.calls.filter((call) => call.method === 'POST' && call.url.endsWith(path));
  return { ...network, sent };
}

function renderAt(path: string, me: Me = KEEPER) {
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
const AT = '/certificates/stock';

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Certificate stock: access', () => {
  it('is in the sidebar for certificates.stock.manage only, and the route refuses others', async () => {
    const items = (me: Me) => visibleNav(BACKEND_NAV, me.permissions).flatMap((group) => group.items.map((item) => item.id));
    expect(items(KEEPER)).toContain('certificate-stock');
    expect(items(ISSUER)).not.toContain('certificate-stock');
    const backend = stockBackend();
    renderAt(AT, ISSUER);
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
    expect(backend.calls.filter((call) => call.url.includes('/certificate-'))).toEqual([]);
  });
});

describe('Available stock', () => {
  it('shows the grouped stock in words: type, insurer by name, branch by name, a named holder without its ID, count and range', async () => {
    stockBackend();
    renderAt(AT);
    const table = await screen.findByRole('table', { name: 'Available stock' });
    const [, nairobi, mombasa] = within(table).getAllByRole('row');
    expect(nairobi).toHaveTextContent('MOT-A');
    expect(nairobi).toHaveTextContent('Jubilee Insurance');
    expect(nairobi).toHaveTextContent('Nairobi');
    expect(nairobi).toHaveTextContent('40');
    expect(nairobi).toHaveTextContent('CK0000011 – CK0000050');
    expect(mombasa).toHaveTextContent('A named user at Mombasa');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('says so when there is none', async () => {
    stockBackend({ stock: [] });
    renderAt(AT);
    expect(await screen.findByText(NO_STOCK_TEXT)).toBeInTheDocument();
  });
});

describe('Types', () => {
  it('lists the types and creates one (list and create only: no rename or deactivate)', async () => {
    const user = userEvent.setup();
    const backend = stockBackend();
    renderAt(`${AT}?tab=types`);
    const table = await screen.findByRole('table', { name: 'Certificate types' });
    expect(table).toHaveTextContent('Motor certificate');
    expect(table).toHaveTextContent('Inactive');
    expect(screen.queryByRole('button', { name: /Rename|Deactivate|Edit/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New type' }));
    const dialog = await screen.findByRole('dialog', { name: 'New certificate type' });
    const classes = within(dialog).getByLabelText(/Insurance class/) as HTMLSelectElement;
    expect([...classes.options].map((o) => o.textContent)).toEqual(['Choose…', 'Motor (MOTOR)']);   // active classes only
    await user.click(within(dialog).getByRole('button', { name: 'Create type' }));
    expect(within(dialog).getByText('Enter a code.')).toBeInTheDocument();
    expect(backend.sent('/certificate-types')).toHaveLength(0);
    await user.type(within(dialog).getByLabelText(/Code/), 'mot-b');
    await user.type(within(dialog).getByLabelText(/^Name/), 'Motor certificate B');
    await user.selectOptions(within(dialog).getByLabelText(/Category/), 'MOTOR');
    await user.selectOptions(classes, MOTOR_CLASS.id);
    await user.click(within(dialog).getByRole('button', { name: 'Create type' }));
    await waitFor(() => expect(backend.sent('/certificate-types')).toHaveLength(1));
    const [create] = backend.sent('/certificate-types');
    expect(create.body).toEqual({ code: 'MOT-B', name: 'Motor certificate B', category: 'MOTOR', insurance_class_id: MOTOR_CLASS.id });
    expect(create.headers['if-match']).toBeUndefined();
    expect(create.headers['x-idempotency-key']).toBeTruthy();
    expect(await screen.findByText('Certificate type MOT-B created')).toBeInTheDocument();
  });

  it('a code already taken is refused in words', async () => {
    const user = userEvent.setup();
    stockBackend({ command: (_call, path) => (path === '/certificate-types' ? envelope(409, 'CERTIFICATE_TYPE_EXISTS', 'the certificate type already exists') : null) });
    renderAt(`${AT}?tab=types`);
    await user.click(await screen.findByRole('button', { name: 'New type' }));
    const dialog = await screen.findByRole('dialog', { name: 'New certificate type' });
    await user.type(within(dialog).getByLabelText(/Code/), 'MOT-A');
    await user.type(within(dialog).getByLabelText(/^Name/), 'Again');
    await user.selectOptions(within(dialog).getByLabelText(/Category/), 'MOTOR');
    await user.selectOptions(within(dialog).getByLabelText(/Insurance class/), MOTOR_CLASS.id);
    await user.click(within(dialog).getByRole('button', { name: 'Create type' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('A certificate type with this code already exists. Choose another code.');
  });
});

describe('Batches', () => {
  it('lists the received batches with their range, insurer and branch by name', async () => {
    stockBackend();
    renderAt(`${AT}?tab=batches`);
    const row = await screen.findByRole('row', { name: /CBT0000001/ });
    for (const fact of ['MOT-A', 'Jubilee Insurance', 'CK0000001 – CK0000050', '50', 'Nairobi', 'DN-77']) expect(row).toHaveTextContent(fact);
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('receives a batch with a serial preview before sending; active insurers and types only', async () => {
    const user = userEvent.setup();
    const backend = stockBackend();
    renderAt(AT);
    await user.click(await screen.findByRole('button', { name: 'Receive batch' }));
    const dialog = await screen.findByRole('dialog', { name: 'Receive a batch' });
    const insurers = within(dialog).getByLabelText(/Insurer/) as HTMLSelectElement;
    expect([...insurers.options].map((o) => o.textContent)).toEqual(['Choose…', 'Jubilee Insurance']);
    const types = within(dialog).getByLabelText(/Certificate type/) as HTMLSelectElement;
    expect([...types.options].map((o) => o.textContent)).toEqual(['Choose…', 'Motor certificate (MOT-A)']);
    await user.selectOptions(insurers, INSURER.id);
    await user.selectOptions(types, TYPES[0].id);
    await user.selectOptions(within(dialog).getByLabelText(/Receiving branch/), NBO.id);
    await user.type(within(dialog).getByLabelText('Prefix'), 'mk');
    await user.type(within(dialog).getByLabelText(/First number/), '101');
    await user.type(within(dialog).getByLabelText(/Last number/), '150');
    await user.type(within(dialog).getByLabelText('Delivery reference'), 'DN-78');
    expect(within(dialog).getByRole('status', { name: 'Serial preview' })).toHaveTextContent('50 certificates: MK0000101 to MK0000150');
    await user.click(within(dialog).getByRole('button', { name: 'Receive batch' }));
    await waitFor(() => expect(backend.sent('/certificate-batches')).toHaveLength(1));
    expect(backend.sent('/certificate-batches')[0].body).toEqual({
      insurer_id: INSURER.id, certificate_type_id: TYPES[0].id, branch_id: NBO.id, prefix: 'MK',
      first_number: 101, last_number: 150, number_width: 7, delivery_reference: 'DN-78',
    });
    expect(await screen.findByText('Batch CBT0000002 received: MK0000101 to MK0000150')).toBeInTheDocument();
  });

  it('a range that reuses a serial is refused in words, naming it', async () => {
    const user = userEvent.setup();
    stockBackend({ command: (_call, path) => (path === '/certificate-batches' ? envelope(409, 'CERTIFICATE_SERIAL_EXISTS', 'serial CK0000010 already exists', { serial_no: 'CK0000010' }) : null) });
    renderAt(AT);
    await user.click(await screen.findByRole('button', { name: 'Receive batch' }));
    const dialog = await screen.findByRole('dialog', { name: 'Receive a batch' });
    await user.selectOptions(within(dialog).getByLabelText(/Insurer/), INSURER.id);
    await user.selectOptions(within(dialog).getByLabelText(/Certificate type/), TYPES[0].id);
    await user.selectOptions(within(dialog).getByLabelText(/Receiving branch/), NBO.id);
    await user.type(within(dialog).getByLabelText('Prefix'), 'CK');
    await user.type(within(dialog).getByLabelText(/First number/), '10');
    await user.type(within(dialog).getByLabelText(/Last number/), '20');
    await user.click(within(dialog).getByRole('button', { name: 'Receive batch' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Serial CK0000010 already exists, and a serial is never reused.');
  });

  it('a range the server refuses as too large shows its message on the field', async () => {
    const user = userEvent.setup();
    stockBackend({
      command: (_call, path) => (path === '/certificate-batches' ? envelope(422, 'CERTIFICATE_RANGE_INVALID', 'a batch is 1 to 10000 consecutive numbers', { field: 'last_number' }) : null),
    });
    renderAt(AT);
    await user.click(await screen.findByRole('button', { name: 'Receive batch' }));
    const dialog = await screen.findByRole('dialog', { name: 'Receive a batch' });
    await user.selectOptions(within(dialog).getByLabelText(/Insurer/), INSURER.id);
    await user.selectOptions(within(dialog).getByLabelText(/Certificate type/), TYPES[0].id);
    await user.selectOptions(within(dialog).getByLabelText(/Receiving branch/), NBO.id);
    await user.type(within(dialog).getByLabelText(/First number/), '1');
    await user.type(within(dialog).getByLabelText(/Last number/), '20000');
    await user.click(within(dialog).getByRole('button', { name: 'Receive batch' }));
    expect(await within(dialog).findByText(/a batch is 1 to 10000 consecutive numbers/i)).toBeInTheDocument();
  });
});

describe('Allocation', () => {
  it('allocates a range of a batch to a branch only (no user, no ID) and shows the returned result', async () => {
    const user = userEvent.setup();
    const backend = stockBackend();
    renderAt(`${AT}?tab=batches`);
    await user.click(await screen.findByRole('button', { name: 'Allocate from CBT0000001' }));
    const dialog = await screen.findByRole('dialog', { name: 'Allocate to a branch' });
    expect(within(dialog).queryByLabelText(/user/i)).not.toBeInTheDocument();
    const first = within(dialog).getByLabelText(/First number/) as HTMLInputElement;
    expect(first.value).toBe('1');
    await user.clear(first);
    await user.type(first, '11');
    const last = within(dialog).getByLabelText(/Last number/);
    await user.clear(last);
    await user.type(last, '20');
    expect(dialog).toHaveTextContent('10 certificates: CK0000011 to CK0000020');
    await user.click(within(dialog).getByRole('button', { name: 'Allocate' }));
    expect(within(dialog).getByText('Choose the branch.')).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText(/To branch/), MSA.id);
    await user.click(within(dialog).getByRole('button', { name: 'Allocate' }));
    await waitFor(() => expect(backend.sent('/certificate-stock/allocate')).toHaveLength(1));
    expect(backend.sent('/certificate-stock/allocate')[0].body).toEqual({ batch_id: BATCH_ID, first_number: 11, last_number: 20, branch_id: MSA.id });
    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('Allocated to Mombasa');
    expect(result).toHaveTextContent('10 certificates of batch CBT0000001: CK0000011 to CK0000020.');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('keeps the range within the batch, and says so when stock is not available', async () => {
    const user = userEvent.setup();
    const backend = stockBackend({
      command: (_call, path) =>
        path === '/certificate-stock/allocate' ? envelope(409, 'CERTIFICATE_STOCK_UNAVAILABLE', 'only available stock is allocated', { serials: ['CK0000011'] }) : null,
    });
    renderAt(`${AT}?tab=batches`);
    await user.click(await screen.findByRole('button', { name: 'Allocate from CBT0000001' }));
    const dialog = await screen.findByRole('dialog', { name: 'Allocate to a branch' });
    const last = within(dialog).getByLabelText(/Last number/);
    await user.clear(last);
    await user.type(last, '60');
    await user.selectOptions(within(dialog).getByLabelText(/To branch/), MSA.id);
    await user.click(within(dialog).getByRole('button', { name: 'Allocate' }));
    expect(within(dialog).getByText('A number from 1 to 50.')).toBeInTheDocument();
    expect(backend.sent('/certificate-stock/allocate')).toHaveLength(0);
    await user.clear(last);
    await user.type(last, '20');
    await user.click(within(dialog).getByRole('button', { name: 'Allocate' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Only available stock is allocated; already used: CK0000011.');
  });
});
