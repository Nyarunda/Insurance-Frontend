# RS-A: renewals on the policy

**Slice of:** RENEWALS-SURFACE-1 (`backend/docs/specs/renewals-surface-1-scope.md` at `860d21b`, RS-A).
**Branch:** `rs-a` from `main` `d97320d`. **Backend:** RENEWALS-1 endpoints as already on `insurance-core`; RS-A uses none of RS-P0's new reads. Frontend only.

## Where

- **Renewals** tab on the policy (after Endorsements): the policy's renewals, newest first, with the new period, premium and status in words.
- **Prepare renewal** on that tab, for `policies.renewal.create` on a bound policy with no renewal in progress (`DRAFT`, `PRICED`, `OFFERED`, `ACCEPTED`). Whether the policy is inside its renewal window is the server's rule; its refusal is shown in its own words (which carry the window and dates), so no window is computed here.
- A renewal's record: `/policies/list/<POL>/renewals/<REN>`, a dialog over the tab, resolved by number through the policy's renewal list (no UUID in the address).

## Prepare (as is)

`POST /policies/{id}/renewals` with the policy's ETag. Dates may be left empty (the server starts the day after expiry and runs a year less a day); a later start shows "The days from … to … are not covered", since the server refers a gap to a checker.

## The record

| Status | Shown | Actions |
| :--- | :--- | :--- |
| Draft | period | Price, Change dates, Withdraw |
| Priced | expiring vs renewal annual figures, difference and movement ("information, not a charge"), commission only if sent, checker reasons in words | Offer when no check is needed or it is approved; Approve for `policies.renewal.approve` where not governed; where governed, "Waiting for: <role>" and the checker decides in My Work Queue; Change dates (back to draft), Withdraw |
| Offered | offer validity | Customer accepted, Customer declined (reason required), Withdraw |
| Offer expired | "Offer expired … Withdraw it and prepare it again" | Withdraw |
| Accepted | "Held until <start>" before the start | Renew, Withdraw |
| Declined, Withdrawn | the reason | Prepare again |
| Renewed | the policy version created | — |

Every command sends the renewal's ETag; a 412 reloads it, keeps the dialog's input, and the same press resends with the same idempotency key. Refusals are words: the server's sentence, or for `RENEWAL_EXISTS`, `RENEWAL_BASE_STALE`, `RENEWAL_NOT_RENEWABLE` (each problem listed) and `RENEWAL_BACKDATE_APPROVAL_REQUIRED`, the next step as well.

## Not here

Amended renewals (RS-B), the cross-policy Renewals page and the record by number alone (RS-C), the journey gate (RS-E).

## Gate

`tsc --noEmit` clean; `build` and `build:backend` built; Vitest 383 passed (22 files; 14 new in `renewalPages.test.tsx`; the workspace's tab inventory updated for Renewals).
