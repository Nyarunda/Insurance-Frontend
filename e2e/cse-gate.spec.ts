/**
 * CS-E: the CERTIFICATES-SURFACE-1 end-to-end gate against the real backend (certificates-surface-1-scope, CS-E).
 *
 * One serial journey on a freshly built disposable environment (cse_setup.py: the NB1-E environment,
 * so FI1-E's bound motor policy and governed endorsements, plus the certificate accounts):
 *
 *   the stock manager creates a type, receives a numbered batch (serial preview) and allocates a range
 *   to the branch; the issuer issues for the bound policy from its header; a second live certificate
 *   for the vehicle is refused in words and replaced; the canceller spoils an issued, unprinted one;
 *   the issuer opens the print view (nothing sent) and marks one printed; the canceller cancels it
 *   directly; an endorsement made after issue (maker, then checker in My Work Queue) changes the
 *   terms, so marking the next one printed is refused with both versions and it is replaced; then
 *   CERTIFICATE_CANCELLATION is governed (operator, mid-run) and the canceller's Cancel turns into an
 *   explicit Request cancellation that the checker approves in My Work Queue.
 *
 * Plus: find by vehicle and serial; an out-of-branch issuer gets "not found"; tenant B's address gives
 * tenant A's token nothing; profile separation (the issuer cannot cancel or manage stock; the stock
 * manager cannot issue or see policies; the canceller cannot issue or print). No rendered text
 * contains a UUID (the Reference is the only exception).
 *
 * Environment: FI1_FRONTEND_PORT, FI1E_ACCOUNTS, FI1E_FACTS, CSE_ENV_DIR (for the mid-run activation).
 * Secrets are never logged or put in assertion messages.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes, randomInt } from 'node:crypto';
import { Browser, expect, Page, Request, Response, test } from '@playwright/test';

const PORT = process.env.FI1_FRONTEND_PORT ?? '3000';
const ACCOUNTS_FILE = process.env.FI1E_ACCOUNTS;
const FACTS_FILE = process.env.FI1E_FACTS;
const ENV_DIR = process.env.CSE_ENV_DIR;

test.skip(!ACCOUNTS_FILE || !FACTS_FILE || !ENV_DIR, 'needs the disposable CS-E environment (FI1E_ACCOUNTS, FI1E_FACTS, CSE_ENV_DIR)');

type Accounts = Record<string, { host: string; temporary_password: string }>;
interface Facts {
  alpha: {
    domain: string;
    policy: { id: string; policy_no: string; benefits: { code: string; name: string }[] };
    certificates: { class: { name: string; code: string }; insurer: string; registration: string };
  };
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

const KEEPER = 'cert-keeper@fi1e.test';
const ISSUER = 'cert-issuer@fi1e.test';
const CANCELLER = 'cert-canceller@fi1e.test';
const CHECKER = 'cert-checker@fi1e.test';
const OUTSIDER = 'cert-outsider@fi1e.test';
const ENDORSER = 'maker@fi1e.test';
const ENDORSEMENT_CHECKER = 'checker@fi1e.test';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const NOT_FOUND = 'Not found or not available to you.';

const current = new Map<string, string>();
const passwordOf = (email: string) => current.get(email) ?? accounts()[email].temporary_password;
const strongPassword = () => `Cse-${randomBytes(9).toString('base64url')}-Aa1!`;

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

/** A call the test makes with the person's live session (for the API-level separation checks). */
async function api(someone: Person, method: 'GET' | 'POST', path: string, body?: unknown, ifMatch?: string) {
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

const policyPath = () => `/policies/list/${facts().alpha.policy.policy_no}`;
const certificatesTab = () => `${alpha()}${policyPath()}?tab=certificates`;

/** On the policy's Certificates tab, open a certificate by its serial (the row). */
async function openCertificate(page: Page, serial: string) {
  await page.goto(certificatesTab());
  await page.getByRole('row', { name: new RegExp(serial) }).click();
  await expect(page.getByRole('heading', { name: serial })).toBeVisible();
}

/** Issue from the open Issue form with its defaults (the one type of the class, from today, to the end of cover). */
async function issueWithDefaults(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Issue a certificate' });
  await expect(dialog.getByLabel(/Certificate type/)).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Issue certificate' }).click();
  await expect(dialog).toHaveCount(0);
  const heading = page.getByRole('heading', { level: 2, name: /^[A-Z0-9-]+\d{7}$/ });
  await expect(heading).toBeVisible();
  return (await heading.textContent())!.trim();
}

/** The canceller (or issuer) acts on a certificate through a reason dialog. */
async function withReason(page: Page, button: string, dialogName: string, reason: string, submit = button) {
  await page.getByRole('button', { name: button }).click();
  const dialog = page.getByRole('dialog', { name: dialogName });
  await dialog.getByLabel(/^Reason/).fill(reason);
  await dialog.getByRole('button', { name: submit }).click();
  return dialog;
}

test.describe.configure({ mode: 'serial' });

test.describe('CS-E: certificates on the policy, from stock to cancellation, against the real backend', () => {
  let keeper: Person;
  let issuer: Person;
  let canceller: Person;
  const tag = randomInt(1000, 9999);
  const prefix = `E${tag}`;
  const typeCode = `CSE-${tag}`;
  const serials: Record<string, string> = {};

  test.afterAll(async () => {
    for (const someone of [keeper, issuer, canceller]) await someone?.context.close();
  });

  test('the stock manager, issuer and canceller sign in; each sees only their own screens', async ({ browser }) => {
    keeper = await person(browser, KEEPER);
    issuer = await person(browser, ISSUER);
    canceller = await person(browser, CANCELLER);
    const nav = (page: Page) => page.getByRole('complementary', { name: 'Primary navigation' });
    await expect(nav(keeper.page).getByRole('button', { name: 'Certificate stock' })).toBeVisible();
    await expect(nav(keeper.page).getByRole('button', { name: 'Policy Directory' })).toHaveCount(0);
    for (const someone of [issuer, canceller]) {
      await expect(nav(someone.page).getByRole('button', { name: 'Policy Directory' })).toBeVisible();
      await expect(nav(someone.page).getByRole('button', { name: 'Certificates', exact: true })).toBeVisible();
      await expect(nav(someone.page).getByRole('button', { name: 'Certificate stock' })).toHaveCount(0);
    }
  });

  test('the stock manager creates a type, receives a numbered batch with a serial preview, and allocates to the branch', async () => {
    const { page } = keeper;
    const { class: klass, insurer } = facts().alpha.certificates;
    await page.goto(`${alpha()}/certificates/stock?tab=types`);
    await page.getByRole('button', { name: 'New type' }).click();
    const type = page.getByRole('dialog', { name: 'New certificate type' });
    await type.getByLabel(/Code/).fill(typeCode);
    await type.getByLabel(/^Name/).fill('Motor private certificate');
    await type.getByLabel(/Category/).selectOption('MOTOR');
    await type.getByLabel(/Insurance class/).selectOption({ label: `${klass.name || 'Motor private'} (${klass.code})` });
    await type.getByRole('button', { name: 'Create type' }).click();
    await expect(page.getByRole('table', { name: 'Certificate types' })).toContainText(typeCode);

    await page.getByRole('button', { name: 'Receive batch' }).click();
    const receive = page.getByRole('dialog', { name: 'Receive a batch' });
    await receive.getByLabel(/Insurer/).selectOption({ label: insurer });
    await receive.getByLabel(/Certificate type/).selectOption({ label: `Motor private certificate (${typeCode})` });
    await receive.getByLabel(/Receiving branch/).selectOption({ label: 'Nairobi' });
    await receive.getByLabel('Prefix').fill(prefix);
    await receive.getByLabel(/First number/).fill('1');
    await receive.getByLabel(/Last number/).fill('30');
    await receive.getByLabel('Delivery reference').fill(`DN-${tag}`);
    await expect(receive.getByRole('status', { name: 'Serial preview' })).toContainText(`30 certificates: ${prefix}0000001 to ${prefix}0000030`);
    await receive.getByRole('button', { name: 'Receive batch' }).click();
    const batch = page.getByRole('row', { name: new RegExp(`${prefix}0000001`) });
    await expect(batch).toContainText(`DN-${tag}`);
    const batchNo = ((await batch.textContent()) ?? '').match(/CBT\d+/)![0];

    await batch.getByRole('button', { name: `Allocate from ${batchNo}` }).click();
    const allocate = page.getByRole('dialog', { name: 'Allocate to a branch' });
    await allocate.getByLabel(/Last number/).fill('20');
    await allocate.getByLabel(/To branch/).selectOption({ label: 'Nairobi' });
    await allocate.getByRole('button', { name: 'Allocate' }).click();
    const result = page.getByRole('status').filter({ hasText: 'Allocated to Nairobi' });
    await expect(result).toContainText(`20 certificates of batch ${batchNo}: ${prefix}0000001 to ${prefix}0000020.`);

    await page.getByRole('tab', { name: 'Available stock' }).click();
    await expect(page.getByRole('row', { name: new RegExp(typeCode) }).first()).toContainText(insurer);
    await expectNoUuid(page);
  });

  test('the issuer issues from the policy header; the certificate runs to the end of cover and opens by serial', async () => {
    const { page, tracked } = issuer;
    await page.goto(`${alpha()}${policyPath()}`);
    await page.getByRole('button', { name: 'Issue certificate' }).click();
    serials.first = await issueWithDefaults(page);
    expect(serials.first).toBe(`${prefix}0000001`);
    expect(new URL(page.url()).search).toContain(`certificate=${serials.first}`);
    const [issue] = tracked.matching('POST', /\/policies\/[^/]+\/certificates$/).requests();
    expect(issue.headers()['if-match']).toMatch(/^"policy-/);
    expect(Object.keys(issue.postDataJSON()).sort()).toEqual(['certificate_type_id', 'effective_from']);
    await expect(page.getByText('Issued', { exact: true }).first()).toBeVisible();
    await expect(page.locator('main')).toContainText(facts().alpha.certificates.registration);
    await expectNoUuid(page);
  });

  test('a second live certificate for the vehicle is refused in words, and replaced with a reason', async () => {
    const { page } = issuer;
    await page.goto(certificatesTab());
    await page.getByRole('button', { name: 'Issue certificate' }).click();
    const dialog = page.getByRole('dialog', { name: 'Issue a certificate' });
    await dialog.getByRole('button', { name: 'Issue certificate' }).click();
    const refusal = dialog.getByRole('alert');
    await expect(refusal).toContainText(`Certificate ${serials.first} already certifies this vehicle for those dates.`);
    await expect(refusal).not.toContainText('CERTIFICATE_VEHICLE_ALREADY_CERTIFIED');
    await refusal.getByRole('button', { name: 'Replace it' }).click();
    const replace = page.getByRole('dialog', { name: 'Replace the certificate' });
    await replace.getByLabel(/Reason for the replacement/).fill('sticker damaged at the counter');
    await replace.getByRole('button', { name: 'Issue replacement' }).click();
    await expect(replace).toHaveCount(0);
    serials.second = (await page.getByRole('heading', { level: 2, name: /\d{7}$/ }).textContent())!.trim();
    expect(serials.second).toBe(`${prefix}0000002`);
    await expect(page.locator('main')).toContainText(`Replaces${serials.first}`);
    await openCertificate(page, serials.first);
    await expect(page.locator('main')).toContainText('REPLACED: sticker damaged at the counter');
  });

  test('the canceller spoils the issued, unprinted replacement', async () => {
    const { page } = canceller;
    await openCertificate(page, serials.second);
    await expect(page.getByRole('button', { name: 'Mark as printed' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Replace' })).toHaveCount(0);
    const dialog = await withReason(page, 'Spoil', 'Spoil the certificate', 'jammed in the printer');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Spoilt', { exact: true }).first()).toBeVisible();
  });

  test('the issuer opens the print view (nothing is sent) and marks the next certificate printed', async () => {
    const { page, tracked } = issuer;
    await page.goto(certificatesTab());
    await page.getByRole('button', { name: 'Issue certificate' }).click();
    serials.printed = await issueWithDefaults(page);
    await page.getByRole('button', { name: 'Print view' }).click();
    const sheet = page.getByRole('dialog', { name: 'Certificate of motor insurance' });
    await expect(sheet).toContainText(serials.printed);
    await expect(sheet).toContainText(facts().alpha.policy.policy_no);
    await sheet.getByRole('button', { name: 'Close' }).click();
    expect(tracked.matching('POST', /\/print$/).requests()).toHaveLength(0);
    await page.getByRole('button', { name: 'Mark as printed' }).click();
    await page.getByRole('dialog', { name: 'Mark as printed' }).getByRole('button', { name: 'Mark as printed' }).click();
    await expect(page.getByText(`Certificate ${serials.printed} marked as printed`)).toBeVisible();
    await expect(page.getByText('Printed', { exact: true }).first()).toBeVisible();
    expect(tracked.matching('POST', /\/print$/).requests()).toHaveLength(1);
    expect(tracked.matching('POST', /\/print$/).requests()[0].headers()['if-match']).toMatch(/^"certificate-/);
  });

  test('the canceller cancels it directly (not governed yet)', async () => {
    const { page } = canceller;
    await openCertificate(page, serials.printed);
    await expect(page.getByRole('button', { name: 'Spoil' })).toHaveCount(0);                   // printed: not spoilable
    const dialog = await withReason(page, 'Cancel certificate', 'Cancel the certificate', 'vehicle sold');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible();
  });

  test('after an endorsement changes the terms, marking printed is refused with both versions, and the certificate is replaced', async ({ browser }) => {
    const { page } = issuer;
    await page.goto(certificatesTab());
    await page.getByRole('button', { name: 'Issue certificate' }).click();
    serials.stale = await issueWithDefaults(page);

    const endorser = await person(browser, ENDORSER);
    const approver = await person(browser, ENDORSEMENT_CHECKER);
    try {
      const e = endorser.page;
      await e.goto(`${alpha()}${policyPath()}?tab=endorsements`);
      await e.getByRole('button', { name: 'New endorsement' }).click();
      const windscreen = facts().alpha.policy.benefits.find((benefit) => benefit.code === 'WINDSCREEN')!.name;
      await e.getByLabel(/^Benefit/).selectOption({ label: windscreen });
      await e.getByLabel(/^New limit/).fill('70000');
      await e.getByLabel(/^Reason/).fill('Customer asked for a higher windscreen limit');
      await e.getByRole('button', { name: 'Create endorsement' }).click();
      const endorsement = ((await e.getByRole('heading', { name: /^END/ }).textContent()) ?? '').trim();
      await e.getByRole('button', { name: 'Submit' }).click();
      await expect(e.getByText('Sent for approval', { exact: true })).toBeVisible();

      const a = approver.page;
      await a.goto(`${alpha()}/my-work/list`);
      await a.getByRole('row', { name: new RegExp(endorsement) }).click();
      await a.getByRole('button', { name: 'Approve' }).click();
      await a.getByRole('button', { name: 'Confirm approval' }).click();
      await expect(a.getByText(/^Approved: /)).toBeVisible();
    } finally {
      await endorser.context.close();
      await approver.context.close();
    }

    await openCertificate(page, serials.stale);
    await page.getByRole('button', { name: 'Mark as printed' }).click();
    const confirm = page.getByRole('dialog', { name: 'Mark as printed' });
    await confirm.getByRole('button', { name: 'Mark as printed' }).click();
    const refusal = confirm.getByRole('alert');
    await expect(refusal).toContainText("The policy's terms changed after this certificate was issued, so it cannot be printed.");
    await expect(refusal).toContainText('It names version 1; version 2 is now in force for its start date.');
    await refusal.getByRole('button', { name: 'Replace it' }).click();
    const replace = page.getByRole('dialog', { name: 'Replace the certificate' });
    await replace.getByLabel(/Reason for the replacement/).fill('terms changed by endorsement');
    await replace.getByRole('button', { name: 'Issue replacement' }).click();
    await expect(replace).toHaveCount(0);
    serials.current = (await page.getByRole('heading', { level: 2, name: /\d{7}$/ }).textContent())!.trim();
    await expect(page.locator('main')).toContainText('Version 2');
    await page.getByRole('button', { name: 'Mark as printed' }).click();
    await page.getByRole('dialog', { name: 'Mark as printed' }).getByRole('button', { name: 'Mark as printed' }).click();
    await expect(page.getByText(`Certificate ${serials.current} marked as printed`)).toBeVisible();
    await expectNoUuid(page);
  });

  test('once governed, Cancel turns into an explicit Request cancellation, and the checker approves it in My Work Queue', async ({ browser }) => {
    const out = execFileSync('python', ['cse_activate.py'], { cwd: ENV_DIR, env: process.env, encoding: 'utf8' });
    expect(out).toContain('CERTIFICATE_CANCELLATION activation approved by B');

    const { page, tracked } = canceller;
    await openCertificate(page, serials.current);
    const dialog = await withReason(page, 'Cancel certificate', 'Cancel the certificate', 'stolen with the vehicle');
    await expect(dialog.getByText('This cancellation needs approval.', { exact: false })).toBeVisible();
    expect(tracked.matching('POST', /\/request-cancellation$/).requests()).toHaveLength(0);       // never automatic
    await expect(dialog.getByLabel(/^Reason/)).toHaveValue('stolen with the vehicle');
    await dialog.getByRole('button', { name: 'Request cancellation' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Cancellation requested', { exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('Waiting for: Certificate Checker.');
    const [cancel] = tracked.matching('POST', /\/cancel$/).requests().slice(-1);
    const [request] = tracked.matching('POST', /\/request-cancellation$/).requests();
    expect(request.headers()['x-idempotency-key']).not.toBe(cancel.headers()['x-idempotency-key']);

    const checker = await person(browser, CHECKER);
    try {
      const c = checker.page;
      await c.goto(`${alpha()}/my-work/list`);
      const row = c.getByRole('row', { name: new RegExp(serials.current) });
      await expect(row).toBeVisible();
      await expectNoUuid(c);
      await row.click();
      await c.getByRole('button', { name: 'Approve' }).click();
      await c.getByRole('button', { name: 'Confirm approval' }).click();
      await expect(c.getByText(/^Approved: /)).toBeVisible();
    } finally {
      await checker.context.close();
    }
    await openCertificate(page, serials.current);
    await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible();
  });

  test('find: the issuer finds the certificates by vehicle and by serial, and a record opens on its policy', async () => {
    const { page } = issuer;
    await page.goto(`${alpha()}/certificates/list`);
    await page.getByLabel('Registration or chassis number').fill(facts().alpha.certificates.registration);
    await page.getByRole('button', { name: 'Search' }).click();
    for (const serial of Object.values(serials)) await expect(page.getByRole('row', { name: new RegExp(serial) })).toBeVisible();
    await page.getByRole('button', { name: 'Serial number' }).click();
    await page.getByLabel('Serial number').fill(serials.first.toLowerCase());
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('row', { name: new RegExp(serials.first) }).click();
    await expect(page).toHaveURL(new RegExp(`/certificates/list/${serials.first}$`));
    await expect(page.getByRole('heading', { name: serials.first })).toBeVisible();
    await expectNoUuid(page);
    await page.getByRole('button', { name: 'Open on the policy' }).click();
    await expect(page.getByRole('heading', { name: facts().alpha.policy.policy_no })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: serials.first })).toBeVisible();
  });

  test('an issuer outside the branch gets "not found" for the certificates and the policy', async ({ browser }) => {
    const outsider = await person(browser, OUTSIDER);
    try {
      const { page } = outsider;
      for (const serial of [serials.first, serials.current]) {
        await page.goto(`${alpha()}/certificates/list/${serial}`);
        await expect(page.getByText(NOT_FOUND)).toBeVisible();
        await expectNoUuid(page);
      }
      await page.goto(`${alpha()}/certificates/list?vehicle=${encodeURIComponent(facts().alpha.certificates.registration)}`);
      await expect(page.getByText('No certificate matches this search')).toBeVisible();
      await page.goto(`${alpha()}${policyPath()}`);
      await expect(page.getByText(NOT_FOUND)).toBeVisible();
    } finally {
      await outsider.context.close();
    }
  });

  test('profile separation, against the API', async () => {
    const policyId = facts().alpha.policy.id;
    const list = await api(issuer, 'GET', `/policies/${policyId}/certificates`);
    const live = (list.json.results as { id: string; serial_no: string }[]).find((c) => c.serial_no === serials.first)!;
    const seen = await api(issuer, 'GET', `/certificates/${live.id}`);
    // The issuer cancels, spoils and manages stock never.
    expect(codeOf(await api(issuer, 'POST', `/certificates/${live.id}/cancel`, { reason: 'x' }, seen.etag))).toBe('PERMISSION_DENIED');
    expect(codeOf(await api(issuer, 'POST', '/certificate-types', { code: `X-${tag}`, name: 'X', category: 'MOTOR', insurance_class_id: policyId }))).toBe('PERMISSION_DENIED');
    expect(codeOf(await api(issuer, 'GET', '/certificate-batches'))).toBe('PERMISSION_DENIED');
    // The stock manager sees no policies and issues nothing.
    expect(((await api(keeper, 'GET', '/policies')).json.results as unknown[]).length).toBe(0);
    const policy = await api(issuer, 'GET', `/policies/${policyId}`);
    const typeId = (await api(keeper, 'GET', '/certificate-types')).json.results as { id: string; code: string }[];
    const keeperIssue = await api(keeper, 'POST', `/policies/${policyId}/certificates`, { certificate_type_id: typeId.find((t) => t.code === typeCode)!.id }, policy.etag);
    expect([403, 404]).toContain(keeperIssue.status);
    // The canceller issues and prints never.
    const cancellerIssue = await api(canceller, 'POST', `/policies/${policyId}/certificates`, { certificate_type_id: typeId.find((t) => t.code === typeCode)!.id }, policy.etag);
    expect(codeOf(cancellerIssue)).toBe('PERMISSION_DENIED');
    expect(codeOf(await api(canceller, 'POST', `/certificates/${live.id}/print`, {}, seen.etag))).toBe('PERMISSION_DENIED');
  });

  test('tenant isolation: tenant A’s token reads nothing about certificates at tenant B’s address', async () => {
    await issuer.page.goto(`${alpha()}/certificates/list`);
    await expect(issuer.page.getByRole('heading', { name: 'Certificates', exact: true })).toBeVisible();
    const token = issuer.tracked.bearer();
    const beta = facts().beta.domain;
    for (const path of ['/certificates', '/certificate-types', `/policies/${facts().alpha.policy.id}/certificates`]) {
      const target = direct(`${origin(beta)}/api/v1${path}`);
      const response = await issuer.page.request.get(target.url, { headers: { Host: target.host, Authorization: token! } });
      expect(response.status(), path).toBe(403);
      expect((await response.json()).error.code, path).toBe('CROSS_TENANT_TOKEN_ATTEMPT');
    }
  });
});
