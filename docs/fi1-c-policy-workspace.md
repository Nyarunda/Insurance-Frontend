# FI1-C: the policy workspace (FRONTEND-INTEGRATION-1)

**Scope:** `backend/docs/specs/frontend-integration-1-scope.md` §3 FI1-C. The gate reviewer opened it on 2026-10-04, after the FI1-B merge.
**Baselines:**
- Frontend: `fi1-b-baseline` (`0648fca`).
- Backend: frozen at `f4d6182` (record `737cec0`). FI1-C changes no backend code. It reads `GET /policies`, `GET /policies/{id}` and `GET /policies/{id}/versions` as they stand.

## Decisions

| # | Decision |
| :--- | :--- |
| **FI1-C-D1 Policy Directory** | `/policies` (needs `policies.policy.view`; the navigation entry appears only with it) lists `GET /policies`:<ul><li>policy and insurer numbers, customer (name and number), product, insurer, period, annual premium, coverage status;</li><li>loading, empty ("No policies to show"), and error with its Reference.</li></ul>Filtering by coverage status, the search (an exact policy or insurer number, as the backend matches it) and paging (25 a page) are all done by the server. Page and filters live in the URL, so going back from a policy returns to the same list. The mock list's "Underwrite New Policy" and delete actions, and its links to customer, product and broker workspaces, are not part of backend mode. |
| **FI1-C-D2 Workspace content** | `/policies/:policyId` shows `GET /policies/{id}`. Everything about cover comes from `current_version`, the terms in force today, not from the bound fields at the top of the response:<ul><li>**Overview:** lifecycle and coverage status, customer, product, insurer, insurer number, branch, period, the version in force and the latest version, sum insured, annual premium, quotation, proposal, agreement, bound time, the terms (e.g. geographical limit), underwriting details, and the cancellation when there is one.</li><li>**Risk schedule:** rated factors, risk details, identifiers, risk items.</li><li>**Coverage:** benefits with their section, limit and limit wording, whether each is included or an optional benefit held; cover sections; exclusions.</li><li>**Premium and levies:** basic premium, levies (rate and amount) and total, with the rating date. Commission appears only when the backend includes it (it does so for users who may see commission).</li><li>**Versions:** `GET /policies/{id}/versions`, loaded only when the tab is opened. It shows source, effective from and to, expiry, sum insured and annual premium, and marks the version in force and any terminated version.</li></ul>The rating step trace is not shown in FI1-C. |
| **FI1-C-D3 Sections without a backend** | Claims, billing, documents, accounting and the audit timeline have no backend, so backend mode leaves them out. They are never filled from mock data. Endorsements arrive with FI1-D. |
| **FI1-C-D4 The policy ETag** | Taken from the `ETag` response header only, and kept with the policy query for FI1-D's `POST /policies/{id}/endorsements` (If-Match). It is never rebuilt on the client: without the header the ETag is empty, so FI1-D has nothing to send. The detail is not cached between visits (`staleTime 0`). |
| **FI1-C-D5 Visibility** | The backend decides. A 404 (no policy, or one out of the user's scope) shows "Not found or not available to you" with the Reference, and no record. Other errors show the server's message and Reference. The routes check `policies.policy.view` again, as the navigation does. |
| **FI1-C-D6 No identifiers on screen** | The FI1-B display rules apply. No UUID is rendered: policy, customer, product, insurer, branch, quotation, proposal, agreement and endorsement IDs, `bound_by` and `product_version_id` are not shown. Facts whose key ends in `_id` or `_hash`, or whose value is a UUID, are left out. Codes read as words. Benefits and sections appear by name. |

## Evidence (2026-10-04)

| Check | Result |
| :--- | :--- |
| Lint (tsc) | PASS |
| Builds | PASS, backend and mock. Backend bundle: 0 mock markers; mock bundle: no backend client |
| Vitest | 153 passed, 0 failed (11 files), on two consecutive runs. FI1-C adds `policyPages.test.tsx` (18 component tests against a fake backend). |
| Mode isolation | `modeIsolation.test.ts` passes: the new screens do not reach mock data. |

The component tests cover:
- **Directory:**
  - the listing from `GET /policies`, in words and with no UUID;
  - the empty state, and an error with its Reference and no table;
  - the server-side next page, coverage filter and search, with the filter kept in the URL;
  - opening a policy from its row;
  - gating on `policies.policy.view`: no entry, no request, the permission state.
- **Workspace:**
  - the overview of the version in force with no UUID;
  - the header ETag kept, and null when the header is absent;
  - only the five backed tabs offered (no claims, billing, documents, accounting, audit or endorsements);
  - the risk schedule without `_id` facts;
  - benefits and limits;
  - levies, with commission only when sent;
  - versions loaded from `/versions` only when the tab opens, with the version in force marked;
  - a 404 with Reference `corr-404` and no record, and a 403 with its Reference;
  - a cancelled policy.

**Left for the FI1-E gate:** the real-backend Playwright journey, which shows the policy's new version and limit after an approved endorsement.

## FI1-C-R1: Back returns to the same list (independent review, 2026-10-04)

The review found that FI1-C-D1's promise was not kept by the workspace's own Back action. The list kept its filters, search and page in the URL, but "Back to Policy Directory" went to the plain `/policies`.

Fixed in one frontend-only commit:
- Opening a policy from the directory carries the list's location (`/policies` plus its query) in router state (`policies/returnTo.ts`).
- Back navigates there. A tab change in the workspace replaces the URL and keeps that state, so Back still knows the list afterwards.
- A policy opened directly or from a bookmark has no such state, and Back goes to `/policies`.
- Only the directory itself, with an optional query, is accepted as a return location. Another path, a scheme-relative or absolute URL, a fragment or a backslash all fall back to `/policies`.

**Tests:**
- Start on `/policies?coverage=ACTIVE&q=POL0000001&page=2`, open the policy, change tab, then press Back. The exact pathname and search are restored. With the cached list dropped, the one new request is `page=2&page_size=25&coverage_status=ACTIVE&q=POL0000001`, and the page, filter and search field show the same.
- A policy opened directly returns to `/policies`.
- The return location is validated.

Run against the unfixed pages, the restore test fails. It also fails when only the tab change's state carry-over is removed. With the fix, 156/156 pass on two runs. Lint and both builds pass.
