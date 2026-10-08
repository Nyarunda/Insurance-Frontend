# SD-C: vehicle makes and models in the application

**Slice of:** SETUP-DRIVEN-1 (`backend/docs/specs/setup-driven-1-scope.md`, SD-C), over SD-A and SD-B.
**Branch:** `sd-c` from `main` `2ab6288`. **Backend:** `insurance-core` `1348e87` (SD-A and SD-B closed). Frontend only.

## Setup page: `/vehicle-makes/list` (Setup → Vehicle makes)

- For `products.reference.manage` (the `REFERENCE_DATA_MANAGER` profile, tenant-wide). The route checks it as well as the menu; the server decides every call, and its refusal of a branch-only grant reads "Only a tenant-wide reference data manager can change the list."
- Every make with its models, active and inactive, each with its status; **Active only** narrows the list (`GET /vehicle-makes?active=true`).
- **New make** and **Add model**: a code (capitals, never changed once created) and a name.
- **Rename**, **Deactivate**, **Reactivate** for makes and models. Each dialog reads the record's ETag from the server when it opens (`GET /vehicle-makes/{id}`, or the model's) and sends it as `If-Match`; a 412 reloads it, keeps what was typed, and the same confirmation resends with the same idempotency key. No ETag is built from `row_version`.
- No delete and no code edit: SD-D1 keeps codes stable and deactivates instead of deleting.

## Quotation risk

- When the product version in force declares `reference_fields`, the risk form shows them as choices:
  - `VEHICLE_MAKE`: the tenant's **active** makes;
  - `VEHICLE_MODEL`: the **active** models of the chosen make ("Choose the make first" until one is chosen). Changing the make clears a model of another make.
- The form sends **codes**; the server checks them and stores the code and the name at the time, which the form starts from on the next visit and the read-only record shows by name.
- A stored entry that is no longer offered shows as "<name> (no longer offered)", disabled, and must be chosen again before saving.
- A required field is required in the form as a convenience; the server stays authoritative. Its `RISK_REFERENCE_INVALID` is shown under the named field (`risk.details.<field>`) in words, never as the code.
- **A version without `reference_fields` is unchanged:** no list is read, and free-text details are sent back as they are.

## Not here

SD-D (certificate batch setting), SD-E (renewal settings), make-based rating, and any other setup screen.

## Gate

`tsc --noEmit` clean; `build` and `build:backend` built; Vitest 369 passed (21 files; 14 new: 8 in `vehicleMakes.test.tsx`, 6 in `quotationPages.test.tsx`, and the navigation inventory updated).
