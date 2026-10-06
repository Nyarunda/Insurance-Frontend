# NB1-A: customers

**Slice of:** NEW-BUSINESS-1 (`backend/docs/specs/new-business-1-scope.md`, closed 2026-10-06).
**Branch:** `nb1-a` from `main` `df23759`. Frontend only; no backend change (NB-D1).

## What it adds

| Screen | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| Customers list | `/customers/list` (`?q=`, `?kyc=`, `?type=`, `?page=`) | `GET /clients` (search, filters and paging are the server's) | `clients.customer.view` |
| New customer | `/customers/list/new`, a dialog over the list | `POST /clients` | `clients.customer.view` + `clients.customer.create` |
| Customer record | `/customers/list/CUS0000001` (a number resolved through `?q=`; an ID still works) | `GET /clients/{id}` (with its ETag), `GET /clients/{id}/360`, `GET /clients/{id}/identifiers` | `clients.customer.view` |

The record has three tabs:
- **Overview:** the profile, the customer facts, and holdings from `/360` (quotations, active policies).
- **Contacts:** contacts and addresses. Add contact and Add address need `clients.customer.edit`.
- **KYC:** the status, the moves, and the identifiers. Identifiers are masked: only the last 4 characters are ever shown (C1-D17).

**Navigation and Home:**
- A **Customers** group in the navigation, shown with `clients.customer.view`.
- Home shortcuts **Add a customer** (shown with `clients.customer.create`) and **Find a customer** (shown with `clients.customer.view`).

## Rules kept as the backend keeps them

- **Create:**
  - It sends the profile for the chosen type, the home branch (one of the user's branches), the mobile number and e-mail as primary contacts, and optionally the primary identifier.
  - The server normalizes, numbers and validates. Field errors come back onto the fields.
- **Duplicates (NB-D6 for customers, C1-D16):**
  - A 409 `CUSTOMER_DUPLICATE_CANDIDATE` shows the customer numbers the user may see and a count of the rest.
  - Continuing needs a ticked acknowledgement and a reason. The request is resent with `acknowledge_duplicates` and `duplicate_reason`; the body changed, so it goes under a new idempotency key.
  - Records are never merged.
- **Edits:**
  - `PATCH /clients/{id}` carries the customer's ETag as `If-Match` and sends only the fields that changed.
  - A 412 reloads the customer and keeps what was typed; the retry reuses the same key.
- **KYC moves:**
  - The moves mirror the backend's transition table. `manage` moves are offered with `clients.kyc.manage`; Verify and Reject are offered with `clients.kyc.verify`.
  - Rejecting needs a reason.
  - Verifying an identifier sends `verification_status` and `verification_source`.
  - The creator and whoever added an identifier are refused by the server (`KYC_SELF_VERIFICATION`), and the refusal is shown in words.
  - Offering a move is a convenience only; the server decides.
- **Visibility:**
  - A customer outside the user's access is "not found" (404 `CUSTOMER_NOT_FOUND`), by number or by ID.
  - A KYC section the user may not see (`kyc: null` in `/360`) says so.
- **Out (NB-D7):** customer documents (registration, upload and storage), relationships, external references, and status changes.

## Evidence

| Check | Result |
| :--- | :--- |
| `tsc --noEmit`, `build`, `build:backend` | Pass |
| Vitest | **256/256** (245 + 11 new in `customerPages.test.tsx`; the navigation registry test now lists Customers) |

The 11 new tests:
1. The list shows the server's rows with no IDs, and search and filters go to the server and into the URL.
2. An empty list says so, and **New customer** is hidden without `clients.customer.create`.
3. The page is refused without `clients.customer.view`, and the navigation omits it.
4. Create sends the exact body, carries an idempotency key and no If-Match, and opens the new number.
5. A duplicate shows its candidates and hidden count, needs a ticked acknowledgement and a reason, and is resent under a new key.
6. A record opens by number; a number the user cannot see is "not found".
7. Profile edit sends only what changed, with If-Match; a 412 keeps what was typed and the retry keeps the key.
8. The maker sees only the working KYC moves, and a move is sent with the ETag.
9. The checker sees Verify and Reject but not maker actions, and a self-verification refusal is shown in words.
10. Rejecting KYC needs a reason.
11. KYC hidden by access says so.

The real-backend journey is NB1-E's.
