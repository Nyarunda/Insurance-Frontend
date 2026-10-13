import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeFetch, json } from '../../test/fetchFake';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { queryClient } from '../../lib/query/queryClient';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';

beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

function at(path: string, permissions: string[], responder: (url: string, method: string) => Response) {
  const me: Me = { user: { id: 'u1', email: 'admin@example.test' }, tenant: { id: 't1', name: 'Demo' }, branches: [], permissions };
  const network = fakeFetch(call => {
    if (call.url.endsWith('/auth/me')) return json(200, me);
    return responder(call.url, call.method);
  });
  vi.stubGlobal('fetch', network.fn);
  setAccessToken('test');
  useSessionStore.setState({ status: 'signed-in' });
  queryClient.setQueryData(ME_QUERY_KEY, me);
  const router = createMemoryRouter(backendRoutes, { initialEntries: [path] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), network };
}

it('uses the platform plan catalogue instead of accepting a free-text plan code', async () => {
  const { user, network } = at('/platform/tenants/list', ['admin.users.view'], (url, method) => {
    if (url.endsWith('/platform/plans')) return json(200, [{ code: 'FULL', name: 'Full', max_users: null, modules: ['clients'] }]);
    if (method === 'POST') return json(201, { id: 'tenant' });
    return json(200, []);
  });
  const newTenant = await screen.findByRole('button', { name: 'New tenant' });
  await waitFor(() => expect(newTenant).toBeEnabled());
  await user.click(newTenant);
  expect(screen.queryByLabelText('Plan code *')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Name *'), 'Acme Insurance');
  await user.type(screen.getByLabelText('Slug *'), 'acme');
  await user.type(screen.getByLabelText('Domain *'), 'acme.localhost');
  await user.selectOptions(screen.getByLabelText('Plan *'), 'FULL');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  await waitFor(() => expect(network.calls.some(c => c.method === 'POST')).toBe(true));
  expect(network.calls.find(c => c.method === 'POST')?.body).toMatchObject({ plan_code: 'FULL' });
});

it('shows insurer setup only to insurer viewers and exposes managed insurer records', async () => {
  at('/setup/insurers/list', ['insurers.insurer.view'], url =>
    url.endsWith('/insurers') ? json(200, { results: [{ id: 'i1', code: 'APA', name: 'APA Insurance', short_name: 'APA', insurer_type: 'GENERAL', status: 'ACTIVE' }] }) : json(200, {}));
  expect(await screen.findByText('APA Insurance')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'New insurer' })).not.toBeInTheDocument();
});

it('keeps configuration publishing distinct from workflow approvals', async () => {
  const { user, network } = at('/setup/levy-rates', ['products.product.view', 'products.config.publish'], (url, method) => {
    if (method === 'POST') return json(200, { status: 'PUBLISHED' });
    return url.includes('/levy-rates') ? json(200, { results: [{
      id: 'levy-1', code: 'TL', name: 'Training Levy', basis: 'PERCENT', rate: '0.25', lines: ['GENERAL'],
      currency: 'KES', remittance_party: 'AUTHORITY', status: 'DRAFT', effective_from: '2026-11-01',
      effective_to: null, created_by: 'maker', published_by: null,
    }] }) : json(200, {});
  });
  expect(await screen.findByText('Training Levy')).toBeVisible();
  expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Publish' }));
  expect(screen.getByText(/maker–publisher/i)).toBeVisible();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' }));
  await waitFor(() => expect(network.calls.some(c => c.method === 'POST' && c.url.endsWith('/levy-rates/levy-1/publish'))).toBe(true));
  expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
});
