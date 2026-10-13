import { expect, test } from '@playwright/test';
import { productionOptions, productionPolicies, productionReport } from '../src/test/productionFixtures';
import { diaryReport } from '../src/test/diaryFixtures';

const base = process.env.OPERATIONS_UI_URL;
test.skip(!base, 'Set OPERATIONS_UI_URL to the backend-mode Vite server.');
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`production and diary layout ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      let body: unknown = {};
      if (url.pathname.endsWith('/auth/refresh')) body = { status: 'SIGNED_IN', access_token: 'fixture-token', expires_in: 600 };
      else if (url.pathname.endsWith('/auth/me')) body = { user: { id: 'reader', email: 'reader@example.test' }, tenant: { id: 'tenant', name: 'Horizon Assurance' }, branches: [], permissions: ['policies.policy.view'] };
      else if (url.pathname.endsWith('/notifications/system')) body = [];
      else if (url.pathname.endsWith('/options')) body = productionOptions;
      else if (url.pathname.endsWith('/production')) body = url.searchParams.get('view') === 'policies' ? productionPolicies : productionReport;
      else if (url.pathname.endsWith('/renewal-diary')) body = diaryReport;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${base}/reports/production?date_from=2026-10-01&date_to=2026-10-31`);
    await expect(page.getByTestId('production-totals')).toContainText('45250.30');
    await page.getByLabel('Production agent', { exact: true }).selectOption('agent');
    await page.getByLabel('Production sub-agent', { exact: true }).selectOption('sub-agent');
    await page.getByLabel('Group production by').selectOption('sub_agent');
    await page.getByRole('button', { name: 'Run report' }).click();
    await expect(page).toHaveURL(/sub_agent_id=sub-agent/);
    await page.screenshot({ path: info.outputPath('production.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.getByRole('tab', { name: 'Policies', exact: true }).click();
    await expect(page).toHaveURL(/agent_id=agent/);
    await expect(page.getByRole('link', { name: 'POL0000021' })).toHaveAttribute('href', '/policies/list/policy');
    await page.goto(`${base}/renewals/diary?date_from=2026-10-01&date_to=2026-12-31`);
    await expect(page.getByTestId('diary-totals')).toContainText('450250.30');
    await page.screenshot({ path: info.outputPath('diary.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    const download = page.waitForEvent('download');
    await page.getByTestId('diary-export').click();
    expect((await download).suggestedFilename()).toContain('renewal-diary-');
    await page.getByTitle('Print renewal diary page').click();
    await expect(page.getByTestId('print-document')).toContainText('ABC Logistics Ltd');
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: info.outputPath('diary-print.png'), fullPage: true });
    await expect(page.getByTestId('document-print')).toBeHidden();
    expect(errors).toEqual([]);
  });
}
