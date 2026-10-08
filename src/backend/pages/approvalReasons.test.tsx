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
import type { ReasonCodeSetup } from '../workflow/reasonSetup';

const person = (permissions: string[]): Me => ({
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [{ id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'ALL' }],
});
const ADMIN = person(['admin.workflow.manage']);

const REASONS: ReasonCodeSetup[] = [
  { code: 'DOCS_MISSING', label: 'Supporting documents are missing', applicable_actions: ['REJECT'], requires_text: true, is_active: true, system: false },
  { code: 'OUT_OF_APPETITE', label: 'Outside appetite', applicable_actions: ['APPROVE', 'REJECT'], requires_text: false, is_active: false, system: false },
  { code: 'UNDERLYING_RECORD_INVALID', label: 'Underlying record invalid', applicable_actions: ['REJECT'], requires_text: false, is_active: true, system: true },
];

function reasonBackend(options: { reasons?: ReasonCodeSetup[]; etags?: string[]; command?: (call: FakeCall) => Response | null } = {}) {
  let reads = 0;
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (call.method === 'GET' && path === '/workflows/reason-code-setup') return json(200, { results: options.reasons ?? REASONS });
    if (call.method === 'GET' && path.startsWith('/workflows/reason-code-setup/')) {
      const etags = options.etags ?? ['"reason-code-a"'];
      return json(200, REASONS[0], { ETag: etags[Math.min(reads++, etags.length - 1)] });
    }
    if (call.method !== 'GET' && path.startsWith('/workflows/reason-code-setup')) return options.command?.(call) ?? json(200, REASONS[0]);
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return { ...network, sent: () => network.calls.filter((call) => call.method !== 'GET') };
}

function renderAt(path: string, me: Me = ADMIN) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, me);
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createMemoryRouter(backendRoutes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Approval reasons', () => {
  it('lists every reason in words; the system reason has no actions, and nothing can be deleted', async () => {
    reasonBackend();
    renderAt('/approval-reasons/list');
    const table = await screen.findByRole('table', { name: 'Approval reasons' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Supporting documents are missing');
    expect(rows[1]).toHaveTextContent('Rejecting');
    expect(rows[1]).toHaveTextContent('Required');
    expect(rows[2]).toHaveTextContent('Approving and rejecting');
    expect(rows[2]).toHaveTextContent('Inactive');
    expect(rows[3]).toHaveTextContent('System');
    expect(within(rows[3]).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivate OUT_OF_APPETITE' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('creates a reason with its code in capitals, and puts a duplicate code in words', async () => {
    const user = userEvent.setup();
    let first = true;
    const backend = reasonBackend({
      command: () => (first ? ((first = false), envelope(409, 'REASON_CODE_EXISTS', 'a reason code with this code already exists')) : json(201, REASONS[0])),
    });
    renderAt('/approval-reasons/list');
    await user.click(await screen.findByRole('button', { name: 'New reason' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Create reason' }));
    expect(within(dialog).getByText('Enter a code.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/^Code/), 'valuation missing');
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Valuation report missing');
    await user.click(within(dialog).getByLabelText('Approving'));
    await user.click(within(dialog).getByLabelText(/must also write an explanation/));
    await user.click(within(dialog).getByRole('button', { name: 'Create reason' }));
    expect(await within(dialog).findByText(/A reason with this code already exists/)).toBeInTheDocument();
    expect(backend.sent()[0].body).toEqual({ code: 'VALUATION_MISSING', label: 'Valuation report missing', applicable_actions: ['APPROVE', 'REJECT'], requires_text: true });
  });

  it("edits with the reason's ETag; a 412 reloads it and the same confirmation resends with the same key", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const backend = reasonBackend({
      etags: ['"reason-code-v1"', '"reason-code-v2"'],
      command: () => (++calls === 1 ? envelope(412, 'CONCURRENCY_CONFLICT', 'the reason code was changed by someone else; refresh it') : json(200, REASONS[0])),
    });
    renderAt('/approval-reasons/list');
    await user.click(await screen.findByRole('button', { name: 'Edit DOCS_MISSING' }));
    const dialog = screen.getByRole('dialog');
    const reason = within(dialog).getByLabelText(/^Reason/);
    await user.clear(reason);
    await user.type(reason, 'Documents are missing');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled());
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(STALE_TEXT)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [stale, again] = backend.sent();
    expect(stale.method).toBe('PATCH');
    expect(stale.body).toEqual({ label: 'Documents are missing', applicable_actions: ['REJECT'], requires_text: true });
    expect([stale.headers['if-match'], again.headers['if-match']]).toEqual(['"reason-code-v1"', '"reason-code-v2"']);
    expect(again.headers['x-idempotency-key']).toBe(stale.headers['x-idempotency-key']);
  });

  it('deactivates a reason with its ETag', async () => {
    const user = userEvent.setup();
    const backend = reasonBackend();
    renderAt('/approval-reasons/list');
    await user.click(await screen.findByRole('button', { name: 'Deactivate DOCS_MISSING' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Decisions already made keep it');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Deactivate' })).toBeEnabled());
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(backend.sent()).toHaveLength(1));
    expect(backend.sent()[0].body).toEqual({ is_active: false });
    expect(backend.sent()[0].url).toContain('/workflows/reason-code-setup/DOCS_MISSING');
  });

  it('is in Setup only for workflow administrators, and the route checks it too', async () => {
    const setup = (permissions: string[]) => visibleNav(BACKEND_NAV, permissions).find((group) => group.id === 'setup');
    expect(setup(['admin.workflow.manage'])?.items.map((item) => item.label)).toEqual(['Approval reasons']);
    expect(setup(['workflow.task.view'])).toBeUndefined();
    reasonBackend();
    renderAt('/approval-reasons/list', person(['workflow.task.view']));
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
  });
});
