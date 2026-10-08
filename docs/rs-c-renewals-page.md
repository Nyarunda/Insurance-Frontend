# RS-C: the Renewals page

**Slice of:** RENEWALS-SURFACE-1 (scope `860d21b`, RS-C, RS-D3). **Branch:** `rs-c` from `main` `d833751` (RS-A merged). **Backend:** `insurance-core` `be8696c` (RS-P0's reads). Frontend only.

## Where

Policies → **Renewals** (`/renewals/list`), for `policies.policy.view`: view-only users see what their policy reach allows; the server decides every list, the window and every filter.

## Due for renewal (default tab)

`GET /policies?renewal_due=true&page=&page_size=25`: the policies a renewal may be prepared for today, soonest expiry first (the RS-P0 rule `create` also applies). A renewal maker (`policies.renewal.create`) gets **Prepare renewal** on each row, which opens the RS-A prepare dialog on that policy; anyone else opens the policy on its Renewals tab. Nothing about the window is computed here.

## Renewals tab

`GET /renewals?status=&page=&page_size=25`: renewals across policies, newest first, with a status filter on the **effective** status (All, Draft, Priced, Offered, Offer expired, Accepted, Declined, Renewed, Withdrawn). A row opens the RS-A record on its policy (`/policies/list/<POL>/renewals/<REN>`); there is no second record screen. The tab is named "Renewals" rather than "In progress" because, unfiltered, it lists every status.

## A renewal by number

`/renewals/list/<REN>` resolves the number through `GET /renewals?renewal_no=` (exact, within reach) and opens the same RS-A record; a number the user cannot see is "not found". Addresses use numbers only. Tab, filter and page live in the URL.

## Not here

Amended renewals (RS-B) and the journey gate (RS-E).

## Gate

`tsc --noEmit` clean; `build` and `build:backend` built; Vitest 392 passed (23 files; 9 new in `renewalsList.test.tsx`; the navigation inventory updated for Renewals).
