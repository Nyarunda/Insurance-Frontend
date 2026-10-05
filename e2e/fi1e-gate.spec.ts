/**
 * FI1-E: the integration gate's end-to-end journey against the real backend (scope §7.3).
 *
 * One governed policy (built through the API by the operator's setup users), one serial journey:
 * the maker prepares and submits change-limit endorsements, the checker decides them from My work,
 * and the policy moves to its new version. Along the way: a dropped response replays once, a held
 * form meets a 412 and succeeds with the same key, a superseded endorsement shows the PTH1-D4
 * state and is withdrawn, a rejection uses a reason code from the endpoint, a maker never gets
 * their own endorsement to approve (WORK-QUEUE-ACTIONABILITY-1), an out-of-scope user gets "not
 * found", and tenant B's address gives tenant A's user nothing. No rendered text contains a UUID
 * (the Reference is the only exception).
 *
 * Sign-in with the forced password change runs here for every person; the session-expiry,
 * refresh and host-boundary checks are the FI1-A suite's, on its own environment.
 *
 * Environment: FI1_FRONTEND_PORT, FI1E_ACCOUNTS (temporary passwords, from the operator setup),
 * FI1E_FACTS (identifiers, no secrets). Secrets are never logged or put in assertion messages.
 */

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { Browser, expect, Page, Request, Response, test } from '@playwright/test';

const PORT = process.env.FI1_FRONTEND_PORT ?? '3000';
const ACCOUNTS_FILE = process.env.FI1E_ACCOUNTS;
const FACTS_FILE = process.env.FI1E_FACTS;

test.skip(!ACCOUNTS_FILE || !FACTS_FILE, 'needs the disposable FI1-E environment (FI1E_ACCOUNTS, FI1E_FACTS)');

type Accounts = Record<string, { host: string; temporary_password: string }>;
interface Facts {
  alpha: {
    domain: string;
    policy: { id: string; policy_no: string; benefits: { code: string; name: string; limit_amount: string }[] };
    reject_reasons: { code: string; label: string; requires_text: boolean }[];
  };
  beta: { domain: string };
}

const accounts = (): Accounts => JSON.parse(readFileSync(ACCOUNTS_FILE!, 'utf8'));
const facts = (): Facts => JSON.parse(readFileSync(FACTS_FILE!, 'utf8'));
const origin = (host: string) => `http://${host}:${PORT}`;

/**
 * For requests the test itself makes from Node (route.fetch, page.request): Node cannot resolve
 * `*.localhost` the way the browser does, so they go to the loopback address with the tenant's
 * Host header — exactly what the browser sends through the dev server's proxy.
 */
const direct = (url: string) => {
  const parsed = new URL(url);
  return { url: `http://127.0.0.1:${PORT}${parsed.pathname}${parsed.search}`, host: parsed.host };
};

const MAKER = 'maker@fi1e.test';
const CHECKER = 'checker@fi1e.test';
const DUAL = 'dual@fi1e.test';
const OUTSIDER = 'outsider@fi1e.test';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const STALE_TEXT = 'This record changed since you opened it.';

/** Passwords chosen in this run, kept in memory only. */
const current = new Map<string, string>();
const passwordOf = (email: string) => current.get(email) ?? accounts()[email].temporary_password;
const strongPassword = () => `Fi1e-${randomBytes(9).toString('base64url')}-Aa1!`;

async function signIn(page: Page, host: string, email: string) {
  await page.goto(`${origin(host)}/sign-in`);
  await page.getByPlaceholder('name@company.co.ke').fill(email);
  await page.getByPlaceholder('Enter password', { exact: true }).fill(passwordOf(email));
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();
  const code = ((await page.getByTestId('sandbox-code').textContent()) ?? '').match(/\d{6}/)?.[0];
  expect(code, 'the sandbox sender returned a code').toBeTruthy();
  await page.getByPlaceholder('000000').fill(code!);
  await page.getByRole('button', { name: 'Verify & Continue' }).click();
  const home = page.getByRole('heading', { name: 'Home' });
  const change = page.getByRole('heading', { name: 'Update your password' });
  await expect(home.or(change)).toBeVisible();
  if (await change.isVisible()) {
    const next = strongPassword();
    await page.getByPlaceholder('Enter new password', { exact: true }).fill(next);
    await page.getByPlaceholder('Re-enter new password', { exact: true }).fill(next);
    await page.getByRole('button', { name: 'Set Password & Continue' }).click();
    await expect(home).toBeVisible();
    current.set(email, next);
  }
}

/** Gate item: no rendered text contains a UUID; the backend correlation ID (the Reference) is the one exception. */
async function expectNoUuid(page: Page) {
  const text = await page.evaluate(() => {
    const root = (document.querySelector('main') ?? document.body).cloneNode(true) as HTMLElement;
    root.querySelectorAll('[data-correlation-id]').forEach((node) => node.remove());
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).map((dialog) => {
      const copy = dialog.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[data-correlation-id]').forEach((node) => node.remove());
      return copy.textContent ?? '';
    });
    return `${root.textContent ?? ''} ${dialogs.join(' ')}`;
  });
  expect(text, 'rendered text holds no UUID').not.toMatch(UUID);
}

/** Records API requests and responses on a page (headers only: no bodies, nothing secret logged). */
function track(page: Page) {
  const requests: Request[] = [];
  const responses: Response[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request);
  });
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/')) responses.push(response);
  });
  const matching = (suffix: RegExp) => ({
    requests: () => requests.filter((request) => request.method() === 'POST' && suffix.test(new URL(request.url()).pathname)),
    responses: () => responses.filter((response) => response.request().method() === 'POST' && suffix.test(new URL(response.url()).pathname)),
  });
  /** The bearer token the page is using now (held by the test in memory, never logged). */
  const bearer = () => [...requests].reverse().map((request) => request.headers().authorization).find(Boolean) ?? null;
  return { requests, responses, matching, bearer };
}

async function person(browser: Browser, email: string, host = facts().alpha.domain) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const tracked = track(page);
  await signIn(page, host, email);
  return { context, page, tracked };
}

const policyPath = () => `/policies/${facts().alpha.policy.id}`;
const benefitName = (code: string) => facts().alpha.policy.benefits.find((benefit) => benefit.code === code)!.name;

/** Fills the change-limit form; the effective date stays at its default (today). */
async function fillChangeLimit(page: Page, benefit: string, limit: string, reason: string) {
  await page.getByLabel(/^Benefit/).selectOption({ label: benefitName(benefit) });
  await page.getByLabel(/^New limit/).fill(limit);
  await page.getByLabel(/^Reason/).fill(reason);
}

/** From the policy's Endorsements tab: prepare, create and submit; returns the endorsement's number and path. */
async function prepareAndSubmit(page: Page, benefit: string, limit: string, reason: string) {
  await page.goto(`${origin(facts().alpha.domain)}${policyPath()}?tab=endorsements`);
  await page.getByRole('button', { name: 'New endorsement' }).click();
  await fillChangeLimit(page, benefit, limit, reason);
  await page.getByRole('button', { name: 'Create endorsement' }).click();
  const heading = page.getByRole('heading', { name: /^END/ });
  await expect(heading).toBeVisible();
  const number = (await heading.textContent())!.trim();
  const path = new URL(page.url()).pathname;
  await expect(page.getByText('This change needs approval: submitting sends it for approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Sent for approval', { exact: true })).toBeVisible();
  await expect(page.getByText(/Waiting at the Endorsement check stage/)).toBeVisible();
  await expectNoUuid(page);
  return { number, path };
}

test.describe.configure({ mode: 'serial' });

test.describe('FI1-E: the endorsement journey against the real backend', () => {
  let maker: Awaited<ReturnType<typeof person>>;
  let checker: Awaited<ReturnType<typeof person>>;
  let held: Awaited<ReturnType<typeof person>>;
  const endorsements: Record<string, { number: string; path: string }> = {};

  test.afterAll(async () => {
    for (const someone of [maker, checker, held]) await someone?.context.close();
  });

  test('the maker and the checker sign in (password, OTP, forced change)', async ({ browser }) => {
    maker = await person(browser, MAKER);
    checker = await person(browser, CHECKER);
    expect(current.has(MAKER) && current.has(CHECKER), 'both changed their temporary password').toBe(true);
  });

  test('the policy shows its real detail, with no identifiers', async () => {
    const { page } = maker;
    await page.goto(`${origin(facts().alpha.domain)}/policies`);
    await page.getByRole('row', { name: new RegExp(facts().alpha.policy.policy_no) }).click();
    await expect(page.getByRole('heading', { name: facts().alpha.policy.policy_no })).toBeVisible();
    await expect(page.getByText('Version 1, from')).toBeVisible();
    await page.getByRole('tab', { name: 'Coverage' }).click();
    await expect(page.getByRole('row', { name: new RegExp(benefitName('WINDSCREEN')) })).toContainText('KES 50,000.00');
    await expectNoUuid(page);
  });

  test('the maker prepares and submits two change-limit endorsements; both are sent for approval', async () => {
    endorsements.first = await prepareAndSubmit(maker.page, 'WINDSCREEN', '70000', 'Customer asked for a higher windscreen limit');
    endorsements.second = await prepareAndSubmit(maker.page, 'RADIO', '40000', 'Customer fitted a better radio');
  });

  test('a second maker session holds a new endorsement form open on version 1', async ({ browser }) => {
    held = await person(browser, MAKER);
    await held.page.goto(`${origin(facts().alpha.domain)}${policyPath()}/endorsements/new`);
    await expect(held.page.getByText(/prepared on version 1/)).toBeVisible();
    await fillChangeLimit(held.page, 'WINDSCREEN', '90000', 'Held open while another change takes effect');
  });

  test('the checker finds the first in My work and approves it; a dropped response replays with one effect', async () => {
    const { page, tracked } = checker;
    await page.goto(`${origin(facts().alpha.domain)}/my-work`);
    await expect(page.getByRole('row', { name: new RegExp(endorsements.first.number) })).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(endorsements.second.number) })).toBeVisible();
    // RUP1-F1: the two pending changes are told apart in My Work, from the governed facts.
    await expect(page.getByRole('row', { name: new RegExp(endorsements.first.number) }))
      .toContainText('Windscreen: KES 50,000.00 → KES 70,000.00');
    await expect(page.getByRole('row', { name: new RegExp(endorsements.second.number) }))
      .toContainText('Radio cassette: KES 30,000.00 → KES 40,000.00');
    await expectNoUuid(page);
    await page.getByRole('row', { name: new RegExp(endorsements.first.number) }).click();
    await expect(page.getByRole('heading', { name: `Policy endorsement ${endorsements.first.number}` })).toBeVisible();
    // RUP1-F1: the requested change is on the approval page before the decision.
    const change = page.getByLabel('Requested change');
    await expect(change).toContainText('BenefitWindscreen');
    await expect(change).toContainText('Current limitKES 50,000.00');
    await expect(change).toContainText('New limitKES 70,000.00');
    await expect(change).toContainText(`Policy${facts().alpha.policy.policy_no}`);
    await expect(change).toContainText("Maker's reasonCustomer asked for a higher windscreen limit");
    await expectNoUuid(page);

    // The first answer is lost on the way back: the server has acted, the browser sees a network failure.
    let dropped = 0;
    await page.route('**/api/v1/workflows/instances/*/actions', async (route) => {
      if (dropped === 0) {
        dropped += 1;
        const target = direct(route.request().url());
        await route.fetch({ url: target.url, headers: { ...route.request().headers(), host: target.host } });
        await route.abort('connectionfailed');
        return;
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('dialog')).toContainText('No comment is needed.');
    await page.getByRole('button', { name: 'Confirm approval' }).click();
    await expect(page.getByText(`Approved: Policy endorsement ${endorsements.first.number}`)).toBeVisible();
    await page.unroute('**/api/v1/workflows/instances/*/actions');

    const sent = tracked.matching(/\/actions$/).requests();
    expect(sent).toHaveLength(2);
    expect(sent[1].headers()['x-idempotency-key']).toBe(sent[0].headers()['x-idempotency-key']);
    expect(sent[1].postDataJSON()).toEqual(sent[0].postDataJSON());
    expect(sent[0].postDataJSON()).not.toHaveProperty('reason_text'); // APPROVE sends no comment
    const answered = tracked.matching(/\/actions$/).responses();
    expect(answered.at(-1)!.headers()['idempotency-replayed']).toBe('true');
    // The instance's status (the badge in the Status row) and its history both say so.
    await expect(page.locator('dd').filter({ hasText: /^Approved$/ })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Workflow history' })).toContainText('Approved');
  });

  test('the policy now has exactly one new version, in force, with the new limit', async () => {
    const { page } = maker;
    await page.goto(`${origin(facts().alpha.domain)}${policyPath()}?tab=versions`);
    const table = page.getByRole('table', { name: 'Policy versions' });
    await expect(table.getByRole('row')).toHaveCount(3); // header, version 1, version 2: one effect only
    await expect(table.getByRole('row', { name: /Version 2/ })).toContainText('In force');
    await expect(table.getByRole('row', { name: /Version 2/ })).toContainText('Endorsement');
    await page.getByRole('tab', { name: 'Coverage' }).click();
    await expect(page.getByRole('row', { name: new RegExp(benefitName('WINDSCREEN')) })).toContainText('KES 70,000.00');
    await page.goto(`${origin(facts().alpha.domain)}${endorsements.first.path}`);
    await expect(page.getByText(/The policy is now at version 2, with the Windscreen limit at KES 70,000.00/)).toBeVisible();
    await expectNoUuid(page);
  });

  test('PTH1-D4: the superseded endorsement leaves the queue, shows "No longer actionable", and is withdrawn', async () => {
    await checker.page.goto(`${origin(facts().alpha.domain)}/my-work`);
    await checker.page.getByRole('button', { name: 'Refresh' }).click();
    await expect(checker.page.getByRole('row', { name: new RegExp(endorsements.second.number) })).toHaveCount(0);

    const { page } = maker;
    await page.goto(`${origin(facts().alpha.domain)}${endorsements.second.path}`);
    const panel = page.getByText('No longer actionable').locator('xpath=ancestor::div[@data-slot="alert"][1]');
    await expect(panel).toContainText('policy version V1 has been superseded by V2');
    await expect(panel).toContainText('Required action: Withdraw this endorsement and prepare it again from the current policy version.');
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Approve|Decline|Reject/ })).toHaveCount(0);
    await expectNoUuid(page);

    await page.getByRole('button', { name: 'Withdraw' }).click();
    const dialog = page.getByRole('dialog', { name: 'Withdraw endorsement' });
    await dialog.getByLabel(/^Reason/).fill('Superseded by version 2; preparing it again');
    await dialog.getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByText('Withdrawn', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Superseded by version 2; preparing it again').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdraw' })).toHaveCount(0);
  });

  test('the held form meets a 412, keeps what was typed, and succeeds with the new ETag and the same key', async () => {
    const { page, tracked } = held;
    await page.getByRole('button', { name: 'Create endorsement' }).click();
    await expect(page.getByRole('status')).toContainText(STALE_TEXT);
    await expect(page.getByLabel(/^New limit/)).toHaveValue('90000');
    await expect(page.getByText(/prepared on version 2/)).toBeVisible();
    await page.getByRole('button', { name: 'Create endorsement' }).click();
    const heading = page.getByRole('heading', { name: /^END/ });
    await expect(heading).toBeVisible();
    endorsements.third = { number: (await heading.textContent())!.trim(), path: new URL(page.url()).pathname };

    const [first, second] = tracked.matching(/\/policies\/[^/]+\/endorsements$/).requests();
    expect(second.headers()['x-idempotency-key']).toBe(first.headers()['x-idempotency-key']);
    expect(second.headers()['if-match']).not.toBe(first.headers()['if-match']);
    expect(second.postDataJSON()).toEqual(first.postDataJSON());
    const statuses = await Promise.all(tracked.matching(/\/policies\/[^/]+\/endorsements$/).responses().map((r) => r.status()));
    expect(statuses).toEqual([412, 201]);
    await expectNoUuid(page);
  });

  test('a rejection uses a reason code from the endpoint; the maker sees it declined with the reason', async () => {
    const { page } = held;
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Sent for approval', { exact: true })).toBeVisible();

    const reason = facts().alpha.reject_reasons.find((item) => item.requires_text)!;
    const c = checker.page;
    await c.goto(`${origin(facts().alpha.domain)}/my-work`);
    await c.getByRole('row', { name: new RegExp(endorsements.third.number) }).click();
    const listed = c.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/workflows/reason-codes');
    await c.getByRole('button', { name: 'Reject' }).click();
    const select = c.getByLabel(/^Reason/);
    // Exactly the tenant's configured REJECT reasons, in the order the endpoint gives them.
    const fromEndpoint = ((await (await listed).json()).results as { label: string }[]).map((item) => item.label);
    expect([...fromEndpoint].sort()).toEqual(facts().alpha.reject_reasons.map((item) => item.label).sort());
    await expect(select.locator('option')).toHaveText(['Select a reason…', ...fromEndpoint]);
    await select.selectOption({ label: reason.label });
    await c.getByRole('button', { name: 'Confirm rejection' }).click();
    await expect(c.getByText('This reason needs an explanation.')).toBeVisible();
    await c.getByLabel(/^Explanation/).fill('The valuation report is missing for the higher limit.');
    await c.getByRole('button', { name: 'Confirm rejection' }).click();
    await expect(c.getByText(`Rejected: Policy endorsement ${endorsements.third.number}`)).toBeVisible();
    const sent = checker.tracked.matching(/\/actions$/).requests().at(-1)!;
    expect(sent.postDataJSON()).toMatchObject({ action: 'REJECT', reason_code: reason.code });
    await expect(c.getByRole('table', { name: 'Workflow history' })).toContainText('The valuation report is missing for the higher limit.');
    await expectNoUuid(c);

    await page.reload();
    await expect(page.getByText('Declined', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('The valuation report is missing for the higher limit.').first()).toBeVisible();
  });

  test('a maker never gets their own endorsement to approve, even holding the checker role', async ({ browser }) => {
    const dual = await person(browser, DUAL);
    try {
      const own = await prepareAndSubmit(dual.page, 'WINDSCREEN', '120000', 'Prepared by someone who is also a checker');
      const versionsBefore = await maker.page.goto(`${origin(facts().alpha.domain)}${policyPath()}?tab=versions`)
        .then(() => maker.page.getByRole('table', { name: 'Policy versions' }).getByRole('row').count());

      // WORK-QUEUE-ACTIONABILITY-1: the pooled task is listed only to someone who could act on it,
      // so its maker no longer sees it at all (FI1-E-F1). The command's own SOD check, which still
      // refuses a direct attempt, is proven by the backend's tests.
      await dual.page.goto(`${origin(facts().alpha.domain)}/my-work`);
      await expect(dual.page.getByRole('heading', { name: 'My Work Queue' })).toBeVisible();
      await dual.page.getByRole('button', { name: 'Refresh' }).click();
      await expect(dual.page.getByRole('button', { name: 'Refresh' })).toBeEnabled();
      await expect(dual.page.getByRole('row', { name: new RegExp(own.number) })).toHaveCount(0);
      await expectNoUuid(dual.page);

      // The distinct checker has it, and nothing has happened to the endorsement or the policy.
      await checker.page.goto(`${origin(facts().alpha.domain)}/my-work`);
      await expect(checker.page.getByRole('row', { name: new RegExp(own.number) })).toBeVisible();
      await dual.page.goto(`${origin(facts().alpha.domain)}${own.path}`);
      await expect(dual.page.getByText('Sent for approval', { exact: true })).toBeVisible();
      await maker.page.reload();
      await expect(maker.page.getByRole('table', { name: 'Policy versions' }).getByRole('row')).toHaveCount(versionsBefore);
      endorsements.own = own;
    } finally {
      await dual.context.close();
    }
  });

  test('a user outside the policy’s branch gets "not found", never the record', async ({ browser }) => {
    const outsider = await person(browser, OUTSIDER);
    try {
      const { page } = outsider;
      await page.goto(`${origin(facts().alpha.domain)}/policies`);
      await expect(page.getByText('No policies to show')).toBeVisible();
      await page.goto(`${origin(facts().alpha.domain)}${policyPath()}`);
      await expect(page.getByText('Not found or not available to you.')).toBeVisible();
      await expect(page.locator('[data-correlation-id]')).toHaveCount(1);
      await expect(page.getByText(facts().alpha.policy.policy_no)).toHaveCount(0);
      await page.goto(`${origin(facts().alpha.domain)}${endorsements.first.path}`);
      await expect(page.getByText('Not found or not available to you.')).toBeVisible();
      await expect(page.getByText(endorsements.first.number)).toHaveCount(0);
      await expectNoUuid(page);
    } finally {
      await outsider.context.close();
    }
  });

  test('tenant isolation: tenant A’s user cannot sign in or read anything at tenant B’s address', async ({ browser }) => {
    const beta = facts().beta.domain;
    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(`${origin(beta)}/sign-in`);
    await page.getByPlaceholder('name@company.co.ke').fill(MAKER);
    await page.getByPlaceholder('Enter password', { exact: true }).fill(passwordOf(MAKER));
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('alert')).toContainText('The email or password is not correct.');
    await stranger.close();

    // A's live token reads nothing at B's address. Access tokens last 20 s and the gateway checks
    // expiry before the tenant, so the token is taken fresh from an Alpha page and first proven live
    // at Alpha; otherwise an idle page's expired token would be refused as TOKEN_EXPIRED instead.
    await maker.page.goto(`${origin(facts().alpha.domain)}/policies`);
    await expect(maker.page.getByRole('row', { name: new RegExp(facts().alpha.policy.policy_no) })).toBeVisible();
    const token = maker.tracked.bearer();
    expect(token).toBeTruthy();
    const home = direct(`${origin(facts().alpha.domain)}/api/v1/auth/me`);
    const live = await maker.page.request.get(home.url, { headers: { Host: home.host, Authorization: token! } });
    expect(live.status(), 'the token is live at its own tenant').toBe(200);
    for (const path of ['/auth/me', '/policies', `${policyPath()}`, '/work-queue']) {
      const target = direct(`${origin(beta)}/api/v1${path}`);
      const response = await maker.page.request.get(target.url, { headers: { Host: target.host, Authorization: token! } });
      // The gateway recognises another tenant's token and refuses it before any data is read.
      expect(response.status(), path).toBe(403);
      expect((await response.json()).error.code, path).toBe('CROSS_TENANT_TOKEN_ATTEMPT');
    }

    // And the signed-in browser has no session at B's address.
    await maker.page.goto(`${origin(beta)}${policyPath()}`);
    await expect(maker.page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
