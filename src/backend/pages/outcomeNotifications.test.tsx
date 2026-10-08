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
import { QUEUE_POLL_MS } from '../workflow/queries';
import { NOTIFICATION_KEYS, type MyNotifications, type NotificationSettings, type OutcomeNotification } from '../workflow/notifications';

const INSTANCE = '33333333-3333-4333-8333-333333333333';
const BRANCH = { id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'OWN' };

const person = (permissions: string[]): Me => ({
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'maker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions,
  branches: [BRANCH],
});
const MAKER = person(['policies.policy.view']);
const ADMIN = person(['admin.workflow.view', 'admin.workflow.manage']);
const VIEWER = person(['admin.workflow.view']);

const outcome = (over: Partial<OutcomeNotification> = {}): OutcomeNotification => ({
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  event: 'APPROVED',
  occurred_at: '2026-10-08T10:00:00+00:00',
  workflow_instance_id: INSTANCE,
  definition_name: 'Policy endorsement approval',
  resource_type: 'POLICY_ENDORSEMENT',
  resource_reference: 'END0000042',
  reason_code: null,
  reason_label: null,
  reason_text: null,
  unread: true,
  ...over,
});

const SETTINGS = (over: Partial<Record<'APPROVED' | 'REJECTED' | 'VOIDED', boolean>> = {}): NotificationSettings => ({
  results: (['APPROVED', 'REJECTED', 'VOIDED'] as const).map((event) => ({ event, in_app: over[event] ?? true, updated_at: '2026-10-08T00:00:00Z' })),
  etag: '"workflow-notifications-body"',
});

function backend(options: { mine?: MyNotifications; settingsEtags?: string[]; patch?: (call: FakeCall) => Response } = {}) {
  const state = { mine: options.mine ?? { results: [], unread_count: 0, seen_until: null }, settingsReads: 0 };
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path === '/workflows/my-notifications') return json(200, state.mine);
    if (path === '/workflows/my-notifications/seen') {
      const until = (call.body as { until: string }).until;
      state.mine = { ...state.mine, seen_until: until, unread_count: 0, results: state.mine.results.map((n) => ({ ...n, unread: false })) };
      return json(200, state.mine);
    }
    if (path === '/workflows/notification-settings' && call.method === 'GET') {
      const etags = options.settingsEtags ?? ['"workflow-notifications-a"'];
      const etag = etags[Math.min(state.settingsReads, etags.length - 1)];
      state.settingsReads += 1;
      return json(200, SETTINGS(), { ETag: etag });
    }
    if (path === '/workflows/notification-settings') return options.patch?.(call) ?? json(200, SETTINGS({ REJECTED: false }), { ETag: '"workflow-notifications-b"' });
    if (path === '/work-queue') return json(200, { results: [] });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  return { ...network, state, seen: () => network.calls.filter((c) => c.url.endsWith('/seen')) };
}

function renderAt(path: string, me: Me) {
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
  window.sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Outcome notifications (NTF-2)', () => {
  it('tells the requester an approval ended, in words, then marks it seen up to that outcome', async () => {
    const network = backend({ mine: { results: [outcome()], unread_count: 1, seen_until: null } });
    renderAt('/', MAKER);
    const toast = await screen.findByText('Your endorsement END0000042 was approved.');
    expect(toast.closest('[role="status"]')).toHaveTextContent('Approved');
    expect(within(toast.closest('[role="status"]') as HTMLElement).queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
    await waitFor(() => expect(network.seen()).toHaveLength(1));
    expect(network.seen()[0].body).toEqual({ until: '2026-10-08T10:00:00+00:00' });
    expect(network.seen()[0].headers['x-idempotency-key']).toBeTruthy();
  });

  it('gives a rejection its reason, and announces an outcome that arrives at the next refresh, once', async () => {
    const network = backend();
    renderAt('/', MAKER);
    await screen.findByRole('heading', { name: 'Home' });
    await waitFor(() => expect(queryClient.getQueryData(NOTIFICATION_KEYS.mine)).toBeTruthy());
    expect(network.seen()).toHaveLength(0);
    network.state.mine = {
      results: [outcome({ event: 'REJECTED', reason_label: 'Valuation report missing', reason_text: 'Need the report.' })],
      unread_count: 1, seen_until: null,
    };
    await queryClient.refetchQueries({ queryKey: NOTIFICATION_KEYS.mine });
    expect(await screen.findByText('Your endorsement END0000042 was rejected: Valuation report missing. Open it to review the reason.')).toBeInTheDocument();
    await waitFor(() => expect(network.seen()).toHaveLength(1));
    await queryClient.refetchQueries({ queryKey: NOTIFICATION_KEYS.mine });
    expect(network.seen()).toHaveLength(1);                                       // seen: never announced again
  });

  it('sums up several unread outcomes in one notice, and lets an approver open the approval', async () => {
    backend({
      mine: {
        results: [outcome({ id: 'b', event: 'VOIDED', resource_reference: 'END0000043', reason_text: 'the policy changed' }), outcome()],
        unread_count: 2, seen_until: null,
      },
    });
    renderAt('/', { ...MAKER, permissions: ['workflow.task.view'] });
    const toast = await screen.findByText('2 approval outcomes');
    expect(toast.closest('[role="status"]')).toHaveTextContent('Latest: Approval for END0000043 was cancelled: the policy changed.');
  });

  it('polls every minute while the window is visible, for everyone signed in', async () => {
    backend();
    renderAt('/', MAKER);
    await waitFor(() => expect(queryClient.getQueryData(NOTIFICATION_KEYS.mine)).toBeTruthy());
    const query = queryClient.getQueryCache().find({ queryKey: NOTIFICATION_KEYS.mine })!;
    const polling = query.observers.filter((o) => o.options.refetchInterval);
    expect(polling.map((o) => o.options.refetchInterval)).toEqual([QUEUE_POLL_MS]);
    expect(polling[0].options.refetchIntervalInBackground).toBe(false);
  });
});

describe('Approval notifications setup (NTF-2)', () => {
  it("changes only what was changed, with the server's ETag; a 412 reloads it and keeps the choice", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const network = backend({
      settingsEtags: ['"workflow-notifications-a"', '"workflow-notifications-c"'],
      patch: () => {
        calls += 1;
        return calls === 1
          ? envelope(412, 'CONCURRENCY_CONFLICT', 'the notification settings was changed by someone else; refresh it')
          : json(200, SETTINGS({ REJECTED: false }), { ETag: '"workflow-notifications-d"' });
      },
    });
    renderAt('/approval-notifications', ADMIN);
    const rejected = await screen.findByRole('checkbox', { name: /Rejected/ });
    expect(rejected).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(rejected);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(STALE_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Rejected/ })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Notification settings saved')).toBeInTheDocument();
    const [stale, again] = network.calls.filter((c) => c.method === 'PATCH');
    expect(stale.body).toEqual({ events: { REJECTED: false } });
    expect(stale.headers['if-match']).toBe('"workflow-notifications-a"');
    expect(again.headers['if-match']).toBe('"workflow-notifications-c"');
    expect(again.headers['x-idempotency-key']).toBe(stale.headers['x-idempotency-key']);
  });

  it('is read-only for a viewer, and in Setup only for workflow administrators', async () => {
    backend();
    renderAt('/approval-notifications', VIEWER);
    expect(await screen.findByRole('checkbox', { name: /Approved/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByText('A tenant-wide workflow administrator changes these.')).toBeInTheDocument();
    const setup = (permissions: string[]) => visibleNav(BACKEND_NAV, permissions).find((group) => group.id === 'setup');
    expect(setup(['admin.workflow.view'])?.items.map((item) => item.label)).toEqual(['Approval notifications']);
    expect(setup(['policies.policy.view'])).toBeUndefined();
  });
});
