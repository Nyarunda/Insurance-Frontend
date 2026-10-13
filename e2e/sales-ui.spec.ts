import { expect, test } from '@playwright/test';

const base = process.env.OPERATIONS_UI_URL;
test.use({ actionTimeout: 15_000 });
test.skip(!base, 'Set OPERATIONS_UI_URL to a backend-mode Vite server.');
const lead = { id: 'lead-1', reference: 'REF-2026-001', name: 'ABC Logistics Limited', email: 'finance@abc.example', phone: '+254712000000', source: 'Member referral', agent_name: 'Karibu Insurance Agency', campaign_name: 'October member campaign', status: 'NEW', etag: '"v1"' };
for (const width of [1440, 390]) {
  test(`sales workspace and import layout ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = {};
      if (path.endsWith('/auth/refresh')) body = { status: 'SIGNED_IN', access_token: 'fixture', expires_in: 600 };
      else if (path.endsWith('/auth/me')) body = { user: { id: 'actor', email: 'sales@example.test' }, tenant: { id: 'tenant', name: 'Horizon Assurance' }, branches: [], permissions: ['intermediaries.sales.view', 'intermediaries.sales.manage', 'intermediaries.commission.view'] };
      else if (path.endsWith('/notifications/system')) body = [];
      else if (path.endsWith('/sales/leads')) body = { results: [lead], count: 1, page: 1, page_size: 25 };
      else if (path.endsWith('/sales/leads/lead-1')) body = lead;
      else if (path.endsWith('/sales/targets')) body = { results: [], count: 0, page: 1, page_size: 25 };
      else if (path.endsWith('/sales/followups')) body = { results: [{ id: 'follow-1', lead_name: lead.name, note: 'Discuss fleet cover with the finance manager.', due_on: '2026-10-20', completed_at: null }], count: 1, page: 1, page_size: 25 };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${base}/sales/leads`);
    await expect(page.getByRole('link', { name: lead.name })).toBeVisible();
    await page.screenshot({ path: info.outputPath('leads-list.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.getByRole('button', { name: 'Import Excel' }).click();
    await expect(page.getByRole('button', { name: 'Import 0 leads' })).toBeDisabled();
    await page.screenshot({ path: info.outputPath('import-dialog.png'), fullPage: true });
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
    await page.getByRole('link', { name: lead.name }).click();
    await expect(page.getByRole('button', { name: 'Add follow-up' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('lead-workspace.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.goto(`${base}/sales/targets`);
    await page.getByRole('button', { name: 'New target' }).click();
    await page.getByLabel('Assignment').selectOption('BRANCH');
    await page.getByRole('combobox', { name: 'Measure *', exact: true }).selectOption('PREMIUM');
    await expect(page.getByRole('button', { name: 'Select branch' })).toBeVisible();
    await expect(page.getByLabel('Premium goal *', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Count goal *', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('branch-premium-target.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    expect(errors).toEqual([]);
  });
}
