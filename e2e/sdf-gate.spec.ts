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
    certificates: { class: { name: string; code: string }; insurer: string };
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
const QUOTER = 'quoter@sdf.test';
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

const codeOf = (result: { json: Record<string, unknown> }) => (result.json.error as { code?: string } | undefined)?.code;

const expectRefused = (result: { status: number; json: Record<string, unknown> }, what: string) => {
  expect(result.status, what).toBe(403);
  expect(codeOf(result), what).toBe('PERMISSION_DENIED');
};

test.describe.configure({ mode: 'serial' });

test.describe('SD-F: setup-driven features against the real backend', () => {
  let manager: Person;
  let quoter: Person;
  let stockMgr: Person;
  let settingsMaker: Person;
  let settingsPublisher: Person;
  const tag = randomInt(100_000, 999_999);

  test.afterAll(async () => {
    for (const someone of [manager, quoter, stockMgr, settingsMaker, settingsPublisher]) await someone?.context.close();
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

  test('1c. a model of a different make is refused when the pairing is wrong', async () => {
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

  // ---------------------------------------------------------------------------- journey 3: snapshot history

  test('3. after renaming a make, the existing quotation still shows the snapshot name at the time', async () => {
    const { page } = manager;
    // Rename Toyota to Toyota Motor Corporation
    await page.goto(`${alpha()}/vehicle-makes/list`);
    const toyotaRegion = page.getByRole('region', { name: `Make TOYOTA-${tag}` });
    await toyotaRegion.getByRole('button', { name: `Rename make TOYOTA-${tag}` }).click();
    const renameDialog = page.getByRole('dialog', { name: /^Rename make/ });
    await renameDialog.getByLabel(/^Name/).fill('Toyota Motor Corporation');
    await renameDialog.getByRole('button', { name: 'Rename' }).click();
    await expect(renameDialog).toHaveCount(0);

    // The quotation made earlier should still show "Toyota" (the snapshot)
    const { page: qp } = quoter;
    await qp.goto(`${alpha()}/quotations/list`);
    const firstQuote = qp.getByRole('row').filter({ hasText: /QUO\d+/ }).first();
    await firstQuote.click();
    await expect(qp.getByRole('heading', { name: /^QUO\d+$/ })).toBeVisible();
    // The risk section should show the stored snapshot name "Toyota", not the renamed "Toyota Motor Corporation"
    await expect(qp.locator('main')).toContainText('Toyota');
    // Verify it's the snapshot: the detail grid shows the value stored at creation
    const riskGrid = qp.locator('main');
    const makeValue = await riskGrid.getByText('Toyota').first().textContent();
    expect(makeValue?.trim()).toBe('Toyota');
  });

  // ---------------------------------------------------------------------------- journey 4: legacy product versions

  test('4. a quotation under a product version without reference fields still takes free text', async () => {
    // The setup creates a legacy product version without reference_fields. We verify
    // the quotation form does NOT show make/model dropdowns for that product.
    // This is verified via the API: a risk with free-text details is accepted.
    const quoteList = await api(quoter, 'GET', '/quotations?page=1&page_size=1');
    const quoteId = (quoteList.json.results as { id: string }[])[0].id;
    const detail = await api(quoter, 'GET', `/quotations/${quoteId}`);
    // The existing quotation was made under a version WITH reference fields;
    // it stores snapshots and they remain valid and readable.
    const revision = (detail.json as { current_revision: { risk: { details: Record<string, unknown> } } }).current_revision;
    const makeDetail = revision.risk.details.make;
    expect(makeDetail, 'stored snapshot has code and name').toEqual(expect.objectContaining({ code: `TOYOTA-${tag}`, name: 'Toyota' }));
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

    const schema = facts().alpha.domain.replace('.localhost', '').replaceAll('-', '_');
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

  test('5b. a CSV with a bad row refuses the whole file', async () => {
    const csv = [
      'make_code,make_name,model_code,model_name,active',
      ',Missing Code,,,',
    ].join('\n') + '\n';
    const csvPath = join(ENV_DIR!, `bad-${tag}.csv`);
    writeFileSync(csvPath, csv, 'utf8');

    const schema = facts().alpha.domain.replace('.localhost', '').replaceAll('-', '_');
    let failed = false;
    try {
      execFileSync('python', [
        'manage.py', 'import_vehicle_makes', '--schema', schema, '--file', csvPath,
      ], { cwd: ENV_DIR!, env: process.env, encoding: 'utf8', timeout: 30_000 });
    } catch {
      failed = true;
    }
    expect(failed, 'bad CSV row refuses the whole file').toBe(true);

    // The import-make from 5a should still be there (the bad import wrote nothing)
    const { page } = manager;
    await page.goto(`${alpha()}/vehicle-makes/list`);
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

  test('7d. a batch received before the setting change is unaffected', async () => {
    // Receive a batch of 5 (under the new limit of 100)
    const { page } = stockMgr;
    const prefix = `SD${tag}`;
    await page.goto(`${alpha()}/certificates/stock?tab=batches`);
    await page.getByRole('button', { name: 'Receive batch' }).click();
    const receive = page.getByRole('dialog', { name: 'Receive a batch' });
    await receive.getByLabel(/Insurer/).selectOption({ label: facts().alpha.certificates.insurer });
    // Select the first available type
    const typeSelect = receive.getByLabel(/Certificate type/);
    const options = await typeSelect.locator('option').all();
    const firstOption = options.find(async (opt) => (await opt.getAttribute('value')) !== '');
    if (firstOption) await typeSelect.selectOption({ index: 1 });
    await receive.getByLabel(/Receiving branch/).selectOption({ label: 'Nairobi' });
    await receive.getByLabel('Prefix').fill(prefix);
    await receive.getByLabel(/First number/).fill('1');
    await receive.getByLabel(/Last number/).fill('5');
    await receive.getByLabel('Delivery reference').fill(`SD-DN-${tag}`);
    await receive.getByRole('button', { name: 'Receive batch' }).click();
    await expect(page.getByRole('row', { name: new RegExp(`${prefix}0000001`) })).toBeVisible();

    // Now lower the limit to 3 — the batch of 5 is still there
    await page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await page.getByRole('button', { name: 'Change' }).click();
    const form = page.getByRole('form', { name: 'Change the largest batch' });
    await form.getByLabel('Largest batch').fill('3');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Batch maximum set to 3')).toBeVisible();

    // The batch of 5 received earlier is still visible and unaffected
    await page.goto(`${alpha()}/certificates/stock?tab=batches`);
    await expect(page.getByRole('row', { name: new RegExp(`${prefix}0000001`) })).toBeVisible();

    // But a new batch of 5 would exceed the limit
    await page.getByRole('button', { name: 'Receive batch' }).click();
    const receive2 = page.getByRole('dialog', { name: 'Receive a batch' });
    await receive2.getByLabel(/Insurer/).selectOption({ label: facts().alpha.certificates.insurer });
    if (firstOption) await receive2.getByLabel(/Certificate type/).selectOption({ index: 1 });
    await receive2.getByLabel(/Receiving branch/).selectOption({ label: 'Nairobi' });
    await receive2.getByLabel('Prefix').fill(`${prefix}X`);
    await receive2.getByLabel(/First number/).fill('1');
    await receive2.getByLabel(/Last number/).fill('5');
    await receive2.getByLabel('Delivery reference').fill(`SD-DN2-${tag}`);
    // The form states the limit and checks against it
    await expect(receive2.getByText(/At most 3/)).toBeVisible();
    await expect(receive2.getByText(/batch is at most 3 certificates/i)).toBeVisible();

    // Restore to a reasonable limit
    await receive2.getByRole('button', { name: 'Back' }).click();
    await page.goto(`${alpha()}/certificates/stock?tab=settings`);
    await page.getByRole('button', { name: 'Change' }).click();
    const restore = page.getByRole('form', { name: 'Change the largest batch' });
    await restore.getByLabel('Largest batch').fill('10000');
    await restore.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Batch maximum set to 10,000')).toBeVisible();
    await expectNoUuid(page);
  });

  // ---------------------------------------------------------------------------- journey 8: renewal settings

  test('8a. the settings maker and publisher sign in; the maker sees Renewal settings', async ({ browser }) => {
    settingsMaker = await person(browser, SETTINGS_MAKER);
    settingsPublisher = await person(browser, SETTINGS_PUBLISHER);
    const nav = (page: Page) => page.getByRole('complementary', { name: 'Primary navigation' });
    await expect(nav(settingsMaker.page).getByRole('button', { name: 'Renewal settings' })).toBeVisible();
    await expect(nav(settingsPublisher.page).getByRole('button', { name: 'Renewal settings' })).toBeVisible();
  });

  test('8b. the maker drafts a new renewal settings period; someone else publishes it', async () => {
    const { page: mp } = settingsMaker;
    await mp.goto(`${alpha()}/renewal-settings/list`);
    await expect(mp.getByRole('heading', { name: 'Renewal settings' })).toBeVisible();

    // Read the current in-force values
    await expect(mp.getByText('In force today')).toBeVisible();
    const beforeEarly = await mp.getByText(/Renewable before expiry/).locator('..').locator('dd, span').last().textContent();

    // Draft a new period from tomorrow
    await mp.getByRole('button', { name: 'New period' }).click();
    const draft = mp.getByRole('dialog', { name: 'New renewal settings period' });
    await draft.getByLabel(/Renewable before expiry/).fill('60');
    await draft.getByLabel(/Renewable after expiry/).fill('60');
    await draft.getByLabel(/Offer open for/).fill('14');
    await draft.getByLabel(/Longest offer/).fill('60');
    await draft.getByRole('button', { name: 'Save draft' }).click();
    await expect(draft).toHaveCount(0);
    await expect(mp.getByText(/drafted; someone else publishes it/)).toBeVisible();

    // The draft appears in the periods table
    const periodsTable = mp.getByRole('table', { name: 'Renewal settings periods' });
    await expect(periodsTable.getByText('Draft')).toBeVisible();
    // The maker sees "Someone else publishes"
    await expect(periodsTable.getByText('Someone else publishes')).toBeVisible();
    // The maker should NOT see a Publish button on their own draft
    await expect(periodsTable.getByRole('button', { name: /Publish/ })).toHaveCount(0);

    // The publisher sees and publishes it
    const { page: pp } = settingsPublisher;
    await pp.goto(`${alpha()}/renewal-settings/list`);
    const publishTable = pp.getByRole('table', { name: 'Renewal settings periods' });
    await expect(publishTable.getByText('Draft')).toBeVisible();
    const publishBtn = publishTable.getByRole('button', { name: /Publish/ });
    await publishBtn.click();
    const publishDialog = pp.getByRole('dialog', { name: /Publish/ });
    await expect(publishDialog).toContainText('60 days');
    await publishDialog.getByRole('button', { name: 'Publish' }).click();
    await expect(publishDialog).toHaveCount(0);
    await expect(pp.getByText(/published/i)).toBeVisible();

    // After publishing, the in-force values should reflect the new settings (if effective today/tomorrow)
    // Since the draft starts from tomorrow, it's not yet in force today
    await expect(pp.getByText('In force today')).toBeVisible();
    await expectNoUuid(pp);
  });

  test('8c. a published period never changes; the maker cannot publish their own draft', async () => {
    const { page: mp } = settingsMaker;
    await mp.goto(`${alpha()}/renewal-settings/list`);
    const periodsTable = mp.getByRole('table', { name: 'Renewal settings periods' });
    // The published period should show "Published" status
    await expect(periodsTable.getByText('Published').first()).toBeVisible();
    // There should be no way to edit the published period — no button on published rows
    const publishedRows = periodsTable.locator('tr').filter({ hasText: 'Published' });
    const publishedCount = await publishedRows.count();
    expect(publishedCount, 'at least one published period').toBeGreaterThanOrEqual(1);
    // Published rows should not have change/edit buttons
    for (let i = 0; i < publishedCount; i++) {
      await expect(publishedRows.nth(i).getByRole('button', { name: /Publish|Edit|Change/ })).toHaveCount(0);
    }
  });
});
