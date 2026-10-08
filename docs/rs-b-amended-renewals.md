# RS-B: amended renewals

**Slice of:** RENEWALS-SURFACE-1 (scope `860d21b`, RS-B, RS-D4). **Branch:** `rs-b` from `main` `c810795` (RS-A and RS-C merged). **Backend:** RENEWALS-1 `AMENDED` contract (R1-D4, R1-D7), already on `insurance-core`. Frontend only.

## Why

Renewal is when most real changes happen: the vehicle's value falls, optional cover is added or dropped, limits change. "As is" alone does not serve most renewals.

## Where

- **Prepare renewal** offers **As is** or **Amended**. Amended shows the amendment fields; the server validates them against the product version in force when the new period starts, which the form reads (the start date chosen, or the day after expiry).
- On a **Draft or Priced** renewal: **Amend** (as is) or **Change amendments** (amended), which returns it to draft; **Back to as is** clears them. The record lists the amendments asked, in words.

## The amendments (R1-D4)

| Field | Sent as |
| :--- | :--- |
| Sum insured (when the product rates on it) | `sum_insured` |
| Other rating factors (number, choice, yes/no, from the product) | `factors` |
| Optional cover ticked or unticked | `add_benefits`, `remove_benefits` |
| Limits on the benefits the renewed cover holds | `limits` |
| Geographical limit | `geographical_limit` |

The fields start from the policy's terms in force (or the amendments already asked). **Only what differs is sent**; an amended renewal that changes nothing is refused before sending. Numbers accept grouping (`2,000,000`) and are sent as plain digits. Risk items are never offered (the server cannot price them at renewal).

## Rules the screen keeps

- **No price is typed.** The premium always comes from the tariff applied to the amended risk; increases in value or cover go to the checker by the server's own rule (R1-D7), and the reasons show on the renewal once priced (RS-A).
- `RENEWAL_CHANGE_INVALID` is shown under the field the server names, in words.
- The amendments go with the policy's ETag on prepare, and the renewal's ETag on change; the idempotency lifecycle is RS-A's.

## Gate

`tsc --noEmit` clean; `build` and `build:backend` built; Vitest 396 passed (24 files; 4 new in `renewalAmend.test.tsx`).
