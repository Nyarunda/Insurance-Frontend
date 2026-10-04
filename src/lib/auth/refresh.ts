/**
 * Refresh serialization (FI1-A).
 *
 * The backend rotates the refresh token on every refresh, and treats a second use of a rotated
 * token as theft: it revokes the whole session (C1-D9, `REFRESH_REUSE`). Two refreshes sent with
 * the same cookie therefore end the session. So:
 *
 * - within a tab, every caller shares one in-flight refresh (single flight); React StrictMode's
 *   double effects and many simultaneous 401s produce one request;
 * - across tabs of the same origin, refreshes run one at a time under a Web Lock, so each one
 *   sends the cookie the previous one rotated. Web Locks exist only in secure contexts: HTTPS, or
 *   `localhost` and `*.localhost` in development. On any other plain-HTTP host only the in-tab
 *   guarantee holds, and tabs restoring at once do end the session (observed: FI1-A-F3); a console
 *   warning says so.
 */

import { ApiError, errorFromResponse, networkError } from '../api/errors';
import { setAccessToken } from './tokens';

export const REFRESH_PATH = '/api/v1/auth/refresh';
export const REFRESH_LOCK = 'insurance-cloud:auth-refresh';

export interface SignedInBody {
  status: 'SIGNED_IN';
  access_token: string;
  token_type: string;
  expires_in: number;
}

type FetchLike = typeof fetch;

interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

let warnedNoLocks = false;

const lockManager = (): LockManagerLike | null => {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks as LockManagerLike | undefined;
  if (locks && typeof locks.request === 'function') return locks;
  if (!warnedNoLocks) {
    warnedNoLocks = true;
    console.warn(
      'Insurance Cloud: this page is not a secure context, so refreshes cannot be serialized across tabs. ' +
        'Several tabs refreshing at once will end the session. Use HTTPS, or a <tenant>.localhost host in development.',
    );
  }
  return null;
};

/** One refresh request. True with a new token in memory; false when there is no session (401). */
export async function refreshOnce(fetchImpl: FetchLike = fetch): Promise<boolean> {
  let response: Response;
  try {
    response = await fetchImpl(REFRESH_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
      credentials: 'same-origin',
    });
  } catch {
    throw networkError();
  }
  if (response.status === 401) {
    setAccessToken(null);
    return false;
  }
  if (!response.ok) throw await errorFromResponse(response);
  const body = (await response.json()) as SignedInBody;
  setAccessToken(body.access_token);
  return true;
}

let inflight: Promise<boolean> | null = null;

/** Shared by every caller in this tab; serialized with other tabs when Web Locks are available. */
export function refreshAccessToken(fetchImpl: FetchLike = fetch): Promise<boolean> {
  if (!inflight) {
    const locks = lockManager();
    const run = () => refreshOnce(fetchImpl);
    inflight = (locks ? locks.request(REFRESH_LOCK, run) : run()).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export const isSessionOver = (error: unknown): boolean => error instanceof ApiError && error.status === 401;
