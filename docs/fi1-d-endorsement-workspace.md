# FI1-D: the endorsement workspace and the PTH1-D4 state (FRONTEND-INTEGRATION-1)

**Scope:** `backend/docs/specs/frontend-integration-1-scope.md` §3 FI1-D. The gate reviewer said GO on 2026-10-04, after the FI1-C merge.
**Baselines:**
- Frontend: `main` at `061bd9d`, the accepted FI1-C point. As ruled, it is recorded here and not frozen.
- Backend: frozen at `f4d6182` (record `737cec0`). FI1-D changes no backend code.

FI1-D uses these endpoints as they stand:
- `GET` and `POST /policies/{id}/endorsements`;
- `GET /endorsements/{id}`;
- `POST /endorsements/{id}/submit` and `/cancel`.

## Decisions

| # | Decision |
| :--- | :--- |
| **FI1-D-D1 Endorsements tab** | The policy workspace gains an Endorsements tab. It lists `GET /policies/{id}/endorsements` (number, type, effective date, premium change, status) and loads only when the tab opens. "New endorsement" appears only with `policies.endorsement.create` and on a bound policy; the backend decides whether the policy can be endorsed. |
| **FI1-D-D2 Create: change limit only** | `/policies/:id/endorsements/new` (needs `policies.policy.view` and `policies.endorsement.create`) collects the benefit, the new limit, the effective date and the reason.<ul><li>**Benefits:** the backend builds every endorsement on the **latest** policy version, so the benefits offered are that version's, from `/versions`, with their current limits. They are never a list kept in the client.</li><li>**Body:** exactly `{endorsement_type: "CHANGE_LIMIT", effective_date, reason, changes: {benefit, limit_amount}}`.</li><li>**Client checks:** a benefit, a positive amount, a date and a reason. The backend's 422 is still authoritative and is shown on its field (`effective_date`, `reason`, `limit_amount`, or `changes` on the benefit) with its Reference.</li><li>**Success:** the endorsement opens and replaces the form in history.</li></ul>Other endorsement types come later (scope §6). |
| **FI1-D-D3 The policy's If-Match** | Creation sends the policy's ETag from the response header (FI1-C-D4) as `If-Match`. Without that header nothing is sent, and the form says to reload. After a 412 the policy and its versions are reloaded and the typed values are kept. The resubmission carries the new ETag with the **same key**, because the body is unchanged. A corrected body gets a new key. |
| **FI1-D-D4 Endorsement view** | `/policies/:id/endorsements/:endorsementId` shows `GET /endorsements/{id}`:<ul><li>type, policy, base version, effective date, reason, submitted and decided times, resulting version;</li><li>the requested change (benefit and new limit);</li><li>the resulting terms (expiry, sum insured, benefits and limits);</li><li>the premium, levy and total deltas (and commission only when the backend sends it), and the annual premium before and after;</li><li>the `workflow` block: approval, status, stage.</li></ul>A state panel says what the status means:<ul><li>Draft (whether submitting needs approval or applies at once);</li><li>"Sent for approval" with the workflow stage;</li><li>"Effective" with the resulting version and the new limit, linking to the policy;</li><li>Declined with its reason;</li><li>Withdrawn with its reason.</li></ul>The endorsement's ETag is header-only. A 404 shows "Not found or not available to you" with its Reference. |
| **FI1-D-D5 Actions** | The maker's actions only, each needing `policies.endorsement.create`:<ul><li>**Submit** on a draft: `POST /endorsements/{id}/submit`, body `{}`.</li><li>**Withdraw** on a draft or a referred endorsement: `POST /endorsements/{id}/cancel` with the reason the backend requires, from a dialog that keeps typed text through a 412 and on a backdrop click.</li></ul>Each command uses its own FI1-A key lifecycle and the endorsement's ETag. After any refusal other than a field error or a client defect, the endorsement is reloaded. A success refreshes the policy, its versions and endorsements, and the work queue. |
| **FI1-D-D6 PTH1-D4: no longer actionable** | A `REFERRED` endorsement with a `blocker`, or whose workflow is `VOID`, shows **"No longer actionable"**. The panel carries the blocker's message and its `required_action` as the backend wrote it (for example "Withdraw this endorsement and prepare it again from the current policy version."). Withdraw is the only action. Submit is not offered, and nothing reads as approvable. Without the permission, the page says only its maker can withdraw it. Resubmission and rework are not part of this milestone. |
| **FI1-D-D7 No lightweight path** | Approvals happen only through workflow instances, in the approver's queue (FI1-B). Backend mode never calls `/approve` or `/decline` and never starts another workflow. A source scan of `src/backend` and `src/lib` (comments excepted) and a search of the built backend bundle both find neither path. If `WORKFLOW_APPROVAL_REQUIRED` were ever received, it reads "This approval is made through the workflow task." |
| **FI1-D-D8 Errors (§4)** | **412:** reload, keep what was typed, same key.<br>**409 `ENDORSEMENT_STATE_INVALID`:** now a state conflict like `WORKFLOW_STEP_NOT_CURRENT`, so it shows "This item changed: …" and reloads.<br>**Business 409s** (`ENDORSEMENT_BASE_STALE`, `ENDORSEMENT_STALE`, `POLICY_TERMINATED`): the message, the required action and the Reference.<br>**422:** on the field.<br>**403, 404, defects:** the message and the Reference.<br>**Dropped response:** the same key and body, and a replay is the result. |

**Adjacent fix:** a `required_action` that is a sentence is now shown as written, and only a code is turned into words (`requiredActionText`). Before this, FI1-B's instance page lowercased the backend's sentence after its first letter.

**Not in FI1-D:**
- The endorsement page does not link to its workflow instance. The approver works from **My work**.
- Nothing polls. The page refreshes on focus and with its Refresh button (§5).
- The default effective date is the browser's date; the backend decides with the tenant's date.

## Evidence (2026-10-04)

| Check | Result |
| :--- | :--- |
| Lint (tsc) | PASS |
| Builds | PASS, backend and mock. Backend bundle: 0 mock markers, 0 `/approve` or `/decline`. Mock bundle: no backend client |
| Vitest | 184 passed, 0 failed (12 files), on two consecutive runs. FI1-D adds `endorsementPages.test.tsx` (28 tests against a stateful fake backend). The policy fixtures moved to `src/test/policyFixtures.ts`, and FI1-C's tab test now expects the Endorsements tab. |
| Mutation checks | Each change below makes its tests fail:<ul><li>dropping the D4 detection (3 tests);</li><li>resetting the key after a refusal (the create 412 and the withdraw 412);</li><li>sending another If-Match on create (2 tests).</li></ul> |
| Mode isolation | `modeIsolation.test.ts` passes. |

The tests cover:
- **Endorsements tab:**
  - the list with no UUID, opening an endorsement, the empty state;
  - "New endorsement" absent without the permission and on a cancelled policy.
- **Create:**
  - the latest version's benefits with their current limits;
  - client checks with nothing sent;
  - the policy header ETag, a key, the exact body, replace-navigation;
  - a 412: reload, typed values kept, new If-Match, same key;
  - a 422 on `effective_date` with its Reference, and a new key after the correction;
  - a business 409 with its Reference;
  - a dropped response: same key and body, replay accepted;
  - no ETag header, nothing sent;
  - route gating.
- **Endorsement:**
  - the full view with no UUID, and no Approve, Decline or Reject anywhere;
  - submit with its ETag and a key, ending in "Sent for approval" with the stage;
  - the effective state with the resulting version and the new limit;
  - **D4** with a blocker and with a void workflow alone: "No longer actionable", the message and the required action, Withdraw only;
  - withdraw: reason required, a 412 keeps the reason and the key, the result shown;
  - the backdrop keeps the typed reason;
  - a stale base with the required action as written;
  - `ENDORSEMENT_STATE_INVALID` read as "This item changed";
  - no actions without the permission;
  - a 404 with its Reference.
- **Lightweight path:** the source scan, and the `WORKFLOW_APPROVAL_REQUIRED` wording.
- **Helpers:** `requiredActionText` and `fieldErrorsOf`.

**Left for the FI1-E gate:** the real-backend Playwright journey. The maker creates and submits, the checker approves from My work, and the policy shows the new version and limit. That gate also covers the D4 state with withdraw, the maker unable to approve their own endorsement, and a stale ETag across two browser contexts.
