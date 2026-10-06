# NB1-C: underwriting proposals

**Slice of:** NEW-BUSINESS-1 (`backend/docs/specs/new-business-1-scope.md`).
**Branch:** `nb1-c` from `main` `5124d90` (NB1-B merged). Frontend only; no backend change (NB-D1).
**Status:** built, awaiting review.

## What it adds

| Screen | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| Proposals list | `/proposals/list` (`?q=` exact number, `?status=`, `?page=`) | `GET /underwriting/proposals` | `underwriting.proposal.view` |
| New proposal (dialog over the list) | `/proposals/list/new` | `POST /underwriting/proposals`; `GET /quotations?q=&status=ACCEPTED` to find the quotation | + `underwriting.proposal.create` |
| Proposal record | `/proposals/list/UWP0000001` (number resolved through `?q=`; an ID still works) | `GET /underwriting/proposals/{id}` with its ETag; `GET /insurers/{id}/agreements` | `underwriting.proposal.view` |

**Navigation and the guide (NB-D2):**
- **Sales → Proposals** in the navigation.
- **Create proposal** on an accepted quotation's record hands that quotation to the create dialog through router state. It is shown with `underwriting.proposal.create` and `.view`.
- A Home shortcut, **Underwrite an accepted quotation**.

## The record

- **Creating:**
  - **What it takes:** an accepted quotation (handed over, or found by its exact number among accepted quotations) and, optionally, the proposed inception.
  - **What the server does:** copies the accepted offer (risk, cover, premium). Nothing is recalculated (U1-D5).
- **Terms, while DRAFT and with `underwriting.proposal.edit`:**
  - **Fields:**
    - the agreement: the product insurer's agreements, active ones only, plus the current one;
    - the proposed inception;
    - the sum insured;
    - underwriting details: named notes, sent as the backend's string map.
  - **Expiry:** not entered. The server sets it from the inception, one year less a day (U1-D6), and the screen shows it.
  - **Saving:** `PATCH` with the ETag, sending **only the fields that changed**. The sum insured uses the same DECIMAL parser as the risk form (NB1-B-R2), so `1,200,000` is sent as `"1200000"` and malformed or spaced input is refused. Detail names must be present and distinct.
  - **The premium:** never editable.
- **Read-only parts:**
  - **Quoted risk:** factors and identifiers; `risk.details` is not shown (NB-D3).
  - **Premium, as accepted:** the copied breakdown. Commission only when the server includes it (NB-D4).
  - **Cover:** sections with their benefits, limits and exclusions.
- **Requirements (NB-D7):**
  - **Recording:** **Record evidence** takes an evidence reference only (`…/requirements/{code}/satisfy`). No file is uploaded. A recorded reference can be changed while the proposal is open.
  - **Idempotency:** each requirement has its own idempotency lifecycle, and the requirement code is part of the command's resource. The same reference text for two requirements is two commands, never a replay.
- **Submit and the state it settles at:**
  - **Submit** is `POST …/submit` with the ETag.
  - **A refusal** (`PROPOSAL_NOT_BINDABLE`) lists the server's problems as sentences.
  - **UNDER_REVIEW or REFERRED** shows what is outstanding, in words:
    - each open exception by name;
    - missing evidence by the requirement's name;
    - KYC not verified, with **Open the customer**, and **Check again** (`…/evaluate`) once it is verified.
  - **READY_TO_BIND, BOUND, DECLINED, CANCELLED** each say so; bound shows the policy number.
- **Exceptions:**
  - **Listing:** each shows its name, the reason, who found it (the system or an underwriter), and its state. Superseded ones are not shown.
  - **Referring:** **Refer** raises an underwriter's referral and needs a reason.
  - **Approving, when governed:** the exception shows "Waiting for: <role> (<stage>), in My Work Queue". There is no approve button; **Open in My Work Queue** appears for `workflow.task.view`.
  - **Approving, when not governed:** a holder of `underwriting.exception.approve` approves here, with an optional note.
  - **Who may approve:** the detail does not expose the contributors, so the server alone refuses one of them (`PROPOSAL_SELF_APPROVAL`). Under the NB1-P0 profiles, the maker has no approve permission anyway.
- **Other actions:**
  - **Reopen** (submitted proposals; approvals lapse, a server rule).
  - **Decline** (open proposals).
  - **Cancel proposal** (open or ready to bind). Decline and cancel need a reason.
- **Errors:**
  - Every command carries the ETag.
  - A 412 reloads the record and says so. The terms form keeps what was typed, and the retry reuses the same body and key under the refreshed ETag.
  - The form reseeds only when the server's terms actually changed.
  - Mapped field errors land on their fields.
- **Visibility:** a proposal the user cannot see is "not found", by number or by ID. Actions appear only to permissions that could use them; the server decides.

**Not in this slice:**
- **Adding an underwriter's requirement** (`POST …/requirements`): the API exists, but NB1-C's scope is recording evidence.
- **Bind and the "New policy" guide:** NB1-D.

## Evidence

| Check | Result |
| :--- | :--- |
| `tsc --noEmit`, `build`, `build:backend` | Pass |
| Vitest | **292/292** (276 + 16 new in `proposalPages.test.tsx`; the navigation registry test lists Proposals) |

One full run timed out seven tests at 30 s, spread over five files, five of the seven in older suites. An immediate rerun passed 292/292. Alone, the new proposal tests take about 0.05–4 s each.

**One existing guard changed** (`endorsementPages.test.tsx`, *the lightweight approval path*). The FI1 guard fails any backend-mode source naming `/approve` or `/decline`. It was written when only endorsements had such paths. NB1-C's scope includes the lightweight approval of an underwriting exception (NB-D5: "My Work Queue or the lightweight path"), so `proposals/useProposalCommands.ts` is now the one file the guard allows. The guard also asserts that this file mentions no endorsement. The rule for endorsements is unchanged.

The 16 new tests:
1. The list shows the server's rows in words, sends the exact-number search, and hides **New proposal** without create.
2. An empty list says so.
3. An accepted quotation's **Create proposal** hands it over. The create sends exactly `{quotation_id, proposed_inception_date}`, with no If-Match, and opens the new number.
4. Without a hand-over, the dialog finds an accepted quotation (`status=ACCEPTED`, exact number) and requires one.
5. The draft shows:
   - the quoted risk without `risk.details`;
   - the copied premium, without commission;
   - the cover;
   - the active agreements only.
6. Saving terms sends only what changed, with the ETag:
   - the agreement;
   - the sum insured as `"1200000"`;
   - the whole details map.

   A duplicate detail name is refused, with nothing sent.
7. A stale terms save: the typed value remains, and the retry has the same body and key under the refreshed ETag.
8. A refused submit lists the server's problems as sentences.
9. A checker sees the terms read-only, with no maker actions.
10. Submitted and referred: each exception, the missing evidence by name, and the KYC are listed in words. The terms are locked.
11. Evidence per requirement: the ETag, the body, and a required reference. The same text for two requirements gets two different idempotency keys.
12. The maker checks again and reopens with the ETag, and is offered no approval.
13. Refer, decline and cancel each require a reason and send it.
14. Exception approval:
    - Not governed: the checker approves here with a note and the ETag.
    - Governed: "Waiting for …, in My Work Queue", and no approve button.
15. Ready to bind, with commission when present and cancel offered. Bound shows the policy number and no actions.
16. A number the user cannot see is "not found".

The real-backend journey is NB1-E's.
