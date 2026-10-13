import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const source = process.env.OPERATIONS_ACCOUNTS;
test.skip(!source, 'Requires run_operations_demo.py and OPERATIONS_ACCOUNTS');
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

test('real tenant API: production and dated renewal diary', async ({ page }) => {
  test.setTimeout(90_000);
  const account = JSON.parse(readFileSync(source!, 'utf8')).accounts[0];
  const url = process.env.OPERATIONS_UI_URL ?? account.url;
  await page.goto(`${url}/sign-in`);
  await page.getByPlaceholder('name@company.co.ke').fill(account.email);
  await page.getByPlaceholder('Enter password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByTestId('sandbox-code')).toBeVisible();
  const code = (await page.getByTestId('sandbox-code').textContent())!.match(/\d{6}/)![0];
  await page.getByPlaceholder('000000').fill(code);
  await page.getByRole('button', { name: 'Verify & Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();

  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - 30);
  const end = new Date(today); end.setDate(end.getDate() + 365);
  const date = (day: Date) => day.toISOString().slice(0, 10);
  await page.goto(`${url}/reports/production?date_from=${date(start)}&date_to=${date(today)}`);
  await expect(page.getByTestId('production-totals')).toContainText('KES');
  await expect(page.getByTestId('operations-workspace').getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Group production by').selectOption('agent');
  const grouped = page.waitForResponse(response => response.url().includes('/policies/reports/production?') && response.url().includes('group_by=agent'));
  await page.getByRole('button', { name: 'Run report' }).click();
  const response = await grouped;
  expect(response.status()).toBe(200);
  expect((await response.json()).group_by).toBe('agent');
  await expect(page.getByTestId('operations-workspace').getByRole('alert')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Policies', exact: true }).click();
  await expect(page.getByRole('link', { name: /^POL/ }).first()).toBeVisible();

  await page.goto(`${url}/renewals/diary?date_from=${date(today)}&date_to=${date(end)}`);
  await expect(page.getByTestId('diary-totals')).toContainText('KES');
  await expect(page.getByTestId('operations-workspace').getByRole('alert')).toHaveCount(0);
  const policy = page.getByRole('link', { name: /^POL/ }).first();
  await expect(policy).toBeVisible();
  await expect(policy).toHaveAttribute('href', /\/policies\/list\/.+\?tab=renewals/);
  await page.getByTitle('Print renewal diary page').click();
  await expect(page.getByTestId('print-document')).toContainText('latest expiry dates');
});
