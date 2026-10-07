# CS-B: find a certificate

**Slice of:** CERTIFICATES-SURFACE-1 (`backend/docs/specs/certificates-surface-1-scope.md`, CS-D2). CS-A closed and merged (`main` `3790d26`).
**Branch:** `cs-b` from `main` `3790d26`. Frontend only; no certificate API or domain change, no new search field.
**Status:** for review.

## Where

| Screen | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| **Certificates** (Policies group in the sidebar) | `/certificates/list` (`/certificates` moves there) | `GET /certificates?vehicle=` or `?serial_no=` | `certificates.cert.view` |
| A certificate | `/certificates/list/<serial>` | `GET /certificates?serial_no=<serial>` (exact), then `GET /certificates/{id}` | the same |

The route checks the permission again; the backend checks every call. The sidebar highlights Certificates on the list and on a record.

## Find

- **Search by** Vehicle (a registration or chassis number) or Serial number. One term at a time; the server matches and normalises (`kda-123a` finds `KDA 123A`).
- The search lives in the URL (`?vehicle=` or `?serial=`), so a result can be shared and Back returns to it.
- **Nothing is fetched until there is a term:** the page says "Search for a certificate". The backend's own rules apply: issued certificates only (never blank stock), on policies the user may see, at most 100.
- **Results:** serial and type, what it certifies (registration, or shipment and voyage), insured and policy number, validity, status. No IDs on screen. A row opens the record by its serial.
- **No match:** "No certificate matches this search", with the reminder that only issued certificates on policies the user can see are found.

## The record

- **Resolved by serial** through the exact `serial_no` search, so a serial outside the user's scope is "Not found or not available to you", exactly as an ID would be.
- **Shown:** status, type, category and insurer code; policy and the version it names; validity; insured; batch; the vehicle (registration, chassis, engine) or the shipment; issued, marked as printed, replaces / replaced by (each opens that record), cancelled or spoilt with the reason.
- **Derived state from the server:** the cover warning when the policy no longer covers the whole validity, and a pending cancellation request with who it waits for.
- **Read here; acted on the policy.** Issue, print, replace, cancel and spoil stay on the policy's Certificates tab (CS-A). **Open on the policy** goes to `/policies/list/<POL>?tab=certificates&certificate=<serial>`, for users with `policies.policy.view`; a stock manager (cert.view without policies) sees the record without it.

## Not in CS-B

Blank-stock lookup, stock management (CS-C), movement history and new search fields (status and others) are out, as ruled.

## Tests

`src/backend/pages/certificateFind.test.tsx` (11): the nav item for `cert.view` only (issuer, stock manager; not a policy-only user); `/certificates` → the list, which fetches nothing before a search; vehicle search on the server, kept in the URL, results in words without IDs, a row opens `/certificates/list/<serial>`; serial search; no match; the record by serial in words, the replacement link, Back to the originating search; Open on the policy at this certificate; no policy link without `policies.policy.view`; an unseen serial is not found; the cover warning and pending request; the sidebar highlights Certificates. `navigation.test.ts`: the registry gains Certificates, and its list and records resolve to it.

## CS-POLISH (product owner, 2026-10-07, after the pilot preview)

- **Recent certificates before a search.** With no search term, the page asks `GET /certificates` with no filter, which returns the latest issued certificates the user may see (the server's own scope and cap), titled "Recent certificates"; a search narrows them as before ("Search results"). With none issued: "No certificates have been issued yet". This reverses CS-B's "nothing fetched before a term", on the product owner's instruction; still issued certificates only, never blank stock, and no new search field.
