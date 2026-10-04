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

## FI1-B: decisions

| # | Decision |
| :--- | :--- |
| **FI1-B-D1 My Work Queue** | `/my-work` (needs `workflow.task.view`; the navigation entry appears only with it) shows `GET /work-queue` only:<ul><li>stage label, record (type and reference), approval, amount with currency, and assigned time;</li><li>loading, empty ("Nothing is waiting for you"), and error with its Reference;</li><li>a Refresh button, plus a refresh whenever the user returns to the tab.</li></ul>A task appears and disappears only as the server lists it. A delegated task shows "for a colleague", with no name. |
| **FI1-B-D2 Instance detail** | `/my-work/:instanceId` shows `GET /workflows/instances/{id}`:<ul><li>status, stage, quorum ("n of m"), amount, submitted and completed times;</li><li>the approval facts a person can read;</li><li>history with each reason code and reason text (PTH1-D4).</li></ul>The ETag used for `If-Match` is the response header's. A 404 says "Not found or not available to you", with no fallback data. |
| **FI1-B-D3 No identifiers on screen (FI1-Q6)** | Approval facts whose key ends in `_id` or `_hash`, or whose value is a UUID, are not shown. Codes read as words by one generic rule (no per-code vocabulary); references such as `END0000001` stay as they are. People are "You", "System", or described by the stage they acted at ("Endorsement check approver"); never a name, never an ID. The correlation ID shown as Reference is the only exception (FI1-A-D10). |
| **FI1-B-D4 When decisions are offered** | Approve and Reject appear only while the instance is `PENDING_APPROVAL` and the caller's queue holds a task for its current step. Otherwise the page says the approval is not in the caller's queue. The task's `step_id` and `slot_no` come from that queue entry. `on_behalf_of` is never sent: delegation is not managed in FI1 (F-14). |
| **FI1-B-D5 Decision rules** | Applied here rather than left for FI1-E, because this is the dialog that sends them:<ul><li>APPROVE collects and sends no comment.</li><li>REJECT needs one of the tenant's reason codes from `GET /workflows/reason-codes?action=REJECT`, plus text when the code `requires_text`. The text is sent as `reason_text` and is shown in history.</li><li>With no reasons configured, rejection is unavailable: "No rejection reasons are configured for this tenant."</li><li>What was typed survives a 412 reload, and a backdrop click does not discard it.</li></ul>`DialogFrame` is the frame the mock demo's `ApprovalDecisionModal` now shares (its behaviour is unchanged). |
| **FI1-B-D6 Keys and the §4 contract** | Each decision is one logical command: `WORKFLOW_<ACTION>` on `workflow-instance:<id>`, keyed by its body. `lib/api/commandErrors.ts` classifies refusals and the page reacts:<ul><li>**412:** reload, keep the dialog and its text; the resubmission carries the new ETag and the same key.</li><li>**409 state conflicts** (`WORKFLOW_STEP_NOT_CURRENT`, `INVALID_STATE_TRANSITION`): close the dialog, show "This item changed: someone else acted or it is no longer pending.", reload.</li><li>**403, 404 and business 409s:** the server's message, its Reference and any `required_action`; no retry; reload.</li><li>**422:** shown on the reason field.</li><li>**`IDEMPOTENCY_KEY_REUSED` and 428:** shown as defects, with the Reference.</li><li>**No response:** retried with the same key and body; a replay is the result.</li></ul>If a reload moves the step or removes the task while the dialog is open, the dialog says so and cannot send. Closing the dialog does not reset the key: confirming the same decision again is the same command. |

**Left for FI1-E:** focus trap and the remaining 13 px text in the decision dialog; the VOID heading; the end-to-end gate. Per the scope, FI1-B's gate is lint, build and focused tests; the real-backend journey (which needs a governed endorsement built through the API) runs once, in FI1-E.

## FI1-B: evidence (2026-10-04)

| Check | Result |
| :--- | :--- |
| Lint (tsc) | PASS |
| Builds | PASS, backend and mock. Backend bundle: 0 mock markers; mock bundle: no backend client |
| Vitest | 135 passed, 0 failed (10 files), on two consecutive runs. FI1-B adds `format.test.ts` (display rules and the §4 classification, 21 cases) and `workflowPages.test.tsx` (19 component tests against a stateful fake backend). |

The component tests cover:
- the queue: listing, empty, error with Reference, refresh, a task disappearing, navigation, and gating on `workflow.task.view`;
- the instance: facts and history with no UUID or hash in the rendered page, decisions offered only from the caller's queue, VOID with its reason text, 404;
- APPROVE: no comment; the header ETag as `If-Match`; a key; the result shown;
- a 412: same key with the new ETag, typed text kept;
- a dropped response: same key and body, replay accepted;
- a 409 state conflict and a 403 SOD refusal;
- REJECT: reason codes from the endpoint, `requires_text`, the body sent; the empty-reasons state; a 422 on the field; a changed decision gets a new key; the backdrop keeps typed text;
- a step that moves under an open dialog.

The mode-isolation test still passes: the new screens do not reach mock data.
