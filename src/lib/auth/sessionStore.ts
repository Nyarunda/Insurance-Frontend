/**
 * Where the session stands, for routing and the sign-in page. The identity itself (`/me`) is
 * server state and lives in the query cache.
 */

import { create } from 'zustand';
import { useBranchStore } from '../context/branchStore';
import { queryClient } from '../query/queryClient';
import { setAccessToken } from './tokens';

export type SessionStatus = 'idle' | 'restoring' | 'signed-in' | 'signed-out' | 'unavailable';

/** Why the user is looking at the sign-in page, when it is not a first visit. */
export type SessionNotice = 'SESSION_ENDED' | 'SIGNED_OUT_ELSEWHERE' | null;

export const SESSION_NOTICE_TEXT: Record<Exclude<SessionNotice, null>, string> = {
  SESSION_ENDED: 'Your session ended. Sign in again to continue.',
  SIGNED_OUT_ELSEWHERE: 'You signed out in another tab.',
};

interface SessionState {
  status: SessionStatus;
  notice: SessionNotice;
  /** Set when the session could not be restored for a reason other than "no session". */
  unavailableReason: string | null;
  setStatus: (status: SessionStatus, unavailableReason?: string | null) => void;
  signedIn: () => void;
  /** Clears the token, the query cache and the branch context. */
  ended: (notice: SessionNotice) => void;
  clearNotice: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'idle',
  notice: null,
  unavailableReason: null,

  setStatus: (status, unavailableReason = null) => set({ status, unavailableReason }),

  signedIn: () => set({ status: 'signed-in', notice: null, unavailableReason: null }),

  ended: (notice) => {
    setAccessToken(null);
    queryClient.cancelQueries();
    queryClient.clear();
    useBranchStore.getState().reset();
    set({ status: 'signed-out', notice, unavailableReason: null });
  },

  clearNotice: () => set({ notice: null }),
}));

/** Called by the API client when a refresh fails: only a live session "ends"; a restore just finds none. */
export const sessionExpired = () => {
  const { status, ended } = useSessionStore.getState();
  if (status === 'signed-in') ended('SESSION_ENDED');
  else if (status !== 'signed-out') ended(null);
};
