import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fakeFetch, json, envelope } from '../../test/fetchFake';
import { ME_QUERY_KEY, Me } from '../../lib/auth/me';
import { queryClient } from '../../lib/query/queryClient';
import { setAccessToken } from '../../lib/auth/tokens';
import { useSessionStore } from '../../lib/auth/sessionStore';
import { useBranchStore } from '../../lib/context/branchStore';
import { backendRoutes } from '../BackendApp';
import { AgentPicker } from './AgentPicker';

const branch = { id: 'branch', code: 'NBO', name: 'Nairobi', scope: 'ALL' };
const me: Me = { user: { id: 'actor', email: 'admin@demo.test' }, tenant: { id: 'tenant', name: 'Demo' }, branches: [branch], permissions: ['intermediaries.agent.view', 'intermediaries.agent.manage', 'intermediaries.agent.approve', 'quotations.quotation.create'] };
const agent = { id: 'agent-1', code: 'AG-001', name: 'Karibu Agency', kind: 'AGENT', parent: null, email: 'agent@example.test', phone: '0712000000', licence_no: 'L-123', status: 'DRAFT', reason: '', contributors: ['actor'], approved_at: null, created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z', etag: '"agent-v1"' };
function init(permissions = me.permissions) {
  setAccessToken('access'); queryClient.setQueryData(ME_QUERY_KEY, { ...me, permissions });
  useSessionStore.setState({ status: 'signed-in' }); useBranchStore.getState().hydrate(me.user.id, me.branches);
}
function at(path: string, permissions = me.permissions) {
  init(permissions);
  render(<QueryClientProvider client={queryClient}><RouterProvider router={createMemoryRouter(backendRoutes, { initialEntries: [path] })} /></QueryClientProvider>);
}
beforeEach(() => { queryClient.clear(); useBranchStore.getState().reset(); });
afterEach(() => vi.unstubAllGlobals());
const page = { results: [agent], count: 26, page: 1, page_size: 25 };

it('opens a named workspace and retains server filters while paging', async () => {
  const user = userEvent.setup();
  const net = fakeFetch(c => c.url.includes('/agents?') ? json(200, page) : c.url.endsWith('/agents/agent-1') ? json(200, agent) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/agents/list?status=DRAFT');
  await user.click(await screen.findByTitle('Next page'));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('page=2') && c.url.includes('status=DRAFT'))).toBe(true));
  await user.click(screen.getByRole('link', { name: agent.name }));
  expect(await screen.findByRole('heading', { name: agent.name })).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Sub-agents' })).toBeVisible();
  expect(screen.getByText('L-123')).toBeVisible();
});

it('keeps an edit open after a stale-version conflict and sends its original ETag', async () => {
  const user = userEvent.setup();
  const net = fakeFetch(c => c.method === 'PATCH' ? envelope(412, 'ETAG_MISMATCH', 'This agent changed. Refresh before editing.') : c.url.includes('/agents/agent-1') ? json(200, agent) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/agents/list/agent-1');
  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByLabelText('Name *')); await user.type(screen.getByLabelText('Name *'), 'Karibu Revised');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(net.calls.some(c => c.method === 'PATCH')).toBe(true));
  expect(net.calls.find(c => c.method === 'PATCH')!.headers['if-match']).toBe(agent.etag);
  expect(net.calls.find(c => c.method === 'PATCH')!.headers['x-idempotency-key']).toBeTruthy();
  expect(screen.getByLabelText('Name *')).toHaveValue('Karibu Revised');
  expect(screen.getByRole('dialog')).toBeVisible();
});

it('does not offer self-approval, but offers approval to an independent reviewer', async () => {
  let currentMe = me;
  const net = fakeFetch(c => c.url.endsWith('/agents/agent-1') ? json(200, { ...agent, status: 'PENDING' }) : json(200, currentMe));
  vi.stubGlobal('fetch', net.fn); at('/agents/list/agent-1');
  await screen.findByRole('button', { name: 'Withdraw' });
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  currentMe = { ...me, user: { ...me.user, id: 'checker' } };
  queryClient.setQueryData(ME_QUERY_KEY, currentMe);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeVisible());
});

it('shows Open approval when a workflow governs the pending agent', async () => {
  const governed = { ...agent, status: 'PENDING', workflow: { instance_id: 'wf-instance-1', status: 'PENDING_APPROVAL', stage_label: 'Agent Checker' } };
  const net = fakeFetch(c => c.url.endsWith('/agents/agent-1') ? json(200, governed) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/agents/list/agent-1');
  expect(await screen.findByRole('button', { name: 'Open approval' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  expect(screen.getByText(/Pending approval/)).toBeVisible();
});

it('creates a persisted draft with contact details', async () => {
  const user = userEvent.setup();
  const net = fakeFetch(c => c.method === 'POST' ? json(201, agent) : c.url.includes('/agents?') ? json(200, page) : c.url.includes('/agents/agent-1') ? json(200, agent) : json(200, me));
  vi.stubGlobal('fetch', net.fn); at('/agents/list');
  await user.click(await screen.findByRole('button', { name: 'New agent' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.type(dialog.getByLabelText('Name *'), agent.name);
  await user.type(dialog.getByLabelText('Email'), agent.email);
  await user.click(dialog.getByRole('button', { name: 'Create draft' }));
  await waitFor(() => expect(net.calls.filter(c => c.method === 'POST')).toHaveLength(1));
  expect(net.calls.find(c => c.method === 'POST')!.body).toMatchObject({ name: agent.name, parent_id: null });
  expect(await screen.findByRole('heading', { name: agent.name })).toBeVisible();
});

it('uses paginated approved reference choices and returns a record identity', async () => {
  const user = userEvent.setup(); const choose = vi.fn();
  const net = fakeFetch(() => json(200, { ...page, page_size: 10 })); vi.stubGlobal('fetch', net.fn); init();
  render(<QueryClientProvider client={queryClient}><AgentPicker label="Agent" value={null} onChange={choose} /></QueryClientProvider>);
  expect(net.calls).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Choose agent' }));
  await user.click(await screen.findByTitle('Next page'));
  await waitFor(() => expect(net.calls.some(c => c.url.includes('page=2'))).toBe(true));
  await user.click(screen.getByRole('button', { name: /Karibu Agency/ }));
  expect(choose).toHaveBeenCalledWith(expect.objectContaining({ id: agent.id }));
});

it('blocks a direct route without permission', async () => {
  const net = fakeFetch(() => json(200, { ...me, permissions: [] })); vi.stubGlobal('fetch', net.fn);
  at('/agents/list', []);
  expect(await screen.findByText(/do not have access/i)).toBeVisible();
  expect(net.calls.some(c => c.url.includes('/agents'))).toBe(false);
});
