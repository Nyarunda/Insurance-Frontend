/** Browser layout checks with explicit API fixtures, separate from the live database gate. */
import { expect, test } from '@playwright/test';

const base = process.env.OPERATIONS_UI_URL;
test.skip(!base, 'Set OPERATIONS_UI_URL to the backend-mode Vite server.');
const branch = { id: 'branch', code: 'NBO', name: 'Nairobi', scope: 'ALL' };
const member = { user_id: 'member', email: 'jane.kamau@example.test', status: 'ACTIVE', default_branch: branch, member_from: '2026-01-01', profile_status: 'ACTIVE', identity_active: true, roles: [{ name: 'Finance officer', scope: 'BRANCH', branch_code: 'NBO' }], branch_access: [] };
const me = { user: { id: 'actor', email: 'admin@example.test' }, tenant: { id: 'tenant', name: 'Horizon Assurance' }, branches: [branch], permissions: ['admin.users.view', 'admin.users.manage', 'admin.roles.manage', 'billing.document.view', 'billing.receipt.create', 'billing.setup.manage'] };
const role = { id: 'collections', name: 'Collections Officer', description: 'Record premium receipts and view customer statements.', origin: 'TENANT', editable: true, permissions: [] };
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`operations layout ${viewport.width}`, async ({ page }, info) => {
    page.setDefaultTimeout(15_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = {};
      if (path.endsWith('/auth/refresh')) body = { status: 'SIGNED_IN', access_token: 'layout-fixture-token', expires_in: 600 };
      else if (path.endsWith('/auth/me')) body = me;
      else if (path.endsWith('/admin/users')) body = { results: [member], count: 1, page: 1, page_size: 25 };
      else if (path.endsWith('/admin/users/member')) body = member;
      else if (path.endsWith('/admin/users/member/access')) body = { roles: [{ id: 'assignment', name: 'Finance officer', scope: 'BRANCH', branch_name: 'Nairobi', effective_from: '2026-01-01', effective_to: null }], branches: [], overrides: [], proposals: [] };
      else if (path.endsWith('/admin/user-options')) body = { branches: [branch], roles: [], permissions: [] };
      else if (path.endsWith('/admin/roles')) body = [role];
      else if (path.endsWith('/admin/roles/collections')) body = role;
      else if (path.endsWith('/permission-proposals')) body = [];
      else if (path.endsWith('/admin/permissions')) body = [
        { id: 'read', code: 'billing.document.view', module: 'billing', description: 'View receipt and statement records.', grantable: true },
        { id: 'create', code: 'billing.receipt.create', module: 'billing', description: 'Record a customer payment.', grantable: true },
        { id: 'reverse', code: 'billing.receipt.reverse', module: 'billing', description: 'Reverse an eligible receipt.', grantable: true },
      ];
      else if (path.endsWith('/billing/receipts')) body = { results: [{ id: 'receipt', receipt_no: 'RCT0000042', customer_name: 'ABC Logistics Ltd', currency: 'KES', amount: '45000.00', payment_method: 'BANK_TRANSFER', payment_date: '2026-10-11', status: 'ACTIVE' }], count: 1, page: 1, page_size: 25 };
      else if (path.endsWith('/billing/receipts/receipt')) body = { id: 'receipt', receipt_no: 'RCT0000042', customer_name: 'ABC Logistics Ltd', currency: 'KES', amount: '45000.00', payment_method: 'BANK_TRANSFER', payment_date: '2026-10-11', status: 'ACTIVE', payment_reference: 'BANK-24031', created_by: 'actor', reversal_of_receipt_id: null, allocations: [{ id: 'allocation', policy_no: 'POL0000021', amount: '45000.00' }] };
      else if (path.endsWith('/billing/receipts/receipt/journal')) body = { posting_date: '2026-10-11', action: 'RECEIVE', description: 'Premium receipt RCT0000042', currency: 'KES', total_debit: '45000.00', total_credit: '45000.00', lines: [
        { line_no: 1, account_code: 'BANK01', account_name: 'Premium collections', debit: '45000.00', credit: '0.00', memo: 'Bank transfer' },
        { line_no: 2, account_code: 'CLIENT01', account_name: 'Client receivables', debit: '0.00', credit: '45000.00', memo: 'POL0000021' },
      ] };
      else if (path.endsWith('/billing/accounts')) body = { results: [{ id: 'bank', code: 'BANK01', name: 'Premium collections', kind: 'BANK', currency: 'KES', is_active: true, external_mapping: 'BANK-001', etag: '"v1"' }] };
      else if (path.endsWith('/billing/reports/collections')) body = {
        results: [{ bucket: '2026-10-11', label: '2026-10-11', currency: 'KES', receipt_count: 10, reversal_count: 1, gross: '45000.00', reversed: '125.30', net: '44874.70' }],
        totals: [{ currency: 'KES', receipt_count: 10, reversal_count: 1, gross: '45000.00', reversed: '125.30', net: '44874.70' }],
        count: 1, page: 1, page_size: 25, date_from: '2026-10-01', date_to: '2026-10-31', group_by: 'day', date_basis: 'POSTING_DATE',
      };
      else if (path.endsWith('/billing/account-kinds')) body = [{ code: 'BANK', name: 'Bank' }];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${base}/admin/users/list`);
    await expect(page.getByRole('link', { name: member.email })).toBeVisible();
    await page.screenshot({ path: info.outputPath('users.png'), fullPage: true });
    await page.getByRole('link', { name: member.email }).click();
    await page.getByRole('tab', { name: 'Roles', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Assign role', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('permissions.png'), fullPage: true });
    await page.goto(`${base}/admin/roles/list`);
    await expect(page.getByRole('link', { name: 'Collections Officer' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('roles.png'), fullPage: true });
    await page.getByRole('link', { name: 'Collections Officer' }).click();
    await expect(page.getByRole('checkbox', { name: 'Record receipts', exact: true })).toBeEnabled();
    await expect(page.getByText('billing.receipt.create', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('role-permissions.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    await page.getByRole('checkbox', { name: 'Show technical codes' }).check();
    await expect(page.getByText('billing.receipt.create', { exact: true })).toBeVisible();
    await page.goto(`${base}/billing/receipts/list`);
    await expect(page.getByRole('link', { name: 'RCT0000042' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('receipts.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    await page.getByRole('link', { name: 'RCT0000042' }).click();
    await expect(page.getByTestId('receipt-journal').getByRole('row', { name: 'Total KES 45000.00 KES 45000.00' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('receipt-journal.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    await page.getByTestId('receipt-print').click();
    await expect(page.getByTestId('print-document')).toContainText('ABC Logistics Ltd');
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: info.outputPath('receipt-print.png'), fullPage: true });
    await expect(page.getByTestId('document-print')).toBeHidden();
    await expect(page.getByTestId('print-document')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
    await page.goto(`${base}/billing/reports/collections`);
    await expect(page.getByTestId('collections-totals')).toContainText('44874.70');
    await page.screenshot({ path: info.outputPath('collections.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('collections-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('premium-collections-');
    await page.getByTitle('Print report page').click();
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: info.outputPath('collections-print.png'), fullPage: true });
    await expect(page.getByTestId('print-document')).toContainText('44874.70');
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
    await page.goto(`${base}/billing/accounts/list`);
    await page.getByTitle('Edit BANK01').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: info.outputPath('account-edit.png'), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}
