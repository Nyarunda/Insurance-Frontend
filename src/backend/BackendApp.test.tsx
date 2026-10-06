import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, fakeFetch, FakeHandler, json, signedIn } from '../test/fetchFake';
import { useBranchStore } from '../lib/context/branchStore';
import { ME_QUERY_KEY, Me } from '../lib/auth/me';
import { useSessionStore } from '../lib/auth/sessionStore';
import { getAccessToken, setAccessToken } from '../lib/auth/tokens';
import { queryClient } from '../lib/query/queryClient';
import { backendRoutes } from './BackendApp';
import { RequirePermission, safeReturnPath } from './routing';

const ME: Me = {
  user: { id: 'u1', email: 'maker@acme.test' },
  tenant: { id: 't1', name: 'Acme Insurance' },
  permissions: ['policies.policy.view'],
  branches: [
    { id: 'b-nbo', code: 'NBO', name: 'Nairobi', scope: 'OWN' },
    { id: 'b-msa', code: 'MSA', name: 'Mombasa', scope: 'OWN' },
  ],
};

const CHALLENGE = {
  status: 'OTP_REQUIRED',
  challenge_id: 'ch-1',
  otp_expires_in: 300,
  resend_after: 30,
  delivery: { channel: 'EMAIL', destination: 'm***@acme.test' },
};

function backend(handler: FakeHandler) {
  const network = fakeFetch(handler);
  vi.stubGlobal('fetch', network.fn);
  return network;
}

function renderAt(path: string, routes = backendRoutes) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const signedOut = () => useSessionStore.setState({ status: 'signed-out', notice: null, unavailableReason: null });

function signedInAs(me: Me) {
  setAccessToken('access-1');
  queryClient.setQueryData(ME_QUERY_KEY, me);
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  useSessionStore.setState({ status: 'signed-in', notice: null, unavailableReason: null });
}

beforeEach(() => {
  setAccessToken(null);
  queryClient.clear();
  useBranchStore.getState().reset();
  signedOut();
});

afterEach(() => vi.unstubAllGlobals());

describe('route protection', () => {
  it('sends an unauthenticated visit to sign-in', async () => {
    const router = renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('shows the permission state for a screen the permissions do not allow, and the screen when they do', async () => {
    signedInAs(ME);
    const routes = [
      { path: '/allowed', element: <RequirePermission permission="policies.policy.view">Policies screen</RequirePermission> },
      { path: '/denied', element: <RequirePermission permission="workflow.task.view">Queue screen</RequirePermission> },
    ];
    renderAt('/denied', routes);
    expect(await screen.findByText('You do not have access to this screen')).toBeInTheDocument();
    expect(screen.queryByText('Queue screen')).not.toBeInTheDocument();
    expect(screen.getByText('workflow.task.view')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Ask your administrator');
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });

  it('shows the screen when the permission is held', async () => {
    signedInAs(ME);
    renderAt('/allowed', [
      { path: '/allowed', element: <RequirePermission permission="policies.policy.view">Policies screen</RequirePermission> },
    ]);
    expect(await screen.findByText('Policies screen')).toBeInTheDocument();
  });
});

describe('the return path after sign-in', () => {
  it.each([
    ['/policies/abc?tab=versions', '/policies/abc?tab=versions'],
    ['//example.com/steal', '/'],
    ['//example.com', '/'],
    ['/\\example.com', '/'],
    ['https://example.com', '/'],
    ['/sign-in', '/'],
    ['/sign-in?x=1', '/'],
    [undefined, '/'],
  ])('%s -> %s', (from, expected) => {
    expect(safeReturnPath(from)).toBe(expected);
  });

  it('never lands on a scheme-relative destination', async () => {
    signedInAs(ME);
    const router = createMemoryRouter(backendRoutes, {
      initialEntries: [{ pathname: '/sign-in', state: { from: '//example.com/steal' } }],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('sign-in against the backend contract', () => {
  it('runs login, OTP and the forced password change, then lands where the user was going', async () => {
    const user = userEvent.setup();
    const network = backend((call) => {
      switch (call.url) {
        case '/api/v1/auth/login':
          return json(200, { ...CHALLENGE, sandbox_code: '482913' });
        case '/api/v1/auth/otp/verify':
          return json(200, { status: 'PASSWORD_CHANGE_REQUIRED', challenge_id: 'ch-1' });
        case '/api/v1/auth/password/forced-change':
          return (call.body as { new_password: string }).new_password === 'Reused-Password-1'
            ? envelope(422, 'PASSWORD_POLICY_VIOLATION', 'the new password must differ from the current one', {
                requirements: ['different from the current password'],
              })
            : signedIn('access-new');
        case '/api/v1/auth/me':
          return json(200, ME);
        default:
          throw new Error(`unexpected ${call.url}`);
      }
    });
    const router = renderAt('/');

    await user.type(await screen.findByPlaceholderText('name@company.co.ke'), 'maker@acme.test');
    await user.type(screen.getByPlaceholderText('Enter password'), 'Temporary-Pass-1');
    expect(screen.getByTestId('sign-in-host')).toHaveTextContent(window.location.hostname);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('heading', { name: 'Verify your identity' })).toBeInTheDocument();
    expect(screen.getByText('m***@acme.test')).toBeInTheDocument();
    expect(screen.getByTestId('sandbox-code')).toHaveTextContent('482913');
    expect(network.calls[0].body).toEqual({ email: 'maker@acme.test', password: 'Temporary-Pass-1' });
    expect(network.calls[0].headers.authorization).toBeUndefined();

    await user.type(screen.getByPlaceholderText('000000'), '482913');
    await user.click(screen.getByRole('button', { name: 'Verify & Continue' }));
    expect(await screen.findByRole('heading', { name: 'Update your password' })).toBeInTheDocument();
    expect(network.calls[1].body).toEqual({ challenge_id: 'ch-1', code: '482913' });

    // The rules are checked before anything is sent.
    await user.type(screen.getByPlaceholderText('Enter new password'), 'short');
    await user.type(screen.getByPlaceholderText('Re-enter new password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Set Password & Continue' }));
    expect(network.calls).toHaveLength(2);

    // The backend's answer is final.
    await user.clear(screen.getByPlaceholderText('Enter new password'));
    await user.clear(screen.getByPlaceholderText('Re-enter new password'));
    await user.type(screen.getByPlaceholderText('Enter new password'), 'Reused-Password-1');
    await user.type(screen.getByPlaceholderText('Re-enter new password'), 'Reused-Password-1');
    await user.click(screen.getByRole('button', { name: 'Set Password & Continue' }));
    expect(await screen.findByText('The new password needs different from the current password.')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Enter new password'));
    await user.clear(screen.getByPlaceholderText('Re-enter new password'));
    await user.type(screen.getByPlaceholderText('Enter new password'), 'Brand-New-Pass-2');
    await user.type(screen.getByPlaceholderText('Re-enter new password'), 'Brand-New-Pass-2');
    await user.click(screen.getByRole('button', { name: 'Set Password & Continue' }));

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(getAccessToken()).toBe('access-new');
    expect(network.calls.find((call) => call.url === '/api/v1/auth/me')?.headers.authorization).toBe('Bearer access-new');
  }, 30_000); // a long typed journey; slow under the parallel run

  it('never shows a code the backend did not send', async () => {
    const user = userEvent.setup();
    backend(() => json(200, CHALLENGE));
    renderAt('/sign-in');
    await user.type(await screen.findByPlaceholderText('name@company.co.ke'), 'maker@acme.test');
    await user.type(screen.getByPlaceholderText('Enter password'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('heading', { name: 'Verify your identity' })).toBeInTheDocument();
    expect(screen.queryByTestId('sandbox-code')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sandbox code/)).not.toBeInTheDocument();
  });

  it('shows a refused sign-in with its reference', async () => {
    const user = userEvent.setup();
    backend(() => envelope(401, 'INVALID_CREDENTIALS', 'the e-mail or password is not correct', {}, 'corr-login'));
    renderAt('/sign-in');
    await user.type(await screen.findByPlaceholderText('name@company.co.ke'), 'maker@acme.test');
    await user.type(screen.getByPlaceholderText('Enter password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The email or password is not correct.');
    expect(within(alert).getByText('corr-login')).toBeInTheDocument();
    expect(useSessionStore.getState().status).toBe('signed-out');
  });

  it('counts down the OTP attempts the backend reports', async () => {
    const user = userEvent.setup();
    backend((call) =>
      call.url.endsWith('/login') ? json(200, CHALLENGE) : envelope(401, 'OTP_INVALID', 'the code is not correct', { attempts_remaining: 3 }),
    );
    renderAt('/sign-in');
    await user.type(await screen.findByPlaceholderText('name@company.co.ke'), 'maker@acme.test');
    await user.type(screen.getByPlaceholderText('Enter password'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await user.type(await screen.findByPlaceholderText('000000'), '111111');
    await user.click(screen.getByRole('button', { name: 'Verify & Continue' }));
    expect(await screen.findByText('The code is not correct. 3 attempts left.')).toBeInTheDocument();
  });

  it('starts again when the challenge is no longer valid', async () => {
    const user = userEvent.setup();
    backend((call) =>
      call.url.endsWith('/login') ? json(200, CHALLENGE) : envelope(401, 'CHALLENGE_INVALID', 'this sign-in attempt is no longer valid; start again'),
    );
    renderAt('/sign-in');
    await user.type(await screen.findByPlaceholderText('name@company.co.ke'), 'maker@acme.test');
    await user.type(screen.getByPlaceholderText('Enter password'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await user.type(await screen.findByPlaceholderText('000000'), '111111');
    await user.click(screen.getByRole('button', { name: 'Verify & Continue' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This sign-in attempt is no longer valid. Start again.');
  });

  it('says why the user is back at sign-in after the session ended', async () => {
    useSessionStore.setState({ status: 'signed-out', notice: 'SESSION_ENDED' });
    renderAt('/sign-in');
    expect(await screen.findByText('Your session ended. Sign in again to continue.')).toBeInTheDocument();
  });
});

describe('the shell in backend mode', () => {
  it('shows the tenant from /me with no switcher, and none of the demo’s mock content', async () => {
    signedInAs(ME);
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByTestId('tenant-name')).toHaveTextContent('Acme Insurance');
    expect(screen.queryByTitle('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Create a new record')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Search (Ctrl+K)')).not.toBeInTheDocument();
    expect(screen.queryByText(/Role center/i)).not.toBeInTheDocument();
  });

  it('lets the user choose a branch from /me.branches and sends it as context', async () => {
    const user = userEvent.setup();
    signedInAs(ME);
    const network = backend(() => json(200, ME));
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: 'Branch: All my branches' }));
    await user.click(screen.getByRole('menuitemradio', { name: /Mombasa/ }));
    expect(screen.getByTestId('branch-context')).toHaveTextContent('Mombasa (MSA)');

    await queryClient.refetchQueries({ queryKey: ME_QUERY_KEY });
    expect(network.calls.at(-1)?.headers['x-branch-id']).toBe('b-msa');
  });

  it('shows that sign-out was not confirmed when the logout request fails', async () => {
    const user = userEvent.setup();
    signedInAs(ME);
    backend(() => Promise.reject(new TypeError('offline')));
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Sign-out not confirmed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You were signed out locally, but the server could not confirm sign-out. Try again when the connection is available.',
      ),
    ).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('signs out through the account menu and returns to sign-in', async () => {
    const user = userEvent.setup();
    signedInAs(ME);
    const network = backend(() => json(204, null));
    const router = renderAt('/');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(network.calls.map((call) => call.url)).toContain('/api/v1/auth/logout');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(getAccessToken()).toBeNull();
  });
});
