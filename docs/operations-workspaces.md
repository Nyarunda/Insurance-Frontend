# Connected Users, Billing and Integrations

Implemented 11 October 2026 in backend mode (`VITE_DATA_SOURCE=backend`). These
screens use the Django APIs, not `recordsStore` or demo permissions.

## Delivered

- Users: server-paginated email/status search, tenant membership details, invitations,
  suspension/reactivation/revocation, and a record workspace with separate Roles,
  Branch access, Restrictions and Approvals tabs.
- User permissions: branch access, role assignments, protected-role assignment/removal
  proposals, permission restrictions, and second-administrator decisions.
- Roles: tenant role creation, current permission checkboxes, proposed permission changes,
  and approval history. Ticking a permission proposes access; it does not silently bypass approval.
- Invitations: private single-use link creation and new/existing account acceptance.
  Secrets are held in component memory, removed from the address bar, and not cached.
- Billing: account creation/editing, collection agreement settings, authority recording
  and independent approval, receipt allocations, and second-user full reversals.
- Receipt enquiry: server-side number/customer/reference search, inclusive payment-date
  filters, pagination, and read-only journal detail with exact debit/credit totals.
- Role naming: readable module/action labels, optional technical codes, and role search.
  Disposable demo fixture roles receive descriptive names based on their actual rights.
  IDs, grants, assignments and approval records are not changed by that maintenance.
- Premium collections: posting-date report with day/branch/payment-method grouping,
  branch/currency filters, separate currency totals, gross/reversal/net amounts and
  server pagination. CSV and print/PDF-via-browser export the current report page,
  explicitly marked as a page, with full filtered totals. No cross-currency addition.
- Receipt printing: refreshed receipt/reversal details and policy allocations in a
  print layout, without internal journal accounts or application navigation.
- Tenant integration setup: provider-specific add/edit cards for Business Central,
  SMTP email and HTTP APIs (core banking, SMS or payments). Search, service/status
  filters, pagination, enable/disable, credential replacement/clearing and explicit
  stale-edit reload are connected to the backend. No simulated connectivity result.

Routes start at `/admin/users/list`, `/admin/roles/list`, `/billing/receipts/list`,
`/billing/accounts/list`, `/billing/agreements/list`, `/billing/reports/collections`,
and `/admin/integrations/list`.

## Concurrency and Isolation

- APIs enforce tenant-host identity, effective permissions and applicable branch reach.
  The UI is not the security boundary. Unauthorized receipt/journal detail returns 404.
- Query keys contain tenant, user and branch. Forms reset on context/record changes;
  a completed request from an unmounted form cannot navigate the new workspace.
- Mutations retain their idempotency key across network retries and guard duplicate
  submission. Pending state is form-local; list refreshes do not block navigation.
- Billing account and agreement forms send the version read in `If-Match`. Stale
  edits return 412 without overwriting another person's changes. Legacy API clients
  that omit this header remain supported; their writes are not optimistic-lock protected.
- Receipt amounts use decimal strings and integer cents, not floating-point arithmetic.
  Reversals retain the original records and post compensating journal lines.

## Local Test Environment

The optional helper `backend/scripts/run_operations_demo.py` uses release-gate
fixtures in a **new disposable database**, with two tenant administrators and a
separate second tenant. It never resets an existing stack. Do not use it for production.
It binds HTTP to `127.0.0.1:8001`, uses sandbox OTP and a local threaded development server.

From `backend`, start a separate loopback database stack (the original port can be
reserved by Windows):

```powershell
$env:GATE_POSTGRES_HOST_PORT='55483'
$env:GATE_PGBOUNCER_HOST_PORT='56483'
docker compose -p insurance-operations-gate -f docker/wf1-gate.compose.yml up -d --wait
python scripts/run_operations_demo.py
```

Use `--reuse` to resume the last helper-created database after restarting the server.
Use `--upgrade` to apply current migrations to that saved disposable database and
give only its two demo administrators the Integration Administrator fixture role.
Restart the demo backend with `--reuse` after upgrading. This is not a production
permission provisioning command; tenant access in production follows approved roles.
Use `--refresh-labels` to repair only generated role names in that saved disposable
database without starting a second server. Customer-authored role names are preserved.
The database uses tmpfs and is lost if its container is stopped. After that, run without
`--reuse` for a new disposable dataset. Credentials are generated into ignored
`frontend/secrets/operations-accounts.json`; never commit this file.

From `frontend`:

```powershell
$env:BACKEND_ORIGIN='http://127.0.0.1:8001'
node node_modules/vite/bin/vite.js --mode backend --host 127.0.0.1 --port 3001 --strictPort
```

Open `http://operations.localhost:3001`; the other tenant uses
`http://operations-other.localhost:3001`. The sign-in page displays the sandbox OTP.

## Verification

```powershell
# backend
$env:GATE_PG_PORT='55483'
$env:GATE_PGBOUNCER_PORT='56483'
python -m pytest tests/tua tests/billing -q --tb=short -p no:cacheprovider
# frontend
node node_modules/vitest/vitest.mjs run --maxWorkers=2
npm run lint
npm run build:backend
$env:OPERATIONS_UI_URL='http://operations.localhost:3001'
node node_modules/@playwright/test/cli.js test e2e/operations-ui.spec.ts
$env:OPERATIONS_ACCOUNTS="$PWD/secrets/operations-accounts.json"
node node_modules/@playwright/test/cli.js test e2e/operations-live.spec.ts
```

The UI layout test uses explicit HTTP fixtures at desktop/mobile sizes. The live
journey uses real sign-in/OTP, permission proposal/approval, receipt posting and reversal.
It also tests integration creation, blank-secret preservation, two-administrator edit
conflicts, explicit reload and credential clearing against the real tenant API.
Backend tests include tenant/branch isolation, pagination bounds and a simultaneous
two-editor race. These are correctness checks, **not a high-concurrency load benchmark**.

## Still Missing

- Full name and named department editing require additions to the identity/profile
  contract; the connected user list currently uses the actual email and branch fields.
- Full general ledger/period close, debit/credit notes, statements/PDF exports, insurer
  settlements, refunds, commission accounting and payment reconciliation are not delivered
  by the receipt journal view. Receipt date filtering is not an account statement.
- Selecting M-Pesa records a receipt method; it does not initiate or verify a provider payment.
- Claims, reinsurance, production messaging/OTP delivery, EDMS storage and external
  integrations remain separate milestones from the requirements review.
- Production TLS, deployment sizing, monitoring and load testing still require verification.
- The new pages are lazy-loaded; the pre-existing backend entry still emits a chunk-size warning.

## Report Boundaries

Collections use journal posting dates, not original payment dates (a reversal retains
the original payment date). Original receipts remain in gross collections even when
reversed; the compensating posting subtracts on its own posting date. OWN-scoped
readers see reversals of their own receipts, regardless of who performed the reversal.
The report aggregates under one database snapshot, uses no write locks, and limits
date ranges to 366 days and pages to 100 groups. It is not a load-test certification.

This delivers the recorded-premium-collection part of Reports R15 and part of G7/R4.
It does not validate bank/M-Pesa settlement, produce debtor ageing, account balances,
insurer statements, a trial balance, or the full financial reporting catalogue.
Browser Save as PDF is not a server-generated, signed or insurer-approved document.

## Integration Setup Boundaries

Requires tenant-wide `admin.integrations.manage`. Each tenant owns separate connection
records; guessed IDs from another tenant return 404. Credentials are authenticated-
encrypted with tenant-and-record-bound associated data and are never returned by the
API or copied into the audit log. Production keys must be provisioned and rotated
securely; the disposable demo uses public test keys and must never hold real secrets.

`POST /api/v1/admin/integrations` creates setup. `GET /api/v1/admin/integrations`
accepts `q`, `category`, `status` (ENABLED/DISABLED) and `page`. Catalog and record
reads use `/catalog` and `/{id}`. `PUT /{id}` requires the last `etag` in `If-Match`
and an idempotency key. Missing versions return 428, stale versions 412. Reload
is explicit and discards the local draft; there is no silent last-writer-wins save.
Blank secrets preserve the current credential; clearing, switching providers, or
selecting HTTP authentication NONE removes it. Credential replacement is write-only.

Setup enabled is an administrative preference, not proof of a working connection.
All connections remain NOT_TESTED. This supplies configuration foundations for the
integration requirements, not completed Integration S1-S4. Business Central OAuth,
entity/field mappings, scheduled sync, SMTP/OTP delivery, SMS/payment adapters,
callbacks, retries and reconciliation remain unimplemented. Nothing here contacts
providers. Before adding outbound HTTP, implement tenant-aware egress controls,
DNS/address checks (including redirects/rebinding), timeouts and background work;
the current URL syntax checks alone are not a complete SSRF boundary.
