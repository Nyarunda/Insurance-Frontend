# CS-C: certificate stock

**Slice of:** CERTIFICATES-SURFACE-1 (`backend/docs/specs/certificates-surface-1-scope.md`, CS-D8 as narrowed by R1 and R2). CS-B closed and merged (`main` `6a4e8a3`).
**Branch:** `cs-c` from `main` `6a4e8a3`. Frontend only; no certificate API or domain change, no new backend API.
**Status:** for review.

## Where

| Screen | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| **Certificate stock** (Policies group in the sidebar) | `/certificates/stock`, tabs `?tab=` Available stock (default), Batches, Types | below | `certificates.stock.manage` (the `CERTIFICATE_STOCK_MANAGER` profile) |

The route checks the permission again (others see "You do not have access to this screen" and nothing is fetched); the backend decides every call.

| Part | Backend |
| :--- | :--- |
| Available stock | `GET /certificate-stock` |
| Batches | `GET /certificate-batches`; receive `POST /certificate-batches` |
| Allocation | `POST /certificate-stock/allocate` `{batch_id, first_number, last_number, branch_id}` |
| Types | `GET /certificate-types`; create `POST /certificate-types` |
| Lookups | `GET /insurers` (`insurers.insurer.view`), `GET /insurance-classes` (`products.product.view`); branches from `/me` |

Each command goes through the FI1-A idempotency lifecycle (no `If-Match`: these create), with its own key per command.

## Available stock

The current grouped stock as the server returns it: type, insurer (by name), held by (the branch by name; stock held by a named user reads "A named user at <branch>", never an ID, since there is no user directory), available count, lowest–highest serial. Never individual blanks.

## Batches

- **The list:** batch number, type, insurer, the serial range, quantity, receiving branch, delivery reference, received at.
- **Receive batch:** insurer (active only), type (active only), receiving branch (from `/me`), prefix (capitals, digits, hyphens; up to 12), first and last number, digits (1–12, default 7), optional delivery reference. A **preview** shows the count and the first and last serial before sending. The batch size limit is the server's (a setup default, not repeated here): its `CERTIFICATE_RANGE_INVALID` message lands on the field. A reused serial is refused in words naming it.
- **Allocate** (a button on each batch): a range within the batch (defaulting to the whole batch, kept within it), **to a branch only** (from `/me`). A preview names the serials. On success the page shows the command's own result: "Allocated to <branch>: N certificates of batch …: first to last." Refusals in words: stock not available (naming used serials), a range split across holders.

## Types

The list (code, name, category, insurance class, active or inactive) and **New type**: code (2–32 capitals, digits, hyphens, underscores), name, category (motor or marine), insurance class (active classes). A taken code is refused in words. **No rename or deactivate** (R2 CS5); the tab says so.

## Not in CS-C (deferred to a certificate-stock API follow-up)

Allocation to a named user, manual ID entry, spoiling a blank serial, a movement-history screen, renaming or deactivating a type, any new backend API.

## Tests

`src/backend/pages/certificateStock.test.tsx` (11): sidebar for `stock.manage` only and the route refuses an issuer without fetching; stock in words (insurer and branch by name, a named holder without its ID, count, range) and empty; types list without rename/deactivate, create with active classes only, required fields, the body without If-Match and with a key, a taken code in words; batches list in words; receive with active insurers and types, the serial preview, the exact body; a reused serial in words; the server's range limit on the field; allocate to a branch only (no user field), range preview, the exact body, the returned result shown; the range kept within the batch and stock-not-available in words. `navigation.test.ts`: the registry gains Certificate stock, and `/certificates/stock` resolves to it.
