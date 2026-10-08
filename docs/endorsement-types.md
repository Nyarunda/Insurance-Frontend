# ENDORSEMENT-TYPES: every endorsement the server can price, including policy cancellation

**Branch:** `endorsement-types`, stacked on `rs-b` (it reuses RS-B's amendment fields), so it merges after RS-B. **Backend:** ENDORSEMENTS-1 types, already on `insurance-core`. Frontend only.

## What changes

New endorsement now asks **What changes**:

| Type | The form asks | Sent as `changes` |
| :--- | :--- | :--- |
| Change a limit (FI1-D, unchanged) | benefit, new limit | `benefit`, `limit_amount` |
| Change the sum insured | the new sum insured (current shown) | `sum_insured` |
| Change the cover | rating details and optional cover, from the tariff the policy was priced on | `factors`, `add_benefits`, `remove_benefits` (only what differs) |
| Change the geographical limit | the new limit (current shown) | `geographical_limit` |
| Change the policy period | the new expiry date (current shown) | `expiry_date` |
| Cancel the policy | nothing; "cover ends the day before the effective date" | `{}` |

- **Cancel the policy** is offered only with `policies.policy.cancel` (the server requires it too).
- **Adding or removing a risk item** is never offered: the server refuses it (`ENDORSEMENT_RATING_UNSUPPORTED`; items cannot be priced yet).
- Every type re-rates on the server; whether it needs a checker, and the premium change, are the server's.
- A draft of any of these types can be **edited**; prepare-again remains change-limit only.
- Numbers accept grouping and are sent as plain digits; refusals are shown under the field the server names.

## Gate

`tsc --noEmit` clean; `build` and `build:backend` built; Vitest 403 passed (25 files; 7 new in `endorsementTypes.test.tsx`; the 47 endorsement tests unchanged).
