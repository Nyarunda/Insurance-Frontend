# SD-F: SETUP-DRIVEN-1 end-to-end gate

**Scope:** `setup-driven-1-scope.md` §4 (the gate).
**Backend:** `insurance-core` (no changes; Django 6.1.2 at `4b3fb25`).
**Frontend:** branch `sd-f` from `main` at `96e61cf`.

## What SD-F proves

SD-F is test/gate work only. No new domain behaviour, migrations, permissions, APIs or setup architecture.

| # | Journey | Tests |
|---|---------|-------|
| 1 | Vehicle reference setup: ALL-scope creates, branch-scope refused by setup command, make/model pairing, stable codes, no delete, deactivate/reactivate, model/make ownership | 1a–1e |
| 2 | Quotation reference fields: valid accepted, unknown/inactive/wrong-make refused (RISK_REFERENCE_INVALID) | 2a–2b |
| 3 | Full quotation→policy→certificate flow with snapshot proof: rename/deactivate does not rewrite existing snapshots; certificate stays valid | 3a–3c |
| 4 | Legacy product versions (no reference_fields): free-text make/model stored and readable without snapshot | 4 |
| 5 | CSV import: idempotent; bad row refuses whole file (all-or-nothing) | 5a–5b |
| 6 | Isolation/security: tenant B invisible; unauthorized refused | 6a–6b |
| 7 | Certificate batch setting: limit enforced, API-level batch above limit refused (422), at-limit accepted, existing batches unaffected | 7a–7d |
| 8 | Renewal settings: effective-date advance, frozen offer expiry, prepared renewal survives change; draft/publish maker-checker, published immutable | 8a–8d |

## Environment

The SD-F gate needs a disposable environment with:

- Two tenants (alpha with setup, beta empty) for isolation
- A motor product with a published version that declares reference fields (make, model)
- Accounts per profile:
  - `ref-manager@sdf.test`: REFERENCE_DATA_MANAGER (ALL)
  - `quoter@sdf.test`: NEW_BUSINESS_MAKER (BRANCH)
  - `checker@sdf.test`: NEW_BUSINESS_CHECKER (BRANCH) + clients.kyc.verify — KYC verification in journey 3
  - `cert-issuer@sdf.test`: CERTIFICATE_ISSUER (BRANCH) — issues certificates in journey 3
  - `stock-manager@sdf.test`: CERTIFICATE_STOCK_MANAGER (BRANCH)
  - `renewal-maker@sdf.test`: RENEWAL_MAKER (BRANCH) — prepares and offers renewals in journey 8
  - `settings-maker@sdf.test`: policies.renewal_settings.manage (ALL)
  - `settings-publisher@sdf.test`: products.config.publish (ALL) + policies.renewal_settings.manage (ALL)
  - `outsider@sdf.test`: policies.policy.view only (no reference/stock/settings management)
- A legacy motor product version (no reference_fields) for journey 4
- Two bound policies within the current renewal window (for journey 8)
- Certificate type and insurer (for batch setting journey)
- `SDF_ENV_DIR`: directory containing the backend worktree (for `import_vehicle_makes`)

### Environment variables

| Variable | Purpose |
|----------|---------|
| `FI1_FRONTEND_PORT` | The dev server port (default 3000) |
| `SDF_ACCOUNTS` | JSON: `{ email: { host, temporary_password } }` |
| `SDF_FACTS` | JSON: `{ alpha: { domain, branch_id, new_business, legacy_product, certificates, renewable, renewable2 }, beta: { domain } }` |
| `SDF_ENV_DIR` | Directory with `manage.py` for the import command |

## Gate matrix

| Check | Requirement |
|-------|-------------|
| `tsc --noEmit` | Pass |
| `build` | Pass |
| `build:backend` | Pass |
| Vitest | Pass |
| SD-F journey (sdf-gate.spec.ts) | Pass twice, fresh env each |
| CS-E regression | Once |
| NB1-E regression | Once |
| FI1-E regression | Once |
