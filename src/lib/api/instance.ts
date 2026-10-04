/** The application's API client, wired to the in-memory token, the shared refresh and the branch context. */

import { getActiveBranchId, useBranchStore } from '../context/branchStore';
import { refreshAccessToken } from '../auth/refresh';
import { sessionExpired } from '../auth/sessionStore';
import { getAccessToken } from '../auth/tokens';
import { createApiClient } from './client';

export const API_BASE = '/api/v1';

export const api = createApiClient({
  fetch: (input, init) => fetch(input, init),
  baseUrl: API_BASE,
  getAccessToken,
  refreshAccessToken: () => refreshAccessToken(),
  getBranchId: getActiveBranchId,
  onSessionEnded: sessionExpired,
  onBranchRejected: (branchId) => useBranchStore.getState().rejected(branchId),
});
