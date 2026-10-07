# CS-A: certificates on the policy

**Slice of:** CERTIFICATES-SURFACE-1 (`backend/docs/specs/certificates-surface-1-scope.md`; scope closed and merged at `60787e2`, CS-P0 profiles at `4a2d731`).
**Branch:** `cs-a` from `main` `4f9c7db`. Frontend only; no certificate API or domain change (CS-D1).
**Status:** CS-A (`57ffa7e`) reviewed: REQUEST CHANGES on CS-A-Q1 only (option 1 approved; the rest accepted). CS-A-R1 implements it; see *Governed cancellation (CS-A-Q1, R1)*.

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
| **Cancel certificate** | live, no cancellation awaiting approval | `POST /certificates/{id}/cancel`, reason; where governed, then **Request cancellation** (below) | `.cancel` |
| **Spoil** | issued (not printed) | `POST /certificates/{id}/spoil`, reason | `.cancel` |

## Printing (CS-D4)

- **Print view** opens a print-ready sheet of the certificate record (serial, insured, policy, insurer, dates, vehicle or shipment, policy version) with **Print** (the browser's print, the rest of the page hidden). Opening it, or printing from it, sends nothing.
- **Mark as printed** is a separate confirmation: "Confirm that certificate … was printed. This records its one print; the system cannot see the paper, so it records your confirmation." Only it sends `/print`.
- **Refusals:** "the policy's terms changed" (with the version it names and the one now in force) and "the policy no longer covers…", each with **Replace it**.

## Replace (CS-D6)

The issue form for the same type and the same vehicle or shipment (fixed), with a required reason. Valid from is empty by default (the server's rule: today, or the replaced certificate's start if later). It sends `replaces_certificate_id`; the old certificate is cancelled as replaced in the same transaction, and the toast names both.

## Governed cancellation (CS-A-Q1, R1)

CS-A brought this back: no read tells a canceller whether the tenant governs `CERTIFICATE_CANCELLATION`. Ruling: option 1, **server-driven** discovery, the sequence the backend's own workflow test follows. No governance flag, no backend change, no client-side governance state.

1. **Cancel certificate** sends the direct `POST /certificates/{id}/cancel` with the reason.
2. Where the tenant governs it, the server answers `409 WORKFLOW_APPROVAL_REQUIRED`; the certificate is refetched (the command's refusal path), so its current ETag is in hand.
3. The dialog stays open with the typed reason and says: "This cancellation needs approval. Request cancellation sends it, with your reason, to an approver; the certificate stays valid until it is approved." Its button becomes **Request cancellation**. **Nothing is sent automatically.**
4. Only the user's click sends `POST /certificates/{id}/request-cancellation` (`CERTIFICATE_REQUEST_CANCELLATION`, `{reason}`, `If-Match` = the current certificate ETag), through **its own idempotency lifecycle**: never the refused cancel's key.
5. On success the toast says the cancellation was requested, and the certificate shows "Cancellation requested", the reason and who it waits for (`waiting_on`); Cancel is no longer offered.

- **412 on the request:** the certificate reloads and the dialog says so, keeping the reason and the request's key; it is sent again only on the user's click, with the new ETag.
- **`WORKFLOW_NOT_CONFIGURED`** (governance switched off between the two clicks): the server's refusal is shown as it is, titled "The cancellation was not requested".

## Tests

`src/backend/pages/certificatePages.test.tsx` (16 at CS-A): tab and actions by profile (none, issuer, canceller); no issue on a cancelled policy; Overview → issue form, class and active types only, sent with the policy ETag, opens by serial, no IDs on screen; vehicle asked only when several; marine shipment; already certified → words → **Replace it** → reason required → `replaces_certificate_id`; 412 keeps the key with the new ETag; no stock in words; print view sends nothing, Mark as printed sends `/print` with the certificate ETag; terms changed in words with both versions and Replace; cover warning; cancel and spoil with reasons and the certificate ETag; a pending request shows who it waits for.

CS-A-R1 (18 in all): the governed Cancel is refused, **Request cancellation** appears only then, with the reason kept and no request sent automatically; one click sends exactly one request with the same reason, the current ETag and a key distinct from the cancel's; success shows the pending approval and who it waits for; a stale request keeps the reason and its key and is resent only on a click with the new ETag; `WORKFLOW_NOT_CONFIGURED` is shown as the server says it.
