import { readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';

const source = process.env.OPERATIONS_ACCOUNTS;
test.skip(!source, 'Requires run_operations_demo.py and OPERATIONS_ACCOUNTS');
test.use({ trace: 'off', video: 'off', screenshot: 'off' });
type Account = { email: string; password: string; url: string };

async function signIn(page: Page, account: Account) {
  await page.goto(`${account.url}/sign-in`);
  await page.getByPlaceholder('name@company.co.ke').fill(account.email);
  await page.getByPlaceholder('Enter password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByTestId('sandbox-code')).toBeVisible();
  const code = (await page.getByTestId('sandbox-code').textContent())!.match(/\d{6}/)![0];
  await page.getByPlaceholder('000000').fill(code);
  await page.getByRole('button', { name: 'Verify & Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
}

test('real tenant API: user workspace, permission approval, receipt and second-user reversal', async ({ browser }) => {
  test.setTimeout(180_000);
  const accounts: Account[] = JSON.parse(readFileSync(source!, 'utf8')).accounts;
  const makerContext = await browser.newContext();
  const checkerContext = await browser.newContext();
  try {
    const maker = await makerContext.newPage();
    const checker = await checkerContext.newPage();
    maker.setDefaultTimeout(15_000);
    checker.setDefaultTimeout(15_000);
    await signIn(maker, accounts[0]);
    await maker.goto(`${accounts[0].url}/admin/users/list?q=checker`);
    await maker.getByRole('link', { name: accounts[1].email, exact: true }).click();
    await maker.getByRole('tab', { name: 'Roles', exact: true }).click();
    await expect(maker.getByRole('button', { name: 'Assign role', exact: true })).toBeVisible();

    await maker.goto(`${accounts[0].url}/admin/roles/list`);
    await expect(maker.getByRole('link', { name: 'Collections Officer', exact: true })).toBeVisible();
    const existingNames = await maker.locator('table a').allTextContents();
    expect(existingNames.some(n => /^Role [0-9a-f]{10}$/.test(n))).toBe(false);
    let sequence = 1;
    while (existingNames.includes(`Receipt Enquiry - Browser Check ${sequence}`)) sequence++;
    await maker.getByRole('button', { name: 'New role', exact: true }).click();
    const name = `Receipt Enquiry - Browser Check ${sequence}`;
    await maker.getByLabel('Name *', { exact: true }).fill(name);
    await maker.getByRole('button', { name: 'Save', exact: true }).click();
    await maker.getByRole('link', { name, exact: true }).click();
    const roleUrl = maker.url();
    await maker.getByRole('checkbox', { name: 'View receipts and statements', exact: true }).click();
    await maker.getByLabel('Reason *').fill('Receipt enquiry duties');
    await maker.getByRole('button', { name: 'Submit for approval', exact: true }).click();
    await maker.getByRole('tab', { name: /^Approvals/ }).click();
    await expect(maker.getByRole('cell', { name: 'Pending', exact: true })).toBeVisible();
    await expect(maker.getByTitle('Approve View receipts and statements', { exact: true })).toHaveCount(0);

    await signIn(checker, accounts[1]);
    await checker.goto(roleUrl);
    await checker.getByRole('tab', { name: /^Approvals/ }).click();
    await checker.getByTitle('Approve View receipts and statements', { exact: true }).click();
    await checker.getByLabel('Reason *').fill('Approved enquiry access');
    await checker.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(checker.getByRole('dialog')).toHaveCount(0);
    await checker.getByRole('tab', { name: 'Permissions', exact: true }).click();
    await expect(checker.getByRole('checkbox', { name: 'View receipts and statements', exact: true })).toBeChecked();

    await maker.goto(`${accounts[0].url}/billing/receipts/list`);
    await maker.getByRole('button', { name: 'Record receipt', exact: true }).click();
    await maker.getByTitle(/^Allocate to /).first().click();
    await maker.getByLabel('Receipt amount *', { exact: true }).fill('125.30');
    await maker.getByLabel('Payment date *', { exact: true }).fill(new Date().toISOString().slice(0, 10));
    for (const label of ['Payment account *', 'Receivable account *']) {
      const select = maker.getByRole('combobox', { name: label, exact: true });
      await expect(select.locator('option')).toHaveCount(2);
      await select.selectOption((await select.locator('option').nth(1).getAttribute('value'))!);
    }
    await maker.getByLabel(/^Allocation for /).fill('125.30');
    await maker.getByRole('button', { name: 'Post receipt', exact: true }).click();
    await expect(maker.getByRole('heading', { name: /^RCT/ })).toBeVisible();
    await expect(maker.getByTestId('receipt-journal').getByRole('row', { name: 'Total KES 125.30 KES 125.30' })).toBeVisible();
    await expect(maker.getByRole('button', { name: 'Reverse receipt', exact: true })).toHaveCount(0);
    await checker.goto(maker.url());
    await checker.getByRole('button', { name: 'Reverse receipt', exact: true }).click();
    await checker.getByLabel('Reason *').fill('Duplicate customer payment in local test');
    await checker.getByRole('dialog').getByRole('button', { name: 'Reverse receipt', exact: true }).click();
    await expect(checker.getByText('Duplicate customer payment in local test', { exact: true })).toBeVisible();
    await expect(checker.getByTestId('receipt-journal').getByRole('row', { name: 'Total KES 125.30 KES 125.30' })).toBeVisible();
    await checker.getByTestId('receipt-print').click();
    await expect(checker.getByTestId('print-document')).toContainText('Receipt reversal');
    await checker.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
    await checker.goto(`${accounts[1].url}/billing/reports/collections`);
    await expect(checker.getByTestId('collections-totals')).toContainText('KES');
    await expect(checker.getByRole('alert')).toHaveCount(0);
    await checker.getByLabel('Group collections by').selectOption('payment_method');
    await checker.getByRole('button', { name: 'Run report' }).click();
    await expect(checker.getByRole('cell', { name: 'Bank transfer', exact: true })).toBeVisible();
  } finally {
    await makerContext.close().catch(() => {});
    await checkerContext.close().catch(() => {});
  }
});
