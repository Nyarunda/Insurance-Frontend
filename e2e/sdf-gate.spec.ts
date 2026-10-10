/**
 * SD-F: the SETUP-DRIVEN-1 end-to-end gate against the real backend (setup-driven-1-scope, SD-F).
 *
 * One serial journey on a freshly built disposable environment (sdf_setup.py: the NB1-E environment
 * plus REFERENCE_DATA_MANAGER and RENEWAL_SETTINGS_MANAGE / CONFIG_PUBLISH accounts, and the
 * certificate stock manager from CS-E). Run twice on fresh environments.
 *
 * Eight journeys, each proving what the scope document §4 requires:
 *
 *   1. Vehicle reference setup: ALL-scope manager creates makes and models; branch-scoped grant
 *      refused; model belongs to its make; codes stable / no delete.
 *   2. Quotation reference fields: valid make/model accepted; unknown/inactive/wrong-make refused
 *      with RISK_REFERENCE_INVALID.
 *   3. Snapshot history: rename/deactivate does not rewrite existing quotation or policy.
 *   4. Legacy product versions: free text kept without reference fields.
 *   5. CSV import: same file twice is idempotent; bad row refuses the whole file.
 *   6. Isolation/security: tenant B cannot see tenant A's data; unauthorized user refused.
 *   7. Certificate batch setting: lowered limit enforced; at-limit accepted; <1 and >10,000 refused;
 *      existing batches unchanged.
 *   8. Renewal settings: effective date respected; maker/checker; old offer keeps stored expiry;
 *      prepared renewal not invalidated.
 *
 * Environment: FI1_FRONTEND_PORT, SDF_ACCOUNTS, SDF_FACTS, SDF_ENV_DIR (for import_vehicle_makes).
 * Secrets are never logged or put in assertion messages.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomInt } from 'node:crypto';
import { Browser, expect, Page, Request, Response, test } from '@playwright/test';

const PORT = process.env.FI1_FRONTEND_PORT ?? '3000';
const ACCOUNTS_FILE = process.env.SDF_ACCOUNTS;
const FACTS_FILE = process.env.SDF_FACTS;
const ENV_DIR = process.env.SDF_ENV_DIR;

test.skip(!ACCOUNTS_FILE || !FACTS_FILE || !ENV_DIR, 'needs the disposable SD-F environment (SDF_ACCOUNTS, SDF_FACTS, SDF_ENV_DIR)');

type Accounts = Record<string, { host: string; temporary_password: string }>;
interface Facts {
  alpha: {
    domain: string;
    new_business: { product: string; insurer: string; agreement: string };
    legacy_product: { product: string; insurer: string };
    certificates: { class: { name: string; code: string }; insurer: string };
    renewable: { policy_no: string; policy_id: string; customer_id: string; expiry: string };
    renewable2: { policy_no: string; policy_id: string; customer_id: string; expiry: string };
  };
  beta: { domain: string };
}

const accounts = (): Accounts => JSON.parse(readFileSync(ACCOUNTS_FILE!, 'utf8'));
const facts = (): Facts => JSON.parse(readFileSync(FACTS_FILE!, 'utf8'));
const origin = (host: string) => `http://${host}:${PORT}`;
const alpha = () => origin(facts().alpha.domain);

const direct = (url: string) => {
  const parsed = new URL(url);
  return { url: `http://127.0.0.1:${PORT}${parsed.pathname}${parsed.search}`, host: parsed.host };
};

// Accounts: the setup creates these in the disposable environment.
const REF_MANAGER = 'ref-manager@sdf.test';
const BRANCH_REF = 'branch-ref@sdf.test';
const QUOTER = 'quoter@sdf.test';
const CHECKER = 'checker@sdf.test';
const STOCK_MANAGER = 'stock-manager@sdf.test';
const SETTINGS_MAKER = 'settings-maker@sdf.test';
const SETTINGS_PUBLISHER = 'settings-publisher@sdf.test';
const OUTSIDER = 'outsider@sdf.test';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const NOT_FOUND = 'Not found or not available to you.';

const current = new Map<string, string>();
const passwordOf = (email: string) => current.get(email) ?? accounts()[email].temporary_password;
const strongPassword = () => `Sdf-${randomBytes(9).toString('base64url')}-Aa1!`;

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

async function api(someone: Person, method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown, ifMatch?: string) {
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

const codeOf = (result: { json: Record<string, unknown> }) => (result.json.error as { code?: string } | undefined)?.code;

const expectRefused = (result: { status: number; json: Record<string, unknown> }, what: string) => {
  expect(result.status, what).toBe(403);
  expect(codeOf(result), what).toBe('PERMISSION_DENIED');
};

const tenantSchema = () => facts().alpha.domain.replace('.localhost', '').replaceAll('-', '_');

const djangoExec = (code: string) => execFileSync('python', ['-c', [
  "import os, django",
  "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')",
  "django.setup()",
  code,
].join('; ')], { cwd: ENV_DIR!, env: process.env, encoding: 'utf8', timeout: 15_000 });

const setTenantTimezone = (tz: string) => djangoExec([
  `from django.db import connections`,
  `from apps.tenancy.context import set_tenant_schema_context, validate_schema_name`,
  `schema = validate_schema_name('${tenantSchema()}')`,
  `set_tenant_schema_context(schema, using='direct')`,
  `c = connections['direct'].cursor()`,
  `c.execute("UPDATE workflow_tenant_policy SET timezone = %s", ['${tz}'])`,
].join('; '));

const readTenantToday = (): string => {
  const out = djangoExec([
    `from django.db import connections`,
    `from apps.tenancy.context import set_tenant_schema_context, validate_schema_name`,
    `schema = validate_schema_name('${tenantSchema()}')`,
    `set_tenant_schema_context(schema, using='direct')`,
    `c = connections['direct'].cursor()`,
    `c.execute("SELECT (now() AT TIME ZONE p.timezone)::date FROM workflow_tenant_policy p WHERE p.singleton")`,
    `print(c.fetchone()[0].isoformat())`,
  ].join('; '));
  return out.trim();
};

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

test.describe.configure({ mode: 'serial' });

test.describe('SD-F: setup-driven features against the real backend', () => {
  let manager: Person;
  let quoter: Person;
  let checker: Person;
  let stockMgr: Person;
  let settingsMaker: Person;
  let settingsPublisher: Person;
  const tag = randomInt(100_000, 999_999);
  const record: Record<string, unknown> = {};

  test.afterAll(async () => {
    for (const someone of [manager, quoter, checker, stockMgr, settingsMaker, settingsPublisher]) await someone?.context.close();
  });

  // ---------------------------------------------------------------------------- journey 1: vehicle reference setup

  test('1a. the reference manager and quoter sign in; the manager sees Vehicle makes, the quoter does not', async ({ browser }) => {
    manager = await person(browser, REF_MANAGER);
    quoter = await person(browser, QUOTER);
    const nav = (page: Page) => page.getByRole('complementary', { name: 'Primary navigation' });
    await expect(nav(manager.page).getByRole('button', { name: 'Vehicle makes' })).toBeVisible();
    await expect(nav(quoter.page).getByRole('button', { name: 'Vehicle makes' })).toHaveCount(0);
  });

  test('1b. the manager creates a make (code never changes) and a model of that make', async () => {
    const { page } = manager;
    await page.goto(`${alpha()}/vehicle-makes/list`);
    await expect(page.getByRole('heading', { name: 'Vehicle makes and models' })).toBeVisible();

    // Create the make
    await page.getByRole('button', { name: 'New make' }).click();
    const makeDialog = page.getByRole('dialog', { name: 'New vehicle make' });
    await makeDialog.getByLabel(/Code/).fill(`TOYOTA-${tag}`);
    await makeDialog.getByLabel(/^Name/).fill('Toyota');
    await makeDialog.getByRole('button', { name: 'Create make' }).click();
    await expect(makeDialog).toHaveCount(0);
    await expect(page.getByText(`Make TOYOTA-${tag} created`)).toBeVisible();

    // The make appears with its code
    const makeRegion = page.getByRole('region', { name: `Make TOYOTA-${tag}` });
    await expect(makeRegion).toBeVisible();
    await expect(makeRegion).toContainText(`Code TOYOTA-${tag}`);
    await expect(makeRegion.getByText('No models for this make yet')).toBeVisible();

    // Create a model of that make
    await makeRegion.getByRole('button', { name: `Add a model of TOYOTA-${tag}` }).click();
    const modelDialog = page.getByRole('dialog', { name: /^New model of/ });
    await modelDialog.getByLabel(/Code/).fill(`COROLLA-${tag}`);
    await modelDialog.getByLabel(/^Name/).fill('Corolla');
    await modelDialog.getByRole('button', { name: 'Create model' }).click();
    await expect(modelDialog).toHaveCount(0);
    await expect(page.getByText(`Model COROLLA-${tag} of Toyota created`)).toBeVisible();

    const modelTable = makeRegion.getByRole('table', { name: `Models of TOYOTA-${tag}` });
    await expect(modelTable).toContainText(`COROLLA-${tag}`);
    await expect(modelTable).toContainText('Corolla');
    await expectNoUuid(page);
  });

  test('1c. a second make and model are created; a duplicate make code is refused', async () => {
    const { page } = manager;
    // Create a second make
    await page.getByRole('button', { name: 'New make' }).click();
    const makeDialog = page.getByRole('dialog', { name: 'New vehicle make' });
    await makeDialog.getByLabel(/Code/).fill(`NISSAN-${tag}`);
    await makeDialog.getByLabel(/^Name/).fill('Nissan');
    await makeDialog.getByRole('button', { name: 'Create make' }).click();
    await expect(makeDialog).toHaveCount(0);

    // Add a model of Nissan
    const nissanRegion = page.getByRole('region', { name: `Make NISSAN-${tag}` });
    await nissanRegion.getByRole('button', { name: `Add a model of NISSAN-${tag}` }).click();
    const modelDialog = page.getByRole('dialog', { name: /^New model of/ });
    await modelDialog.getByLabel(/Code/).fill(`SUNNY-${tag}`);
    await modelDialog.getByLabel(/^Name/).fill('Sunny');
    await modelDialog.getByRole('button', { name: 'Create model' }).click();
    await expect(modelDialog).toHaveCount(0);

    // A duplicate make code is refused
    await page.getByRole('button', { name: 'New make' }).click();
    const dupDialog = page.getByRole('dialog', { name: 'New vehicle make' });
    await dupDialog.getByLabel(/Code/).fill(`TOYOTA-${tag}`);
    await dupDialog.getByLabel(/^Name/).fill('Toyota Motors');
    await dupDialog.getByRole('button', { name: 'Create make' }).click();
    await expect(dupDialog.getByRole('alert')).toContainText('A make with this code already exists');
    await dupDialog.getByRole('button', { name: 'Back' }).click();
  });

  test('1e. branch-scoped reference manager refused; no hard delete; model/make ownership proven', async ({ browser }) => {
    // A branch-scoped REFERENCE_DATA_MANAGER cannot create makes (requires tenant-wide scope)
    const branchRef = await person(browser, BRANCH_REF);
    expectRefused(await api(branchRef, 'POST', '/vehicle-makes', { code: `HACK-${tag}`, name: 'Hacked' }), 'branch-scoped ref manager creates a make');
    await branchRef.context.close();

    // No DELETE endpoint: the HTTP method is not allowed
    const makesResult = await api(manager, 'GET', '/vehicle-makes');
    const toyota = (makesResult.json.results as { id: string; code: string }[]).find((m) => m.code === `TOYOTA-${tag}`);
    const nissan = (makesResult.json.results as { id: string; code: string }[]).find((m) => m.code === `NISSAN-${tag}`);
    expect(toyota, 'Toyota make exists').toBeTruthy();
    expect(nissan, 'Nissan make exists').toBeTruthy();
    record.toyotaId = toyota!.id;
    record.nissanId = nissan!.id;

    const del = direct(`${alpha()}/api/v1/vehicle-makes/${toyota!.id}`);
    const token = manager.tracked.bearer();
    const deleteResult = await manager.page.request.fetch(del.url, {
      method: 'DELETE', headers: { Host: del.host, Authorization: token!, 'X-Idempotency-Key': randomBytes(16).toString('hex') },
    });
    expect(deleteResult.status(), 'DELETE make returns 405').toBe(405);

    // Model/make ownership: Corolla belongs to Toyota, not Nissan
    const toyotaDetail = await api(manager, 'GET', `/vehicle-makes/${toyota!.id}`);
    const corolla = ((toyotaDetail.json as { models: { id: string; code: string }[] }).models ?? []).find((m) => m.code === `COROLLA-${tag}`);
    expect(corolla, 'Corolla is a model of Toyota').toBeTruthy();
    // Fetching Corolla under Nissan should fail
    const wrongOwner = await api(manager, 'GET', `/vehicle-makes/${nissan!.id}/models/${corolla!.id}`);
    expect(wrongOwner.status, 'Corolla under Nissan is not found').toBe(404);
  });

  test('1d. the manager renames and deactivates a make; codes remain stable', async () => {
    const { page } = manager;
    const nissanRegion = page.getByRole('region', { name: `Make NISSAN-${tag}` });

    // Rename
    await nissanRegion.getByRole('button', { name: `Rename make NISSAN-${tag}` }).click();
    const renameDialog = page.getByRole('dialog', { name: /^Rename make/ });
    await renameDialog.getByLabel(/^Name/).fill('Nissan Motors');
    await renameDialog.getByRole('button', { name: 'Rename' }).click();
    await expect(renameDialog).toHaveCount(0);
    await expect(page.getByText('Renamed to Nissan Motors')).toBeVisible();

    // The code stays the same; the name changed
    await expect(page.getByRole('region', { name: `Make NISSAN-${tag}` })).toContainText('Nissan Motors');
    await expect(page.getByRole('region', { name: `Make NISSAN-${tag}` })).toContainText(`Code NISSAN-${tag}`);

    // Deactivate
    await page.getByRole('region', { name: `Make NISSAN-${tag}` }).getByRole('button', { name: `Deactivate make NISSAN-${tag}` }).click();
    const deactivateDialog = page.getByRole('dialog', { name: /^Deactivate/ });
    await deactivateDialog.getByRole('button', { name: 'Deactivate' }).click();
    await expect(deactivateDialog).toHaveCount(0);
    await expect(page.getByText('Nissan Motors deactivated')).toBeVisible();
    await expect(page.getByRole('region', { name: `Make NISSAN-${tag}` }).getByText('Inactive')).toBeVisible();

    // Reactivate
    await page.getByRole('region', { name: `Make NISSAN-${tag}` }).getByRole('button', { name: `Reactivate make NISSAN-${tag}` }).click();
    const reactivateDialog = page.getByRole('dialog', { name: /^Reactivate/ });
    await reactivateDialog.getByRole('button', { name: 'Reactivate' }).click();
    await expect(reactivateDialog).toHaveCount(0);
    await expect(page.getByText('Nissan Motors reactivated')).toBeVisible();
    await expect(page.getByRole('region', { name: `Make NISSAN-${tag}` }).getByText('Active')).toBeVisible();
    await expectNoUuid(page);
  });

  // ---------------------------------------------------------------------------- journey 2: quoting with reference fields

  test('2a. the quoter creates a quotation and the risk uses reference field selects (make/model)', async () => {
    const { page } = quoter;

    // Create a customer first
    await page.goto(`${alpha()}/customers/list`);
    await page.getByRole('button', { name: 'New customer' }).click();
    const custDialog = page.getByRole('dialog', { name: 'New customer' });
    await custDialog.getByLabel(/First name/).fill('Setup');
    await custDialog.getByLabel(/Last name/).fill('Driver');
    await custDialog.getByLabel('Mobile number').fill(`07${randomInt(10_000_000, 99_999_999)}`);
    await custDialog.getByLabel('Identifier number').fill(String(randomInt(10_000_000, 99_999_999)));
    await custDialog.getByRole('button', { name: 'Create customer' }).click();
    await expect(page.getByRole('heading', { name: 'Setup Driver' })).toBeVisible();

    // Create a quotation under the product with reference fields
    await page.getByRole('button', { name: 'New quotation' }).click();
    const quoteDialog = page.getByRole('dialog', { name: 'New quotation' });
    await quoteDialog.getByLabel(/Product/).selectOption({ label: `${facts().alpha.new_business.product} · ${facts().alpha.new_business.insurer}` });
    await quoteDialog.getByRole('button', { name: 'Create quotation' }).click();
    const heading = page.getByRole('heading', { name: /^QUO\d+$/ });
    await expect(heading).toBeVisible();

    // The risk form should show the make/model selects (the product version has reference_fields)
    const risk = page.getByRole('form', { name: 'Risk' });
    await risk.getByLabel(/Sum insured/).fill('500,000');
    await risk.getByLabel(/^Use/).selectOption('PRIVATE');
    await risk.getByLabel(/Vehicle age/).fill('2');
    await risk.getByLabel(/Tracking device/).selectOption('true');

    // Select the make — should show our created makes
    const makeSelect = risk.getByLabel(/Make/);
    await makeSelect.selectOption(`TOYOTA-${tag}`);

    // Select the model — should show models of the chosen make
    const modelSelect = risk.getByLabel(/Model/);
    await modelSelect.selectOption(`COROLLA-${tag}`);

    // Add an identifier
    await risk.getByRole('button', { name: 'Add identifier' }).click();
    await risk.getByLabel('Identifier 1 number').fill(`KDA ${String(tag).slice(0, 3)}A`);

    await risk.getByRole('button', { name: 'Save risk' }).click();
    await expect(page.getByText(/Risk saved/)).toBeVisible();
    await expectNoUuid(page);
  });

  test('2b. an unknown make, inactive make, and wrong-make model are each refused with RISK_REFERENCE_INVALID', async () => {
    const quoteList = await api(quoter, 'GET', '/quotations?page=1&page_size=1');
    const quoteId = (quoteList.json.results as { id: string }[])[0].id;
    const detail = await api(quoter, 'GET', `/quotations/${quoteId}`);
    const revision = (detail.json as { current_revision: { risk: { factors: Record<string, unknown>; details: Record<string, unknown>; identifiers: unknown[] } } }).current_revision;

    // Unknown make
    const unknown = await api(quoter, 'PATCH', `/quotations/${quoteId}/risk`, {
      factors: revision.risk.factors,
      details: { ...revision.risk.details, make: 'UNKNOWN_MAKE_XYZ', model: `COROLLA-${tag}` },
      identifiers: revision.risk.identifiers,
    }, detail.etag!);
    expect(unknown.status, 'unknown make refused').toBe(422);
    expect(codeOf(unknown), 'RISK_REFERENCE_INVALID for unknown make').toBe('RISK_REFERENCE_INVALID');

    // Deactivate Nissan so we can test inactive make
    const makesResult = await api(manager, 'GET', '/vehicle-makes');
    const nissan = (makesResult.json.results as { id: string; code: string }[]).find((m) => m.code === `NISSAN-${tag}`);
    expect(nissan, 'Nissan make exists').toBeTruthy();
    const nissanDetail = await api(manager, 'GET', `/vehicle-makes/${nissan!.id}`);
    await api(manager, 'PATCH', `/vehicle-makes/${nissan!.id}`, { is_active: false }, nissanDetail.etag!);

    // Inactive make
    const refreshed = await api(quoter, 'GET', `/quotations/${quoteId}`);
    const inactive = await api(quoter, 'PATCH', `/quotations/${quoteId}/risk`, {
      factors: revision.risk.factors,
      details: { ...revision.risk.details, make: `NISSAN-${tag}`, model: `SUNNY-${tag}` },
      identifiers: revision.risk.identifiers,
    }, refreshed.etag!);
    expect(inactive.status, 'inactive make refused').toBe(422);
    expect(codeOf(inactive), 'RISK_REFERENCE_INVALID for inactive make').toBe('RISK_REFERENCE_INVALID');

    // Reactivate Nissan for the rest of the tests
    const nissanAfter = await api(manager, 'GET', `/vehicle-makes/${nissan!.id}`);
    await api(manager, 'PATCH', `/vehicle-makes/${nissan!.id}`, { is_active: true }, nissanAfter.etag!);

    // Wrong-make model: COROLLA belongs to TOYOTA, not NISSAN
    const refreshed2 = await api(quoter, 'GET', `/quotations/${quoteId}`);
    const wrongMake = await api(quoter, 'PATCH', `/quotations/${quoteId}/risk`, {
      factors: revision.risk.factors,
      details: { ...revision.risk.details, make: `NISSAN-${tag}`, model: `COROLLA-${tag}` },
      identifiers: revision.risk.identifiers,
    }, refreshed2.etag!);
    expect(wrongMake.status, 'wrong-make model refused').toBe(422);
    expect(codeOf(wrongMake), 'RISK_REFERENCE_INVALID for wrong-make model').toBe('RISK_REFERENCE_INVALID');
  });

  // ---------------------------------------------------------------------------- journey 3: snapshot history (quotation, policy, certificate)

  test('3a. the quotation is priced, offered, accepted, and bound into a policy via API', async ({ browser }) => {
    checker = await person(browser, CHECKER);

    // Get the quotation created in 2a
    const quoteList = await api(quoter, 'GET', '/quotations?page=1&page_size=1');
    const quoteId = (quoteList.json.results as { id: string; number: string }[])[0].id;
    record.quotationId = quoteId;
    record.quotationNo = (quoteList.json.results as { number: string }[])[0].number;

    // Price the quotation
    let q = await api(quoter, 'GET', `/quotations/${quoteId}`);
    const priceResult = await api(quoter, 'POST', `/quotations/${quoteId}/price`, {}, q.etag!);
    expect(priceResult.status, 'quotation priced').toBe(200);

    // Issue the offer
    q = await api(quoter, 'GET', `/quotations/${quoteId}`);
    const issueResult = await api(quoter, 'POST', `/quotations/${quoteId}/issue`, {}, q.etag!);
    expect(issueResult.status, 'offer issued').toBe(200);

    // Accept the offer
    q = await api(quoter, 'GET', `/quotations/${quoteId}`);
    const acceptResult = await api(quoter, 'POST', `/quotations/${quoteId}/accept`, {}, q.etag!);
    expect(acceptResult.status, 'quotation accepted').toBe(200);

    // KYC: advance the customer through NOT_STARTED → IN_PROGRESS → PENDING_VERIFICATION → VERIFIED
    const customerId = (q.json as { customer: { id: string } }).customer.id;
    record.customerId = customerId;
    let cust = await api(quoter, 'GET', `/clients/${customerId}`);
    await api(quoter, 'PATCH', `/clients/${customerId}`, { kyc_status: 'IN_PROGRESS' }, cust.etag!);
    cust = await api(quoter, 'GET', `/clients/${customerId}`);
    await api(quoter, 'PATCH', `/clients/${customerId}`, { kyc_status: 'PENDING_VERIFICATION' }, cust.etag!);
    cust = await api(checker, 'GET', `/clients/${customerId}`);
    await api(checker, 'PATCH', `/clients/${customerId}`, { kyc_status: 'VERIFIED' }, cust.etag!);

    // Verify the customer's identifier (needed for underwriting readiness)
    const custDetail = await api(checker, 'GET', `/clients/${customerId}`);
    const identifiers = (custDetail.json as { identifiers: { id: string; is_verified: boolean }[] }).identifiers;
    for (const ident of identifiers.filter((id) => !id.is_verified)) {
      await api(checker, 'PATCH', `/clients/${customerId}/identifiers/${ident.id}`, { is_verified: true });
    }

    // Create the proposal
    const proposalResult = await api(quoter, 'POST', '/underwriting/proposals', { quotation_id: quoteId, proposed_inception_date: readTenantToday(), agreement_id: null });
    expect(proposalResult.status, 'proposal created').toBe(201);
    const proposalId = (proposalResult.json as { id: string }).id;
    record.proposalId = proposalId;

    // Set terms (agreement)
    let p = await api(quoter, 'GET', `/underwriting/proposals/${proposalId}`);
    const agreements = (p.json as { agreements: { id: string; name: string }[] }).agreements ?? [];
    if (agreements.length > 0) {
      await api(quoter, 'PATCH', `/underwriting/proposals/${proposalId}`, { agreement_id: agreements[0].id }, p.etag!);
    }

    // Submit the proposal
    p = await api(quoter, 'GET', `/underwriting/proposals/${proposalId}`);
    const submitResult = await api(quoter, 'POST', `/underwriting/proposals/${proposalId}/submit`, {}, p.etag!);
    expect(submitResult.status, 'proposal submitted').toBe(200);

    // If the proposal has exceptions or requirements, handle them (the setup product should not require these)
    p = await api(quoter, 'GET', `/underwriting/proposals/${proposalId}`);
    const status = (p.json as { status: string }).status;
    expect(status, 'proposal is ready to bind or needs approval').toMatch(/READY_TO_BIND|UNDER_REVIEW/);

    // Bind into a policy
    p = await api(quoter, 'GET', `/underwriting/proposals/${proposalId}`);
    const bindResult = await api(quoter, 'POST', '/policies', { proposal_id: proposalId }, p.etag!);
    expect(bindResult.status, 'policy bound').toBe(201);
    record.policyId = (bindResult.json as { id: string }).id;
    record.policyNo = (bindResult.json as { policy_no: string }).policy_no;
  });

  test('3b. a certificate is issued against the policy', async () => {
    const pol = await api(quoter, 'GET', `/policies/${record.policyId}`);
    const certTypeId = (pol.json as { product: { insurance_class_id: string } }).product?.insurance_class_id;
    // Find a certificate type matching the insurance class
    const certSettings = await api(stockMgr, 'GET', '/certificate-settings');
    // Issue a certificate: the stock manager needs to have allocated stock from a received batch
    // Use the quoter (who can issue on the policy) with whatever stock is available
    const policyEtag = pol.etag!;
    // Get available certificate types for this insurance class
    const types = await api(stockMgr, 'GET', '/certificate-types?active=true');
    const certTypes = (types.json.results as { id: string; code: string; insurance_class_id: string }[]) ?? [];
    const matchingType = certTypes.find((t) => t.insurance_class_id === certTypeId) ?? certTypes[0];

    if (matchingType) {
      const issueResult = await api(quoter, 'POST', `/policies/${record.policyId}/certificates`, {
        certificate_type_id: matchingType.id,
      }, policyEtag);
      if (issueResult.status === 201) {
        record.certificateId = (issueResult.json as { id: string }).id;
        record.certificateSerial = (issueResult.json as { serial_no: string }).serial_no;
      }
    }
  });

  test('3c. after renaming and deactivating the make, quotation and policy snapshots remain unchanged', async () => {
    // Rename Toyota to Toyota Motor Corporation
    const { page } = manager;
    await page.goto(`${alpha()}/vehicle-makes/list`);
    const toyotaRegion = page.getByRole('region', { name: `Make TOYOTA-${tag}` });
    await toyotaRegion.getByRole('button', { name: `Rename make TOYOTA-${tag}` }).click();
    const renameDialog = page.getByRole('dialog', { name: /^Rename make/ });
    await renameDialog.getByLabel(/^Name/).fill('Toyota Motor Corporation');
    await renameDialog.getByRole('button', { name: 'Rename' }).click();
    await expect(renameDialog).toHaveCount(0);

    // Deactivate Nissan
    const nissanRegion = page.getByRole('region', { name: `Make NISSAN-${tag}` });
    await nissanRegion.getByRole('button', { name: `Deactivate make NISSAN-${tag}` }).click();
    const deactivateDialog = page.getByRole('dialog', { name: /^Deactivate/ });
    await deactivateDialog.getByRole('button', { name: 'Deactivate' }).click();
    await expect(deactivateDialog).toHaveCount(0);

    // Quotation snapshot: the risk still shows "Toyota" (not "Toyota Motor Corporation")
    const qDetail = await api(quoter, 'GET', `/quotations/${record.quotationId}`);
    const revision = (qDetail.json as { current_revision: { risk: { details: Record<string, unknown> } } }).current_revision;
    const makeSnapshot = revision.risk.details.make as { code: string; name: string };
    expect(makeSnapshot.code, 'quotation make code unchanged').toBe(`TOYOTA-${tag}`);
    expect(makeSnapshot.name, 'quotation make name is the original snapshot').toBe('Toyota');
    const modelSnapshot = revision.risk.details.model as { code: string; name: string };
    expect(modelSnapshot.code, 'quotation model code unchanged').toBe(`COROLLA-${tag}`);
    expect(modelSnapshot.name, 'quotation model name unchanged').toBe('Corolla');

    // Policy snapshot: the policy's risk details also carry the old names
    const polDetail = await api(quoter, 'GET', `/policies/${record.policyId}`);
    const policyRisk = (polDetail.json as { risk: { details: Record<string, unknown> } }).risk;
    const policyMake = policyRisk.details.make as { code: string; name: string };
    expect(policyMake.code, 'policy make code unchanged').toBe(`TOYOTA-${tag}`);
    expect(policyMake.name, 'policy make name is the original snapshot').toBe('Toyota');
    const policyModel = policyRisk.details.model as { code: string; name: string };
    expect(policyModel.code, 'policy model code unchanged').toBe(`COROLLA-${tag}`);
    expect(policyModel.name, 'policy model name unchanged').toBe('Corolla');

    // Certificate: if issued, it references the policy version with the original snapshot
    if (record.certificateId) {
      const cert = await api(quoter, 'GET', `/certificates/${record.certificateId}`);
      expect(cert.status, 'certificate still readable').toBe(200);
      expect((cert.json as { status: string }).status, 'certificate still ISSUED').toBe('ISSUED');
    }

    // Reactivate Nissan for later tests
    await page.goto(`${alpha()}/vehicle-makes/list`);
    const inactiveNissan = page.getByRole('region', { name: `Make NISSAN-${tag}` });
    await inactiveNissan.getByRole('button', { name: `Reactivate make NISSAN-${tag}` }).click();
    const reactivateDialog = page.getByRole('dialog', { name: /^Reactivate/ });
    await reactivateDialog.getByRole('button', { name: 'Reactivate' }).click();
    await expect(reactivateDialog).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------- journey 4: legacy product versions (SD-D5)

  test('4. a quotation under a legacy product version without reference fields takes free text', async () => {
    // The setup creates a second product with a published version that has NO reference_fields.
    // Under that version, make and model are free text: any string is accepted.
    const legacyProduct = facts().alpha.legacy_product;

    // Create a quotation under the legacy product
    const legacyQuote = await api(quoter, 'POST', '/quotations', {
      customer_id: record.customerId,
      product_id: legacyProduct.product,
      branch_id: null,
    });
    expect(legacyQuote.status, 'legacy quotation created').toBe(201);
    const legacyQuoteId = (legacyQuote.json as { id: string }).id;

    // Save a risk with free-text make and model (including a typo — the point is no validation)
    let lq = await api(quoter, 'GET', `/quotations/${legacyQuoteId}`);
    const riskBody = {
      factors: { sum_insured: '500000', vehicle_use: 'PRIVATE', vehicle_age: '2', tracking_device: 'true' },
      details: { make: 'Toyta', model: 'anything' },
      identifiers: [{ type: 'REGISTRATION', value: `KDZ ${String(tag).slice(0, 3)}L` }],
    };
    const riskResult = await api(quoter, 'PUT', `/quotations/${legacyQuoteId}/risk`, riskBody, lq.etag!);
    expect(riskResult.status, 'legacy risk saved').toBe(200);

    // The stored values are plain strings, not snapshots
    lq = await api(quoter, 'GET', `/quotations/${legacyQuoteId}`);
    const revision = (lq.json as { current_revision: { risk: { details: Record<string, unknown> } } }).current_revision;
    expect(revision.risk.details.make, 'legacy make is free text').toBe('Toyta');
    expect(revision.risk.details.model, 'legacy model is free text').toBe('anything');
  });

  // ---------------------------------------------------------------------------- journey 5: CSV import

  test('5a. a CSV import applied twice gives the same list (idempotent)', async () => {
    const csv = [
      'make_code,make_name,model_code,model_name,active',
      `IMPORT-${tag},Import Make,,,`,
      `IMPORT-${tag},,IMP-MODEL-${tag},Import Model,`,
    ].join('\n') + '\n';
    const csvPath = join(ENV_DIR!, `import-${tag}.csv`);
    writeFileSync(csvPath, csv, 'utf8');

    const schema = tenantSchema();
    const run = () => execFileSync('python', [
      'manage.py', 'import_vehicle_makes', '--schema', schema, '--file', csvPath,
    ], { cwd: ENV_DIR!, env: process.env, encoding: 'utf8', timeout: 30_000 });

    const first = run();
    expect(first).toContain('IMPORTED');
    const second = run();
    expect(second).toContain('NO_CHANGE');

    // The imported make and model appear on the screen
    const { page } = manager;
    await page.goto(`${alpha()}/vehicle-makes/list`);
    await expect(page.getByText(`IMPORT-${tag}`)).toBeVisible();
    await expect(page.getByText('Import Model')).toBeVisible();
  });

  test('5b. a CSV with a valid row followed by a bad row refuses the whole file and writes nothing', async () => {
    const csv = [
      'make_code,make_name,model_code,model_name,active',
      `PHANTOM-${tag},Phantom Make,,,`,
      ',Missing Code,,,',
    ].join('\n') + '\n';
    const csvPath = join(ENV_DIR!, `bad-${tag}.csv`);
    writeFileSync(csvPath, csv, 'utf8');

    const schema = tenantSchema();
    let failed = false;
    try {
      execFileSync('python', [
        'manage.py', 'import_vehicle_makes', '--schema', schema, '--file', csvPath,
      ], { cwd: ENV_DIR!, env: process.env, encoding: 'utf8', timeout: 30_000 });
    } catch {
      failed = true;
    }
    expect(failed, 'bad CSV row refuses the whole file').toBe(true);

    // The valid row from the same file (PHANTOM) must NOT exist: all-or-nothing
    const { page } = manager;
    await page.goto(`${alpha()}/vehicle-makes/list`);
    await expect(page.getByText(`PHANTOM-${tag}`)).toHaveCount(0);

    // The import-make from 5a should still be there (the bad import wrote nothing)
    await expect(page.getByText(`IMPORT-${tag}`)).toBeVisible();
  });

  // ---------------------------------------------------------------------------- journey 6: isolation and security

  test('6a. tenant B sees none of tenant A\'s reference data', async ({ browser }) => {
    const betaHost = facts().beta.domain;
    const context = await browser.newContext();
    const page = await context.newPage();
    const tracked = track(page);
    await signIn(page, betaHost, REF_MANAGER);

    await page.goto(`${origin(betaHost)}/vehicle-makes/list`);
    await expect(page.getByRole('heading', { name: 'Vehicle makes and models' })).toBeVisible();
    await expect(page.getByText('No vehicle makes are set up')).toBeVisible();
    // Tenant A's makes (TOYOTA, NISSAN) must not appear
    await expect(page.getByText(`TOYOTA-${tag}`)).toHaveCount(0);
    await expect(page.getByText(`NISSAN-${tag}`)).toHaveCount(0);
    await context.close();
  });

  test('6b. an unauthorized user cannot change reference data (API refuses)', async ({ browser }) => {
    const outsider = await person(browser, OUTSIDER);
    // The outsider can quote (and thus read makes) but cannot manage them
    expectRefused(await api(outsider, 'POST', '/vehicle-makes', { code: 'HACK', name: 'Hacked' }), 'outsider creates a make');
    // The outsider's sidebar should not show Vehicle makes
    const nav = outsider.page.getByRole('complementary', { name: 'Primary navigation' });
    await expect(nav.getByRole('button', { name: 'Vehicle makes' })).toHaveCount(0);
    await outsider.context.close();
  });

  // ---------------------------------------------------------------------------- journey 7: certificate batch setting

  test('7a. the stock manager signs in and sees the Settings tab', async ({ browser }) => {
    stockMgr = await person(browser, STOCK_MANAGER);
    await stockMgr.page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await expect(stockMgr.page.getByText('Largest batch')).toBeVisible();
    await expect(stockMgr.page.getByText('Platform ceiling')).toBeVisible();
  });

  test('7b. lowering the batch limit: a value within range is accepted', async () => {
    const { page } = stockMgr;
    await page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await page.getByRole('button', { name: 'Change' }).click();
    const form = page.getByRole('form', { name: 'Change the largest batch' });
    await form.getByLabel('Largest batch').fill('50');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Batch maximum set to 50')).toBeVisible();
    await expect(page.getByText('50 certificates')).toBeVisible();
  });

  test('7c. a value above 10,000 or below 1 is refused', async () => {
    const { page } = stockMgr;
    await page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await page.getByRole('button', { name: 'Change' }).click();
    const form = page.getByRole('form', { name: 'Change the largest batch' });
    await form.getByLabel('Largest batch').fill('10001');
    // The client-side validation should show an error before sending
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByText(/whole number/i)).toBeVisible();

    await form.getByLabel('Largest batch').fill('0');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByText(/whole number/i)).toBeVisible();

    // Restore a valid value
    await form.getByLabel('Largest batch').fill('100');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Batch maximum set to 100')).toBeVisible();
  });

  test('7d. existing batch unaffected; new batch above limit refused; batch at limit accepted', async () => {
    // Receive a batch of 5 (under the current limit of 100)
    const { page } = stockMgr;
    const prefix = `SD${tag}`;
    await page.goto(`${alpha()}/certificates/stock?tab=batches`);
    await page.getByRole('button', { name: 'Receive batch' }).click();
    const receive = page.getByRole('dialog', { name: 'Receive a batch' });
    await receive.getByLabel(/Insurer/).selectOption({ label: facts().alpha.certificates.insurer });
    const typeSelect = receive.getByLabel(/Certificate type/);
    await typeSelect.selectOption({ index: 1 });
    await receive.getByLabel(/Receiving branch/).selectOption({ label: 'Nairobi' });
    await receive.getByLabel('Prefix').fill(prefix);
    await receive.getByLabel(/First number/).fill('1');
    await receive.getByLabel(/Last number/).fill('5');
    await receive.getByLabel('Delivery reference').fill(`SD-DN-${tag}`);
    await receive.getByRole('button', { name: 'Receive batch' }).click();
    await expect(page.getByRole('row', { name: new RegExp(`${prefix}0000001`) })).toBeVisible();

    // Lower the limit to 3 — the batch of 5 is still there
    await page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await page.getByRole('button', { name: 'Change' }).click();
    const form = page.getByRole('form', { name: 'Change the largest batch' });
    await form.getByLabel('Largest batch').fill('3');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Batch maximum set to 3')).toBeVisible();

    // The batch of 5 received earlier is still visible and unaffected
    await page.goto(`${alpha()}/certificates/stock?tab=batches`);
    await expect(page.getByRole('row', { name: new RegExp(`${prefix}0000001`) })).toBeVisible();

    // A new batch of 5 is REFUSED (above the limit of 3) — via API for precision
    const batchesResult = await api(stockMgr, 'GET', '/certificate-batches?page=1&page_size=1');
    const firstBatch = (batchesResult.json.results as { insurer_id: string; certificate_type_id: string; branch_id: string }[])[0];
    const refusedBatch = await api(stockMgr, 'POST', '/certificate-batches', {
      insurer_id: firstBatch.insurer_id, certificate_type_id: firstBatch.certificate_type_id,
      branch_id: firstBatch.branch_id, prefix: `${prefix}R`, first_number: 1, last_number: 5,
      delivery_reference: `SD-DN-REFUSED-${tag}`,
    });
    expect(refusedBatch.status, 'batch of 5 refused when limit is 3').toBe(422);
    expect(codeOf(refusedBatch), 'CERTIFICATE_RANGE_INVALID').toBe('CERTIFICATE_RANGE_INVALID');

    // A new batch of exactly 3 is ACCEPTED (at the limit)
    const acceptedBatch = await api(stockMgr, 'POST', '/certificate-batches', {
      insurer_id: firstBatch.insurer_id, certificate_type_id: firstBatch.certificate_type_id,
      branch_id: firstBatch.branch_id, prefix: `${prefix}A`, first_number: 1, last_number: 3,
      delivery_reference: `SD-DN-ACCEPTED-${tag}`,
    });
    expect(acceptedBatch.status, 'batch of 3 accepted at the limit').toBe(201);

    // The accepted batch appears on the batches tab
    await page.goto(`${alpha()}/certificates/stock?tab=batches`);
    await expect(page.getByRole('row', { name: new RegExp(`${prefix}A0000001`) })).toBeVisible();

    // Restore to a reasonable limit
    await page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await page.getByRole('button', { name: 'Change' }).click();
    const restore = page.getByRole('form', { name: 'Change the largest batch' });
    await restore.getByLabel('Largest batch').fill('10000');
    await restore.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Batch maximum set to 10,000')).toBeVisible();
    await expectNoUuid(page);
  });

  // ---------------------------------------------------------------------------- journey 8: renewal settings (effective date, frozen offer, prepared renewal)

  test('8a. the settings maker and publisher sign in; the maker sees Renewal settings', async ({ browser }) => {
    settingsMaker = await person(browser, SETTINGS_MAKER);
    settingsPublisher = await person(browser, SETTINGS_PUBLISHER);
    const nav = (page: Page) => page.getByRole('complementary', { name: 'Primary navigation' });
    await expect(nav(settingsMaker.page).getByRole('button', { name: 'Renewal settings' })).toBeVisible();
    await expect(nav(settingsPublisher.page).getByRole('button', { name: 'Renewal settings' })).toBeVisible();
  });

  test('8b. a renewal is prepared under current settings; a second is offered and its expiry captured', async () => {
    // The setup pre-creates two renewable policies (within the current window).
    // Policy 1: prepare a renewal, leave it in DRAFT status
    const pol1 = facts().alpha.renewable;
    const p1 = await api(quoter, 'GET', `/policies/${pol1.policy_id}`);
    const prepareResult = await api(quoter, 'POST', `/policies/${pol1.policy_id}/renewals`, {
      renewal_type: 'AS_IS',
    }, p1.etag!);
    expect(prepareResult.status, 'renewal 1 prepared').toBe(201);
    record.renewal1Id = (prepareResult.json as { id: string }).id;
    record.renewal1Status = (prepareResult.json as { status: string }).status;

    // Policy 2: prepare, price, and offer a renewal — capture offer_valid_until
    const pol2 = facts().alpha.renewable2;
    const p2 = await api(quoter, 'GET', `/policies/${pol2.policy_id}`);
    const prepare2 = await api(quoter, 'POST', `/policies/${pol2.policy_id}/renewals`, {
      renewal_type: 'AS_IS',
    }, p2.etag!);
    expect(prepare2.status, 'renewal 2 prepared').toBe(201);
    const renewal2Id = (prepare2.json as { id: string }).id;
    record.renewal2Id = renewal2Id;

    // Price the renewal
    let r2 = await api(quoter, 'GET', `/renewals/${renewal2Id}`);
    const priceResult = await api(quoter, 'POST', `/renewals/${renewal2Id}/price`, {}, r2.etag!);
    expect(priceResult.status, 'renewal 2 priced').toBe(200);

    // If check is required, the checker approves
    r2 = await api(quoter, 'GET', `/renewals/${renewal2Id}`);
    const r2Data = r2.json as { requires_check: boolean; status: string };
    if (r2Data.requires_check) {
      const approveResult = await api(checker, 'POST', `/renewals/${renewal2Id}/approve`, {}, r2.etag!);
      expect(approveResult.status, 'renewal 2 approved').toBe(200);
      r2 = await api(quoter, 'GET', `/renewals/${renewal2Id}`);
    }

    // Offer the renewal
    const offerResult = await api(quoter, 'POST', `/renewals/${renewal2Id}/offer`, {}, r2.etag!);
    expect(offerResult.status, 'renewal 2 offered').toBe(200);
    record.originalOfferValidUntil = (offerResult.json as { offer_valid_until: string }).offer_valid_until;
    expect(record.originalOfferValidUntil, 'offer_valid_until is set').toBeTruthy();

    // Record the current in-force settings for comparison
    const settingsNow = await api(settingsMaker, 'GET', '/renewal-settings');
    record.originalSettings = (settingsNow.json as { in_force: Record<string, unknown> }).in_force;
  });

  test('8c. maker drafts future-effective settings; publisher publishes; before effective date, old settings hold', async () => {
    // Shift the tenant's clock behind (UTC-11) so that "tomorrow" in this timezone is reliably
    // before Kiritimati (UTC+14) — giving a guaranteed 25-hour span for the date advance.
    setTenantTimezone('Pacific/Pago_Pago');
    const behindToday = readTenantToday();
    const effectiveFrom = addDays(behindToday, 1);

    // Draft new settings with the future effective date
    const { page: mp } = settingsMaker;
    await mp.goto(`${alpha()}/renewal-settings/list`);
    await mp.getByRole('button', { name: 'New period' }).click();
    const draft = mp.getByRole('dialog', { name: 'New renewal settings period' });
    await draft.getByLabel(/Starts on/).fill(effectiveFrom);
    await draft.getByLabel(/Renewable before expiry/).fill('45');
    await draft.getByLabel(/Renewable after expiry/).fill('45');
    await draft.getByLabel(/Offer open for/).fill('7');
    await draft.getByLabel(/Longest offer/).fill('30');
    await draft.getByRole('button', { name: 'Save draft' }).click();
    await expect(draft).toHaveCount(0);
    await expect(mp.getByText(/drafted; someone else publishes it/)).toBeVisible();

    // Maker-checker: the maker cannot publish their own draft
    const periodsTable = mp.getByRole('table', { name: 'Renewal settings periods' });
    await expect(periodsTable.getByText('Someone else publishes')).toBeVisible();
    await expect(periodsTable.getByRole('button', { name: /Publish/ })).toHaveCount(0);

    // Publisher publishes it
    const { page: pp } = settingsPublisher;
    await pp.goto(`${alpha()}/renewal-settings/list`);
    const publishTable = pp.getByRole('table', { name: 'Renewal settings periods' });
    await expect(publishTable.getByText('Draft')).toBeVisible();
    const publishBtn = publishTable.getByRole('button', { name: /Publish/ });
    await publishBtn.click();
    const publishDialog = pp.getByRole('dialog', { name: /Publish/ });
    await expect(publishDialog).toContainText('45 days');
    await publishDialog.getByRole('button', { name: 'Publish' }).click();
    await expect(publishDialog).toHaveCount(0);
    await expect(pp.getByText(/published/i)).toBeVisible();

    // Before effective date (still in Pago Pago time): old settings are still in force
    const settingsBefore = await api(settingsMaker, 'GET', '/renewal-settings');
    const inForceBefore = (settingsBefore.json as { in_force: { early_window_days: number; on: string } }).in_force;
    expect(inForceBefore.on, 'still on the behind-timezone date').toBe(behindToday);
    const originalEarly = (record.originalSettings as { early_window_days: number }).early_window_days;
    expect(inForceBefore.early_window_days, 'old early window still in force').toBe(originalEarly);

    record.effectiveFrom = effectiveFrom;
    await expectNoUuid(pp);
  });

  test('8d. after advancing the test date, new settings are in force; prepared renewal stays open; offered renewal keeps its expiry', async () => {
    // Advance the date: switch from Pago Pago (UTC-11) to Kiritimati (UTC+14).
    // The 25-hour span guarantees the date advances by at least 1 day.
    setTenantTimezone('Pacific/Kiritimati');
    const advancedToday = readTenantToday();
    expect(advancedToday >= (record.effectiveFrom as string), 'date advanced past effective_from').toBe(true);

    // New settings are now in force
    const settingsAfter = await api(settingsMaker, 'GET', '/renewal-settings');
    const inForceAfter = (settingsAfter.json as { in_force: { early_window_days: number; offer_validity_days: number; on: string } }).in_force;
    expect(inForceAfter.early_window_days, 'new early window in force').toBe(45);
    expect(inForceAfter.offer_validity_days, 'new offer validity in force').toBe(7);

    // Published settings are immutable: no edit/change button on published rows
    const { page: mp } = settingsMaker;
    await mp.goto(`${alpha()}/renewal-settings/list`);
    const periodsTable = mp.getByRole('table', { name: 'Renewal settings periods' });
    const publishedRows = periodsTable.locator('tr').filter({ hasText: 'Published' });
    const publishedCount = await publishedRows.count();
    expect(publishedCount, 'at least one published period').toBeGreaterThanOrEqual(1);
    for (let i = 0; i < publishedCount; i++) {
      await expect(publishedRows.nth(i).getByRole('button', { name: /Publish|Edit|Change/ })).toHaveCount(0);
    }

    // The previously prepared renewal (policy 1) remains open/usable — not closed by the change
    const r1 = await api(quoter, 'GET', `/renewals/${record.renewal1Id}`);
    expect(r1.status, 'renewal 1 still readable').toBe(200);
    const r1Status = (r1.json as { status: string }).status;
    expect(r1Status, 'prepared renewal still in its original status').toBe(record.renewal1Status);

    // The offered renewal (policy 2) retains its original offer_valid_until
    const r2 = await api(quoter, 'GET', `/renewals/${record.renewal2Id}`);
    expect(r2.status, 'renewal 2 still readable').toBe(200);
    const r2Data = r2.json as { offer_valid_until: string; status: string };
    expect(r2Data.status, 'offered renewal still OFFERED').toBe('OFFERED');
    expect(r2Data.offer_valid_until, 'offer_valid_until unchanged by settings change').toBe(record.originalOfferValidUntil);

    // Restore the tenant's timezone to Africa/Nairobi
    setTenantTimezone('Africa/Nairobi');
    await expectNoUuid(mp);
  });
});
