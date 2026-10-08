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
import { BACKEND_NAV, visibleNav } from '../navigation';
import type { VehicleMake } from '../reference/vehicles';
import { NO_MAKES_TEXT } from './VehicleMakesPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const TOYOTA = 'aaaaaaaa-0000-4000-8000-000000000001';
const COROLLA = 'aaaaaaaa-0000-4000-8000-000000000002';
const NISSAN = 'aaaaaaaa-0000-4000-8000-000000000003';
const BRANCH = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'BRANCH' };

const person = (permissions: string[]): Me => ({
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'setup@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [BRANCH],
});
const MANAGER = person(['products.reference.manage']);
const QUOTER = person(['quotations.quotation.view', 'quotations.quotation.create']);

const MAKES: VehicleMake[] = [
  {
    id: TOYOTA, code: 'TOYOTA', name: 'Toyota', is_active: true, row_version: 1,
    models: [{ id: COROLLA, code: 'COROLLA', name: 'Corolla', is_active: true, row_version: 1 }],
  },
  { id: NISSAN, code: 'NISSAN', name: 'Nissan', is_active: false, row_version: 2, models: [] },
];

interface Options {
  makes?: VehicleMake[];
  /** The ETag served for a make or model, per GET in order; the last repeats. */
  etags?: string[];
  command?: (call: FakeCall) => Response | null;
}

function referenceBackend(options: Options = {}) {
  let etagReads = 0;
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (call.method === 'GET' && (path === '/vehicle-makes' || path === '/vehicle-makes?active=true')) {
      const all = options.makes ?? MAKES;
      return json(200, { results: path.endsWith('true') ? all.filter((make) => make.is_active) : all });
    }
    if (call.method === 'GET' && path.startsWith('/vehicle-makes/')) {
      const etags = options.etags ?? ['"vehicle-make-v1"'];
      const etag = etags[Math.min(etagReads, etags.length - 1)];
      etagReads += 1;
      return json(200, { id: TOYOTA }, { ETag: etag });
    }
    if (call.method !== 'GET' && path.startsWith('/vehicle-makes')) return options.command?.(call) ?? json(200, {});
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const sent = () => network.calls.filter((call) => call.method !== 'GET');
  return { ...network, sent };
}

function renderAt(path: string, me: Me = MANAGER) {
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

describe('Vehicle makes and models', () => {
  it('lists every make with its models and status, narrows to active ones, and offers no delete', async () => {
    const user = userEvent.setup();
    const backend = referenceBackend();
    const router = renderAt('/vehicle-makes/list');
    const toyota = await screen.findByRole('region', { name: 'Make TOYOTA' });
    expect(within(toyota).getByRole('table', { name: 'Models of TOYOTA' })).toHaveTextContent('Corolla');
    expect(within(toyota).getAllByText('Active').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Make NISSAN' })).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivate make NISSAN' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);

    await user.click(screen.getByLabelText('Active only'));
    await waitFor(() => expect(router.state.location.search).toBe('?active=only'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Make NISSAN' })).not.toBeInTheDocument());
    expect(backend.calls.map((call) => call.url)).toContainEqual(expect.stringContaining('/vehicle-makes?active=true'));
  });

  it('says so when the list is empty', async () => {
    referenceBackend({ makes: [] });
    renderAt('/vehicle-makes/list');
    expect(await screen.findByText(NO_MAKES_TEXT)).toBeInTheDocument();
  });

  it('creates a make with its code in capitals, and puts a duplicate code in words', async () => {
    const user = userEvent.setup();
    let refuse = true;
    const backend = referenceBackend({
      command: () => {
        if (!refuse) return json(201, { id: 'x', code: 'MAZDA', name: 'Mazda', is_active: true, row_version: 1, models: [] });
        refuse = false;
        return envelope(409, 'VEHICLE_MAKE_CODE_EXISTS', 'another make has this code');
      },
    });
    renderAt('/vehicle-makes/list');
    await user.click(await screen.findByRole('button', { name: 'New make' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Create make' }));
    expect(within(dialog).getByText('Enter a code.')).toBeInTheDocument();
    expect(backend.sent()).toHaveLength(0);

    await user.type(within(dialog).getByLabelText(/Code/), 'mazda');
    await user.type(within(dialog).getByLabelText(/Name/), '  Mazda ');
    await user.click(within(dialog).getByRole('button', { name: 'Create make' }));
    expect(await within(dialog).findByText(/A make with this code already exists/)).toBeInTheDocument();
    const [first] = backend.sent();
    expect(first.url).toMatch(/\/vehicle-makes$/);
    expect(first.body).toEqual({ code: 'MAZDA', name: 'Mazda' });

    await user.clear(within(dialog).getByLabelText(/Code/));
    await user.type(within(dialog).getByLabelText(/Code/), 'MAZDA2');
    await user.click(within(dialog).getByRole('button', { name: 'Create make' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(backend.sent()[1].body).toEqual({ code: 'MAZDA2', name: 'Mazda' });
  });

  it('adds a model to its make', async () => {
    const user = userEvent.setup();
    const backend = referenceBackend({ command: () => json(201, { id: 'm', code: 'YARIS', name: 'Yaris', is_active: true, row_version: 1 }) });
    renderAt('/vehicle-makes/list');
    await user.click(await screen.findByRole('button', { name: 'Add a model of TOYOTA' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Code/), 'yaris');
    await user.type(within(dialog).getByLabelText(/Name/), 'Yaris');
    await user.click(within(dialog).getByRole('button', { name: 'Create model' }));
    await waitFor(() => expect(backend.sent()).toHaveLength(1));
    expect(backend.sent()[0].url).toContain(`/vehicle-makes/${TOYOTA}/models`);
    expect(backend.sent()[0].body).toEqual({ code: 'YARIS', name: 'Yaris' });
  });

  it("renames with the record's ETag from the server; a 412 reloads it and the same confirmation resends with the same key", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const backend = referenceBackend({
      etags: ['"vehicle-make-v1"', '"vehicle-make-v2"'],
      command: () => {
        calls += 1;
        return calls === 1 ? envelope(412, 'CONCURRENCY_CONFLICT', 'the make was changed by someone else; refresh it') : json(200, {});
      },
    });
    renderAt('/vehicle-makes/list');
    await user.click(await screen.findByRole('button', { name: 'Rename make TOYOTA' }));
    const dialog = screen.getByRole('dialog');
    const name = await within(dialog).findByLabelText(/Name/);
    expect(name).toHaveValue('Toyota');
    await user.clear(name);
    await user.type(name, 'Toyota Motor');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Rename' })).toBeEnabled());
    await user.click(within(dialog).getByRole('button', { name: 'Rename' }));
    expect(await within(dialog).findByText(STALE_TEXT)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Toyota Motor');

    await user.click(within(dialog).getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [stale, again] = backend.sent();
    expect(stale.method).toBe('PATCH');
    expect(stale.url).toContain(`/vehicle-makes/${TOYOTA}`);
    expect(stale.body).toEqual({ name: 'Toyota Motor' });
    expect(stale.headers['if-match']).toBe('"vehicle-make-v1"');
    expect(again.headers['if-match']).toBe('"vehicle-make-v2"');
    expect(again.headers['x-idempotency-key']).toBe(stale.headers['x-idempotency-key']);
  });

  it('deactivates a model and reactivates a make, each with its ETag', async () => {
    const user = userEvent.setup();
    const backend = referenceBackend();
    renderAt('/vehicle-makes/list');
    await user.click(await screen.findByRole('button', { name: 'Deactivate model TOYOTA COROLLA' }));
    let dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Quotations and policies already made keep it');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Deactivate' })).toBeEnabled());
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(backend.sent()).toHaveLength(1));
    expect(backend.sent()[0].url).toContain(`/vehicle-makes/${TOYOTA}/models/${COROLLA}`);
    expect(backend.sent()[0].body).toEqual({ is_active: false });
    expect(backend.sent()[0].headers['if-match']).toBe('"vehicle-make-v1"');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Reactivate make NISSAN' }));
    dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reactivate' })).toBeEnabled());
    await user.click(within(dialog).getByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(backend.sent()).toHaveLength(2));
    expect(backend.sent()[1].body).toEqual({ is_active: true });
  });

  it("says in words that a branch-only grant cannot change the list", async () => {
    const user = userEvent.setup();
    referenceBackend({ command: () => envelope(403, 'PERMISSION_DENIED', 'requires products.reference.manage') });
    renderAt('/vehicle-makes/list');
    await user.click(await screen.findByRole('button', { name: 'New make' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Code/), 'KIA');
    await user.type(within(dialog).getByLabelText(/Name/), 'Kia');
    await user.click(within(dialog).getByRole('button', { name: 'Create make' }));
    expect(await within(dialog).findByText('Only a tenant-wide reference data manager can change the list.')).toBeInTheDocument();
  });

  it('is in Setup only for reference data managers, and the route checks it too', async () => {
    const setup = (permissions: string[]) => visibleNav(BACKEND_NAV, permissions).find((group) => group.id === 'setup');
    expect(setup(['products.reference.manage'])?.items.map((item) => item.label)).toEqual(['Vehicle makes']);
    expect(setup(['quotations.quotation.create'])).toBeUndefined();
    referenceBackend();
    renderAt('/vehicle-makes/list', QUOTER);
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New make' })).not.toBeInTheDocument();
  });
});
