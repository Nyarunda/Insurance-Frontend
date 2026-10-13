import { readFileSync } from 'node:fs';
import { expect, test, Page } from '@playwright/test';

const source = process.env.OPERATIONS_ACCOUNTS;
const base = process.env.OPERATIONS_UI_URL;
test.skip(!source || !base, 'Requires an isolated operations demo and its ignored accounts file.');
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto(`${base}/sign-in`);
  await page.getByPlaceholder('name@company.co.ke').fill(account.email);
  await page.getByPlaceholder('Enter password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByTestId('sandbox-code')).toBeVisible();
  const code = (await page.getByTestId('sandbox-code').textContent())!.match(/\d{6}/)![0];
  await page.getByPlaceholder('000000').fill(code);
  await page.getByRole('button', { name: 'Verify & Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
}

test('lead and follow-up persist and campaign requires another reviewer', async ({ browser }) => {
  test.setTimeout(90_000);
  const accounts = JSON.parse(readFileSync(source!, 'utf8')).accounts;
  const maker = await browser.newContext();
  const checker = await browser.newContext();
  const reference = `LIVE-${Date.now()}`;
  try {
    const page = await maker.newPage();
    await login(page, accounts.find((a: { email: string }) => a.email === 'admin@operations.test'));
    await page.goto(`${base}/sales/leads`);
    await page.getByRole('button', { name: 'New lead', exact: true }).click();
    await page.getByLabel('Source reference *').fill(reference);
    await page.getByLabel('Name *', { exact: true }).fill(`Logistics ${reference}`);
    await page.getByLabel('Email', { exact: true }).fill('sales-test@example.test');
    await page.getByLabel('Source *', { exact: true }).fill('Local acceptance test');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Logistics ${reference}` })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Add follow-up' }).click();
    await page.getByLabel('Note *').fill('Call to discuss fleet renewal');
    await page.getByLabel('Due date *').fill('2026-10-20');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Call to discuss fleet renewal' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('cell', { name: 'Call to discuss fleet renewal' })).toBeVisible();

    await page.goto(`${base}/sales/campaigns`);
    await page.getByRole('button', { name: 'New campaign' }).click();
    await page.getByLabel('Name *', { exact: true }).fill(`Campaign ${reference}`);
    await page.getByLabel('Start date *').fill('2026-10-01');
    await page.getByLabel('End date *').fill('2026-12-31');
    await page.getByLabel('Channel *').fill('Branch referral');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Campaign ${reference}` })).toBeVisible();
    const workspace = page.url();
    await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
    await page.getByLabel('Reason *').fill('Local acceptance test');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Withdraw', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
    const review = await checker.newPage();
    await login(review, accounts.find((a: { email: string }) => a.email === 'checker@operations.test'));
    await review.goto(workspace);
    await review.getByRole('button', { name: 'Approve', exact: true }).click();
    await review.getByLabel('Reason *').fill('Independent local review');
    await review.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(review.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
  } finally {
    await maker.close();
    await checker.close();
  }
});
