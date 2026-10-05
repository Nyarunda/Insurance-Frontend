# DESIGN-1: the Studio theme

**Origin:** RUP1 finding F-10 (OBSERVATION): the operator found the design "not rich or professional enough". Before the RUP1 human follow-up, the product owner asked for the frontend to follow the Studio Admin template (shadcn/ui) closely. This **replaces the earlier institutional design direction** (navy shell, 3px/6px corners, no pills), by the product owner's choice on 2026-10-05.
**Status:** proposed slice on branch `design-1` (from `main` `c907f54`), for the gate reviewer. The pilot candidate stays `c907f54` until this is accepted.

## What changed

Presentation only. No route, query, permission, decision rule or text that a test or participant relies on has changed, apart from the noted additions to Home.

| Area | Change |
| :--- | :--- |
| **Tokens** (`src/index.css`, `index.html`) | Neutral palette with a near-black primary; Geist type with Inter as fallback; corner radii 6/8/10/14px; soft card shadow. Tailwind's blue-like families resolve to the neutral scale. Green, amber and red still mean business state only. Every existing token and class name is kept, so screens follow without edits. |
| **Primitives** (`src/components/horizon.tsx`) | Pill status badges in normal case; card headers and section titles in the template's type scale; segmented tabs; rounded alerts with a stable `data-slot="alert"` hook; page titles at 24px. |
| **Shell** (`Sidebar`, `GlobalTopBar`, `ShellBreadcrumb`, `BackendShell`) | A full-height light sidebar: product mark with the tenant, labelled groups of icon items, a collapse control, and the signed-in user at the foot. Collapsed, it is an icon rail; on phones, a drawer. A light header holds the sidebar toggle, tenant, branch, help and an avatar account menu. Breadcrumbs sit inside the page. Content is centred, up to 1536px wide. |
| **Home** | Metric cards from real data only: tasks waiting (with `workflow.task.view`), policies visible (with `policies.policy.view`), branch context, signed-in user. Also the five latest tasks in the queue, each with its change summary, and the access summary as before. Nothing is invented. |
| **Approval page** | A "What is being approved" card with the **requested change** as a highlighted panel, headed by the change in words (for example "Windscreen: KES 50,000.00 → KES 70,000.00"). Beside it, a Status card. History is its own card. The RUP1-F1 facts and their order are unchanged. |
| **New endorsement as a dialog** (product owner's request, 2026-10-05) | `…/endorsements/new` opens as a dialog over the policy's Endorsements tab, which is inert behind it. The dialog keeps its own address, so links, refresh and browser Back still work. It has an **Expand / Restore size** toggle, remembered per browser. Its contents: a policy context strip (policy, customer, version, period); the same fields, checks, ETag and 412 recovery as before; a reason counter; and a **preview of what the checker will see** (for example "Windscreen: KES 50,000.00 → KES 100,000.00"). A backdrop click does not discard typed values; Escape and the close button ("Back to the policy") return to the policy. `DialogFrame` gains optional `size`, `expandable`, `icon` and `closeLabel`; the existing dialogs are unchanged. |
| **Amounts with thousands separators** (RUP1 F-8, product owner's request) | The new limit accepts "55,000" and "1,250,000.50" (commas only between groups of three). The field keeps what was typed; the server receives plain digits ("55000"). A refused amount now says why: not a number, misplaced commas, more than two decimals, or zero. The earlier message ("must be positive") was misleading for "55,000". Parsing is in `endorsements/amount.ts`, with its own tests. |
| **Sign-in** | The template's split layout: the form on a clean column, and a dark panel with the product's purpose. The earlier panel's invented figures ("12 active modules", "24/7") were removed. |

**Kept on purpose:**
- the 13px floor for body text in backend mode (FI1-E-R1);
- every accessible name used by tests and e2e: `Account menu`, `Sign out`, `Branch: …`, `Primary navigation`, `aria-current`, `tenant-name`, `branch-context`;
- density modes;
- the remembered sidebar state.

**Not taken from the template:** theme presets, font switcher, dark mode, decorative charts, and the template's sample metrics. Dark mode can be a later slice, because the tokens already allow it.

## Test changes

- Two page tests and one FI1-E journey step found the alert panel by its old CSS class (`rounded-[3px]`). They now use the alert's `data-slot="alert"` hook. The assertions are unchanged. The first FI1-E run on the new theme failed at exactly that step (test 7: the selector found no element) and passed once the selector was changed.
- `usePolicies` takes an optional `enabled` flag, so Home asks for policies only when the user may see them.

## Evidence (2026-10-05)

| Check | Result |
| :--- | :--- |
| Lint (`tsc --noEmit`), `build`, `build:backend` | Pass |
| Vitest | 202/202 for the theme. With the endorsement dialog: **203/203**, including a new test: it opens as a named dialog with the preview, expands and restores, and survives a backdrop click once something is typed, while Escape returns to the policy. With F-8: **219/219**, with 15 amount cases plus a form test that "55,000" is accepted, previewed as KES 55,000.00 and sent as "55000", and that "55,00" is refused with the grouping message. The zero case now expects "The new limit must be more than zero." |
| FI1-E real-backend journey, backend `e85aa1b`, each run on a freshly built environment | Theme (`b5681be`): **12/12, twice**, after the selector fix (before it: 6 passed, test 7 failed on the class selector, 5 did not run, in both runs). With the endorsement dialog: **not yet run**. The journey creates endorsements and meets a 412 through this form, so it must pass before review. |
| FI1-A suite | Not rerun: no auth logic changed, only the sign-in layout's presentation |
| Visual review | 15 screens captured from a disposable FI1-E environment (sign-in, Home, Policy Directory, policy, new endorsement, My Work, approval page, both dialogs, phone width). Not committed. Teardown: stack down with its volumes, processes stopped, worktree removed, secrets deleted, `test-results/` deleted. |
