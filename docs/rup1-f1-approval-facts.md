# RUP1-F1: the checker sees what they decide (frontend)

**Origin:** RUP1 finding F-1 (HIGH). The checker saw "Change limit", dates and deltas, but not the benefit or the new limit. With two pending changes, they approved by guessing from entry order.
**Backend change:** `insurance-core` branch `rup1-f1`, `e85aa1b` (record: `backend/docs/specs/rup1-f1-approval-facts.md`). The approval snapshot `POLICY_ENDORSEMENT_APPROVAL/2` governs `policy_no`, `benefit`, `benefit_name`, `previous_limit_amount`, `new_limit_amount` and `request_reason`. Each `GET /work-queue` row now carries the snapshot's frozen `approval_facts`.

## What changed

- **My Work** (`WorkQueuePage.tsx`): under the record, a limit change reads in words, for example **Windscreen: KES 80,000.00 → KES 100,000.00**. Two pending changes on one policy can be told apart without opening either.
- **Approval page** (`InstancePage.tsx`): "What is being approved" opens with a **Requested change** block, above Approve and Reject:

  | Row | Example |
  | :--- | :--- |
  | Type | Change limit |
  | Policy | POL0000001 |
  | Base version | Version 2 |
  | Benefit | Windscreen |
  | Current limit | KES 80,000.00 |
  | New limit | KES 100,000.00 |
  | Effective from | 05 Oct 2026 |
  | Maker's reason | Increase windscreen cover |

  The remaining governed facts follow under **Other approval facts**, with the same display rules as before: no identifiers or hashes.
- **Formatting** (`workflow/format.ts`): `changeSummary` and `decisionFacts`. Amounts take two decimals and thousands separators, in the snapshot's `transaction_currency`. Dates are calendar dates. The benefit's readable name is used, with the code as fallback.
- **An older approval** (`/1` facts, no benefit or limits) renders as before: no change line, and no empty rows.
- **Decisions are unchanged:** Approve takes no comment. Reject needs a reason code, plus text when the code `requires_text`.

## Evidence (2026-10-05)

| Check | Result |
| :--- | :--- |
| Lint (`tsc --noEmit`), `build`, `build:backend` | Pass |
| Vitest | **202/202** (13 files). New tests: `format.test.ts` (summary in words, no summary for `/1` or other types, decision-row order, currency from the facts) and `workflowPages.test.tsx` "RUP1-F1" (My Work tells two changes apart, the approval page shows the change before the actions, a `/1` approval still renders) |
| Mutation check | Removing the My Work change line fails the My Work test |
| FI1-E real-backend journey, backend `e85aa1b` | **12/12, twice**, each run on a freshly built environment. The journey now also asserts the checker's rows "Windscreen: KES 50,000.00 → KES 70,000.00" and "Radio cassette: KES 30,000.00 → KES 40,000.00", and the approval page's Requested change (benefit, current and new limit, policy number, maker's reason) |
| Backend gate at `e85aa1b` | 1224 passed, fresh PostgreSQL 16 + PgBouncer stack, no migrations |
| FI1-A suite | Not rerun, as ruled. No auth code changed. |

Teardown: gate stack down with its volumes, Vite and backend stopped, the e2e worktree removed, secrets deleted, `test-results/` deleted. The RUP1 pilot environment was not touched.
