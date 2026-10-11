import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope, FakeHandler } from '../../test/fetchFake';
import { integrationCatalog, integrationConnection } from '../../test/integrationFixtures';
import { queryClient } from '../../lib/query/queryClient';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { IntegrationsPage } from '../pages/IntegrationsPage';

const me: Me = { user: { id: 'admin', email: 'admin@example.test' }, tenant: { id: 'tenant', name: 'Assurance' }, branches: [], permissions: ['admin.integrations.manage'] };
beforeEach(() => {
  queryClient.clear(); useBranchStore.getState().reset(); setAccessToken('test-token');
  queryClient.setQueryData(ME_QUERY_KEY, me); useSessionStore.setState({ status: 'signed-in' });
});
afterEach(() => vi.unstubAllGlobals());

function setup(override?: FakeHandler) {
  const network = fakeFetch(call => {
    if (call.url.endsWith('/auth/me')) return json(200, me);
    if (call.url.endsWith('/admin/integrations/catalog')) return json(200, integrationCatalog);
    if (call.url.includes('/admin/integrations?')) return json(200, { results: [integrationConnection], count: 26, page: 1, page_size: 25 });
    return override?.(call) ?? json(200, integrationConnection);
  });
  vi.stubGlobal('fetch', network.fn);
  render(<QueryClientProvider client={queryClient}><IntegrationsPage /></QueryClientProvider>);
  return { user: userEvent.setup(), network };
}

describe('Integration setup', () => {
  it('filters service and enabled status on the server and resets pagination', async () => {
    const { user, network } = setup();
    expect(await screen.findByTestId('integration-row')).toHaveTextContent('Not tested');
    await user.click(screen.getByTitle('Next page'));
    await waitFor(() => expect(network.calls.at(-1)?.url).toContain('page=2'));
    await user.selectOptions(screen.getByLabelText('Service'), 'SMS');
    await user.selectOptions(screen.getByLabelText('Setup status'), 'DISABLED');
    await waitFor(() => expect(network.calls.some(c => c.url.includes('category=SMS&status=DISABLED&page=1'))).toBe(true));
  });

  it('creates a provider-specific setup with an idempotency key and no credential echo', async () => {
    const { user, network } = setup();
    await screen.findByTestId('integration-row');
    await user.click(screen.getByRole('button', { name: 'Add integration' }));
    const form = within(screen.getByRole('dialog'));
    await user.type(form.getByLabelText('Name *'), 'Email service');
    await user.selectOptions(form.getByLabelText('Provider *'), 'SMTP');
    expect(form.queryByLabelText('Company ID *')).not.toBeInTheDocument();
    expect(form.getByLabelText('Service *')).toHaveValue('EMAIL');
    await user.type(form.getByLabelText('SMTP host *'), 'smtp.example.test');
    await user.type(form.getByLabelText('Port *'), '587');
    await user.type(form.getByLabelText('Username *'), 'mailer');
    await user.type(form.getByLabelText('Sender email *'), 'notifications@example.test');
    await user.selectOptions(form.getByLabelText('Transport security *'), 'STARTTLS');
    await user.type(form.getByLabelText('SMTP password'), 'private-value');
    await user.click(form.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const sent = network.calls.find(c => c.method === 'POST')!;
    expect(sent.headers['x-idempotency-key']).toBeTruthy();
    expect(sent.body).toEqual({ name: 'Email service', provider: 'SMTP', category: 'EMAIL', is_active: true, clear_secret: false, secret: 'private-value',
      configuration: { host: 'smtp.example.test', port: 587, username: 'mailer', sender_email: 'notifications@example.test', security: 'STARTTLS' } });
    expect(document.body).not.toHaveTextContent('private-value');
  });

  it('preserves credentials when blank and sends the current ETag when disabling setup', async () => {
    const { user, network } = setup();
    await user.click(await screen.findByTitle('Edit Core banking sandbox'));
    expect(screen.getByLabelText('Client secret (replace)')).toHaveValue('');
    await user.click(screen.getByLabelText('Setup enabled'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const sent = network.calls.find(c => c.method === 'PUT')!;
    expect(sent.headers['if-match']).toBe(integrationConnection.etag);
    expect(sent.body).toMatchObject({ is_active: false, clear_secret: false });
    expect(sent.body).not.toHaveProperty('secret');
  });

  it('clears a stored credential only through an explicit clear operation', async () => {
    const { user, network } = setup();
    await user.click(await screen.findByTitle('Edit Core banking sandbox'));
    await user.type(screen.getByLabelText('Client secret (replace)'), 'discarded-replacement');
    await user.click(screen.getByLabelText('Clear stored credential'));
    expect(screen.getByLabelText('Client secret (replace)')).toBeDisabled();
    expect(screen.getByLabelText('Client secret (replace)')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(network.calls.some(c => c.method === 'PUT')).toBe(true));
    expect(network.calls.find(c => c.method === 'PUT')!.body).toMatchObject({ clear_secret: true });
    expect(network.calls.find(c => c.method === 'PUT')!.body).not.toHaveProperty('secret');
  });

  it('drops provider fields and credentials when switching to unauthenticated HTTP', async () => {
    const { user, network } = setup();
    await user.click(await screen.findByTitle('Edit Core banking sandbox'));
    await user.selectOptions(screen.getByLabelText('Provider *'), 'HTTP_API');
    await user.type(screen.getByLabelText('HTTPS base URL *'), 'https://provider.example.test/api');
    await user.selectOptions(screen.getByLabelText('Authentication *'), 'API_KEY');
    await user.type(screen.getByLabelText('API key header'), 'X-API-Key');
    await user.type(screen.getByLabelText('API credential'), 'temporary-value');
    await user.selectOptions(screen.getByLabelText('Authentication *'), 'NONE');
    expect(screen.queryByLabelText('API credential')).not.toBeInTheDocument();
    expect(screen.getByLabelText('API key header')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(network.calls.some(c => c.method === 'PUT')).toBe(true));
    const sent = network.calls.find(c => c.method === 'PUT')!;
    expect(sent.body).toMatchObject({ provider: 'HTTP_API', configuration: { base_url: 'https://provider.example.test/api', authentication: 'NONE' } });
    expect(sent.body).not.toHaveProperty('secret');
    expect((sent.body as { configuration: object }).configuration).not.toHaveProperty('company_id');
    expect((sent.body as { configuration: object }).configuration).not.toHaveProperty('api_key_header');
  });

  it('keeps stale edits intact until the user explicitly reloads, then uses the new version', async () => {
    let stale = true;
    const refreshed = { ...integrationConnection, name: 'Updated by another administrator', etag: '"integration-bc-connection-2"' };
    const { user, network } = setup(call => {
      if (call.method === 'PUT' && stale) { stale = false; return envelope(412, 'ETAG_MISMATCH', 'This record changed since you opened it.'); }
      return json(200, refreshed);
    });
    await user.click(await screen.findByTitle('Edit Core banking sandbox'));
    await user.clear(screen.getByLabelText('Name *')); await user.type(screen.getByLabelText('Name *'), 'Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This record changed');
    expect(screen.getByLabelText('Name *')).toHaveValue('Unsaved changes');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Discard edits and reload' }));
    await waitFor(() => expect(screen.getByLabelText('Name *')).toHaveValue(refreshed.name));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(network.calls.filter(c => c.method === 'PUT').at(-1)?.headers['if-match']).toBe(refreshed.etag);
  });
});
