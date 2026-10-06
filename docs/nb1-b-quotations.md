# NB1-B: quotations

**Slice of:** NEW-BUSINESS-1 (`backend/docs/specs/new-business-1-scope.md`).
**Branch:** `nb1-b` from `main` `96985c7`. Frontend only; no backend change (NB-D1).

## What it adds

| Screen | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| Quotations list | `/quotations/list` (`?q=` exact number, `?status=`, `?page=`) | `GET /quotations` | `quotations.quotation.view` |
| New quotation (dialog over the list) | `/quotations/list/new` | `POST /quotations`; `GET /clients?q=` to find the customer; `GET /products?status=ACTIVE` | + `quotations.quotation.create` |
| Quotation record | `/quotations/list/QUO0000001` (number resolved through `?q=`; an ID still works) | `GET /quotations/{id}` with its ETag; the product version's rating factors; `/revisions/{n}/offer` | `quotations.quotation.view` |

**Navigation and the guide (NB-D2):**
- A **Sales → Quotations** navigation group.
- **New quotation** on the customer's record hands that customer to the create dialog through router state. Nothing else is kept.
- A Home shortcut, **Prepare a quotation**.

## The record

- **Risk (NB-D3):**
  - **The form:** the rating factors come only from the product's published version in force. `DECIMAL` is a number field showing its bounds and unit, and is checked before sending. `CHOICE` offers the server's choices. `BOOLEAN` is a yes/no choice.
  - **Identifiers:** risk identifiers use the platform's fixed types.
  - **`risk.details`:** not shown. What a revision already holds is sent back unchanged.
  - **Saving:** `PUT …/risk` with the ETag. The server clears any pricing when the risk changes, and the screen says so.
  - **Which version:** the version is chosen by the browser's date for the form only. The server prices with the version in force on its own business date, and its answer is what counts.
- **Premium (NB-D4):**
  - **Display:** the stored snapshot: base, loadings, discounts, minimum adjustment, rounding, basic premium, each levy and the total. Nothing is calculated in the browser.
  - **Commission:** shown only when the server includes it, for `products.commission.view`.
  - **Pricing:** **Price** is `POST …/price` with the ETag.
- **Issue (NB-D6):**
  - **The alert:** when the risk is on other live quotations, the issue dialog shows the visible quotation numbers and statuses and the hidden count. This comes from the revision's `duplicate_alerts`, or from a 422 `DUPLICATE_RISK_ACKNOWLEDGEMENT_REQUIRED` if the duplicates appear later.
  - **Continuing:** needs a ticked acknowledgement and a reason. The changed body is sent under a new idempotency key.
- **The offer:**
  - **The customer's answer:** **Customer accepted** records acceptance. **Customer declined** needs a reason.
  - **Other actions:** **Revise** makes a new draft revision. **Cancel quotation** needs a reason. **Change validity** is a PATCH on a draft.
  - **History:** the revisions are listed, and **View offer** shows an issued revision as it was frozen.
- **A revision of an expired offer:**
  - The record says it needs a checker. **Issue** is withheld until it is approved.
  - The maker uses **Submit for a check**.
  - When the tenant governs `QUOTATION_REVISION_APPROVAL`, the record shows "Waiting for: <role>" and the check happens in My Work Queue.
  - Otherwise a holder of `quotations.quotation.check` approves it here. The server refuses its preparer (`QUOTATION_SELF_CHECK`).
- **Errors:**
  - Every command carries the quotation's ETag.
  - A 412 reloads the record and says so, keeping what was typed in the risk form.
  - A form re-seeds from the server only when the server's risk actually changed, not on every refetch.
  - Mapped field errors land on their fields; others are shown as the backend's error.
- **Visibility:** a quotation the user cannot see is "not found", by number or by ID. Actions appear only to permissions that could use them; the server decides.

## Evidence

| Check | Result |
| :--- | :--- |
| `tsc --noEmit`, `build`, `build:backend` | Pass |
| Vitest | **270/270** (258 + 12 new in `quotationPages.test.tsx`; the navigation registry test lists Quotations) |

The 12 new tests:
1. The list shows the server's rows in words, sends the exact-number search, and hides **New quotation** without create.
2. An empty list says so.
3. Create with a handed-over customer sends the exact body (no If-Match) and opens the new number.
4. Without a handed-over customer, the dialog finds one on the server and requires one.
5. The risk form is built from DECIMAL, CHOICE and BOOLEAN factors. The lower bound is enforced before sending. The PUT carries the ETag, the typed values (a boolean as a boolean) and identifiers, and `details` unchanged.
6. Price carries the ETag. The breakdown shows levies and total, and commission appears only when present.
7. Issue against duplicates: the 422 evidence and hidden count are shown, the acknowledgement and reason are required, and the retry carries the acknowledgement under a new key.
8. Acceptance carries the ETag, a decline needs a reason, and the frozen offer can be viewed.
9. For an expired-offer revision, the maker submits for a check, and **Issue** is withheld until it is approved.
10. A checker approves here when the check is not governed. When it is governed, the record shows "Waiting for" and no approval button.
11. A number the user cannot see is "not found".
12. The version in force is picked by date.

The real-backend journey is NB1-E's.
