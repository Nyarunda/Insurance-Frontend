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
import { NO_REJECTION_REASONS } from '../workflow/DecisionDialog';
import type { InstanceView, ReasonCode, WorkQueueItem } from '../workflow/types';
import { EMPTY_QUEUE_TEXT } from './WorkQueuePage';
import { VOID_HEADING } from './InstancePage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const ME_ID = '11111111-1111-4111-8111-111111111111';
const MAKER_ID = '22222222-2222-4222-8222-222222222222';
const INSTANCE_ID = '33333333-3333-4333-8333-333333333333';
const STEP_1 = '44444444-4444-4444-8444-444444444444';
const STEP_2 = '55555555-5555-4555-8555-555555555555';

const CHECKER: Me = {
  user: { id: ME_ID, email: 'checker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions: ['workflow.task.view'],
  branches: [{ id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'OWN' }],
};

const task = (over: Partial<WorkQueueItem> = {}): WorkQueueItem => ({
  assignment_id: '88888888-8888-4888-8888-888888888888',
  workflow_instance_id: INSTANCE_ID,
  step_id: STEP_1,
  definition_code: 'POLICY_ENDORSEMENT_APPROVAL',
  resource_type: 'POLICY_ENDORSEMENT',
  resource_id: '99999999-9999-4999-8999-999999999999',
  resource_reference: 'END0000001',
  stage: 'ENDORSEMENT_CHECK',
  stage_label: 'Endorsement check',
  slot_no: 1,
  acting_for_user_id: null,
  amount: '0.00',
  currency: 'KES',
  amount_reason: null,
  branch_id: CHECKER.branches[0].id,
  assigned_at: '2026-10-04T09:00:00Z',
  ...over,
});

const view = (over: Partial<InstanceView> = {}): InstanceView => ({
  id: INSTANCE_ID,
  definition_code: 'POLICY_ENDORSEMENT_APPROVAL',
  version_no: 1,
  resource: { type: 'POLICY_ENDORSEMENT', id: '99999999-9999-4999-8999-999999999999', reference: 'END0000001' },
  status: 'PENDING_APPROVAL',
  stage: 'ENDORSEMENT_CHECK',
  stage_label: 'Endorsement check',
  step_id: STEP_1,
  cycle_no: 1,
  quorum: { mode: 'ANY_ONE', required: 1, counted: 0, slots: 1 },
  amount: '0.00',
  currency: 'KES',
  amount_reason: null,
  approval_facts: {
    action: 'APPROVE_ENDORSEMENT',
    endorsement_no: 'END0000001',
    policy_id: '99999999-9999-4999-8999-999999999999',
    endorsement_type: 'CHANGE_LIMIT',
    terms_hash: 'ab'.repeat(32),
  },
  branch_id: CHECKER.branches[0].id,
  submitted_at: '2026-10-04T09:00:00Z',
  completed_at: null,
  history: [
    {
      action: 'SUBMIT',
      actor_kind: 'USER',
      actor_user_id: MAKER_ID,
      acting_for_user_id: null,
      new_status: 'PENDING_APPROVAL',
      stage: null,
      reason_code: null,
      reason_text: '',
      occurred_at: '2026-10-04T09:00:00Z',
    },
  ],
  etag: '"body-etag-should-not-be-used"',
  ...over,
});

const REJECT_REASONS: ReasonCode[] = [
  { code: 'VALUATION_MISSING', label: 'Valuation report missing', requires_text: true },
  { code: 'OUT_OF_APPETITE', label: 'Out of appetite', requires_text: false },
];

/** A small stateful backend for the workflow endpoints. */
function workflowBackend(options: {
  queue?: WorkQueueItem[];
  instance?: InstanceView;
  etag?: string;
  reasons?: ReasonCode[];
  act?: (call: FakeCall, state: { etag: string }) => Response | Promise<Response>;
}) {
  const state = { etag: options.etag ?? '"wf-v1"', queue: options.queue ?? [task()], instance: options.instance ?? view() };
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path === '/auth/me') return json(200, CHECKER);
    if (path === '/work-queue') return json(200, { results: state.queue });
    if (path.startsWith('/workflows/reason-codes')) return json(200, { results: options.reasons ?? REJECT_REASONS });
    if (path === `/workflows/instances/${INSTANCE_ID}`) return json(200, state.instance, { ETag: state.etag });
    if (path === `/workflows/instances/${INSTANCE_ID}/actions` && options.act) return options.act(call, state);
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return { ...network, state, actions: () => network.calls.filter((call) => call.url.endsWith('/actions')) };
}

function renderAt(path: string, me: Me = CHECKER) {
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

describe('My Work Queue', () => {
  it('lists only what /work-queue returns, in words, with no identifiers', async () => {
    workflowBackend({});
    renderAt('/my-work');
    const row = await screen.findByRole('row', { name: /Endorsement check/ });
    expect(row).toHaveTextContent('Policy endorsement END0000001');
    expect(row).toHaveTextContent('Policy endorsement approval');
    expect(row).toHaveTextContent('KES 0.00');
    expect(screen.getByText('1 task waiting for you')).toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('says so when nothing is waiting', async () => {
    workflowBackend({ queue: [] });
    renderAt('/my-work');
    expect(await screen.findByText(EMPTY_QUEUE_TEXT)).toBeInTheDocument();
  });

  it('shows a failure with its reference', async () => {
    const network = fakeFetch((call) =>
      call.url.endsWith('/work-queue') ? envelope(500, 'INTERNAL_ERROR', 'an unexpected error occurred', {}, 'corr-q') : json(200, CHECKER),
    );
    vi.stubGlobal('fetch', network.fn);
    renderAt('/my-work');
    const alert = await screen.findByRole('alert', {}, { timeout: 8000 }); // a 5xx is retried twice first
    expect(alert).toHaveTextContent('Your tasks could not be loaded');
    expect(within(alert).getByText('corr-q')).toBeInTheDocument();
  });

  it('refreshes on demand, and a task disappears when the server stops listing it', async () => {
    const user = userEvent.setup();
    const backend = workflowBackend({});
    renderAt('/my-work');
    await screen.findByRole('row', { name: /Endorsement check/ });
    backend.state.queue = [];
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(EMPTY_QUEUE_TEXT)).toBeInTheDocument();
  });

  it('opens the instance from a row', async () => {
    const user = userEvent.setup();
    workflowBackend({});
    const router = renderAt('/my-work');
    await user.click(await screen.findByRole('row', { name: /Endorsement check/ }));
    expect(router.state.location.pathname).toBe(`/my-work/list/${INSTANCE_ID}`);
    expect(await screen.findByRole('heading', { name: 'Policy endorsement END0000001' })).toBeInTheDocument();
  });

  it('is not available without workflow.task.view: no navigation entry, and the route shows the permission state', async () => {
    workflowBackend({});
    renderAt('/my-work', { ...CHECKER, permissions: [] });
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'My Work Queue' })).not.toBeInTheDocument();
  });
});

describe('the instance', () => {
  it('shows status, stage, quorum, readable facts and history, without identifiers or hashes', async () => {
    workflowBackend({});
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    await screen.findByRole('heading', { name: 'Policy endorsement END0000001' });
    expect(screen.getAllByText('Pending approval').length).toBeGreaterThan(0); // status and history
    expect(screen.getByText('0 of 1')).toBeInTheDocument();
    expect(screen.getByText('Change limit')).toBeInTheDocument();
    const history = screen.getByRole('table', { name: 'Workflow history' });
    expect(within(history).getByText('Requester')).toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    expect(mainText()).not.toContain('ab'.repeat(32));
  });

  it('offers decisions only when the caller’s queue holds the current step', async () => {
    workflowBackend({ queue: [] });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    expect(await screen.findByText(/This approval is not in your queue/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('offers no decisions once the instance is no longer pending, and shows the reason text in history', async () => {
    workflowBackend({
      instance: view({
        status: 'VOID',
        step_id: null,
        history: [
          ...view().history,
          {
            action: 'VOID',
            actor_kind: 'SYSTEM',
            actor_user_id: null,
            acting_for_user_id: null,
            new_status: 'VOID',
            stage: 'ENDORSEMENT_CHECK',
            reason_code: 'UNDERLYING_RECORD_INVALID',
            reason_text: 'ENDORSEMENT_BASE_STALE: V1 superseded by V2',
            occurred_at: '2026-10-04T10:00:00Z',
          },
        ],
      }),
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    // FI1-E: a VOID heading with the void's reason from history, the code read as words.
    const heading = await screen.findByText(VOID_HEADING);
    const panel = heading.closest('[data-slot="alert"]') as HTMLElement;
    expect(panel).toHaveTextContent('Endorsement base stale: V1 superseded by V2');
    expect(panel).toHaveTextContent('No decision can be made on it.');
    expect(mainText()).not.toContain('ENDORSEMENT_BASE_STALE');
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('says "not found or not available" for a 404, with no fallback data', async () => {
    const network = fakeFetch((call) =>
      call.url.includes('/workflows/instances/')
        ? envelope(404, 'WORKFLOW_INSTANCE_NOT_FOUND', 'workflow instance not found', {}, 'corr-404')
        : call.url.endsWith('/work-queue')
          ? json(200, { results: [] })
          : json(200, CHECKER),
    );
    vi.stubGlobal('fetch', network.fn);
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    expect(await screen.findByText('Not found or not available to you.')).toBeInTheDocument();
    expect(screen.getByText('corr-404')).toHaveAttribute('data-correlation-id');
  });
});

async function openDecision(name: 'Approve' | 'Reject') {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name }));
  return user;
}

describe('DESIGN-1: the approval as a dialog over My Work', () => {
  it('opens over the queue with Cancel, Reject and Approve at the foot; Escape closes only the topmost dialog', async () => {
    workflowBackend({});
    const router = renderAt(`/my-work/list/${INSTANCE_ID}`);
    const approval = await screen.findByRole('dialog', { name: 'Policy endorsement END0000001' });
    expect(within(approval).getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    const actions = within(approval).getAllByRole('button').map((button) => button.textContent?.trim());
    expect(actions.slice(-3)).toEqual(['Cancel', 'Reject', 'Approve']);

    const user = userEvent.setup();
    await user.click(within(approval).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByRole('dialog', { name: /^Reject/ })).toBeInTheDocument();
    // Only the decision is exposed while it is open; the approval under it is inert.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /^Reject/ })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Policy endorsement END0000001' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/my-work/list/${INSTANCE_ID}`);

    await user.keyboard('{Escape}');
    expect(router.state.location.pathname).toBe('/my-work/list');
  });
});

describe('approving', () => {
  it('sends no comment, the header ETag as If-Match, and an idempotency key; then shows the result', async () => {
    const backend = workflowBackend({
      act: (_call, state) => {
        backend.state.instance = view({ status: 'APPROVED', step_id: null, quorum: null, completed_at: '2026-10-04T10:00:00Z' });
        backend.state.queue = [];
        state.etag = '"wf-v2"';
        return json(200, backend.state.instance, { ETag: '"wf-v2"' });
      },
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Approve');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); // no comment is collected
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));

    expect(await screen.findByText('Approved: Policy endorsement END0000001')).toBeInTheDocument();
    const [action] = backend.actions();
    expect(action.body).toEqual({ action: 'APPROVE', step_id: STEP_1, slot_no: 1 });
    expect(action.headers['if-match']).toBe('"wf-v1"');
    expect(action.headers['x-idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    await waitFor(() => expect(backend.calls.filter((call) => call.url.endsWith('/work-queue')).length).toBeGreaterThan(1));
  });

  it('a stale ETag (412) keeps the dialog, reloads, and the resubmission carries the new ETag and the same key', async () => {
    let attempts = 0;
    const backend = workflowBackend({
      act: (call, state) => {
        attempts += 1;
        if (attempts === 1) {
          state.etag = '"wf-v1b"'; // someone else touched it: same step, new version
          return envelope(412, 'CONCURRENCY_CONFLICT', 'the record changed', { current_etag: '"wf-v1b"' }, 'corr-412');
        }
        return json(200, view({ status: 'APPROVED', step_id: null }), { ETag: '"wf-v2"' });
      },
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Approve');
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));
    expect(await screen.findByText(/This record changed since you opened it/)).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('corr-412')).toHaveAttribute('data-correlation-id');

    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));
    await screen.findByText('Approved: Policy endorsement END0000001');
    const [first, second] = backend.actions();
    expect([first.headers['if-match'], second.headers['if-match']]).toEqual(['"wf-v1"', '"wf-v1b"']);
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
    expect(second.body).toEqual(first.body);
  });

  it('a dropped response is retried with the same key and body, and a replay counts as the result', async () => {
    let attempts = 0;
    const backend = workflowBackend({
      act: () => {
        attempts += 1;
        if (attempts === 1) return Promise.reject(new TypeError('connection reset'));
        return json(200, view({ status: 'APPROVED', step_id: null }), { ETag: '"wf-v2"', 'Idempotency-Replayed': 'true' });
      },
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Approve');
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));
    await screen.findByText('Approved: Policy endorsement END0000001', {}, { timeout: 5000 });
    const [first, second] = backend.actions();
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
    expect(second.body).toEqual(first.body);
  });

  it('someone else acted first (409): the dialog closes, the item is reloaded, and the screen says so', async () => {
    const backend = workflowBackend({
      act: () => {
        backend.state.instance = view({ status: 'APPROVED', step_id: null });
        backend.state.queue = [];
        return envelope(409, 'WORKFLOW_STEP_NOT_CURRENT', 'the step is not current', {}, 'corr-409');
      },
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Approve');
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));
    expect(await screen.findByText('This item changed: someone else acted or it is no longer pending.')).toBeInTheDocument();
    expect(screen.getByText('corr-409')).toHaveAttribute('data-correlation-id');
    // The decision dialog is closed; the approval itself (a dialog over My Work since DESIGN-1) stays open.
    expect(screen.queryByRole('dialog', { name: /^Approve/ })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: `Policy endorsement END0000001` })).toBeInTheDocument();
    expect(await screen.findByText('Approved')).toBeInTheDocument();
  });

  it('a refusal (403) shows the server’s message and reference, and is not retried', async () => {
    const backend = workflowBackend({
      act: () => envelope(403, 'SOD_MAKER_CANNOT_APPROVE', 'the maker cannot approve their own request', {}, 'corr-sod'),
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Approve');
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The maker cannot approve their own request.');
    expect(within(alert).getByText('corr-sod')).toBeInTheDocument();
    expect(backend.actions()).toHaveLength(1);
  });
});

describe('rejecting', () => {
  it('needs a reason from the endpoint, and the text when the reason requires it; then sends both', async () => {
    const backend = workflowBackend({
      act: () => json(200, view({ status: 'REJECTED', step_id: null }), { ETag: '"wf-v2"' }),
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Reject');
    const select = await screen.findByLabelText(/Reason/);
    expect(within(select as HTMLElement).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Select a reason…',
      'Valuation report missing',
      'Out of appetite',
    ]);

    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(screen.getByText('Choose a reason.')).toBeInTheDocument();
    await user.selectOptions(select, 'VALUATION_MISSING');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(screen.getByText('This reason needs an explanation.')).toBeInTheDocument();
    expect(backend.actions()).toHaveLength(0);

    await user.type(screen.getByLabelText(/Explanation/), 'The valuation report is missing.');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await screen.findByText('Rejected: Policy endorsement END0000001');
    expect(backend.actions()[0].body).toEqual({
      action: 'REJECT',
      step_id: STEP_1,
      slot_no: 1,
      reason_code: 'VALUATION_MISSING',
      reason_text: 'The valuation report is missing.',
    });
  });

  it('is unavailable, and says why, when the tenant has no rejection reasons', async () => {
    workflowBackend({ reasons: [] });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    await openDecision('Reject');
    expect(await screen.findByText(NO_REJECTION_REASONS)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled();
  });

  it('shows the backend’s reason complaint (422) on the field and keeps the dialog', async () => {
    workflowBackend({
      act: () => envelope(422, 'WORKFLOW_REASON_REQUIRED', 'reason text is required for this reason code', {}, 'corr-422'),
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Reject');
    await user.selectOptions(await screen.findByLabelText(/Reason/), 'OUT_OF_APPETITE');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(await screen.findByText('Reason text is required for this reason code.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('corr-422')).toHaveAttribute('data-correlation-id');
  });

  it('a changed decision after a refusal is a new command with a new key', async () => {
    const backend = workflowBackend({
      act: (call) =>
        (call.body as { reason_code?: string }).reason_code === 'OUT_OF_APPETITE'
          ? envelope(422, 'WORKFLOW_REASON_REQUIRED', 'needs text')
          : json(200, view({ status: 'REJECTED', step_id: null }), { ETag: '"wf-v2"' }),
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Reject');
    const select = await screen.findByLabelText(/Reason/);
    await user.selectOptions(select, 'OUT_OF_APPETITE');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await screen.findByText('Needs text.');
    await user.selectOptions(select, 'VALUATION_MISSING');
    await user.type(screen.getByLabelText(/Explanation/), 'Missing valuation.');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await screen.findByText('Rejected: Policy endorsement END0000001');
    const [first, second] = backend.actions();
    expect(second.headers['x-idempotency-key']).not.toBe(first.headers['x-idempotency-key']);
  });

  it('does not lose typed text on a backdrop click', async () => {
    workflowBackend({});
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Reject');
    await user.type(await screen.findByLabelText(/Explanation/), 'Work in progress');
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('dialog').parentElement! });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Explanation/)).toHaveValue('Work in progress');
  });
});

describe('a reload that moves the step while the dialog is open', () => {
  it('blocks the confirm and says the item changed', async () => {
    let attempts = 0;
    const backend = workflowBackend({
      act: (_call, state) => {
        attempts += 1;
        state.etag = '"wf-v3"';
        backend.state.instance = view({ step_id: STEP_2, stage_label: 'Second check' });
        backend.state.queue = [];
        return envelope(412, 'CONCURRENCY_CONFLICT', 'the record changed');
      },
    });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const user = await openDecision('Approve');
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm approval' })).toBeDisabled());
    expect(within(screen.getByRole('dialog')).getByText(/This item changed/)).toBeInTheDocument();
    expect(attempts).toBe(1);
  });
});

describe('RUP1-F1: the checker sees what they decide', () => {
  /** The pilot's example: version 6, Windscreen 80,000 to 100,000, with the maker's reason (POLICY_ENDORSEMENT_APPROVAL/2). */
  const v2Facts = (over: Record<string, unknown> = {}) => ({
    ...view().approval_facts,
    endorsement_type: 'CHANGE_LIMIT',
    policy_no: 'POL0000001',
    base_version_no: 6,
    effective_date: '2026-10-05',
    benefit: 'WINDSCREEN',
    benefit_name: 'Windscreen',
    previous_limit_amount: '80000.00',
    new_limit_amount: '100000.00',
    request_reason: 'Customer requested increased windscreen cover',
    transaction_currency: 'KES',
    ...over,
  });

  it('My Work tells two pending limit changes apart before either is opened', async () => {
    const second = '12121212-1212-4121-8121-121212121212';
    workflowBackend({
      queue: [
        task({ approval_facts: v2Facts() }),
        task({
          assignment_id: '13131313-1313-4131-8131-131313131313',
          workflow_instance_id: second,
          resource_reference: 'END0000002',
          approval_facts: v2Facts({ benefit: 'RADIO', benefit_name: 'Radio cassette', previous_limit_amount: '30000.00', new_limit_amount: '40000.00' }),
        }),
      ],
    });
    renderAt('/my-work');
    expect(await screen.findByRole('row', { name: /END0000001/ })).toHaveTextContent('Windscreen: KES 80,000.00 → KES 100,000.00');
    expect(screen.getByRole('row', { name: /END0000002/ })).toHaveTextContent('Radio cassette: KES 30,000.00 → KES 40,000.00');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    expect(mainText()).not.toContain('WINDSCREEN');
  });

  it('the approval page shows the requested change before Approve and Reject, in words', async () => {
    workflowBackend({ instance: view({ approval_facts: v2Facts() }) });
    renderAt(`/my-work/list/${INSTANCE_ID}`);
    const change = await screen.findByLabelText('Requested change');
    const text = change.textContent ?? '';
    for (const expected of [
      'TypeChange limit',
      'PolicyPOL0000001',
      'Base versionVersion 6',
      'BenefitWindscreen',
      'Current limitKES 80,000.00',
      'New limitKES 100,000.00',
      'Effective from05 Oct 2026',
      "Maker's reasonCustomer requested increased windscreen cover",
    ]) {
      expect(text).toContain(expected);
    }
    // The decision facts are not repeated raw among the other facts.
    const others = screen.getByLabelText('Other approval facts').textContent ?? '';
    expect(others).not.toContain('100000.00');
    expect(others).not.toContain('WINDSCREEN');
    expect(others).not.toContain('Request reason');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('an older approval (version 1 facts) still renders, without a change line', async () => {
    workflowBackend({ queue: [task({ approval_facts: view().approval_facts })] });
    renderAt('/my-work');
    const row = await screen.findByRole('row', { name: /END0000001/ });
    expect(row).not.toHaveTextContent('→');
    expect(row).toHaveTextContent('Policy endorsement END0000001');
  });
});
