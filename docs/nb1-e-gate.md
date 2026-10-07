# NB1-E: the NEW-BUSINESS-1 end-to-end gate

**Slice of:** NEW-BUSINESS-1 (`backend/docs/specs/new-business-1-scope.md`), the validation gate. No product code changes.
**Branch:** `nb1-e` from `main` `fdba66b`. The spec was committed as `43a7d1d` before any counted run, and this record follows it.
**Status:** run, awaiting review. 2026-10-07.

## Candidate

| Part | Commit |
| :--- | :--- |
| Frontend product code | `main` `fdba66b5ee20edcd3ab66a039b90d7b51cd6b527`, served from a clean detached worktree. `src/` at `43a7d1d` is identical to `fdba66b`. |
| Frontend journey | `e2e/nb1e-gate.spec.ts` at `43a7d1d` |
| Backend | `insurance-core` `9d0ebc5460143bdde48326152ec2b33b048fbba4`, from a clean detached worktree |

## Environment (disposable, rebuilt for every run)

**Isolation:**
- **Gate stack:** PostgreSQL 16 and PgBouncer on 127.0.0.1:55433/56432, destroyed (`down -v`) and recreated for every run. The backend is on :8000 and the frontend on :3100.
- **The pilot is untouched:** :3300/:8010, database 55443/56442.

**Setup:**
- **Base:** the FI1-E setup, unchanged, plus `nb1e_setup.py`. Supported operator commands and the normal API only.
- **New accounts in tenant Alpha:**

  | Account | Access |
  | :--- | :--- |
  | `nb-maker` | `NEW_BUSINESS_MAKER@NBO` |
  | `nb-checker` | `NEW_BUSINESS_CHECKER@NBO`, plus the workflow role `UNDERWRITING_EXCEPTION_APPROVER@NBO` |
  | `nb-outsider` | `NEW_BUSINESS_MAKER@MSA` |
  | `nb-checker-msa` | `NEW_BUSINESS_CHECKER@MSA`, plus `UNDERWRITING_EXCEPTION_APPROVER@MSA`; API-only. Activation refuses a branch with no eligible approver. |

- **Governed approval:** `UNDERWRITING_EXCEPTION_APPROVAL` is activated: requested by A through `request_standard_workflow_activation`, and approved by B through the workflow API.
- **Credentials:** temporary credentials stay in the environment's `secrets/accounts.json`. None are in logs, fixtures, this record or the repository.

## The journey (15 steps)

1. The maker and the checker sign in (password, OTP, forced change). Each sees only their own menu: the maker has New policy and no My Work Queue; the checker has My Work Queue, no New policy, and no New customer.
2. The maker creates a customer with a primary identifier, starts KYC and sends it for verification. Verify KYC is not offered to the maker.
3. **Separation, through the API:** the maker cannot verify KYC (`PATCH /clients/{id}` `kyc_status=VERIFIED` → 403 `PERMISSION_DENIED`) or read the work queue (403).
4. The checker verifies the identifier and the KYC.
5. The maker starts a quotation from the customer's record (the hand-over).
6. **A real 412:**
   - A second maker session holds the risk form, typed in.
   - The first session changes the validity.
   - The held save gets 412; the typed values remain, and the retry succeeds.
   - PUT statuses are `[412, 200]`, with the same idempotency key, the same body and a new If-Match. The sum insured is sent as `"1000000"`.
7. The maker prices, issues the offer and records acceptance. The frozen offer shows the risk as offered.
8. The maker creates the proposal from the accepted quotation (the hand-over) and saves the agreement. The server sets the expiry.
9. **Separation, through the API:**
   - The maker cannot check a revision.
   - The checker cannot create or edit a customer, quotation or proposal, and cannot bind.
   - The checker has no setup powers: creating an insurer, adding an agreement and drafting a product version are each refused with 403.
   - Real identifiers are used throughout, so only the permission can refuse.
10. The maker submits; the outstanding list shows "Evidence missing: Logbook copy". The maker refers (with a reason) and records the evidence. The referral shows "Waiting for …, in My Work Queue", with no inline approval.
11. **Separation, through the API:** the maker cannot approve the referral (403 `PERMISSION_DENIED`).
12. The checker approves the referral from My Work Queue, and the proposal becomes ready to bind.
13. **Bind with a dropped response:**
    - The maker binds with an insurer number.
    - The first answer is dropped after the server acted.
    - The retry carries the same key and the same If-Match, and is answered `Idempotency-Replayed: true`.
    - The customer has exactly one policy. The new `POL…` opens with its cover, and the proposal's **Open the policy** opens it again.
14. The Mombasa maker gets "Not found or not available to you." for the customer, quotation, proposal and policy addresses, and an empty proposals list.
15. **Tenant isolation:** tenant A's user cannot sign in at tenant B's address. A's live token is refused at B for `/clients`, a customer, `/quotations`, `/underwriting/proposals`, a proposal and `/policies` (403 `CROSS_TENANT_TOKEN_ATTEMPT`).

No rendered text contains a UUID (the Reference is the only exception).

## Evidence

| Run | Fresh environment | Result |
| :--- | :--- | :--- |
| NB1-E run 1 | rebuilt (agreement `AG-7952cd8c`) | **15/15** passed (1.2 min) |
| NB1-E run 2 | rebuilt (agreement `AG-82c86a37`) | **15/15** passed (1.2 min) |
| FI1-E regression run 1 | rebuilt | **12/12** passed (1.4 min) |
| FI1-E regression run 2 | rebuilt | **12/12** passed (1.1 min) |

**Development runs, before the spec was committed:**
- **Setup:** the first build was refused by the backend's activation check, because Mombasa had no eligible underwriting-exception approver. This is correct behaviour, not a defect; the setup now onboards `nb-checker-msa`.
- **Journey:** two attempts failed on the test's own locators (the sidebar's entries are buttons in the "Primary navigation" landmark; a duplicated heading; the KYC label wording). The third passed 15/15.
- No product defect was found, and nothing was patched during the gate.
