/**
 * FI1-A against the real backend: authentication, OTP and forced password change, session
 * restoration, refresh (in one tab and across tabs), logout, session expiry, the tenant host
 * boundary and the branch context. See playwright.config.ts for the environment it needs.
 *
 * Secrets: temporary passwords are read from FI1_ACCOUNTS, new passwords are generated in memory,
 * and the sandbox code is read from the page. None of them is ever logged or asserted in a message.
 */

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { BrowserContext, expect, Page, Request, test } from '@playwright/test';

const PORT = process.env.FI1_FRONTEND_PORT ?? '3000';
const ACCOUNTS_FILE = process.env.FI1_ACCOUNTS;
const FACTS_FILE = process.env.FI1_FACTS;

test.skip(!ACCOUNTS_FILE || !FACTS_FILE, 'needs the disposable FI1 environment (FI1_ACCOUNTS, FI1_FACTS)');

type Accounts = Record<string, { host: string; temporary_password: string }>;
interface Facts {
  alpha: { tenant: string; domain: string; branches: Record<string, string>; users: Record<string, { user_id: string }> };
  beta: { tenant: string; domain: string };
}

const accounts = (): Accounts => JSON.parse(readFileSync(ACCOUNTS_FILE!, 'utf8'));
const facts = (): Facts => JSON.parse(readFileSync(FACTS_FILE!, 'utf8'));
const origin = (host: string) => `http://${host}:${PORT}`;

const ALPHA = 'fi1a-alpha.localhost';
const BETA = 'fi1a-beta.localhost';
const MAKER = 'alpha.maker@fi1a.test';
const SECOND = 'alpha.second@fi1a.test';
const BETA_USER = 'beta.user@fi1a.test';

/** Passwords chosen in this run, kept in memory only. */
const current = new Map<string, string>();
const passwordOf = (email: string) => current.get(email) ?? accounts()[email].temporary_password;
const strongPassword = () => `Fi1a-${randomBytes(9).toString('base64url')}-Aa1!`;

const MOCK_MARKERS = ['Marcus Vance', 'ABC Logistics', 'Apex', 'Role center', 'SLA breach', 'Sandbox code: 0'];

function track(page: Page) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request);
  });
  return {
    requests,
    to: (path: string) => requests.filter((request) => new URL(request.url()).pathname === `/api/v1${path}`),
  };
}

async function submitCredentials(page: Page, host: string, email: string, password: string) {
  await page.goto(`${origin(host)}/sign-in`);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByTestId('sign-in-host')).toHaveText(host);
  await page.getByPlaceholder('name@company.co.ke').fill(email);
  await page.getByPlaceholder('Enter password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function readSandboxCode(page: Page): Promise<string> {
  const text = (await page.getByTestId('sandbox-code').textContent()) ?? '';
  const code = text.match(/\d{6}/)?.[0];
  expect(code, 'the sandbox sender returned a code').toBeTruthy();
  return code!;
}

async function enterCode(page: Page, code: string) {
  await page.getByPlaceholder('000000').fill(code);
  await page.getByRole('button', { name: 'Verify & Continue' }).click();
}

/** Signs in completely; changes a temporary password when the backend requires it. */
async function signIn(page: Page, host: string, email: string) {
  await submitCredentials(page, host, email, passwordOf(email));
  await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();
  await enterCode(page, await readSandboxCode(page));
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

/** What the browser fires when the user comes back to the tab (it bubbles to window, where the query cache listens). */
const returnToTab = (page: Page) =>
  page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));

async function expectNoMockContent(page: Page) {
  const text = await page.locator('body').innerText();
  for (const marker of MOCK_MARKERS) expect(text).not.toContain(marker);
}

test.describe.configure({ mode: 'serial' });

test.describe('FI1-A: foundation against the real backend', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('tenant host boundary: accounts sign in only at their own tenant’s address', async ({ browser }) => {
    const isolated = await browser.newContext();
    const other = await isolated.newPage();

    // An Alpha account at Beta's address is not a Beta user.
    await submitCredentials(other, BETA, MAKER, passwordOf(MAKER));
    await expect(other.getByRole('alert')).toContainText('The email or password is not correct.');
    await expect(other.getByRole('heading', { name: 'Verify your identity' })).toHaveCount(0);

    // And the reverse.
    await submitCredentials(other, ALPHA, BETA_USER, passwordOf(BETA_USER));
    await expect(other.getByRole('alert')).toContainText('The email or password is not correct.');

    // An address no tenant serves.
    await submitCredentials(other, 'nobody.localhost', MAKER, 'irrelevant');
    await expect(other.getByRole('alert')).toContainText('No tenant is served at this address.');
    await isolated.close();
  });

  test('wrong OTP is counted by the backend; the right one, then the forced change, signs in (Beta)', async ({ browser }) => {
    const betaContext = await browser.newContext();
    const beta = await betaContext.newPage();
    await submitCredentials(beta, BETA, BETA_USER, passwordOf(BETA_USER));
    await expect(beta.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();
    const code = await readSandboxCode(beta);
    await enterCode(beta, code === '000000' ? '111111' : '000000');
    await expect(beta.getByText(/The code is not correct\. \d attempts? left\./)).toBeVisible();

    await enterCode(beta, code);
    await expect(beta.getByRole('heading', { name: 'Update your password' })).toBeVisible();
    const next = strongPassword();
    await beta.getByPlaceholder('Enter new password', { exact: true }).fill(next);
    await beta.getByPlaceholder('Re-enter new password', { exact: true }).fill(next);
    await beta.getByRole('button', { name: 'Set Password & Continue' }).click();
    await expect(beta.getByRole('heading', { name: 'Home' })).toBeVisible();
    current.set(BETA_USER, next);
    await expect(beta.getByTestId('tenant-name')).toHaveText(facts().beta.tenant);

    // The Beta session is invisible at Alpha's address (host-only cookie, separate origin).
    await beta.goto(`${origin(ALPHA)}/`);
    await expect(beta.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await betaContext.close();
  });

  test('auth happy path: password, OTP, forced change (rules first, server final), then Home', async () => {
    const net = track(page);
    await submitCredentials(page, ALPHA, MAKER, passwordOf(MAKER));
    await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();
    await expect(page.getByText(/A 6-digit code was sent to/)).toBeVisible();
    await enterCode(page, await readSandboxCode(page));
    await expect(page.getByRole('heading', { name: 'Update your password' })).toBeVisible();

    // A weak password is stopped in the browser: nothing is sent.
    await page.getByPlaceholder('Enter new password', { exact: true }).fill('weak');
    await page.getByPlaceholder('Re-enter new password', { exact: true }).fill('weak');
    await page.getByRole('button', { name: 'Set Password & Continue' }).click();
    expect(net.to('/auth/password/forced-change')).toHaveLength(0);

    // Reusing the temporary password passes the local rules; the backend refuses it.
    await page.getByPlaceholder('Enter new password', { exact: true }).fill(passwordOf(MAKER));
    await page.getByPlaceholder('Re-enter new password', { exact: true }).fill(passwordOf(MAKER));
    await page.getByRole('button', { name: 'Set Password & Continue' }).click();
    await expect(page.getByText('The new password needs different from the current password.')).toBeVisible();

    const next = strongPassword();
    await page.getByPlaceholder('Enter new password', { exact: true }).fill(next);
    await page.getByPlaceholder('Re-enter new password', { exact: true }).fill(next);
    await page.getByRole('button', { name: 'Set Password & Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    current.set(MAKER, next);

    await expect(page.getByTestId('tenant-name')).toHaveText(facts().alpha.tenant);
    await expect(page.getByTestId('branch-context')).toHaveText('Nairobi (NBO)');
    await expectNoMockContent(page);
    expect(net.to('/auth/login')[0].headers().authorization).toBeUndefined();
    expect(net.to('/auth/me')[0].headers().authorization).toMatch(/^Bearer /);
    // The token stays in memory: nothing readable by script holds it.
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
    expect(stored).not.toContain('eyJ');
  });

  test('session restoration: a reload signs back in through the refresh cookie, with one refresh', async () => {
    const net = track(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
    expect(net.to('/auth/refresh')).toHaveLength(1); // StrictMode's double effect shares one attempt
  });

  test('branch context: the only branch is asserted with each request; a tampered stored choice is ignored', async () => {
    const { branches, users } = facts().alpha;
    const net = track(page);
    await page.waitForTimeout(11_000); // let /me go stale, then come back to the tab
    await returnToTab(page);
    await expect.poll(() => net.to('/auth/me').length).toBeGreaterThan(0);
    expect(net.to('/auth/me').at(-1)!.headers()['x-branch-id']).toBe(branches.NBO);

    // localStorage is a convenience only: a branch the user does not hold is dropped, never sent.
    await page.evaluate(
      ([key, branch]) => localStorage.setItem(key, branch),
      [`insurance-cloud:branch:${users[MAKER].user_id}`, branches.MSA],
    );
    const afterTamper = track(page);
    await page.reload();
    await expect(page.getByTestId('branch-context')).toHaveText('Nairobi (NBO)');
    expect(afterTamper.requests.every((request) => request.headers()['x-branch-id'] !== branches.MSA)).toBe(true);
  });

  test('branch context: when the backend refuses the asserted branch, the choice is cleared and not resent', async () => {
    const { branches } = facts().alpha;
    // Make the browser's assertion stale, as if access to the branch had been withdrawn: the real
    // backend then refuses it with BRANCH_SCOPE_DENIED.
    await page.route('**/api/v1/auth/me', async (route) => {
      const headers = { ...route.request().headers() };
      if (headers['x-branch-id']) headers['x-branch-id'] = branches.MSA;
      await route.continue({ headers });
    });
    const net = track(page);
    const refused = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/me') && response.status() === 403);
    await page.waitForTimeout(11_000);
    await returnToTab(page);
    const response = await refused;
    expect((await response.json()).error.code).toBe('BRANCH_SCOPE_DENIED');
    await expect(page.getByText('Branch selection cleared')).toBeVisible();
    await expect(page.getByTestId('branch-context')).toHaveText('All my branches');
    await page.unroute('**/api/v1/auth/me');

    await page.waitForTimeout(11_000);
    await returnToTab(page);
    await expect.poll(() => net.to('/auth/me').filter((request) => !request.headers()['x-branch-id']).length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

    // The user may choose it again deliberately.
    await page.getByRole('button', { name: 'Branch: All my branches' }).click();
    await page.getByRole('menuitemradio', { name: /Nairobi/ }).click();
    await expect(page.getByTestId('branch-context')).toHaveText('Nairobi (NBO)');
  });

  test('refresh: after the access token expires, one 401 leads to one refresh and a retry', async () => {
    const net = track(page);
    await page.waitForTimeout(21_000); // AUTH_ACCESS_TOKEN_SECONDS=20 in the disposable environment
    await returnToTab(page);
    await expect.poll(() => net.to('/auth/refresh').length).toBe(1);
    await expect.poll(() => net.to('/auth/me').length).toBe(2);
    const [first, retry] = net.to('/auth/me');
    expect((await first.response())?.status()).toBe(401);
    expect((await retry.response())?.status()).toBe(200);
    expect(retry.headers().authorization).not.toBe(first.headers().authorization);
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  });

  test('refresh serialization across tabs: tabs restoring at once never reuse a rotated token', async () => {
    const tabs = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
    const timeline: Array<{ start: number; end: number }> = [];
    for (const tab of tabs) {
      tab.on('request', (request) => {
        if (!request.url().endsWith('/api/v1/auth/refresh')) return;
        const entry = { start: Date.now(), end: Number.POSITIVE_INFINITY };
        timeline.push(entry);
        void request.response().then(() => (entry.end = Date.now()));
      });
    }
    await Promise.all(tabs.map((tab) => tab.goto(`${origin(ALPHA)}/`)));
    for (const tab of tabs) await expect(tab.getByRole('heading', { name: 'Home' })).toBeVisible();
    expect(timeline).toHaveLength(3);
    const ordered = [...timeline].sort((a, b) => a.start - b.start);
    for (let i = 1; i < ordered.length; i += 1) expect(ordered[i].start).toBeGreaterThanOrEqual(ordered[i - 1].end);

    // The session survived: no reuse was detected, so the original tab still works after a reload.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    for (const tab of tabs.slice(1)) await tab.close();
  });

  test('logout: the backend session ends, every tab notices, and a reload stays signed out', async () => {
    const otherTab = context.pages().find((candidate) => candidate !== page)!;
    const net = track(page);
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    const logout = net.to('/auth/logout')[0];
    expect((await logout.response())?.status()).toBe(204);

    await expect(otherTab.getByText('You signed out in another tab.')).toBeVisible();

    const afterReload = track(page);
    await page.goto(`${origin(ALPHA)}/`);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect((await afterReload.to('/auth/refresh')[0].response())?.status()).toBe(401);
    await otherTab.close();
  });

  test('a returning user signs in with their new password and no forced change', async () => {
    await submitCredentials(page, ALPHA, MAKER, passwordOf(MAKER));
    await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible();
    await enterCode(page, await readSandboxCode(page));
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  });

  test('session expiry: when the session’s lifetime ends, the user is returned to sign-in and told why', async ({ browser }) => {
    const expiringContext = await browser.newContext();
    const tab = await expiringContext.newPage();
    await signIn(tab, ALPHA, SECOND);
    await expect(tab.getByTestId('branch-context')).toHaveText('Mombasa (MSA)');
    await expectNoMockContent(tab);

    await tab.waitForTimeout(155_000); // AUTH_SESSION_SECONDS=150 in the disposable environment
    await returnToTab(tab);
    await expect(tab.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(tab.getByText('Your session ended. Sign in again to continue.')).toBeVisible();
    await expect(tab).toHaveURL(/\/sign-in$/);
    await expiringContext.close();
  });
});
