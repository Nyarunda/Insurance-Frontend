/**
 * The session lifecycle (FI1-A).
 *
 * - Page load: `POST /auth/refresh` (the httpOnly cookie), then `GET /auth/me`. No cookie, or a
 *   dead session, simply means "signed out".
 * - Sign-in completes with the access token in memory, then `/me`.
 * - Sign-out calls `POST /auth/logout`, then clears memory, the query cache and the branch context,
 *   and tells the other tabs.
 * - A 401 the shared refresh cannot recover ends the session ("Your session ended").
 */

import { ApiError } from '../api/errors';
import { useBranchStore } from '../context/branchStore';
import { queryClient } from '../query/queryClient';
import { logoutRequest, type SignedInBody } from './authApi';
import { fetchMe, ME_QUERY_KEY, type Me } from './me';
import { refreshAccessToken } from './refresh';
import { useSessionStore } from './sessionStore';
import { setAccessToken } from './tokens';

const CHANNEL_NAME = 'insurance-cloud:auth';
type AuthMessage = { type: 'signed-out' };

const channel: BroadcastChannel | null = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data?.type === 'signed-out' && useSessionStore.getState().status === 'signed-in') {
    useSessionStore.getState().ended('SIGNED_OUT_ELSEWHERE');
  }
});

async function loadIdentity(): Promise<Me> {
  const me = await queryClient.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, staleTime: 0 });
  useBranchStore.getState().hydrate(me.user.id, me.branches);
  return me;
}

let restoring: Promise<void> | null = null;

/** Restores the session once; concurrent calls (StrictMode's double effect) share the same attempt. */
export function restoreSession(): Promise<void> {
  if (!restoring) {
    restoring = (async () => {
      const store = useSessionStore.getState();
      store.setStatus('restoring');
      try {
        if (!(await refreshAccessToken())) {
          useSessionStore.getState().ended(null);
          return;
        }
        await loadIdentity();
        useSessionStore.getState().signedIn();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          useSessionStore.getState().ended(null);
          return;
        }
        setAccessToken(null);
        const reason =
          error instanceof ApiError
            ? `${error.message}${error.correlationId ? ` (reference ${error.correlationId})` : ''}`
            : 'The session could not be restored.';
        useSessionStore.getState().setStatus('unavailable', reason);
      }
    })().finally(() => {
      restoring = null;
    });
  }
  return restoring;
}

/** The last sign-in step returned SIGNED_IN: keep the token in memory and load the identity. */
export async function completeSignIn(body: SignedInBody): Promise<Me> {
  setAccessToken(body.access_token);
  try {
    const me = await loadIdentity();
    useSessionStore.getState().signedIn();
    return me;
  } catch (error) {
    setAccessToken(null);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    await logoutRequest();
  } catch {
    // The local session ends regardless; the server session also ends at its expiry.
  }
  channel?.postMessage({ type: 'signed-out' } satisfies AuthMessage);
  useSessionStore.getState().ended(null);
}
