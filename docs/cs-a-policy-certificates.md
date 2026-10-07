# CS-A: certificates on the policy

**Slice of:** CERTIFICATES-SURFACE-1 (`backend/docs/specs/certificates-surface-1-scope.md`; scope closed and merged at `60787e2`, CS-P0 profiles at `4a2d731`).
**Branch:** `cs-a` from `main` `4f9c7db`. Frontend only; no certificate API or domain change (CS-D1).
**Status:** for review. One item is stopped and brought back rather than worked around: see *CS-A-Q1*.

## Where

| What | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| **Certificates** tab on the policy | `/policies/list/POL…?tab=certificates` | `GET /policies/{id}/certificates` | `certificates.cert.view` or `.issue` |
| A certificate | `…?tab=certificates&certificate=<serial>` | `GET /certificates/{id}` (body, ETag, derived `cover`) | the same |
| **Issue certificate** in the policy header (Overview and every tab but Certificates) | opens the tab with the issue form (`&issue=1`, removed once used) | — | `certificates.cert.issue`, on a bound policy whose cover is not cancelled or expired |

A certificate is addressed by its serial, never by an ID. A bind already lands on the new policy's Overview (NB1-D), so **Issue certificate** is there straight after binding.

## Issue (CS-D3, CS-D5)

`POST /policies/{id}/certificates`, `If-Match` = the policy's ETag from the policy query's header.

- **Type:** the active types whose class is the policy's class. The class comes from `GET /products/{id}` → `insurance_class` (the issuer's `products.product.view`, CS-P0). When only one fits, it is chosen. When none fits, the form says so and to ask the stock manager. The server refuses any other type.
- **Valid from:** today by default; the picker offers no earlier day. **Valid to:** empty means the end of continuous cover, and the form says so.
- **Serial:** optional; empty means the next one held by the issuer or the policy's branch. No serials are listed (the issuer cannot read stock).
- **Vehicle:** asked only when the policy's version in force names several registrations, and then required.
- **Marine:** a marine type asks for the shipment reference, conveyance, voyage from and to, and the goods, all required.
- **Refusals in words**, never codes: backdated, no cover, beyond cover (with the date), type not applicable or unknown, vehicle ambiguous, unknown or missing, vehicle already certified (naming the live serial, with **Replace it**), identity conflict, shipment already certified (with **Replace it**), stock unavailable ("ask your stock manager"), stock held by someone else.
- **412:** the policy reloads and the form says so; the retry keeps the body and idempotency key under the new ETag.
- **After issue:** the certificate opens by its serial, with a toast.

## The certificate

- **Shown:** type, validity, the policy version it names, insured, insurer, batch; the vehicle (registration, chassis, engine) or the shipment; issued, marked as printed, replaces / replaced by (each opens that certificate), and cancelled or spoilt with its reason.
- **Cover:** when the derived `cover` says the policy no longer covers the whole validity, a warning gives the covered-through date and says to cancel or replace it.
- **Actions,** each only to those who could use it; the server decides:

| Action | When | Backend | Permission |
| :--- | :--- | :--- | :--- |
| **Print view** | live (issued or printed) | none | view |
| **Mark as printed** | issued | `POST /certificates/{id}/print`, the certificate's ETag | `.issue` |
| **Replace** | live, on an issuable policy | `POST /policies/{id}/certificates` with `replaces_certificate_id` + reason | `.issue` |
| **Cancel certificate** | live, no cancellation awaiting approval | `POST /certificates/{id}/cancel`, reason | `.cancel` |
| **Spoil** | issued (not printed) | `POST /certificates/{id}/spoil`, reason | `.cancel` |

## Printing (CS-D4)

- **Print view** opens a print-ready sheet of the certificate record (serial, insured, policy, insurer, dates, vehicle or shipment, policy version) with **Print** (the browser's print, the rest of the page hidden). Opening it, or printing from it, sends nothing.
- **Mark as printed** is a separate confirmation: "Confirm that certificate … was printed. This records its one print; the system cannot see the paper, so it records your confirmation." Only it sends `/print`.
- **Refusals:** "the policy's terms changed" (with the version it names and the one now in force) and "the policy no longer covers…", each with **Replace it**.

## Replace (CS-D6)

The issue form for the same type and the same vehicle or shipment (fixed), with a required reason. Valid from is empty by default (the server's rule: today, or the replaced certificate's start if later). It sends `replaces_certificate_id`; the old certificate is cancelled as replaced in the same transaction, and the toast names both.

## CS-A-Q1: governed cancellation (stopped, brought back)

CS-D7 says that where a tenant governs `CERTIFICATE_CANCELLATION`, the button is **Request cancellation**. No read available to a canceller says whether the tenant governs it: `GET /workflows/standard-definitions` is for workflow administrators, and the certificate's `workflow` block exists only after a request. So the screen cannot choose the button in advance.

Built, without working around it:
- **Cancel certificate** (direct). Where the tenant governs it, the server refuses with `WORKFLOW_APPROVAL_REQUIRED`; the dialog says "Cancelling a certificate needs approval at your company, so it cannot be cancelled directly. Requesting a cancellation for approval is not available on this screen yet." and sends nothing else.
- A certificate whose cancellation is already awaiting approval shows "Cancellation requested", the reason and who it waits for (`waiting_on`), and no Cancel; a rejected request says so.

Not built: the **Request cancellation** entry (`POST /certificates/{id}/request-cancellation`). For a ruling, two ways:
1. **Frontend only:** after the server's `WORKFLOW_APPROVAL_REQUIRED` on Cancel, the dialog offers **Request cancellation** with the same reason, sent only on the user's click. Uses only documented answers; nothing is guessed in advance.
2. **A backend read:** a governance flag for the canceller (for example on the certificate or policy detail). Not authorized now.

## Tests

`src/backend/pages/certificatePages.test.tsx` (16): tab and actions by profile (none, issuer, canceller); no issue on a cancelled policy; Overview → issue form, class and active types only, sent with the policy ETag, opens by serial, no IDs on screen; vehicle asked only when several; marine shipment; already certified → words → **Replace it** → reason required → `replaces_certificate_id`; 412 keeps the key with the new ETag; no stock in words; print view sends nothing, Mark as printed sends `/print` with the certificate ETag; terms changed in words with both versions and Replace; cover warning; cancel and spoil with reasons and the certificate ETag; governed refusal in words with nothing else sent; a pending request shows who it waits for.
