import React from 'react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, FakeCall, fakeFetch, json } from '../../test/fetchFake';
import { detail, ENDORSEMENT_ID, MAKER, POLICY_ETAG, POLICY_ID, summary, V1, version } from '../../test/policyFixtures';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { describeError } from '../../lib/api/errorText';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { useBranchStore } from '../../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { setAccessToken } from '../../lib/auth/tokens';
import { queryClient } from '../../lib/query/queryClient';
import { backendRoutes } from '../BackendApp';
import type { EndorsementDetail, EndorsementSummary } from '../endorsements/types';
import { NO_ENDORSEMENTS_TEXT } from '../endorsements/PolicyEndorsementsTab';
import { NO_ETAG_TEXT } from '../endorsements/useEndorsementCommands';
import { requiredActionText } from '../workflow/format';
import { NO_LONGER_ACTIONABLE, SENT_FOR_APPROVAL } from './EndorsementPage';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const INSTANCE_ID = '33333333-3333-4333-8333-333333333333';
const ENDORSEMENT_ETAG = (row: number) => `"endorsement-${ENDORSEMENT_ID}-v${row}"`;
const REQUIRED_ACTION = 'Withdraw this endorsement and prepare it again from the current policy version.';

const PREPARER: Me = { ...MAKER, permissions: ['policies.policy.view', 'policies.endorsement.create'] };

/** V3, the latest version, takes effect later than V2 (in force today) and adds a benefit. */
const V3 = version({ version_no: 3, effective_from: '2026-11-01' });
V3.cover = {
  ...V3.cover,
  benefits: [
    ...V3.cover.benefits,
    {
      code: 'ROADSIDE',
      name: 'Roadside assistance',
      section: 'OWN_DAMAGE',
      description: '',
      limit_amount: '20000.00',
      limit_description: '',
      is_optional: false,
    },
  ],
};

const endorsementSummary = (over: Partial<EndorsementSummary> = {}): EndorsementSummary => ({
  id: ENDORSEMENT_ID,
  endorsement_no: 'END0000001',
  endorsement_type: 'CHANGE_LIMIT',
  status: 'DRAFT',
  effective_date: '2026-11-15',
  premium_delta: '0.00',
  levy_delta: '0.00',
  ...over,
});

const endorsement = (over: Partial<EndorsementDetail> = {}): EndorsementDetail => {
  const resulting = version({ version_no: 3 });
  resulting.cover = {
    ...resulting.cover,
    benefits: resulting.cover.benefits.map((benefit) =>
      benefit.code === 'WINDSCREEN' ? { ...benefit, limit_amount: '100000.00' } : benefit,
    ),
  };
  return {
    ...endorsementSummary(),
    policy: { id: POLICY_ID, policy_no: 'POL0000001' },
    base_version_no: 3,
    reason: 'Customer asked for a higher windscreen limit',
    requested_changes: { benefit: 'WINDSCREEN', limit_amount: '100000.00' },
    resulting_terms: {
      risk: resulting.risk,
      cover: resulting.cover,
      terms: resulting.terms,
      sum_insured: '2500000.00',
      expiry_date: '2026-12-31',
      terminated: false,
    },
    rerated: false,
    old_annual: { basic_premium: '50000.00', levies_total: '2000.00', total_premium: '52000.00' },
    new_annual: { basic_premium: '50000.00', levies_total: '2000.00', total_premium: '52000.00' },
    financial: { currency: 'KES', premium_delta: '0.00', levy_delta: '0.00', total_delta: '0.00' },
    requires_check: true,
    submitted_at: null,
    approved_at: null,
    decision_reason: '',
    decided_at: null,
    resulting_version_no: null,
    workflow: null,
    blocker: null,
    row_version: 1,
    ...over,
  };
};

const pending = (over: Partial<EndorsementDetail> = {}) =>
  endorsement({
    status: 'REFERRED',
    submitted_at: '2026-10-04T09:00:00Z',
    workflow: {
      instance_id: INSTANCE_ID,
      definition_code: 'POLICY_ENDORSEMENT_APPROVAL',
      status: 'PENDING_APPROVAL',
      stage: 'ENDORSEMENT_CHECK',
      lock_version: 1,
    },
    ...over,
  });

const blocked = (over: Partial<EndorsementDetail> = {}) =>
  pending({
    workflow: { instance_id: INSTANCE_ID, definition_code: 'POLICY_ENDORSEMENT_APPROVAL', status: 'VOID', stage: null, lock_version: 2 },
    blocker: {
      code: 'ENDORSEMENT_BASE_STALE',
      message: 'This endorsement can no longer be approved because policy version V3 has been superseded by V4.',
      approved_base_version: 3,
      current_version: 4,
      required_action: REQUIRED_ACTION,
    },
    ...over,
  });

interface State {
  policyEtag: string | null;
  endorsement: EndorsementDetail;
  row: number;
  list: EndorsementSummary[];
}

type Handler = (call: FakeCall, state: State) => Response | Promise<Response>;

function endorsementBackend(options: {
  endorsement?: EndorsementDetail;
  list?: EndorsementSummary[];
  policy?: () => Response;
  create?: Handler;
  submit?: Handler;
  cancel?: Handler;
  me?: Me;
} = {}) {
  const state: State = {
    policyEtag: POLICY_ETAG,
    endorsement: options.endorsement ?? endorsement(),
    row: 1,
    list: options.list ?? [endorsementSummary()],
  };
  const network = fakeFetch((call) => {
    const path = call.url.replace('/api/v1', '');
    if (path === '/auth/me') return json(200, options.me ?? PREPARER);
    if (path.startsWith('/policies?')) return json(200, { results: [summary()], count: 60, page: 2, page_size: 25 });
    if (path === `/policies/${POLICY_ID}`) {
      if (options.policy) return options.policy();
      return json(200, detail(), state.policyEtag ? { ETag: state.policyEtag } : {});
    }
    if (path === `/policies/${POLICY_ID}/versions`) return json(200, { policy_no: 'POL0000001', results: [V1, version(), V3] });
    if (path === `/policies/${POLICY_ID}/endorsements` && call.method === 'GET') {
      return json(200, { policy_no: 'POL0000001', results: state.list });
    }
    if (path === `/policies/${POLICY_ID}/endorsements` && call.method === 'POST' && options.create) return options.create(call, state);
    if (path === `/endorsements/${ENDORSEMENT_ID}` && call.method === 'GET') {
      return json(200, state.endorsement, { ETag: ENDORSEMENT_ETAG(state.row) });
    }
    if (path === `/endorsements/${ENDORSEMENT_ID}/submit` && options.submit) return options.submit(call, state);
    if (path === `/endorsements/${ENDORSEMENT_ID}/cancel` && options.cancel) return options.cancel(call, state);
    if (path === '/work-queue') return json(200, { results: [] });
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', network.fn);
  const posts = (suffix: string) => network.calls.filter((call) => call.method === 'POST' && call.url.endsWith(suffix));
  return { ...network, state, posts };
}

/** The endorsement after a command: stored, with a new row version and ETag, as the backend does. */
const answer = (state: State, next: EndorsementDetail, status = 200) => {
  state.row += 1;
  state.endorsement = { ...next, row_version: state.row };
  return json(status, state.endorsement, { ETag: ENDORSEMENT_ETAG(state.row) });
};

function renderAt(path: string, me: Me = PREPARER) {
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
const ENDORSEMENT_PATH = `/policies/${POLICY_ID}/endorsements/${ENDORSEMENT_ID}`;
const NEW_PATH = `/policies/${POLICY_ID}/endorsements/new`;
// RUP1 F-11: the app links by business number; addresses with IDs still open.
const READABLE_POLICY_PATH = '/policies/POL0000001';
const READABLE_ENDORSEMENT_PATH = '/policies/POL0000001/endorsements/END0000001';

async function fillChangeLimit(user: ReturnType<typeof userEvent.setup>, overrides: { limit?: string; date?: string } = {}) {
  await user.selectOptions(await screen.findByLabelText(/Benefit/), 'WINDSCREEN');
  await user.type(screen.getByLabelText(/New limit/), overrides.limit ?? '100000');
  const date = screen.getByLabelText(/Effective from/);
  await user.clear(date);
  await user.type(date, overrides.date ?? '2026-11-15');
  await user.type(screen.getByLabelText(/Reason/), 'Customer asked for a higher windscreen limit');
}

beforeEach(() => {
  queryClient.clear();
  useBranchStore.getState().reset();
});

afterEach(() => vi.unstubAllGlobals());

describe('the Endorsements tab', () => {
  it('lists GET /policies/{id}/endorsements and opens one', async () => {
    const user = userEvent.setup();
    const backend = endorsementBackend({ list: [endorsementSummary({ status: 'REFERRED', premium_delta: '1250.00' })] });
    const router = renderAt(`/policies/${POLICY_ID}?tab=endorsements`);
    const row = await screen.findByRole('row', { name: /END0000001/ });
    expect(row).toHaveTextContent('Change limit');
    expect(row).toHaveTextContent('15 Nov 2026');
    expect(row).toHaveTextContent('+ KES 1,250.00');
    expect(row).toHaveTextContent('Referred');
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
    expect(backend.calls.some((call) => call.url.endsWith(`/policies/${POLICY_ID}/endorsements`))).toBe(true);

    await user.click(row);
    expect(router.state.location.pathname).toBe(READABLE_ENDORSEMENT_PATH);
    expect(await screen.findByRole('heading', { name: 'END0000001' })).toBeInTheDocument();
  });

  it('says so when there are none', async () => {
    endorsementBackend({ list: [] });
    renderAt(`/policies/${POLICY_ID}?tab=endorsements`);
    expect(await screen.findByText(NO_ENDORSEMENTS_TEXT)).toBeInTheDocument();
  });

  it('offers "New endorsement" only with policies.endorsement.create, on a bound policy', async () => {
    endorsementBackend({ me: MAKER });
    renderAt(`/policies/${POLICY_ID}?tab=endorsements`, MAKER);
    await screen.findByRole('row', { name: /END0000001/ });
    expect(screen.queryByRole('button', { name: 'New endorsement' })).not.toBeInTheDocument();
  });

  it('does not offer it on a cancelled policy', async () => {
    endorsementBackend({
      policy: () => json(200, detail({ lifecycle_status: 'CANCELLED', coverage_status: 'CANCELLED' }), { ETag: POLICY_ETAG }),
    });
    renderAt(`/policies/${POLICY_ID}?tab=endorsements`);
    await screen.findByRole('row', { name: /END0000001/ });
    expect(screen.queryByRole('button', { name: 'New endorsement' })).not.toBeInTheDocument();
  });
});

describe('RUP1 F-11: readable addresses', () => {
  it('opens an endorsement from its policy and endorsement numbers', async () => {
    const backend = endorsementBackend();
    renderAt(READABLE_ENDORSEMENT_PATH);
    expect(await screen.findByRole('heading', { name: 'END0000001' })).toBeInTheDocument();
    const urls = backend.calls.map((call) => call.url.replace('/api/v1', ''));
    expect(urls).toContain('/policies?q=POL0000001&page=1&page_size=5');
    expect(urls).toContain(`/policies/${POLICY_ID}/endorsements`);
    expect(urls).toContain(`/endorsements/${ENDORSEMENT_ID}`);
    expect(mainText()).not.toMatch(UUID_IN_TEXT);
  });

  it('a number the user cannot see is "not found", and nothing else is loaded', async () => {
    const backend = endorsementBackend();
    renderAt('/policies/POL9999999/endorsements/END0000001');
    expect(await screen.findByText('The policy does not exist, or it is outside the branches you can see.')).toBeInTheDocument();
    const urls = backend.calls.map((call) => call.url.replace('/api/v1', ''));
    expect(urls.filter((url) => url.startsWith(`/policies/${POLICY_ID}`) || url.startsWith('/endorsements/'))).toEqual([]);
  });

  it('an endorsement number not on the policy is "not found"', async () => {
    endorsementBackend();
    renderAt('/policies/POL0000001/endorsements/END0009999');
    expect(
      await screen.findByText('The endorsement does not exist on this policy, or it is not one you can see.'),
    ).toBeInTheDocument();
  });

  it('an old address with IDs still opens the same endorsement', async () => {
    endorsementBackend();
    renderAt(ENDORSEMENT_PATH);
    expect(await screen.findByRole('heading', { name: 'END0000001' })).toBeInTheDocument();
  });
});

describe('creating a change-limit endorsement', () => {
  const created = (call: FakeCall, state: State) =>
    answer(state, endorsement({ requested_changes: (call.body as { changes: Record<string, unknown> }).changes }), 201);

  it('offers the benefits of the latest version, with their current limits', async () => {
    const user = userEvent.setup();
    endorsementBackend();
    renderAt(NEW_PATH);
    expect(await screen.findByText(/prepared on version 3/)).toBeInTheDocument();
    const options = within(screen.getByLabelText(/Benefit/)).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Select a benefit…', 'Windscreen cover', 'Courtesy car', 'Roadside assistance']);
    await user.selectOptions(screen.getByLabelText(/Benefit/), 'WINDSCREEN');
    expect(screen.getByText(/Current limit: KES 75,000.00 \(Per occurrence\)/)).toBeInTheDocument();
  });

  it('DESIGN-1: opens as an expandable dialog over the policy, with a preview of what the checker will see', async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem('hz-dialog-expanded');
    endorsementBackend();
    const router = renderAt(NEW_PATH);
    await screen.findByText(/prepared on version 3/);
    const dialog = screen.getByRole('dialog', { name: 'New endorsement' });
    expect(within(dialog).getByText(/prepared on version 3/)).toBeInTheDocument();
    expect(within(dialog).getByText('Choose a benefit and give the new limit to see the change.')).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/Benefit/), 'WINDSCREEN');
    await user.type(within(dialog).getByLabelText(/New limit/), '100000');
    const preview = within(dialog).getByRole('region', { name: 'Preview of the change' });
    expect(preview).toHaveTextContent('Windscreen cover:KES 75,000.00KES 100,000.00');

    const expand = within(dialog).getByRole('button', { name: 'Expand' });
    expect(expand).toHaveAttribute('aria-pressed', 'false');
    await user.click(expand);
    expect(within(dialog).getByRole('button', { name: 'Restore size' })).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('hz-dialog-expanded')).toBe('1');
    await user.click(within(dialog).getByRole('button', { name: 'Restore size' }));
    window.localStorage.removeItem('hz-dialog-expanded');

    // Something is typed, so a stray click on the backdrop keeps the form; Escape still closes it.
    await user.click(dialog.parentElement!);
    expect(screen.getByRole('dialog', { name: 'New endorsement' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(router.state.location.pathname).toBe(`/policies/${POLICY_ID}`);
  });

  it('checks the form before sending anything', async () => {
    const user = userEvent.setup();
    const backend = endorsementBackend({ create: created });
    renderAt(NEW_PATH);
    await screen.findByLabelText(/Benefit/);
    await user.clear(screen.getByLabelText(/Effective from/));
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    for (const message of [
      'Choose the benefit whose limit changes.',
      'Give the new limit as a positive amount.',
      'Give the date the change takes effect.',
      'Give the reason for the change.',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    await user.type(screen.getByLabelText(/New limit/), '0');
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    expect(screen.getByText('The new limit must be more than zero.')).toBeInTheDocument();
    expect(backend.posts('/endorsements')).toHaveLength(0);
  });

  it('RUP1 F-8: accepts a limit typed with thousands separators and sends plain digits', async () => {
    const user = userEvent.setup();
    const backend = endorsementBackend({ create: created });
    renderAt(NEW_PATH);
    await screen.findByLabelText(/Benefit/);
    await user.type(screen.getByLabelText(/New limit/), '55,00');
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    expect(screen.getByText('Put commas only between groups of three digits, for example 55,000.')).toBeInTheDocument();
    await fillChangeLimit(user);
    await user.clear(screen.getByLabelText(/New limit/));
    await user.type(screen.getByLabelText(/New limit/), '55,000');
    expect(screen.getByRole('region', { name: 'Preview of the change' })).toHaveTextContent('KES 55,000.00');
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    await screen.findByRole('heading', { name: 'END0000001' });
    const [post] = backend.posts(`/policies/${POLICY_ID}/endorsements`);
    expect((post.body as { changes: { limit_amount: string } }).changes.limit_amount).toBe('55000');
  });

  it("creates it with the policy's header ETag and a key, then opens it", async () => {
    const user = userEvent.setup();
    const backend = endorsementBackend({ create: created });
    const router = renderAt(NEW_PATH);
    await fillChangeLimit(user);
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));

    expect(await screen.findByRole('heading', { name: 'END0000001' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(READABLE_ENDORSEMENT_PATH);
    const [post] = backend.posts(`/policies/${POLICY_ID}/endorsements`);
    expect(post.headers['if-match']).toBe(POLICY_ETAG);
    expect(post.headers['x-idempotency-key']).toMatch(UUID_IN_TEXT);
    expect(post.body).toEqual({
      endorsement_type: 'CHANGE_LIMIT',
      effective_date: '2026-11-15',
      reason: 'Customer asked for a higher windscreen limit',
      changes: { benefit: 'WINDSCREEN', limit_amount: '100000' },
    });
    // Replaced, so Back from the endorsement does not return to a filled form.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('after a 412 reloads the policy, keeps what was typed, and resends with the new ETag and the same key', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = endorsementBackend({
      create: (call, state) => {
        attempts += 1;
        if (attempts === 1) {
          state.policyEtag = `"policy-${POLICY_ID}-v4"`;
          return envelope(412, 'CONCURRENCY_CONFLICT', 'the policy changed', {}, 'corr-412');
        }
        return created(call, state);
      },
    });
    renderAt(NEW_PATH);
    await fillChangeLimit(user);
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent(STALE_TEXT);
    expect(notice).toHaveTextContent('Reference corr-412');
    expect(screen.getByLabelText(/New limit/)).toHaveValue('100000');
    expect(screen.getByLabelText(/Reason/)).toHaveValue('Customer asked for a higher windscreen limit');

    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    await screen.findByRole('heading', { name: 'END0000001' });
    const [first, second] = backend.posts(`/policies/${POLICY_ID}/endorsements`);
    expect(first.headers['if-match']).toBe(POLICY_ETAG);
    expect(second.headers['if-match']).toBe(`"policy-${POLICY_ID}-v4"`);
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
    expect(second.body).toEqual(first.body);
  });

  it('shows a 422 on its field with the Reference; a corrected command gets a new key', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = endorsementBackend({
      create: (call, state) => {
        attempts += 1;
        if (attempts === 1) {
          return envelope(422, 'EFFECTIVE_DATE_INVALID', 'the endorsement takes effect from 2026-11-01 to 2026-12-31',
            { field: 'effective_date' }, 'corr-422');
        }
        return created(call, state);
      },
    });
    renderAt(NEW_PATH);
    await fillChangeLimit(user, { date: '2027-02-01' });
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));

    expect(await screen.findByText('The endorsement takes effect from 2026-11-01 to 2026-12-31.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Effective from/)).toHaveAttribute('aria-invalid', 'true');
    expect(mainText()).toContain('Reference corr-422');

    const date = screen.getByLabelText(/Effective from/);
    await user.clear(date);
    await user.type(date, '2026-11-15');
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    await screen.findByRole('heading', { name: 'END0000001' });
    const [first, second] = backend.posts(`/policies/${POLICY_ID}/endorsements`);
    expect(second.headers['x-idempotency-key']).not.toBe(first.headers['x-idempotency-key']);
  });

  it('shows a business refusal with its message, required action and Reference', async () => {
    const user = userEvent.setup();
    endorsementBackend({
      create: () => envelope(409, 'POLICY_TERMINATED', 'the policy is cancelled; it cannot be endorsed', {}, 'corr-409'),
    });
    renderAt(NEW_PATH);
    await fillChangeLimit(user);
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The endorsement was not created');
    expect(alert).toHaveTextContent('The policy is cancelled; it cannot be endorsed.');
    expect(alert).toHaveTextContent('Reference corr-409');
  });

  it('after a dropped response retries with the same key and body, and takes the replay', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = endorsementBackend({
      create: (call, state) => {
        attempts += 1;
        if (attempts === 1) throw new TypeError('Failed to fetch');
        const response = created(call, state);
        response.headers.set('Idempotency-Replayed', 'true');
        return response;
      },
    });
    renderAt(NEW_PATH);
    await fillChangeLimit(user);
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    expect(await screen.findByRole('heading', { name: 'END0000001' }, { timeout: 4000 })).toBeInTheDocument();
    const [first, second] = backend.posts(`/policies/${POLICY_ID}/endorsements`);
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
    expect(second.body).toEqual(first.body);
  });

  it('sends nothing without the policy ETag header', async () => {
    const user = userEvent.setup();
    const backend = endorsementBackend({ create: created });
    backend.state.policyEtag = null;
    renderAt(NEW_PATH);
    await fillChangeLimit(user);
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    expect(await screen.findByText(NO_ETAG_TEXT)).toBeInTheDocument();
    expect(backend.posts(`/policies/${POLICY_ID}/endorsements`)).toHaveLength(0);
  });

  it('is not available without policies.endorsement.create', async () => {
    const backend = endorsementBackend({ me: MAKER, create: created });
    renderAt(NEW_PATH, MAKER);
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
    expect(backend.posts('/endorsements')).toHaveLength(0);
  });
});

describe('the endorsement', () => {
  it('shows the type, base version, requested change, resulting terms and deltas, with no identifiers', async () => {
    endorsementBackend({
      endorsement: endorsement({
        financial: { currency: 'KES', premium_delta: '1250.00', levy_delta: '50.00', total_delta: '1300.00' },
      }),
    });
    renderAt(ENDORSEMENT_PATH);
    await screen.findByRole('heading', { name: 'END0000001' });
    const text = mainText();
    for (const expected of [
      'Change limit · Policy POL0000001',
      'Version 3',
      '15 Nov 2026',
      'Customer asked for a higher windscreen limit',
      'BenefitWindscreen cover',
      'New limitKES 100,000.00',
      'Premium change+ KES 1,250.00',
      'Levy change+ KES 50.00',
      'Total change+ KES 1,300.00',
      'This change needs approval: submitting sends it for approval.',
    ]) {
      expect(text).toContain(expected);
    }
    expect(within(screen.getByRole('table', { name: 'Resulting benefits and limits' })).getByRole('row', { name: /Windscreen cover/ }))
      .toHaveTextContent('KES 100,000.00');
    expect(text).not.toMatch(UUID_IN_TEXT);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve|Decline|Reject/ })).not.toBeInTheDocument();
  });

  it('submits with its own ETag and a key; when governed it shows "Sent for approval" with the stage', async () => {
    const user = userEvent.setup();
    const backend = endorsementBackend({ submit: (_call, state) => answer(state, pending()) });
    renderAt(ENDORSEMENT_PATH);
    await user.click(await screen.findByRole('button', { name: 'Submit' }));

    expect(await screen.findByText(SENT_FOR_APPROVAL)).toBeInTheDocument();
    expect(mainText()).toContain('Waiting at the Endorsement check stage');
    const [post] = backend.posts('/submit');
    expect(post.headers['if-match']).toBe(ENDORSEMENT_ETAG(1));
    expect(post.headers['x-idempotency-key']).toMatch(UUID_IN_TEXT);
    expect(post.body).toEqual({});
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve|Decline|Reject/ })).not.toBeInTheDocument();
  });

  it('after approval shows it effective, with the resulting version and the new limit', async () => {
    endorsementBackend({
      endorsement: pending({
        status: 'EFFECTIVE',
        resulting_version_no: 4,
        workflow: { instance_id: INSTANCE_ID, definition_code: 'POLICY_ENDORSEMENT_APPROVAL', status: 'APPROVED', stage: null, lock_version: 3 },
      }),
    });
    renderAt(ENDORSEMENT_PATH);
    await screen.findByRole('heading', { name: 'END0000001' });
    expect(mainText()).toContain('The policy is now at version 4, with the Windscreen cover limit at KES 100,000.00');
    expect(screen.getByRole('link', { name: 'View the policy' })).toHaveAttribute('href', READABLE_POLICY_PATH);
    expect(screen.queryByRole('button', { name: /Submit|Withdraw/ })).not.toBeInTheDocument();
  });

  it('PTH1-D4: shows a blocked endorsement as no longer actionable, with Withdraw the only action', async () => {
    endorsementBackend({ endorsement: blocked() });
    renderAt(ENDORSEMENT_PATH);
    const title = await screen.findByText(NO_LONGER_ACTIONABLE);
    const panel = title.closest('[data-slot="alert"]') as HTMLElement;
    expect(panel).toHaveTextContent('policy version V3 has been superseded by V4');
    expect(panel).toHaveTextContent(`Required action: ${REQUIRED_ACTION}`);
    expect(panel).toHaveTextContent('Withdraw is the only action left.');
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit|Approve|Decline|Reject|Resubmit/ })).not.toBeInTheDocument();
    expect(mainText()).not.toContain(SENT_FOR_APPROVAL);
  });

  it('PTH1-D4: a void workflow without a blocker is the same state', async () => {
    endorsementBackend({ endorsement: blocked({ blocker: null }) });
    renderAt(ENDORSEMENT_PATH);
    expect(await screen.findByText(NO_LONGER_ACTIONABLE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('withdraws with a reason, its ETag and a key; a 412 keeps the reason and the key', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const backend = endorsementBackend({
      endorsement: blocked(),
      cancel: (_call, state) => {
        attempts += 1;
        if (attempts === 1) {
          state.row += 1; // someone else touched it
          return envelope(412, 'CONCURRENCY_CONFLICT', 'the endorsement changed', {}, 'corr-412');
        }
        return answer(state, blocked({ status: 'CANCELLED', blocker: null, decision_reason: 'Superseded; preparing again' }));
      },
    });
    renderAt(ENDORSEMENT_PATH);
    await user.click(await screen.findByRole('button', { name: 'Withdraw' }));
    const dialog = screen.getByRole('dialog', { name: 'Withdraw endorsement' });

    await user.click(within(dialog).getByRole('button', { name: 'Withdraw' }));
    expect(within(dialog).getByText('Give the reason for withdrawing it.')).toBeInTheDocument();
    expect(backend.posts('/cancel')).toHaveLength(0);

    await user.type(within(dialog).getByLabelText(/Reason/), 'Superseded; preparing again');
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw' }));
    const notice = await within(dialog).findByRole('status');
    expect(notice).toHaveTextContent(STALE_TEXT);
    expect(notice).toHaveTextContent('Reference corr-412');
    expect(within(dialog).getByLabelText(/Reason/)).toHaveValue('Superseded; preparing again');

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Withdraw' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Superseded; preparing again', { selector: 'div' })).toBeInTheDocument();

    const [first, second] = backend.posts('/cancel');
    expect(first.headers['if-match']).toBe(ENDORSEMENT_ETAG(1));
    expect(second.headers['if-match']).toBe(ENDORSEMENT_ETAG(2));
    expect(second.headers['x-idempotency-key']).toBe(first.headers['x-idempotency-key']);
    expect(second.body).toEqual({ reason: 'Superseded; preparing again' });
    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
  });

  it('a backdrop click does not discard a typed withdrawal reason', async () => {
    const user = userEvent.setup();
    endorsementBackend({ endorsement: blocked() });
    renderAt(ENDORSEMENT_PATH);
    await user.click(await screen.findByRole('button', { name: 'Withdraw' }));
    await user.type(screen.getByLabelText(/Reason/), 'Superseded');
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('dialog').parentElement! });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/)).toHaveValue('Superseded');
  });

  it('a stale base on submit shows the message, the required action as written, and the Reference', async () => {
    const user = userEvent.setup();
    endorsementBackend({
      submit: () =>
        envelope(409, 'ENDORSEMENT_BASE_STALE', 'version 4 took effect after this endorsement was prepared on version 3; prepare it again',
          { base_version_no: 3, latest_version_no: 4, required_action: REQUIRED_ACTION }, 'corr-409'),
    });
    renderAt(ENDORSEMENT_PATH);
    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Version 4 took effect after this endorsement was prepared on version 3; prepare it again.');
    expect(alert).toHaveTextContent('Reference corr-409');
    expect(mainText()).toContain(`Required action: ${REQUIRED_ACTION}`);
  });

  it('a submit that finds it already referred says it changed', async () => {
    const user = userEvent.setup();
    endorsementBackend({
      submit: () => envelope(409, 'ENDORSEMENT_STATE_INVALID', 'a referred endorsement cannot be submitted', { status: 'REFERRED' }, 'corr-st'),
    });
    renderAt(ENDORSEMENT_PATH);
    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('This item changed');
    expect(notice).toHaveTextContent('Reference corr-st');
  });

  it('without policies.endorsement.create shows the endorsement with no actions', async () => {
    endorsementBackend({ me: MAKER, endorsement: blocked() });
    renderAt(ENDORSEMENT_PATH, MAKER);
    expect(await screen.findByText(NO_LONGER_ACTIONABLE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit|Withdraw/ })).not.toBeInTheDocument();
  });

  it('says an endorsement out of scope is not found or not available, with its Reference', async () => {
    endorsementBackend();
    vi.stubGlobal(
      'fetch',
      fakeFetch((call) =>
        call.url.endsWith('/auth/me') ? json(200, PREPARER) : envelope(404, 'ENDORSEMENT_NOT_FOUND', 'endorsement not found', {}, 'corr-404'),
      ).fn,
    );
    renderAt(ENDORSEMENT_PATH);
    expect(await screen.findByText(NOT_FOUND_TEXT)).toBeInTheDocument();
    expect(mainText()).toContain('Reference corr-404');
    expect(mainText()).not.toContain('END0000001');
  });
});

describe('the Policy Directory return context (FI1-D-R1)', () => {
  const DIRECTORY = '/policies?coverage=ACTIVE&q=POL0000001&page=2';

  /** From the filtered, paged directory into the policy's Endorsements tab. */
  async function intoEndorsements(user: ReturnType<typeof userEvent.setup>) {
    const router = renderAt(DIRECTORY);
    await user.click(await screen.findByRole('row', { name: /POL0000001/ }));
    await user.click(await screen.findByRole('tab', { name: 'Endorsements' }));
    await screen.findByRole('row', { name: /END0000001/ });
    return router;
  }

  async function expectDirectoryRestored(user: ReturnType<typeof userEvent.setup>, router: ReturnType<typeof renderAt>) {
    await user.click(await screen.findByTitle('Back to Policy Directory'));
    expect(router.state.location.pathname).toBe('/policies/list');
    expect(router.state.location.search).toBe('?coverage=ACTIVE&q=POL0000001&page=2');
  }

  it('policy → endorsement → back to the policy → back to the directory', async () => {
    const user = userEvent.setup();
    endorsementBackend();
    const router = await intoEndorsements(user);
    await user.click(screen.getByRole('row', { name: /END0000001/ }));
    await screen.findByRole('heading', { name: 'END0000001' });

    await user.click(screen.getByTitle('Back to the policy'));
    expect(router.state.location.pathname).toBe(READABLE_POLICY_PATH);
    expect(router.state.location.search).toBe('?tab=endorsements');
    await screen.findByRole('row', { name: /END0000001/ });
    await expectDirectoryRestored(user, router);
  });

  it('policy → new endorsement → Cancel → the policy → back to the directory', async () => {
    const user = userEvent.setup();
    endorsementBackend();
    const router = await intoEndorsements(user);
    await user.click(screen.getByRole('button', { name: 'New endorsement' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(router.state.location.pathname).toBe(READABLE_POLICY_PATH);
    await expectDirectoryRestored(user, router);
  });

  it("policy → new endorsement → the page's Back → the policy → back to the directory", async () => {
    const user = userEvent.setup();
    endorsementBackend();
    const router = await intoEndorsements(user);
    await user.click(screen.getByRole('button', { name: 'New endorsement' }));
    await screen.findByLabelText(/Benefit/);
    await user.click(screen.getByTitle('Back to the policy'));
    await expectDirectoryRestored(user, router);
  });

  it('policy → new endorsement → created → back to the policy → back to the directory', async () => {
    const user = userEvent.setup();
    endorsementBackend({ create: (_call, state) => answer(state, endorsement(), 201) });
    const router = await intoEndorsements(user);
    await user.click(screen.getByRole('button', { name: 'New endorsement' }));
    await fillChangeLimit(user);
    await user.click(screen.getByRole('button', { name: 'Create endorsement' }));
    await screen.findByRole('heading', { name: 'END0000001' });
    await user.click(screen.getByTitle('Back to the policy'));
    await expectDirectoryRestored(user, router);
  });

  it('an effective endorsement → View the policy → back to the directory', async () => {
    const user = userEvent.setup();
    endorsementBackend({ endorsement: pending({ status: 'EFFECTIVE', resulting_version_no: 4, workflow: null }) });
    const router = await intoEndorsements(user);
    await user.click(screen.getByRole('row', { name: /END0000001/ }));
    await user.click(await screen.findByRole('link', { name: 'View the policy' }));
    expect(router.state.location.pathname).toBe(READABLE_POLICY_PATH);
    await expectDirectoryRestored(user, router);
  });
});

describe('the lightweight approval path', () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });

  it('is never called: no backend-mode source names /approve or /decline', () => {
    const root = resolve(__dirname, '..', '..');
    const files = [...sources(join(root, 'backend')), ...sources(join(root, 'lib'))];
    expect(files.length).toBeGreaterThan(20);
    // Comments may explain the rule; code may not build either path.
    const code = (file: string) =>
      readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
    const offenders = files.filter((file) => /\/(approve|decline)\b/.test(code(file)));
    expect(offenders).toEqual([]);
    // The scan itself works: the rule is written down where the commands are.
    expect(readFileSync(join(root, 'backend', 'endorsements', 'useEndorsementCommands.ts'), 'utf8')).toMatch(/\/approve/);
  });

  it('if it were ever reached, WORKFLOW_APPROVAL_REQUIRED would say the approval is made through the workflow task', () => {
    const error = new ApiError({ status: 409, code: 'WORKFLOW_APPROVAL_REQUIRED', message: 'x', correlationId: 'c', details: {} });
    expect(describeError(error).message).toBe('This approval is made through the workflow task.');
  });
});

describe('helpers', () => {
  it('shows a required action as the backend wrote it, and a code in words', () => {
    expect(requiredActionText(REQUIRED_ACTION)).toBe(REQUIRED_ACTION);
    expect(requiredActionText('Prepare it again from V4.')).toBe('Prepare it again from V4.');
    expect(requiredActionText('WITHDRAW_ENDORSEMENT')).toBe('Withdraw endorsement');
  });

  it('reads field errors from a domain 422 and from VALIDATION_FAILED', () => {
    const one = new ApiError({ status: 422, code: 'REASON_REQUIRED', message: 'an endorsement needs a reason', correlationId: 'c', details: { field: 'reason' } });
    expect(fieldErrorsOf(one)).toEqual({ reason: 'An endorsement needs a reason.' });
    const many = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'the request is not valid',
      correlationId: 'c',
      details: { fields: { effective_date: ['Enter a valid date.'], changes: { limit_amount: ['Too large.'] } } },
    });
    expect(fieldErrorsOf(many)).toEqual({ effective_date: 'Enter a valid date.', limit_amount: 'Too large.' });
    expect(fieldErrorsOf(new ApiError({ status: 409, code: 'X', message: 'x', correlationId: null, details: { field: 'reason' } }))).toEqual({});
  });
});
