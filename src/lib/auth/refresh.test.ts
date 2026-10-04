import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, fakeFetch, signedIn } from '../../test/fetchFake';
import { createApiClient } from '../api/client';
import { REFRESH_LOCK, REFRESH_PATH, refreshAccessToken } from './refresh';
import { getAccessToken, setAccessToken } from './tokens';

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

/** A refresh endpoint that rotates: every successful call hands out the next token. */
function rotatingRefresh(delayMs = 5) {
  let issued = 0;
  return fakeFetch(
    () =>
      new Promise<Response>((resolve) => {
        issued += 1;
        const token = `rotated-${issued}`;
        setTimeout(() => resolve(signedIn(token)), delayMs);
      }),
  );
}

describe('refresh single flight', () => {
  it('sends one refresh for any number of simultaneous callers', async () => {
    const endpoint = rotatingRefresh();
    const results = await Promise.all(Array.from({ length: 5 }, () => refreshAccessToken(endpoint.fn)));
    expect(results).toEqual([true, true, true, true, true]);
    expect(endpoint.calls).toHaveLength(1);
    expect(endpoint.calls[0]).toMatchObject({ url: REFRESH_PATH, method: 'POST', body: {} });
    expect(endpoint.calls[0].headers['content-type']).toBe('application/json');
    expect(getAccessToken()).toBe('rotated-1');
  });

  it('starts a new refresh once the previous one has finished', async () => {
    const endpoint = rotatingRefresh();
    await refreshAccessToken(endpoint.fn);
    await refreshAccessToken(endpoint.fn);
    expect(endpoint.calls).toHaveLength(2);
    expect(getAccessToken()).toBe('rotated-2');
  });

  it('reports "no session" on 401 and forgets the token', async () => {
    setAccessToken('stale');
    const endpoint = fakeFetch(() => envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in to continue'));
    expect(await refreshAccessToken(endpoint.fn)).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('throws a network error when the server cannot be reached, without ending anything', async () => {
    setAccessToken('kept');
    const endpoint = fakeFetch(() => Promise.reject(new TypeError('offline')));
    await expect(refreshAccessToken(endpoint.fn)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(getAccessToken()).toBe('kept');
  });

  it('serializes across tabs through a Web Lock when the browser has one', async () => {
    const requested: string[] = [];
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: { request: (name: string, callback: () => Promise<unknown>) => (requested.push(name), callback()) },
    });
    const endpoint = rotatingRefresh();
    await Promise.all([refreshAccessToken(endpoint.fn), refreshAccessToken(endpoint.fn)]);
    expect(requested).toEqual([REFRESH_LOCK]);
    expect(endpoint.calls).toHaveLength(1);
  });
});

describe('many simultaneous 401s through the client', () => {
  it('share one refresh, and every request is retried once with the rotated token', async () => {
    setAccessToken('expired');
    let refreshes = 0;
    const network = fakeFetch((call) => {
      if (call.url === REFRESH_PATH) {
        refreshes += 1;
        return new Promise((resolve) => setTimeout(() => resolve(signedIn(`fresh-${refreshes}`)), 10));
      }
      return call.headers.authorization === 'Bearer expired'
        ? envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in')
        : new Response(JSON.stringify({ path: call.url }), { status: 200 });
    });
    const client = createApiClient({
      fetch: network.fn,
      baseUrl: '/api/v1',
      getAccessToken,
      refreshAccessToken: () => refreshAccessToken(network.fn),
      getBranchId: () => null,
      onSessionEnded: vi.fn(),
      onBranchRejected: vi.fn(),
    });

    const results = await Promise.all(['/a', '/b', '/c', '/d'].map((path) => client.request<{ path: string }>(path)));

    expect(results.map((result) => result.data.path)).toEqual(['/api/v1/a', '/api/v1/b', '/api/v1/c', '/api/v1/d']);
    expect(refreshes).toBe(1);
    const retried = network.calls.filter((call) => call.headers.authorization === 'Bearer fresh-1');
    expect(retried).toHaveLength(4);
  });
});
