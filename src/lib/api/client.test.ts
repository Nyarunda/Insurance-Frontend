import { describe, expect, it, vi } from 'vitest';
import { envelope, fakeFetch, FakeHandler, json } from '../../test/fetchFake';
import { ApiClientDeps, createApiClient } from './client';
import { ApiError } from './errors';

function setup(handler: FakeHandler, overrides: Partial<ApiClientDeps> = {}) {
  const fake = fakeFetch(handler);
  let token: string | null = 'token-1';
  const deps: ApiClientDeps = {
    fetch: fake.fn,
    baseUrl: '/api/v1',
    getAccessToken: () => token,
    refreshAccessToken: vi.fn(async () => {
      token = 'token-2';
      return true;
    }),
    getBranchId: () => null,
    onSessionEnded: vi.fn(),
    onBranchRejected: vi.fn(),
    ...overrides,
  };
  return { client: createApiClient(deps), deps, calls: fake.calls, setToken: (value: string | null) => (token = value) };
}

const caught = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('expected a rejection');
};

describe('error normalization', () => {
  it('maps the backend envelope to code, message, correlation ID, details and status', async () => {
    const { client } = setup(() =>
      envelope(409, 'ENDORSEMENT_BASE_STALE', 'the base version was superseded', { required_action: 'WITHDRAW' }, 'corr-9'),
    );
    const error = await caught(client.request('/endorsements/x'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'ENDORSEMENT_BASE_STALE',
      message: 'the base version was superseded',
      correlationId: 'corr-9',
      details: { required_action: 'WITHDRAW' },
    });
  });

  it('keeps validation field errors in details', async () => {
    const { client } = setup(() => envelope(422, 'VALIDATION_FAILED', 'the request is not valid', { fields: { action: ['bad'] } }));
    expect((await caught(client.request('/x'))).details).toEqual({ fields: { action: ['bad'] } });
  });

  it('normalises a response that is not the envelope, keeping the correlation header', async () => {
    const { client } = setup(() => new Response('<html>Bad gateway</html>', { status: 502, headers: { 'X-Correlation-ID': 'corr-proxy' } }));
    expect(await caught(client.request('/x'))).toMatchObject({ status: 502, code: 'HTTP_502', correlationId: 'corr-proxy' });
  });

  it('turns a dropped connection into a network error with status 0', async () => {
    const { client } = setup(() => Promise.reject(new TypeError('Failed to fetch')));
    const error = await caught(client.request('/x'));
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', correlationId: null });
    expect(error.isNetwork).toBe(true);
  });

  it('turns a timeout into NETWORK_TIMEOUT', async () => {
    const { client } = setup(
      (call) =>
        new Promise<Response>((_, reject) => {
          void call;
          setTimeout(() => reject(new DOMException('aborted', 'AbortError')), 50);
        }),
    );
    const error = await caught(client.request('/x', { timeoutMs: 10 }));
    expect(error.code).toBe('NETWORK_TIMEOUT');
  });
});

describe('ETag extraction', () => {
  it('reads the ETag header, whatever its case on the wire', async () => {
    const { client } = setup(() => json(200, { id: 'a', etag: '"body"' }, { etag: '"header"' }));
    expect((await client.request('/x')).etag).toBe('"header"');
  });

  it('falls back to the body etag only when the header is absent', async () => {
    const { client } = setup(() => json(200, { id: 'a', etag: '"body"' }));
    expect((await client.request('/x')).etag).toBe('"body"');
  });

  it('is null when neither is present', async () => {
    const { client } = setup(() => json(200, { id: 'a' }));
    expect((await client.request('/x')).etag).toBeNull();
  });
});

describe('request headers', () => {
  it('sends the bearer token, branch context, If-Match and idempotency key it is given', async () => {
    const { client, calls } = setup(() => json(200, {}), { getBranchId: () => 'branch-1' });
    await client.request('/workflows/instances/i/actions', {
      method: 'POST',
      body: { action: 'APPROVE' },
      ifMatch: '"v1"',
      idempotencyKey: 'key-1',
    });
    expect(calls[0].url).toBe('/api/v1/workflows/instances/i/actions');
    expect(calls[0].headers).toMatchObject({
      authorization: 'Bearer token-1',
      'x-branch-id': 'branch-1',
      'if-match': '"v1"',
      'x-idempotency-key': 'key-1',
      'content-type': 'application/json',
    });
    expect(calls[0].body).toEqual({ action: 'APPROVE' });
  });

  it('sends neither token nor branch to the sign-in endpoints', async () => {
    const { client, calls } = setup(() => json(200, {}), { getBranchId: () => 'branch-1' });
    await client.request('/auth/login', { method: 'POST', body: {}, authenticated: false });
    expect(calls[0].headers.authorization).toBeUndefined();
    expect(calls[0].headers['x-branch-id']).toBeUndefined();
  });

  it('never sends a tenant header', async () => {
    const { client, calls } = setup(() => json(200, {}));
    await client.request('/auth/me');
    expect(Object.keys(calls[0].headers).some((name) => name.includes('tenant'))).toBe(false);
  });

  it('reports a replayed idempotent result', async () => {
    const { client } = setup(() => json(200, {}, { 'Idempotency-Replayed': 'true' }));
    expect((await client.request('/x', { method: 'POST', body: {}, idempotencyKey: 'k' })).replayed).toBe(true);
  });
});

describe('401 handling', () => {
  it('refreshes once and retries once with the new token', async () => {
    const { client, deps, calls } = setup((call) =>
      call.headers.authorization === 'Bearer token-2' ? json(200, { ok: true }) : envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in'),
    );
    const result = await client.request<{ ok: boolean }>('/x');
    expect(result.data).toEqual({ ok: true });
    expect(deps.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(calls.map((call) => call.headers.authorization)).toEqual(['Bearer token-1', 'Bearer token-2']);
  });

  it('keeps the idempotency key and body on the retry', async () => {
    const { client, calls } = setup((call) =>
      call.headers.authorization === 'Bearer token-2' ? json(200, {}) : envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in'),
    );
    await client.request('/x', { method: 'POST', body: { a: 1 }, idempotencyKey: 'key-7', ifMatch: '"e"' });
    expect(calls[1].headers['x-idempotency-key']).toBe('key-7');
    expect(calls[1].headers['if-match']).toBe('"e"');
    expect(calls[1].body).toEqual({ a: 1 });
  });

  it('ends the session when the refresh finds no session', async () => {
    const { client, deps } = setup(() => envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in'), {
      refreshAccessToken: vi.fn(async () => false),
    });
    expect((await caught(client.request('/x'))).status).toBe(401);
    expect(deps.onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the retry is refused again, without a second refresh', async () => {
    const { client, deps, calls } = setup(() => envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in'));
    await caught(client.request('/x'));
    expect(deps.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
    expect(deps.onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when another caller already replaced the token', async () => {
    let setToken: (value: string) => void = () => {};
    const { client, deps, calls, setToken: set } = setup((call) => {
      if (call.headers.authorization === 'Bearer token-1') {
        setToken('token-3'); // a concurrent refresh finished while this request was in flight
        return envelope(401, 'AUTHENTICATION_REQUIRED', 'sign in');
      }
      return json(200, {});
    });
    setToken = set;
    await client.request('/x');
    expect(deps.refreshAccessToken).not.toHaveBeenCalled();
    expect(calls[1].headers.authorization).toBe('Bearer token-3');
  });

  it('never refreshes for the sign-in endpoints', async () => {
    const { client, deps } = setup(() => envelope(401, 'INVALID_CREDENTIALS', 'the e-mail or password is not correct'));
    expect((await caught(client.request('/auth/login', { method: 'POST', body: {}, authenticated: false }))).code).toBe(
      'INVALID_CREDENTIALS',
    );
    expect(deps.refreshAccessToken).not.toHaveBeenCalled();
    expect(deps.onSessionEnded).not.toHaveBeenCalled();
  });
});

describe('branch context', () => {
  it('clears the branch the backend refused', async () => {
    const { client, deps } = setup(() => envelope(403, 'BRANCH_SCOPE_DENIED', 'X-Branch-ID is not a branch you can use'), {
      getBranchId: () => 'branch-9',
    });
    expect((await caught(client.request('/x'))).code).toBe('BRANCH_SCOPE_DENIED');
    expect(deps.onBranchRejected).toHaveBeenCalledWith('branch-9');
  });

  it('leaves the branch alone for any other 403', async () => {
    const { client, deps } = setup(() => envelope(403, 'PERMISSION_DENIED', 'requires x'), { getBranchId: () => 'branch-9' });
    await caught(client.request('/x'));
    expect(deps.onBranchRejected).not.toHaveBeenCalled();
  });
});
