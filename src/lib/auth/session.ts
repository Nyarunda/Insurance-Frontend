/**
 * The session lifecycle (FI1-A).
 *
 * - Page load: `POST /auth/refresh` (the httpOnly cookie), then `GET /auth/me`. No cookie, or a
 *   dead session, simply means "signed out".
 * - Sign-in completes with the access token in memory, then `/me`.
 * - Sign-out calls `POST /auth/logout`, then clears memory, the query cache and the branch context,
 *   and tells the other tabs (`signed-out`). If the server cannot confirm it, the local state is
 *   cleared all the same and the user is told: the httpOnly refresh cookie may still hold a live
 *   session that a reload would restore.
 * - A 401 the shared refresh cannot recover ends the session ("Your session ended"), and the
 *   other tabs are told (`session-ended`), since they share the session.
 */

import { ApiError } from '../api/errors';
import { useBranchStore } from '../context/branchStore';
import { queryClient } from '../query/queryClient';
import { authChannel, type AuthMessage } from './authChannel';
import { logoutRequest, type SignedInBody } from './authApi';
import { fetchMe, ME_QUERY_KEY, type Me } from './me';
import { refreshAccessToken } from './refresh';
import { useSessionStore } from './sessionStore';
import { setAccessToken } from './tokens';

/** What another tab told this one. Never rebroadcast. */
export function receiveAuthMessage(message: AuthMessage): void {
  const { status, ended } = useSessionStore.getState();
  if (status !== 'signed-in') return;
  if (message.type === 'signed-out') ended('SIGNED_OUT_ELSEWHERE');
  else if (message.type === 'session-ended') ended('SESSION_ENDED');
}

authChannel.listen(receiveAuthMessage);

async function loadIdentity(): Promise<Me> {
  const me = await queryClient.query({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, staleTime: 0 });
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
  let confirmed = true;
  try {
    await logoutRequest();
  } catch {
    confirmed = false; // the user still leaves; the notice says the server did not confirm it
  }
  authChannel.post({ type: 'signed-out' });
  useSessionStore.getState().ended(confirmed ? null : 'SIGN_OUT_UNCONFIRMED');
}
