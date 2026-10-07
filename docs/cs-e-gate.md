# CS-E: the CERTIFICATES-SURFACE-1 gate

**Slice of:** CERTIFICATES-SURFACE-1 (`backend/docs/specs/certificates-surface-1-scope.md`, §3 CS-E, §4 gates).
**Branch:** `cs-e` from `main` `cd75198` (CS-A, CS-B and CS-C merged). Test-only: `e2e/cse-gate.spec.ts` and this note; no product code.
**Under test:** backend `insurance-core` `b808ee0` (CS-P0 profiles and the CS-C1 fix), frontend `main` `cd75198`.

## Environment

Each run builds a fresh disposable environment (gate stack recreated: PostgreSQL 16 + PgBouncer on 127.0.0.1:55433/56432; backend on 127.0.0.1:8000; the backend-mode frontend on 3100). The pilot (3300/8010, database 55443/56442) is never touched.

`cse_setup.py` = the NB1-E environment (`nb1e_setup.py`: FI1-E's tenants, bound motor policy and governed endorsements, NB1-E's accounts and governed underwriting exceptions) plus, through `onboard_pilot_user`, `setup_tenant_access` and `assign_workflow_role` only:

| Account | Access |
| :--- | :--- |
| cert-keeper@ | `CERTIFICATE_STOCK_MANAGER`@NBO |
| cert-issuer@ | `CERTIFICATE_ISSUER`@NBO |
| cert-canceller@ | `CERTIFICATE_CANCELLER`@NBO (not the issuer) |
| cert-checker@ | workflow role `CERTIFICATE_CHECKER`@NBO |
| cert-checker-msa@ | workflow role `CERTIFICATE_CHECKER`@MSA (API only; activation needs an eligible approver at every branch) |
| cert-outsider@ | `CERTIFICATE_ISSUER`@MSA (out of branch) |

`CERTIFICATE_CANCELLATION` starts as a draft. Mid-run, `cse_activate.py` governs it as an operator would: A requests through `request_standard_workflow_activation`, B approves through the workflow API. Temporary passwords stay in the environment's `secrets/`; nothing secret is logged.

## The journey (`e2e/cse-gate.spec.ts`, 13 steps, serial)

1. The stock manager, issuer and canceller sign in (password, OTP, forced change); each sees only their own sidebar entries (stock for the keeper; Policy Directory and Certificates, no stock, for issuer and canceller).
2. **Stock:** the keeper creates a type for the policy's class, receives a numbered batch (serial preview checked before sending) and allocates a range to Nairobi; the returned result is shown; available stock shows it by insurer name.
3. **Issue:** the issuer issues from the policy header with the form's defaults (the one active type of the class, from today, to the end of cover); `If-Match` is the policy's ETag; the certificate opens by serial; no UUID rendered.
4. **One live certificate per vehicle:** a second issue is refused in words naming the live serial; **Replace it** with a reason issues the replacement; the first shows "REPLACED: …".
5. **Spoil:** the canceller (no Mark as printed or Replace offered) spoils the issued, unprinted replacement.
6. **Print:** the issuer opens the print view (no `/print` sent), then **Mark as printed** sends exactly one `/print` with the certificate's ETag.
7. **Direct cancel:** the canceller cancels the printed certificate (Spoil not offered on a printed one).
8. **Terms changed:** an endorsement after issue (FI1-E maker, then checker in My Work Queue) makes version 2; marking the issued certificate printed is refused with "It names version 1; version 2 is now in force…"; **Replace it** issues one naming version 2, which is then marked printed.
9. **Governed cancel:** after the mid-run activation, the canceller's Cancel turns into "This cancellation needs approval" with the reason kept and **no** `/request-cancellation` sent; the explicit **Request cancellation** sends it with its own idempotency key; the certificate shows "Waiting for: Certificate Checker"; the checker approves in My Work Queue; the certificate is cancelled.
10. **Find:** by vehicle (every serial of the journey) and by serial (lower case, normalised by the server); the record opens at `/certificates/list/<serial>`; **Open on the policy** lands on the policy's tab at that certificate.
11. **Out of branch:** a Mombasa issuer gets "not found" for the certificates and the policy, and no match by vehicle.
12. **Profile separation (API):** the issuer cannot cancel, create a type or read batches (`PERMISSION_DENIED`); the stock manager sees no policies and cannot issue; the canceller cannot issue or print.
13. **Tenant isolation:** tenant A's token at tenant B's address gets `CROSS_TENANT_TOKEN_ATTEMPT` for certificates, types and a policy's certificates.

## Results

Backend `b808ee0`, frontend `cd75198`; every run on a freshly built environment (2026-10-07).

| Run | Result |
| :--- | :--- |
| CS-E run 1 | Not counted: the mid-run helper `cse_activate.py` exited through `os._exit` without flushing its output, so the spec could not read the activation result. Helper fixed (`flush=True`); no product or spec change. |
| CS-E run 2 | 13 passed (1.9 min) |
| CS-E run 3 | 13 passed (2.0 min) |
| NB1-E regression | 15 passed (2.3 min) |
| FI1-E regression | 12 passed (1.9 min) |

No product defect found; no product code changed during the gate.
