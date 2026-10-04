import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, fakeFetch, FakeHandler, json, signedIn } from '../../test/fetchFake';
import { api } from '../api/instance';
import { getActiveBranchId, useBranchStore } from '../context/branchStore';
import { queryClient } from '../query/queryClient';
import { ME_QUERY_KEY, Me } from './me';
import { completeSignIn, restoreSession, signOut } from './session';
import { useSessionStore } from './sessionStore';
import { getAccessToken, setAccessToken } from './tokens';

export const ME: Me = {
  user: { id: 'u1', email: 'checker@example.test' },
  tenant: { id: 't1', name: 'Acme Insurance' },
  permissions: ['workflow.task.view'],
  branches: [{ id: 'b-nbo', code: 'NBO', name: 'Nairobi', scope: 'OWN' }],
};

function backend(handler: FakeHandler) {
  const network = fakeFetch(handler);
  vi.stubGlobal('fetch', network.fn);
  return network;
}

beforeEach(() => {
  setAccessToken(null);
  queryClient.clear();
  useBranchStore.getState().reset();
  useSessionStore.setState({ status: 'idle', notice: null, unavailableReason: null });
});

afterEach(() => vi.unstubAllGlobals());

describe('restoring the session on page load', () => {
  it('refreshes through the cookie, loads /me, and is signed in', async () => {
    const network = backend((call) => {
      if (call.url === '/api/v1/auth/refresh') return signedIn('restored');
      if (call.url === '/api/v1/auth/me') return json(200, ME);
      throw new Error(`unexpected ${call.url}`);
    });
    await restoreSession();
    expect(useSessionStore.getState().status).toBe('signed-in');
    expect(getAccessToken()).toBe('restored');
    expect(queryClient.getQueryData(ME_QUERY_KEY)).toEqual(ME);
    expect(getActiveBranchId()).toBe('b-nbo');
    expect(network.calls.find((call) => call.url === '/api/v1/auth/me')?.headers.authorization).toBe('Bearer restored');
  });

  it('is simply signed out when there is no session, with no notice', async () => {
    backend(() => envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in to continue'));
    await restoreSession();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signed-out', notice: null });
  });

  it('runs once when started twice at the same time (StrictMode)', async () => {
    const network = backend((call) => (call.url.endsWith('/refresh') ? signedIn('one') : json(200, ME)));
    await Promise.all([restoreSession(), restoreSession()]);
    expect(network.calls.filter((call) => call.url.endsWith('/refresh'))).toHaveLength(1);
  });

  it('reports the server as unavailable, with a reference, when it cannot answer', async () => {
    backend(() => envelope(503, 'SERVICE_UNAVAILABLE', 'maintenance', {}, 'corr-503'));
    await restoreSession();
    expect(useSessionStore.getState().status).toBe('unavailable');
    expect(useSessionStore.getState().unavailableReason).toContain('corr-503');
    expect(getAccessToken()).toBeNull();
  });
});

describe('a live session', () => {
  async function signIn() {
    backend((call) => (call.url.endsWith('/auth/me') ? json(200, ME) : json(204, null)));
    await completeSignIn({ status: 'SIGNED_IN', access_token: 'access-1', token_type: 'Bearer', expires_in: 600 });
  }

  it('keeps the access token in memory only', async () => {
    await signIn();
    expect(getAccessToken()).toBe('access-1');
    const stored = [
      ...Object.keys(window.localStorage).map((key) => window.localStorage.getItem(key)),
      ...Object.keys(window.sessionStorage).map((key) => window.sessionStorage.getItem(key)),
    ].join(' ');
    expect(stored).not.toContain('access-1');
    expect(document.cookie).not.toContain('access-1');
  });

  it('ends with "Your session ended" when a 401 cannot be recovered, clearing token, cache and branch', async () => {
    await signIn();
    backend((call) =>
      call.url.endsWith('/auth/refresh')
        ? envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in to continue')
        : envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in to continue'),
    );
    await expect(api.request('/work-queue')).rejects.toMatchObject({ status: 401 });
    expect(useSessionStore.getState()).toMatchObject({ status: 'signed-out', notice: 'SESSION_ENDED' });
    expect(getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(ME_QUERY_KEY)).toBeUndefined();
    expect(getActiveBranchId()).toBeNull();
  });

  it('signs out through the backend and clears everything', async () => {
    await signIn();
    const network = backend(() => json(204, null));
    await signOut();
    const logout = network.calls.find((call) => call.url === '/api/v1/auth/logout');
    expect(logout).toMatchObject({ method: 'POST', body: {} });
    expect(logout?.headers['content-type']).toBe('application/json');
    expect(useSessionStore.getState()).toMatchObject({ status: 'signed-out', notice: null });
    expect(getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(ME_QUERY_KEY)).toBeUndefined();
  });

  it('still clears the local session when the logout request fails', async () => {
    await signIn();
    backend(() => Promise.reject(new TypeError('offline')));
    await signOut();
    expect(useSessionStore.getState().status).toBe('signed-out');
    expect(getAccessToken()).toBeNull();
  });
});
