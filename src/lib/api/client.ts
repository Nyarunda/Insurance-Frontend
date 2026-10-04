/**
 * The API client (FI1-A). Every backend-mode request goes through it, except the token refresh
 * itself, which `lib/auth/refresh.ts` sends directly: the refresh is what this client calls when a
 * request gets a 401, so it cannot go through the client's own 401 handling.
 *
 * - Same origin, `/api/v1`. The tenant comes from the page's host; the client never sends one.
 * - The bearer token comes from memory. A 401 gets one refresh (shared by every caller) and one
 *   retry; if that fails the session has ended.
 * - The active branch is sent as `X-Branch-ID`, a context assertion only. `BRANCH_SCOPE_DENIED`
 *   clears it.
 * - `If-Match` and `X-Idempotency-Key` are passed by the caller; the ETag is read from the
 *   response header, and from the body's `etag` only when the header is absent.
 * - Every failure becomes an `ApiError`.
 */

import { ApiError, errorFromResponse, networkError } from './errors';

export interface ApiResult<T> {
  data: T;
  status: number;
  etag: string | null;
  /** The backend returned a stored result for an idempotency key it had already completed. */
  replayed: boolean;
  correlationId: string | null;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  ifMatch?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** False for the sign-in endpoints, which take no bearer token and never trigger a refresh. */
  authenticated?: boolean;
}

export interface ApiClientDeps {
  fetch: typeof fetch;
  baseUrl: string;
  getAccessToken: () => string | null;
  /** Shared refresh: true when a new access token is in memory, false when the session is over. */
  refreshAccessToken: () => Promise<boolean>;
  getBranchId: () => string | null;
  onSessionEnded: () => void;
  onBranchRejected: (branchId: string) => void;
}

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>>;
}

export const DEFAULT_TIMEOUT_MS = 30_000;

const sessionRequired = () =>
  new ApiError({ status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.', correlationId: null, details: {} });

export function extractEtag(headers: Headers, data: unknown): string | null {
  const header = headers.get('ETag');
  if (header) return header;
  if (data && typeof data === 'object' && typeof (data as { etag?: unknown }).etag === 'string') {
    return (data as { etag: string }).etag;
  }
  return null;
}

export function createApiClient(deps: ApiClientDeps): ApiClient {
  async function send(path: string, options: RequestOptions, token: string | null, branchId: string | null) {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (branchId) headers['X-Branch-ID'] = branchId;
    if (options.ifMatch) headers['If-Match'] = options.ifMatch;
    if (options.idempotencyKey) headers['X-Idempotency-Key'] = options.idempotencyKey;

    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const onCallerAbort = () => timeout.abort();
    options.signal?.addEventListener('abort', onCallerAbort, { once: true });
    try {
      return await deps.fetch(`${deps.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'same-origin',
        signal: timeout.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error; // the caller cancelled (for example a query unmounting)
      throw networkError(timeout.signal.aborted);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const authenticated = options.authenticated ?? true;
    const branchId = authenticated ? deps.getBranchId() : null;
    let token = authenticated ? deps.getAccessToken() : null;

    if (authenticated && !token) {
      if (!(await deps.refreshAccessToken())) {
        deps.onSessionEnded();
        throw sessionRequired();
      }
      token = deps.getAccessToken();
    }

    let response = await send(path, options, token, branchId);

    if (response.status === 401 && authenticated) {
      const current = deps.getAccessToken();
      if (current && current !== token) {
        token = current; // another caller already refreshed while this request was in flight
      } else {
        if (!(await deps.refreshAccessToken())) {
          const error = await errorFromResponse(response);
          deps.onSessionEnded();
          throw error;
        }
        token = deps.getAccessToken();
      }
      response = await send(path, options, token, branchId);
      if (response.status === 401) {
        const error = await errorFromResponse(response);
        deps.onSessionEnded();
        throw error;
      }
    }

    if (!response.ok) {
      const error = await errorFromResponse(response);
      if (error.code === 'BRANCH_SCOPE_DENIED' && branchId) deps.onBranchRejected(branchId);
      throw error;
    }

    const text = response.status === 204 ? '' : await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError({
          status: response.status,
          code: 'INVALID_RESPONSE',
          message: 'The server returned an unreadable response.',
          correlationId: response.headers.get('X-Correlation-ID'),
          details: {},
        });
      }
    }

    return {
      data: data as T,
      status: response.status,
      etag: extractEtag(response.headers, data),
      replayed: response.headers.get('Idempotency-Replayed') === 'true',
      correlationId: response.headers.get('X-Correlation-ID'),
    };
  }

  return { request };
}
