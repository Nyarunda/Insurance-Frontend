# NB1-D: bind and the New policy guide

**Slice of:** NEW-BUSINESS-1 (`backend/docs/specs/new-business-1-scope.md`).
**Branch:** `nb1-d` from `main` `de9689a` (NB1-C and the customer-form fix merged). Frontend only; no backend change (NB-D1). Independent of `home-metrics`.
**Status:** NB1-D (`97e2217`) reviewed: REQUEST CHANGES (D1, plus one wording correction). NB1-D-R1 makes them; see *NB1-D-R1*.

## Bind

| Where | Backend | Shown to |
| :--- | :--- | :--- |
| **Bind** on a `READY_TO_BIND` proposal (`/proposals/list/UWP…`) | `POST /policies` `{proposal_id, insurer_policy_no?}`, `If-Match` = the proposal's ETag | `policies.policy.bind` |

- **The dialog:**
  - **Shows:** the product and insurer, the cover dates, the agreement and the total premium, all as the proposal holds them.
  - **Takes:** an optional **insurer policy number**, trimmed and sent only when given.
  - **Says:** the policy is made from the proposal exactly as it stands, and the server checks it first.
- **On success:** the new policy opens at `/policies/list/POL…` in the existing policy workspace. That needs `policies.policy.view`; without it, the user returns to the proposals list. The proposal and policy caches are invalidated.
- **The re-checks at bind are shown as the server's answers in words:**
  - **`PROPOSAL_NOT_BINDABLE`:** the server's problems as sentences, such as a KYC no longer verified, a withdrawn product, or an agreement no longer in force. This uses the same component as a refused submit (NB1-C).
  - **`POLICY_INCEPTION_PASSED`:** "The inception date has passed and no backdating was approved. Cancel this proposal and prepare it again with a new inception date."
  - **`PROPOSAL_NOT_READY_TO_BIND`:** "The proposal is no longer ready to bind: it is <status>. It has been reloaded."
  - **412:** the record reloads and the dialog says so. The retry keeps the same body and idempotency key under the refreshed ETag.
- **A bound proposal:** shows **Open the policy** (with `policies.policy.view`).
- **The banner on a ready proposal:** says binding makes it a policy and that the server checks it again first.

## The New policy guide (NB-D2)

| Screen | Address | Backend | Shown to |
| :--- | :--- | :--- | :--- |
| New policy | `/new-policy`, **Sales → New policy** | `GET /quotations?status=ACCEPTED`, `GET /underwriting/proposals?status=READY_TO_BIND` | `quotations.quotation.create` |

- **The steps:** four, in order (**Customer → Quotation → Proposal → Bind**). Each says what is done there, and offers the screens this person's permissions open:
  - Add or Find a customer;
  - New quotation and Quotations;
  - New proposal and Proposals;
  - the Ready to bind list.

  A step with no open screens says so.
- **No state of its own:** the guide keeps nothing. Each step is the record's own screen and the server's own status. The hand-overs stay on the records: **New quotation** on a customer (NB1-A), **Create proposal** on an accepted quotation (NB1-C), **Bind** on a ready proposal (NB1-D).
- **Two server lists for carrying on:**
  - **Accepted quotations:** shown with quotation view and proposal create.
  - **Ready to bind:** shown with proposal view and bind.

  Each row opens the record by its number. A list the person could not act on is not requested.
- **Navigation:** the guide reuses the registry's existing `quote-workspace` screen id; there is no new id.

**Not in this slice:**
- A Home shortcut to the guide. It is left out so this branch stays independent of `home-metrics`, which also edits Home.
- Recording the insurer number on an existing policy (`/policies/{id}/insurer-policy-no`) is outside NB1-D.

## Evidence

| Check | Result |
| :--- | :--- |
| `tsc --noEmit`, `build`, `build:backend` | Pass |
| Vitest | **303/303** (296 + 7 new in `proposalPages.test.tsx`; the navigation registry test lists the guide) |

The 7 new tests:
1. Bind sends `{proposal_id, insurer_policy_no}` with the trimmed number, the proposal's ETag and an idempotency key, then opens `/policies/list/POL0000009`.
2. Without a number, the body is `{proposal_id}` alone. A checker is never offered Bind.
3. The re-checks in words, in turn: the passed inception, the server's problems (KYC), and no longer ready (referred).
4. A stale bind: the dialog says so, and the retry has the same body and key under the refreshed ETag.
5. A bound proposal opens its policy.
6. The guide lists the four steps in order with the screens the permissions open. It requests and shows the accepted quotations and the ready proposals, and a row opens the proposal by number.
7. Without customer create, Add a customer is not offered. Without bind, the ready proposals are never requested. The Ready to bind link stays for a proposal viewer.

The real-backend journey is NB1-E's.

## NB1-D-R1

| Finding | Correction |
| :--- | :--- |
| **D1** (required): the guide offered **Add a customer** with `clients.customer.create` alone and **New quotation** with `quotations.quotation.create` alone. The routes need the list's view permission as well. | Each action now follows its route guard: **Add a customer** needs `clients.customer.view` + `.create`, **New quotation** needs `quotations.quotation.view` + `.create`, and **New proposal** keeps `underwriting.proposal.view` + `.create`. A step whose screens are all closed says so. The guide's own route stays on `quotations.quotation.create`. |
| **Wording**: the bind dialog said the insurer number "can be recorded on the policy later", but the application offers no such action. | "Optional. If omitted, the policy is created without an insurer policy number." |

**R1 evidence:** two new tests.
1. Asymmetric permissions (create without view) offer no **Add a customer** and no **New quotation**, and each step says it is closed. With view and create, both are offered.
2. The bind dialog shows the new wording and never promises a later recording.

| Check | Result |
| :--- | :--- |
| `tsc --noEmit`, `build`, `build:backend` | Pass |
| Vitest | **305/305** (303 + 2 new) |
