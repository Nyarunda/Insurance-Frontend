# FI1-B: work queue, and the workflow instance and action client (FRONTEND-INTEGRATION-1)

**Scope:** `backend/docs/specs/frontend-integration-1-scope.md` §3 FI1-B. The gate reviewer said GO on 2026-10-04.
**Baselines:**
- Frontend: `fi1-a-baseline` (`e8c2cf8`).
- Backend: frozen at `f4d6182` (record `737cec0`). FI1-B changes no backend code.

## FI1-B0: FI1-A review follow-ups (ruled 2026-10-04)

These four items came from the FI1-A self-review. The gate reviewer accepted them as FI1-B's opening commit, before any work-queue code, rather than reopening FI1-A.

| # | Change |
| :--- | :--- |
| **R1 Cross-tab session end** | When a live session becomes unrecoverable in one tab (expiry, revocation), that tab broadcasts `session-ended` (`lib/auth/authChannel.ts`). Every other signed-in tab clears its token, query cache and branch context and shows "Your session ended". This is distinct from `signed-out` (an explicit logout, "You signed out in another tab."). A tab never rebroadcasts what it receives, so the tabs cannot loop. |
| **R4 Unconfirmed sign-out** | A failed `POST /auth/logout` is no longer silent. The local token, cache and branch are cleared all the same, and the other tabs are told `signed-out`, because the user asked to leave. The sign-in page then shows "Sign-out not confirmed: You were signed out locally, but the server could not confirm sign-out. Try again when the connection is available." The httpOnly refresh cookie may still hold a live session, which a reload would restore. |
| **R5 Return path after sign-in** | `safeReturnPath` accepts an internal path only. Paths that start with `//` (scheme-relative), contain a backslash, are not paths, or point back to `/sign-in` all fall back to `/`. |
| **R6 API-client comment** | Corrected: every backend-mode request goes through the client except the token refresh, which `lib/auth/refresh.ts` sends directly, because the client calls it when a request gets a 401. |

**Tests (Vitest, 96 passed):**
- a session that ends is announced once;
- a receiving tab clears itself and does not rebroadcast;
- `signed-out` keeps its own notice;
- tabs that are not signed in ignore both events;
- delivery works through a real `BroadcastChannel`;
- a confirmed logout broadcasts `signed-out` with no notice;
- a failed or refused logout clears everything and shows the unconfirmed notice, in the store and in the interface;
- return-path cases, plus a route test in which `//example.com/steal` lands on `/`.
