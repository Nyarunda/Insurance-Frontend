# FI1-E: the PR #1 contract gaps and the integration gate (FRONTEND-INTEGRATION-1)

**Scope:** `backend/docs/specs/frontend-integration-1-scope.md` §3 FI1-E and §7. The gate reviewer said GO on 2026-10-04, after the FI1-D merge.
**Baselines:**
- Frontend: `main` at `bd8b919`, the accepted FI1-D point. As ruled, it is recorded here and not frozen.
- Backend: frozen at `f4d6182` (record `737cec0`). FI1-E changes no backend code.

## The PR #1 gaps

| Gap (scope §3 FI1-E) | Where it stands |
| :--- | :--- |
| Reject reason codes | Done in FI1-B (FI1-B-D5): a required reason code from `GET /workflows/reason-codes`, plus text when the code `requires_text`. Proven live in the gate below. |
| A comment required on every decision | Done in FI1-B: APPROVE collects and sends no comment, and REJECT sends its text as `reason_text`. The gate checks that the approval body has no `reason_text`. |
| Delegate button | Absent in backend mode. No delegation surface exists there (F-14), and `on_behalf_of` is never sent. |
| VOID state | **FI1-E-D1.** A void instance shows the heading "Void: this approval no longer applies". Its body is the reason recorded with the void, from history, and "No decision can be made on it." On endorsements, the `blocker` is FI1-D's "No longer actionable" (FI1-D-D6). |
| The comment is discarded | Done in FI1-B: the rejection text is sent and shown in history. The "kept in the workflow history" helper text appears only on the rejection text. |
| Stage key collision | **FI1-E-D2.** The PR #1 approval stage lists (`ApprovalStatusPanel`, `ApprovalBar`; mock mode only) now key each stage by its position and label, so two stages with the same label no longer collide. |
| Backdrop dismissal losing typed text | Done in FI1-B (decision dialog) and FI1-D (withdraw dialog): the backdrop does not dismiss once something has been typed. |
| Focus trap | **FI1-E-D3.** The shared `DialogFrame` handles focus for both backend dialogs and PR #1's mock dialog:<ul><li>on opening, focus moves to the first field (or to the dialog);</li><li>Tab and Shift+Tab cycle inside the dialog;</li><li>on closing, focus returns to the control that opened it.</li></ul>Escape still closes it. |
| Text below 13 px | **FI1-E-D4.** No running text, message, field error, helper or counter text below 13 px:<ul><li>in backend-mode screens;</li><li>in the shared dialog frame;</li><li>in the shared primitives that render their messages: `HorizonAlert`'s body, `FieldError`, `CharacterCounter`.</li></ul>A test fails the build if a backend-mode source or those primitives use a smaller size. Left as they are, as Horizon typography tokens shared by every screen of both modes: status badges (11 px uppercase labels) and the page title's subtitle line (12 px metadata). Changing them would restyle the whole shell, which the scope rules out. **Ruled 2026-10-04: an accepted exception, not a defect or deferred item.** Status badges (11 px) and page subtitles (12 px) are compact shell chrome. Readable content (instructions, helper text, errors, field messages, dialog content, running text) must be 13 px or larger. |

**Readable reasons (FI1-E-D1):** the backend records some reasons as `CODE: detail`, for example a void's `ENDORSEMENT_BASE_STALE: V1 superseded by V2`. The heading and the history show them with the code in words ("Endorsement base stale: V1 superseded by V2"), and the detail is kept as written.

## The integration gate (§7)

Each part runs on its own freshly recreated gate stack. Nothing is reused between them.

1. **Lint and builds:** `npm run lint`, `npm run build:backend`, `npm run build`, plus the bundle checks.
2. **Vitest** (§7.2): the focused tests of FI1-A to FI1-E.
3. **Playwright against the real backend** (§7.3), two suites:
   - **FI1-A suite** (`e2e/fi1a-foundation.spec.ts`, unchanged), on its own fresh environment:
     - sign-in with the forced change;
     - the tenant host boundary;
     - session restoration;
     - refresh in one tab and across tabs;
     - logout;
     - the returning user;
     - **session expiry**.
   - **FI1-E journey** (`e2e/fi1e-gate.spec.ts`), on its own fresh environment, described below.
4. **No mock fallback** (§7.4): `modeIsolation.test.ts` and the bundle marker search.
5. **The backend gate stays green** (§7.5): the full backend suite at `f4d6182` on a fresh stack.

**The FI1-E environment** (scratchpad, not in either repository) is built only from the backend repository at `f4d6182` and newly generated keys:
- Operator commands: `setup_plan`, `provision_tenant --verified-domain` (two tenants, `fi1e-alpha.localhost` and `fi1e-beta.localhost`), `setup_branch` (NBO, MSA; KSM), `onboard_pilot_user`, `setup_tenant_access`, `assign_workflow_role`, and `setup_workflow_reason_codes` for two REJECT reasons (one `--requires-text`).
- The people:

  | Person | Access | Role in the journey |
  | :--- | :--- | :--- |
  | A | `WORKFLOW_REQUESTER` | Requests the activation |
  | B | `WORKFLOW_ADMINISTRATOR` | Approves the activation |
  | C | `ENDORSEMENT_CHECKER`, all branches | The checker |
  | D | `ENDORSEMENT_MAKER` at NBO | The maker |
  | Dual | `ENDORSEMENT_MAKER` and `ENDORSEMENT_CHECKER` at NBO | The maker who is also a checker |
  | Outsider | `ENDORSEMENT_MAKER` at MSA | Outside the policy's branch |
  | E | `PILOT_POLICY_SETUP` | Builds the policy |
  | F | `PILOT_SETUP_CHECKER` | Publishes and verifies |

- **The policy is built through the API** by E and F, along the chain of the backend's `tests/wi1/test_pilot_setup_profiles.py` (WI1-D17): insurer, class, product and version, publish, commission, agency agreement, KYC-verified customer, quotation priced, issued and accepted, proposal submitted and ready, bind. There are no owner writes and no SQL for domain data.
- `request_standard_workflow_activation` (dry run `READY`, then real). B then approves the activation through the workflow API, from B's own queue.
- **Sandbox OTP.** API users sign in for real, and their new passwords are random and discarded. The browser users' temporary passwords are written only to the environment's `secrets/` folder. Nothing secret is printed or logged, and Playwright records no trace or video.

**The FI1-E journey**, serial, on that one policy:
1. The maker and the checker sign in with the forced password change.
2. The policy shows its real detail, version 1, and the Windscreen limit of 50,000.
3. The maker prepares and submits two change-limit endorsements. Both are sent for approval, at the Endorsement check stage.
4. A second maker session holds a new endorsement form open on version 1.
5. The checker finds both in My work and approves the first. **The first response is dropped** after the server acted. The client retries with the same key and body, the server replays it (`Idempotency-Replayed: true`), and the approval sends no comment.
6. The policy has **exactly one** new version, in force, with the Windscreen limit at 70,000. The endorsement says so.
7. **PTH1-D4:**
   - the superseded second endorsement has left the checker's queue;
   - it shows "No longer actionable" with the backend's message and required action;
   - it offers no Submit, Approve, Decline or Reject;
   - it is withdrawn with a reason.
8. **412:** the held form is submitted. It gets a 412, keeps the typed values, and reloads onto version 2. The resubmission succeeds with the **same key** and a **new If-Match**.
9. **Reject:** the reasons are the tenant's two codes from the endpoint, and the code that requires text demands it. The body carries `reason_code`, and the text appears in history. The maker sees the endorsement Declined with that text.
10. **SoD:** the dual user prepares and submits their own endorsement.
    - The approval is a role pool, so the pooled task appears in their own queue (finding FI1-E-F1 below).
    - They confirm Approve, and the backend refuses with 403 `SOD_MAKER_CANNOT_APPROVE`.
    - The page shows the server's message ("A maker of this record cannot act on its approval.") with its Reference, and the instance stays pending.
    - The endorsement is still sent for approval, and the policy has no new version.
    - The distinct checker has the task.
11. **Out of scope:** the outsider's Policy Directory is empty. The policy and an endorsement on it are "Not found or not available to you", with a Reference and no record.
12. **Tenant isolation:**
    - tenant A's maker cannot sign in at tenant B's address;
    - the signed-in browser has no session there;
    - A's bearer token is refused by B's `/auth/me`, `/policies`, the policy and `/work-queue` with 403 `CROSS_TENANT_TOKEN_ATTEMPT`. The gateway recognises another tenant's token before any data is read.
13. **No UUID** appears in any rendered text checked along the way. The Reference (the correlation ID) is excluded, as FI1-A-D10 allows.

## Finding

**FI1-E-F1: a maker sees their own pooled approval task.** The endorsement approval assigns by role pool. The slot stays on the role, and every holder of the checker role sees the task in My work, including a checker who prepared the endorsement. The backend's assignment pipeline applies segregation of duties when it chooses a named assignee, but a pool is not filtered. SoD is enforced when someone acts (`runtime/assignment.py`: "only the command-time result is authoritative").

**Effect:**
- A maker who also holds the checker role can open their own endorsement's approval and press Approve.
- The backend then refuses with `SOD_MAKER_CANNOT_APPROVE`.
- The screen shows the refusal with its message and Reference, and nothing changes.
- The gate proves this live.

There is no integrity risk, but it is friction. The task shows a decision the user can never make.

**Not changed in FI1:**
- Hiding it in the client would need the client to know the record's makers, which the queue does not expose.
- Filtering pools by the maker set is a backend change, and the backend is frozen.

**Ruled 2026-10-04: CONFIRMED / NON-BLOCKING for FI1-E.**

| | |
| :--- | :--- |
| Classification | Backend queue actionability UX gap |
| Security impact | None: the command-time SoD check stays authoritative |
| Data-integrity impact | None |
| FI1-E blocker | No |
| Frontend fix | No. The client must not infer maker status or hide the task, because the queue payload lacks the evidence. |
| Backend unfreeze during FI1-E | No |

The reviewer confirmed it against the frozen backend:
- the assignment pipeline excludes makers when it checks whether a role pool has eligible candidates;
- a `ROLE_POOL` assignment is stored against the role, not each user;
- `GET /work-queue` returns the unclaimed pool row to role holders without re-checking caller-specific SoD;
- the command re-checks it and refuses with `SOD_MAKER_CANNOT_APPROVE`.

**Scheduled as post-FI1 backend hardening, preferably before the real-user pilot: WORK-QUEUE-ACTIONABILITY-1.**
- A role-pool task returned by `GET /work-queue` should be one the caller is currently eligible to act on.
- The check reuses the runtime's live eligibility and SoD rules, without duplicating SoD logic in the view.
- It covers maker, beneficiary, cross-stage and distinct-slot SoD alike. It is not a narrow maker-set special case.
- The command-time SoD check remains mandatory and unchanged.

## Evidence (2026-10-04)

| Check | Result |
| :--- | :--- |
| Lint (tsc) | PASS |
| Builds | PASS, backend and mock. Backend bundle: 0 mock markers, 0 `/approve` or `/decline`. Mock bundle: no backend client |
| Vitest (§7.2) | 195 passed, 0 failed (13 files), on two consecutive runs. FI1-E adds `fi1eContractGaps.test.tsx` (6 tests); the instance page's VOID test now checks the heading. Reverting the stage-key fix or removing the focus trap each fails its test. |
| No mock fallback (§7.4) | PASS: `modeIsolation.test.ts` and the bundle marker search |
| Backend gate (§7.5) | **1196 passed, 0 failed, 0 skipped** (17 min 24 s), full `pytest tests` at `f4d6182` from a clean worktree, on a freshly recreated stack with PgBouncer (`GATE_PG_PORT=55433 GATE_PGBOUNCER_PORT=56432`). |
| Playwright, FI1-A suite (§7.3) | **11 passed**, on its own freshly built environment. Covers sign-in with the forced change, the tenant host boundary, restoration, refresh in one tab and across tabs, logout, the returning user and session expiry. The FI1-E tests skip there by design (their environment variables are not set). |
| Playwright, FI1-E journey (§7.3) | **12 passed** (runs 6 and 8), each on its own freshly built environment. Every scenario listed above passed. |

**How the FI1-E journey got there:** the spec was new, and its first runs met the real backend. Each failure was investigated, and none was a defect in the frontend under test:

| Run | Failure | Cause and correction |
| :--- | :--- | :--- |
| 1 | The dropped-response approval never completed | **Harness.** `route.fetch()` runs in Playwright's Node process, which cannot resolve `*.localhost` (only the browser maps it to loopback). Requests made by the test from Node now go to `127.0.0.1` with the tenant's Host header, the path the browser takes through the proxy. |
| 2 | Strict-mode locator conflict on "Approved" | **Assertion.** The status badge and a history cell both say "Approved". The assertion now targets the Status value and the history table. The replay itself already passed: two requests with the same key and body, and `Idempotency-Replayed: true`. |
| 3 | Reason order differed from the setup order | **Assertion.** The dialog lists the reasons in the order the endpoint returns them. The test now compares them with the endpoint's own response and with the configured set. |
| 4 | The maker's own task was in their queue | **Assumption.** That is the backend's pool contract (FI1-E-F1). The test now proves the actual refusal through the screen. |
| 5 | Cross-tenant token got 403, not 401 | **Assumption.** The backend deliberately answers 403 `CROSS_TENANT_TOKEN_ATTEMPT`. The test asserts that code. |
| 6 | **12 passed** | |
| 7 | Setup aborted before Playwright | **Environment script.** Its readiness probe caught only connection errors, and the setup server's first answer took more than 2 seconds. The probe now waits out any request error. No test ran. |
| 8 | **12 passed** (confirmation) | |

**Secrets:** run 1's failure log in `test-results/` included the request headers of the failed call, among them a 20-second access token from the disposable environment. It was deleted, and the environment was destroyed. No password, OTP or new password was printed or logged in any run, and Playwright recorded no trace or video.

**Teardown:**
- Gate stack down with its volumes.
- Backend and dev-server processes stopped.
- Worktrees removed.
- Generated secrets deleted.
- The backend repository is unchanged (`insurance-core`, in sync with origin).

The environment scripts (`setup_env.py`, `run_backend.py`, `cycle.sh`) stay in the session scratchpad. They build everything from the backend repository and new keys on each run.

## FI1-E-R1: the 13 px rule on the sign-in flow (independent review, 2026-10-04)

The review found that the 13 px guard did not follow backend sign-in into its shared components. They still had readable text below 13 px:
- the shared `SignInLayout`: field labels, the panel subtitle, the OTP resend row, "Back to sign in", and the brand panel's "Operations Portal", pill and facts;
- the password-requirement list in `PasswordStrengthMeter`, shown on the forced change.

Fixed in one frontend-only follow-up commit:
- **Text:** every one of those is now 13 px. Only sizes changed; there is no layout change. Shell chrome (top bar, sidebar, breadcrumb, status badges, page subtitles) is untouched, as ruled.
- **Guard:** `fi1eContractGaps.test.tsx` now also checks `src/components/auth/SignInLayout.tsx` and `PasswordStrengthMeter`. Against `5532963` both checks fail; after the fix they pass.

Two more corrections went into the same commit. Both came up while the frontend gate was rerun, and both are in tests only:
- **The isolation check was timing-dependent.** The FI1-E journey's tenant-isolation check sent A's token to B's address, using whatever token the maker's page had last used. Access tokens last 20 s, and the gateway checks expiry before the tenant. After the page had been idle long enough, the token was refused as 401 `TOKEN_EXPIRED` before the cross-tenant check was reached; that happened on the first rerun. The check now:
  1. loads an Alpha page;
  2. takes the live token and proves it with a 200 from Alpha's `/auth/me`;
  3. then requires 403 `CROSS_TENANT_TOKEN_ATTEMPT` on each of B's paths.

  It is deterministic, and stronger than before.
- **Test time budgets.** Under load (two suites at once, or with the dev server and the stack still running), five typed component journeys in the FI1-C and FI1-D page tests ran past Vitest's 5 s default, or Testing Library's 1 s `findBy` wait. They passed whenever the machine was idle. This was reproduced deliberately and then fixed once, for all tests:
  - `testTimeout: 30_000` in the Vitest config (FI1-A had given its one typed journey that budget by hand);
  - `configure({ asyncUtilTimeout: 5000 })` in the test setup.

  A wrong value still fails at once. Two concurrent full suites, the load that had failed, then passed 195/195 each.

**Refreshed frontend gate on the corrected tree.** The backend gate (1196) is not rerun, as ruled; the backend is unchanged.

| Check | Result |
| :--- | :--- |
| Lint (tsc) | PASS |
| Builds | PASS, backend and mock. Backend bundle: 0 mock markers, 0 `/approve` or `/decline`. Mock bundle: no backend client |
| Vitest | 195 passed on two sequential runs, and 195 passed on each of two concurrent runs |
| Playwright, FI1-A suite | **11 passed**, on a freshly built environment |
| Playwright, FI1-E journey | **12 passed** on two consecutive freshly built environments, with the corrected isolation check. The run before that correction passed 11 and failed the isolation check, as described above. |

Teardown as before: stack down with its volumes, processes stopped, worktrees removed, secrets deleted, `test-results/` deleted. No token, password or OTP appears in the diff or this document.
