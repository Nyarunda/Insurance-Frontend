/**
 * NB1-E: the NEW-BUSINESS-1 end-to-end gate against the real backend (new-business-1-scope, NB1-E).
 *
 * One serial journey on a freshly built disposable environment (nb1e_setup.py: the FI1-E
 * environment plus NEW_BUSINESS_MAKER / NEW_BUSINESS_CHECKER accounts and the governed
 * UNDERWRITING_EXCEPTION_APPROVAL):
 *
 *   the maker creates a customer and sends KYC for verification; the checker verifies it;
 *   the maker quotes (risk from the product's factors), prices, issues and records acceptance;
 *   a held risk form meets a real 412 and succeeds with the same key under the new ETag;
 *   the maker creates the proposal, completes the terms, submits (evidence outstanding), refers it
 *   and records the evidence; the checker approves the referral in My Work Queue;
 *   the maker binds (the first answer is dropped and replays with one effect) and the new POL…
 *   opens with its cover.
 *
 * Plus: profile separation asserted against the API (the maker cannot verify KYC, check a
 * revision, approve an exception or see the work queue; the checker cannot create or edit
 * customers, quotations or proposals, bind, or touch insurer and product setup), an out-of-branch
 * maker gets "not found" for every record, and tenant B's address gives tenant A's token nothing.
 * No rendered text contains a UUID (the Reference is the only exception).
 *
 * Environment: FI1_FRONTEND_PORT, FI1E_ACCOUNTS (temporary passwords from the operator setup),
 * FI1E_FACTS (identifiers, no secrets). Secrets are never logged or put in assertion messages.
 */

import { readFileSync } from 'node:fs';
import { randomBytes, randomInt } from 'node:crypto';
import { Browser, expect, Page, Request, Response, test } from '@playwright/test';

const PORT = process.env.FI1_FRONTEND_PORT ?? '3000';
const ACCOUNTS_FILE = process.env.FI1E_ACCOUNTS;
const FACTS_FILE = process.env.FI1E_FACTS;

test.skip(!ACCOUNTS_FILE || !FACTS_FILE, 'needs the disposable NB1-E environment (FI1E_ACCOUNTS, FI1E_FACTS)');

type Accounts = Record<string, { host: string; temporary_password: string }>;
interface Facts {
  alpha: { domain: string; new_business: { product: string; insurer: string; agreement: string } };
  beta: { domain: string };
}

const accounts = (): Accounts => JSON.parse(readFileSync(ACCOUNTS_FILE!, 'utf8'));
const facts = (): Facts => JSON.parse(readFileSync(FACTS_FILE!, 'utf8'));
const origin = (host: string) => `http://${host}:${PORT}`;
const alpha = () => origin(facts().alpha.domain);

/** Node cannot resolve `*.localhost`: the test's own requests go to the loopback with the tenant's Host. */
const direct = (url: string) => {
  const parsed = new URL(url);
  return { url: `http://127.0.0.1:${PORT}${parsed.pathname}${parsed.search}`, host: parsed.host };
};

const MAKER = 'nb-maker@fi1e.test';
const CHECKER = 'nb-checker@fi1e.test';
const OUTSIDER = 'nb-outsider@fi1e.test';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const STALE_TEXT = 'This record changed since you opened it.';
const NOT_FOUND = 'Not found or not available to you.';

const current = new Map<string, string>();
const passwordOf = (email: string) => current.get(email) ?? accounts()[email].temporary_password;
const strongPassword = () => `Nb1e-${randomBytes(9).toString('base64url')}-Aa1!`;

/** The tenant's business day (Africa/Nairobi), as the server judges inception dates. */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
const inDays = (days: number) => {
  const d = new Date(`${today()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

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

function track(page: Page) {
  const requests: Request[] = [];
  const responses: Response[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request);
  });
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/')) responses.push(response);
  });
  const matching = (method: string, path: RegExp) => ({
    requests: () => requests.filter((request) => request.method() === method && path.test(new URL(request.url()).pathname)),
    responses: () => responses.filter((response) => response.request().method() === method && path.test(new URL(response.url()).pathname)),
  });
  const bearer = () => [...requests].reverse().map((request) => request.headers().authorization).find(Boolean) ?? null;
  return { matching, bearer };
}

async function person(browser: Browser, email: string, host = facts().alpha.domain) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const tracked = track(page);
  await signIn(page, host, email);
  return { context, page, tracked };
}
type Person = Awaited<ReturnType<typeof person>>;

/**
 * A call the test makes with the person's live session (for the API-level separation checks). The
 * token is taken fresh from a page load (access tokens last 20 s) and the API answer returned.
 */
async function api(someone: Person, method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, ifMatch?: string) {
  await someone.page.goto(`${alpha()}/`);
  await expect(someone.page.getByRole('heading', { name: 'Home' })).toBeVisible();
  const token = someone.tracked.bearer();
  expect(token, 'a live access token').toBeTruthy();
  const target = direct(`${alpha()}/api/v1${path}`);
  const headers: Record<string, string> = { Host: target.host, Authorization: token!, 'X-Idempotency-Key': randomBytes(16).toString('hex') };
  if (ifMatch) headers['If-Match'] = ifMatch;
  const response = await someone.page.request.fetch(target.url, { method, headers, data: body === undefined ? undefined : body });
  return { status: response.status(), json: (await response.json().catch(() => ({}))) as Record<string, unknown>, etag: response.headers().etag };
}

const expectRefused = (result: { status: number; json: Record<string, unknown> }, what: string) => {
  expect(result.status, what).toBe(403);
  expect((result.json.error as { code?: string } | undefined)?.code, what).toBe('PERMISSION_DENIED');
};

test.describe.configure({ mode: 'serial' });

test.describe('NB1-E: a new policy, from a customer to a bound policy, against the real backend', () => {
  let maker: Person;
  let checker: Person;
  let held: Person;
  const tag = randomInt(100_000, 999_999);
  const record: Record<string, { number: string; path: string; id?: string }> = {};

  test.afterAll(async () => {
    for (const someone of [maker, checker, held]) await someone?.context.close();
  });

  test('the maker and the checker sign in (password, OTP, forced change); each sees only their own screens', async ({ browser }) => {
    maker = await person(browser, MAKER);
    checker = await person(browser, CHECKER);
    expect(current.has(MAKER) && current.has(CHECKER), 'both changed their temporary password').toBe(true);

    // The sidebar's entries are buttons in the "Primary navigation" landmark.
    const nav = (page: Page) => page.getByRole('complementary', { name: 'Primary navigation' });
    await expect(nav(maker.page).getByRole('button', { name: 'New policy' })).toBeVisible();
    await expect(nav(maker.page).getByRole('button', { name: 'My Work Queue' })).toHaveCount(0);
    await expect(nav(checker.page).getByRole('button', { name: 'My Work Queue' })).toBeVisible();
    await expect(nav(checker.page).getByRole('button', { name: 'New policy' })).toHaveCount(0);
    await checker.page.goto(`${alpha()}/customers/list`);
    await expect(checker.page.getByRole('heading', { name: 'Customers', exact: true }).first()).toBeVisible();
    await expect(checker.page.getByRole('button', { name: 'New customer' })).toHaveCount(0);
  });

  test('the maker creates a customer with a primary identifier and sends KYC for verification', async () => {
    const { page } = maker;
    await page.goto(`${alpha()}/customers/list`);
    await page.getByRole('button', { name: 'New customer' }).click();
    const dialog = page.getByRole('dialog', { name: 'New customer' });
    await dialog.getByLabel(/First name/).fill('Achieng');
    await dialog.getByLabel(/Last name/).fill('Otieno');
    await dialog.getByLabel('Mobile number').fill(`07${randomInt(10_000_000, 99_999_999)}`);
    await dialog.getByLabel('Identifier number').fill(String(randomInt(10_000_000, 99_999_999)));
    await dialog.getByRole('button', { name: 'Create customer' }).click();
    const heading = page.getByRole('heading', { name: 'Achieng Otieno' });
    await expect(heading).toBeVisible();
    const number = ((await page.getByText(/^CUS\d+/).first().textContent()) ?? '').match(/CUS\d+/)![0];
    record.customer = { number, path: new URL(page.url()).pathname };
    expect(record.customer.path).toBe(`/customers/list/${number}`);

    await page.getByRole('tab', { name: 'KYC' }).click();
    for (const move of ['Start KYC', 'Send for verification']) {
      await page.getByRole('button', { name: move }).click();
      await page.getByRole('dialog', { name: move }).getByRole('button', { name: move }).click();
      await expect(page.getByRole('dialog', { name: move })).toHaveCount(0);
    }
    await expect(page.getByText('KYC awaiting verification').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify KYC' })).toHaveCount(0);       // not the maker's to do
    await expectNoUuid(page);
  });

  test('profile separation: the maker cannot verify KYC (API refuses)', async () => {
    const found = await api(maker, 'GET', `/clients?q=${record.customer.number}&page=1&page_size=5`);
    const id = (found.json.results as { id: string }[])[0].id;
    record.customer.id = id;
    const detail = await api(maker, 'GET', `/clients/${id}`);
    expectRefused(await api(maker, 'PATCH', `/clients/${id}`, { kyc_status: 'VERIFIED' }, detail.etag), 'maker verifies KYC');
    expectRefused(await api(maker, 'GET', '/work-queue'), 'maker reads the work queue');
  });

  test('the checker verifies the identifier and the KYC', async () => {
    const { page } = checker;
    await page.goto(`${alpha()}${record.customer.path}?tab=kyc`);
    await page.getByRole('tab', { name: 'KYC' }).click();
    const identifiers = page.getByRole('table', { name: 'Identifiers' });
    await identifiers.getByRole('button', { name: 'Verify' }).click();
    await page.getByRole('dialog', { name: 'Verify identifier' }).getByRole('button', { name: 'Verify' }).click();
    await expect(identifiers).toContainText('Verified');
    await page.getByRole('button', { name: 'Verify KYC' }).click();
    await page.getByRole('dialog', { name: 'Verify KYC' }).getByRole('button', { name: 'Verify KYC' }).click();
    await expect(page.getByRole('dialog', { name: 'Verify KYC' })).toHaveCount(0);
    await expect(page.getByText('KYC verified').first()).toBeVisible();
    await expectNoUuid(page);
  });

  test('the maker starts a quotation from the customer’s record', async () => {
    const { page } = maker;
    await page.goto(`${alpha()}${record.customer.path}`);
    await page.getByRole('button', { name: 'New quotation' }).click();
    const dialog = page.getByRole('dialog', { name: 'New quotation' });
    await expect(dialog).toContainText(record.customer.number);
    await dialog.getByLabel(/Product/).selectOption({ label: `${facts().alpha.new_business.product} · ${facts().alpha.new_business.insurer}` });
    await dialog.getByRole('button', { name: 'Create quotation' }).click();
    const heading = page.getByRole('heading', { name: /^QUO\d+$/ });
    await expect(heading).toBeVisible();
    record.quotation = { number: (await heading.textContent())!.trim(), path: new URL(page.url()).pathname };
    expect(record.quotation.path).toBe(`/quotations/list/${record.quotation.number}`);
  });

  test('a held risk form meets a real 412 (validity changed meanwhile), keeps what was typed, and saves with the same key', async ({ browser }) => {
    held = await person(browser, MAKER);
    const h = held.page;
    await h.goto(`${alpha()}${record.quotation.path}`);
    const risk = h.getByRole('form', { name: 'Risk' });
    await risk.getByLabel(/Sum insured/).fill('1,000,000');
    await risk.getByLabel(/^Use/).selectOption('PRIVATE');
    await risk.getByLabel(/Vehicle age/).fill('3');
    await risk.getByLabel(/Tracking device/).selectOption('true');
    await risk.getByRole('button', { name: 'Add identifier' }).click();
    await risk.getByLabel('Identifier 1 number').fill(`KD${String.fromCharCode(65 + (tag % 26))} ${String(tag).slice(0, 3)}N`);

    // Meanwhile, in the first session, the validity changes: a new ETag, the same risk.
    const { page } = maker;
    await page.reload();
    await page.getByRole('button', { name: 'Change validity' }).click();
    const validity = page.getByRole('dialog', { name: 'Change validity' });
    await validity.getByLabel('Valid until').fill(inDays(20));
    await validity.getByRole('button', { name: 'Save' }).click();
    await expect(validity).toHaveCount(0);

    await risk.getByRole('button', { name: 'Save risk' }).click();
    await expect(h.getByText(STALE_TEXT)).toBeVisible();
    await expect(risk.getByLabel(/Sum insured/)).toHaveValue('1,000,000');        // what was typed remains
    await risk.getByRole('button', { name: 'Save risk' }).click();
    await expect(h.getByText(`Risk saved: ${record.quotation.number}`)).toBeVisible();

    const puts = held.tracked.matching('PUT', /\/quotations\/[^/]+\/risk$/);
    const [first, second] = puts.requests();
    expect(second.headers()['x-idempotency-key']).toBe(first.headers()['x-idempotency-key']);
    expect(second.headers()['if-match']).not.toBe(first.headers()['if-match']);
    expect(second.postDataJSON()).toEqual(first.postDataJSON());
    expect(first.postDataJSON().factors.sum_insured).toBe('1000000');               // canonical digits
    expect(await Promise.all(puts.responses().map((r) => r.status()))).toEqual([412, 200]);
    await expectNoUuid(h);
  });

  test('the maker prices, issues the offer and records the customer’s acceptance', async () => {
    const { page } = maker;
    await page.reload();
    await page.getByRole('button', { name: 'Price', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Premium' })).toContainText('Total premium');
    await page.getByRole('button', { name: 'Issue offer' }).click();
    const issue = page.getByRole('dialog', { name: 'Issue offer' });
    await issue.getByRole('button', { name: 'Issue offer' }).click();
    await expect(issue).toHaveCount(0);
    await expect(page.getByText('Offer issued').first()).toBeVisible();
    await page.getByRole('button', { name: 'Customer accepted' }).click();
    await expect(page.getByText('Accepted by the customer')).toBeVisible();
    await page.getByRole('button', { name: 'View offer' }).click();
    const offer = page.getByRole('dialog', { name: new RegExp(`Offer ${record.quotation.number}, revision 1`) });
    await expect(offer).toContainText('Risk, as offered');
    await expect(offer).toContainText('1000000');
    await offer.getByRole('button', { name: 'Close' }).first().click();
    await expectNoUuid(page);
  });

  test('the maker creates the proposal from the accepted quotation and completes the terms', async () => {
    const { page } = maker;
    await page.getByRole('button', { name: 'Create proposal' }).click();
    const dialog = page.getByRole('dialog', { name: 'New proposal' });
    await expect(dialog).toContainText(record.quotation.number);
    await dialog.getByLabel('Proposed inception').fill(today());
    await dialog.getByRole('button', { name: 'Create proposal' }).click();
    const heading = page.getByRole('heading', { name: /^UWP\d+$/ });
    await expect(heading).toBeVisible();
    record.proposal = { number: (await heading.textContent())!.trim(), path: new URL(page.url()).pathname };

    const terms = page.getByRole('form', { name: 'Terms' });
    await terms.getByLabel('Agreement').selectOption({ label: `Agency · ${facts().alpha.new_business.agreement}` });
    await terms.getByRole('button', { name: 'Save terms' }).click();
    await expect(page.getByText(`Terms saved: ${record.proposal.number}`)).toBeVisible();
    await expect(terms).toContainText('one year less a day');
    await expectNoUuid(page);
  });

  test('profile separation: the maker cannot check a revision or approve an exception; the checker cannot create, edit or bind', async () => {
    const quotation = await api(maker, 'GET', `/quotations?q=${record.quotation.number}&page=1&page_size=5`);
    const quotationId = (quotation.json.results as { id: string }[])[0].id;
    const q = await api(maker, 'GET', `/quotations/${quotationId}`);
    expectRefused(await api(maker, 'POST', `/quotations/${quotationId}/approve-revision`, {}, q.etag), 'maker checks a revision');

    const proposal = await api(checker, 'GET', `/underwriting/proposals?q=${record.proposal.number}&page=1&page_size=5`);
    const proposalId = (proposal.json.results as { id: string }[])[0].id;
    record.proposal.id = proposalId;
    const p = await api(checker, 'GET', `/underwriting/proposals/${proposalId}`);
    expectRefused(await api(checker, 'PATCH', `/underwriting/proposals/${proposalId}`, { underwriting_details: { Note: 'x' } }, p.etag), 'checker edits a proposal');
    expectRefused(await api(checker, 'POST', '/policies', { proposal_id: proposalId }, p.etag), 'checker binds');
    // Real identifiers from the maker's records, so only the permission can refuse.
    const view = q.json as { customer: { id: string }; product: { id: string }; insurer: { id: string }; branch: { id: string } };
    expectRefused(await api(checker, 'POST', '/clients', {
      customer_type: 'INDIVIDUAL', home_branch_id: view.branch.id, profile: { first_name: 'Not', last_name: 'Allowed' },
      contacts: [{ type: 'MOBILE', value: `07${randomInt(10_000_000, 99_999_999)}` }],
    }), 'checker creates a customer');
    const customer = await api(checker, 'GET', `/clients/${record.customer.id}`);
    expectRefused(await api(checker, 'PATCH', `/clients/${record.customer.id}`, { profile: { first_name: 'Changed' } }, customer.etag), 'checker edits a customer');
    expectRefused(await api(checker, 'POST', '/quotations', { customer_id: view.customer.id, product_id: view.product.id, branch_id: view.branch.id }), 'checker creates a quotation');
    const quote = await api(checker, 'GET', `/quotations/${quotationId}`);
    expectRefused(await api(checker, 'PATCH', `/quotations/${quotationId}`, { valid_until: inDays(10) }, quote.etag), 'checker edits a quotation');
    expectRefused(await api(checker, 'POST', '/underwriting/proposals', { quotation_id: quotationId }), 'checker creates a proposal');
    // No insurer or product setup powers.
    for (const [what, path, body] of [
      ['creates an insurer', '/insurers', { code: `X${tag}`, name: 'Not allowed', insurer_type: 'GENERAL' }],
      ['adds an agreement', `/insurers/${view.insurer.id}/agreements`, { agreement_type: 'AGENCY', reference_no: `X-${tag}`, effective_from: today() }],
      ['drafts a product version', `/products/${view.product.id}/versions`, {}],
    ] as const) {
      expect((await api(checker, 'POST', path, body)).status, `checker ${what}`).toBe(403);
    }
  });

  test('the maker submits (evidence outstanding), refers it, and records the evidence; the referral waits in My Work Queue', async () => {
    const { page } = maker;
    await page.goto(`${alpha()}${record.proposal.path}`);
    await page.getByRole('button', { name: 'Submit' }).click();
    const outstanding = page.getByRole('list', { name: 'Outstanding' });
    await expect(outstanding).toContainText('Evidence missing: Logbook copy');

    await page.getByRole('button', { name: 'Refer' }).click();
    const refer = page.getByRole('dialog', { name: 'Refer the proposal' });
    await refer.getByLabel(/Reason/).fill('Prior total loss declared on this vehicle');
    await refer.getByRole('button', { name: 'Refer' }).click();
    await expect(refer).toHaveCount(0);
    await expect(page.getByText('Referred: waiting for an approval')).toBeVisible();

    await page.getByRole('button', { name: 'Record evidence: Logbook copy' }).click();
    const evidence = page.getByRole('dialog', { name: 'Record evidence' });
    await evidence.getByLabel(/Evidence reference/).fill(`LOGBOOK-${tag}`);
    await evidence.getByRole('button', { name: 'Record evidence' }).click();
    await expect(evidence).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Requirements' })).toContainText(`LOGBOOK-${tag}`);

    // The exceptions are on their own tab (proposal tabs), with the count still open.
    await page.getByRole('tab', { name: /Exceptions/ }).click();
    const referral = page.getByRole('listitem', { name: "Underwriter's referral" });
    await expect(referral).toContainText(/Waiting for/);
    await expect(referral).toContainText('in My Work Queue');
    await expect(referral.getByRole('button', { name: /Approve/ })).toHaveCount(0);
    await expect(outstanding).not.toContainText('Evidence missing');
    await expectNoUuid(page);
  });

  test('profile separation: the maker cannot approve the referral (API refuses)', async () => {
    const p = await api(maker, 'GET', `/underwriting/proposals/${record.proposal.id}`);
    const exceptionId = (p.json.exceptions as { id: string; code: string }[]).find((item) => item.code === 'UNDERWRITER_REFERRAL')!.id;
    expectRefused(await api(maker, 'POST', `/underwriting/proposals/${record.proposal.id}/exceptions/${exceptionId}/approve`, { note: '' }, p.etag), 'maker approves an exception');
  });

  test('the checker approves the referral from My Work Queue; the proposal becomes ready to bind', async () => {
    const { page } = checker;
    await page.goto(`${alpha()}/my-work/list`);
    const row = page.getByRole('row', { name: new RegExp(record.proposal.number) });
    await expect(row).toBeVisible();
    await expectNoUuid(page);
    await row.click();
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('button', { name: 'Confirm approval' }).click();
    await expect(page.getByText(/^Approved: /)).toBeVisible();

    await maker.page.goto(`${alpha()}${record.proposal.path}?tab=exceptions`);
    await expect(maker.page.getByText(/Nothing is outstanding since/)).toBeVisible();
    await expect(maker.page.getByRole('listitem', { name: "Underwriter's referral" })).toContainText('Approved');
  });

  test('the maker binds with an insurer number; the first answer is dropped and replays with one effect; the policy opens', async () => {
    const { page, tracked } = maker;
    let dropped = 0;
    await page.route('**/api/v1/policies', async (route) => {
      if (route.request().method() === 'POST' && dropped === 0) {
        dropped += 1;
        const target = direct(route.request().url());
        await route.fetch({ url: target.url, headers: { ...route.request().headers(), host: target.host } });
        await route.abort('connectionfailed');
        return;
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Bind' }).click();
    const dialog = page.getByRole('dialog', { name: 'Bind into a policy' });
    await expect(dialog).toContainText(facts().alpha.new_business.agreement);
    await dialog.getByLabel('Insurer policy number').fill(` PG/MP/${tag} `);
    await dialog.getByRole('button', { name: 'Bind' }).click();
    const heading = page.getByRole('heading', { name: /^POL\d+$/ });
    await expect(heading).toBeVisible();
    await page.unroute('**/api/v1/policies');
    record.policy = { number: (await heading.textContent())!.trim(), path: new URL(page.url()).pathname };
    expect(record.policy.path).toBe(`/policies/list/${record.policy.number}`);

    const sent = tracked.matching('POST', /\/api\/v1\/policies$/).requests();
    expect(sent).toHaveLength(2);
    expect(sent[1].headers()['x-idempotency-key']).toBe(sent[0].headers()['x-idempotency-key']);
    expect(sent[1].headers()['if-match']).toBe(sent[0].headers()['if-match']);
    expect(sent[0].postDataJSON()).toEqual({ proposal_id: record.proposal.id, insurer_policy_no: `PG/MP/${tag}` });
    const answered = tracked.matching('POST', /\/api\/v1\/policies$/).responses();
    expect(answered.at(-1)!.headers()['idempotency-replayed']).toBe('true');

    // One effect: the customer has exactly one policy, and it is this one.
    const policies = await api(maker, 'GET', `/policies?customer_id=${record.customer.id}&page=1&page_size=25`);
    expect((policies.json.results as { policy_no: string }[]).map((item) => item.policy_no)).toEqual([record.policy.number]);

    await page.goto(`${alpha()}${record.policy.path}`);
    await expect(page.getByRole('heading', { name: record.policy.number })).toBeVisible();
    await page.getByRole('tab', { name: 'Coverage' }).click();
    await expect(page.getByRole('row', { name: /Windscreen/ })).toContainText('KES 50,000.00');
    await expectNoUuid(page);

    await page.goto(`${alpha()}${record.proposal.path}`);
    await expect(page.getByText(new RegExp(`Policy ${record.policy.number}`))).toBeVisible();
    await page.getByRole('button', { name: 'Open the policy' }).click();
    await expect(page.getByRole('heading', { name: record.policy.number })).toBeVisible();
  });

  test('a maker outside the branch gets "not found" for the customer, quotation, proposal and policy', async ({ browser }) => {
    const outsider = await person(browser, OUTSIDER);
    try {
      const { page } = outsider;
      for (const item of [record.customer, record.quotation, record.proposal, record.policy]) {
        await page.goto(`${alpha()}${item.path}`);
        await expect(page.getByText(NOT_FOUND)).toBeVisible();
        await expect(page.getByText(item.number)).toHaveCount(0);
        await expectNoUuid(page);
      }
      await page.goto(`${alpha()}/proposals/list`);
      await expect(page.getByText('No proposals to show')).toBeVisible();
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

    await maker.page.goto(`${alpha()}/proposals/list`);
    await expect(maker.page.getByRole('row', { name: new RegExp(record.proposal.number) })).toBeVisible();
    const token = maker.tracked.bearer();
    const home = direct(`${alpha()}/api/v1/auth/me`);
    expect((await maker.page.request.get(home.url, { headers: { Host: home.host, Authorization: token! } })).status(), 'live at its own tenant').toBe(200);
    for (const path of ['/clients', `/clients/${record.customer.id}`, '/quotations', '/underwriting/proposals', `/underwriting/proposals/${record.proposal.id}`, '/policies']) {
      const target = direct(`${origin(beta)}/api/v1${path}`);
      const response = await maker.page.request.get(target.url, { headers: { Host: target.host, Authorization: token! } });
      expect(response.status(), path).toBe(403);
      expect((await response.json()).error.code, path).toBe('CROSS_TENANT_TOKEN_ATTEMPT');
    }
    await maker.page.goto(`${origin(beta)}${record.proposal.path}`);
    await expect(maker.page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
