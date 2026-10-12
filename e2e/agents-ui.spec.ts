import { expect, test } from '@playwright/test';

const base = process.env.OPERATIONS_UI_URL;
test.skip(!base, 'Set OPERATIONS_UI_URL to a backend-mode Vite server.');
const agent = { id: 'agent-1', code: 'AG-001', name: 'Karibu Insurance Agency', kind: 'AGENT', parent: null, email: 'enquiries@karibu.example', phone: '+254712000000', licence_no: 'AGENCY-2026-012', status: 'PENDING', reason: 'Onboarding documents reviewed', contributors: ['maker'], approved_at: null, created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-12T08:00:00Z', etag: '"agent-v2"' };

for (const width of [1440, 390]) {
  test(`agent workspace layout and approval ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let current = { ...agent };
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      let body: unknown = {};
      if (url.pathname.endsWith('/auth/refresh')) body = { status: 'SIGNED_IN', access_token: 'fixture-token', expires_in: 600 };
      else if (url.pathname.endsWith('/auth/me')) body = { user: { id: 'checker', email: 'reviewer@example.test' }, tenant: { id: 'tenant', name: 'Horizon Assurance' }, branches: [], permissions: ['intermediaries.agent.view', 'intermediaries.agent.manage', 'intermediaries.agent.approve'] };
      else if (url.pathname.endsWith('/notifications/system')) body = [];
      else if (url.pathname.endsWith('/agents')) body = { results: [current], count: 1, page: 1, page_size: 25 };
      else if (url.pathname.endsWith('/approve')) {
        expect(route.request().headers()['if-match']).toBe(agent.etag);
        current = { ...current, status: 'ACTIVE', etag: '"agent-v3"' }; body = current;
      } else if (url.pathname.endsWith('/agent-1')) body = current;
      else if (url.pathname.endsWith('/activity')) body = { results: [{ id: 'event', action: 'AGENT_SUBMIT', at: agent.updated_at, reason: agent.reason }] };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${base}/agents/list`);
    await expect(page.getByRole('link', { name: agent.name })).toBeVisible();
    await page.screenshot({ path: info.outputPath('agents-list.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.getByRole('link', { name: agent.name }).click();
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('agent-workspace.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await page.getByLabel('Reason *').fill('Independent registration review complete');
    await page.getByRole('button', { name: 'Approve agent', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Suspend', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Activity', exact: true }).click();
    await expect(page.getByRole('cell', { name: agent.reason })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
