# ADMIN-OPS-GATE-1 — frontend contract and review note

**Candidate:** `fix/admin-ops-gate-20261013`, based on `feat/workflow-only-approvals`.  
**Status:** pending review and fresh full test gate; not yet merged to `main`.

The administration pages are **thin clients** of authoritative backend query/command services. The browser does not infer tenant scope, approval eligibility, or audit disclosure rights. The base workflow/API contracts remain authoritative; see backend `docs/reviews/admin-ops-gate-1-2026-10-13.md`.

| Navigation | Permission to display | Server endpoints | UI behavior |
| --- | --- | --- | --- |
| `/admin/branches/list` | `admin.users.view` | `GET /admin/branch-hierarchy`, `POST /admin/regions`, `PATCH /admin/regions/:id`, `POST /admin/branches`, `PATCH /admin/branches/:id` | Read list; write controls require `admin.users.manage`. Immutable codes; strong ETag on updates; rehome active members and branch/role grants before deactivation. |
| `/admin/delegations/list` | `admin.delegation.view` | `GET /workflows/delegations`, `GET /workflows/delegations/options`, `POST /workflows/delegations`, `POST /workflows/delegations/:id/revoke` | Server-paged list (`page`, `page_size`, `count`); creation/revocation requires `admin.delegation.manage`. Never approve or reject business records here; use My Work Queue and workflow action API. |
| `/admin/audit-logs/list` and `/admin/audit-logs/list/:eventId` | `admin.audit.view` | `GET /admin/audit-logs`, `GET /admin/audit-logs/:id` | Server-paged list, with searching resetting to page 1. List and details display **metadata only**, not raw `before_state` or `after_state` contents. No write actions. |

All API paths above are relative to `/api/v1`. Server-side ALL scope is required for tenant-wide administration; hiding a button is only a usability aid and not authorization. Commands use the existing idempotency, correlation and concurrency client helpers. A 412 is a re-fetch/reconcile signal, not permission to force an update.

## Security regression

`src/backend/operations/adminOperations.test.tsx` now asserts that audit details never render raw snapshots, even if an upstream mistakenly includes them in the response. The backend independently omits the fields. The backend's test suite checks canary secrecy, scoped permission denial and cross-tenant 404s.

## Deferred product/architecture rulings

- The current hierarchy is region → branch plus head-office flag. Do **not** depict multi-level parent-child relationships or silently add them.
- A full business-domain branch retirement gate (outstanding policies, stock, certificates, open approval instances) requires separate domain decisions; only the known access dependencies are covered now.
- Raw forensic audit inspection needs a separate documented permission and safe projection.
- The parallel `feat/admin-observability-surfaces` branch contains other desks and may not be merged wholesale into this work.
- Backend compatibility routes that reject direct approvals are not approval bypasses; API removal requires a deprecation decision.

## Candidate test gate (not yet executed)

```bash
npm ci
npm run lint
npm run test -- src/backend/operations/adminOperations.test.tsx
npm run test
npm run build
npm run build:backend
```

Do not record PASS until those commands have run on the candidate commit and matching backend migrations.
