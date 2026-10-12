import { readFileSync } from 'node:fs';
import { expect, test, Page } from '@playwright/test';

const source = process.env.OPERATIONS_ACCOUNTS;
const base = process.env.OPERATIONS_UI_URL;
test.skip(!source || !base, 'Requires the local operations demo and its ignored accounts file.');
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

test('persisted agent onboarding reviewed by another signed-in user', async ({ browser }) => {
  const accounts = JSON.parse(readFileSync(source!, 'utf8')).accounts;
  const maker = await browser.newContext();
  const checker = await browser.newContext();
  try {
    const page = await maker.newPage();
    await login(page, accounts.find((a: { email: string }) => a.email === 'admin@operations.test'));
    await page.goto(`${base}/agents/list`);
    await page.getByRole('button', { name: 'New agent', exact: true }).click();
    const code = `AG-${Date.now()}`;
    await expect(page.getByLabel('Code *')).toHaveCount(0);
    await page.getByLabel('Name *').fill(`Local Test Agency ${code}`);
    await page.getByLabel('Email', { exact: true }).fill('onboarding@example.test');
    await page.getByRole('button', { name: 'Create draft' }).click();
    await expect(page.getByRole('heading', { name: `Local Test Agency ${code}` })).toBeVisible();
    const workspace = page.url();
    await page.reload();
    await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
    await page.getByLabel('Reason *').fill('Local acceptance test registration');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit for approval', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Withdraw', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);

    const review = await checker.newPage();
    await login(review, accounts.find((a: { email: string }) => a.email === 'checker@operations.test'));
    await review.goto(workspace);
    await review.getByRole('button', { name: 'Approve', exact: true }).click();
    await review.getByLabel('Reason *').fill('Independent local test review');
    await review.getByRole('button', { name: 'Approve agent', exact: true }).click();
    await expect(review.getByRole('button', { name: 'Suspend', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'New sub-agent' })).toBeVisible();
    await page.getByRole('tab', { name: 'Activity', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Independent local test review' })).toBeVisible();
    await page.getByRole('button', { name: 'Suspend', exact: true }).click();
    await page.getByLabel('Reason *').fill('Local test completed; keep register inactive');
    await page.getByRole('button', { name: 'Suspend agent', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Submit for approval', exact: true })).toBeVisible();
  } finally {
    await maker.close();
    await checker.close();
  }
});
