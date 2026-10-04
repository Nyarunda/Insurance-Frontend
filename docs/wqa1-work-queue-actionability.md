# WORK-QUEUE-ACTIONABILITY-1: the frontend side

**Backend change:** `insurance-core` `4058a54` (record: `backend/docs/specs/work-queue-actionability-1.md`). `GET /work-queue` now lists an unclaimed role-pool task only to a caller the runtime finds could act on it. A maker who also holds the checker role no longer sees their own endorsement's task (FI1-E-F1).

**Frontend product code:** unchanged. My Work shows what the server lists, as it always has (FI1-B-D1).

**Frontend test change (authorized, test code only):** in the FI1-E journey (`e2e/fi1e-gate.spec.ts`), the dual maker/checker case now proves the new contract:
- the dual user's own pooled task is **absent** from their My Work, after a refresh;
- the distinct checker has it;
- nothing changed: the endorsement is still sent for approval, and the policy has no new version.

The test it replaces proved the old contract: the task was listed, and Approve was refused with `SOD_MAKER_CANNOT_APPROVE`. That old run's evidence stays as recorded in `docs/fi1-e-integration-gate.md`. The command's SoD refusal of a direct attempt is unchanged, and is proven by the backend's WQA1 tests.

## Evidence (2026-10-04)

| Check | Result |
| :--- | :--- |
| Backend gate | **1216 passed** (1196 + 20 WQA1) on a fresh PostgreSQL 16 and PgBouncer stack. No migrations. |
| FI1-E journey against `4058a54` | **12 passed** on a freshly built environment: operator commands, the policy built through the API, sandbox OTP |
| The same spec against the old backend `f4d6182` (negative control) | Test 10 fails as expected: the dual user's own task is still listed (expected 0 rows, received 1). Tests 1–9 pass. |
| FI1-A suite | Not rerun, as ruled. No auth code changed. |

Teardown: stack down with its volumes, processes stopped, worktrees removed, secrets deleted, `test-results/` deleted.
