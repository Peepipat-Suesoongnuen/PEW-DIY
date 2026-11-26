# Lab 7 — Software Maintenance Metrics and Release Readiness

> **Course:** CPE334 — Software Engineering · Lab 7: Software maintenance metrics and release readiness (Due `2026-11-29 23:59` ICT)
>
> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System · **Tracking Issue:** [#117](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/117)
>
> **Repository URL:** `https://github.com/Peepipat-Suesoongnuen/PEW-DIY`
>
> **Public Demo URL:** `https://pewdiy-qtz73ahnlq-as.a.run.app` (Sprint 1 baseline `pewdiy-00008-mfk`; pending Lab 7 release deployment update)
>
> **Team / Students (for final PDF sign-off):** `[STUDENT_1_NAME / ID]` · `[STUDENT_2_NAME / ID]`

---

## Contents & Evidence Map

| Section | Topic | Evidence IDs | Status |
| --- | --- | --- | --- |
| [Version Traceability](#version-traceability-lab-7-42) | Sprint 1 baseline, contract rev, maintenance change, staging & release revisions | `EV-L7-A1`, `EV-L7-A2` | Populated (release SHA pending Task 3) |
| [Part A](#part-a--change-impact-and-updated-contract) | Change request spec, impact traceability table, old/new contract excerpts & PR `#98` review | `EV-L7-A1`, `EV-L7-A2` | Complete |
| [Part B](#part-b--maintenance-implementation-tdd-and-regression) | Maintenance implementation diff, TDD RED → GREEN, and regression verification | `EV-L7-B1`–`EV-L7-B4` | Complete (release PR & GCP deploy pending) |
| [Part C](#part-c--software-maintenance-and-quality-metrics) | Maintenance metrics, review/CI turnaround, defect & change density | `EV-L7-C1` | Placeholder (Task 4/5) |
| [Part D](#part-d--release-readiness-and-deployment-verification) | Release PR, GCP Cloud Run deploy, smoke checks, and Go/No-Go checklist | `EV-L7-B2`, `EV-L7-D1` | Placeholder (Task 3/5) |

---

## Version Traceability (Lab 7 §4.2)

### Primary Baseline & Maintenance Revisions

| Milestone | Branch / Env | Commit SHA (Full) | PR / Issue | Timestamp (UTC) & Peer Review | Notes |
| --- | --- | --- | --- | --- | --- |
| **Accepted Sprint 1 Baseline (App Binary)** | `main` / Cloud Run `pewdiy-00008-mfk` & `pewdiy-uat-00003-8c5` | `b03c9043533a6dc1f8a6fb958983ddb0da9529c7` | PR `#79` | `2026-11-19T16:27:35Z` (deployed `16:51:03Z`) | Deployed Sprint 1 `F-01`–`F-05` image (`@sha256:e636ea0c...`) tested in Lab 6 |
| **Accepted Sprint 1 Baseline (Docs on `main`)** | `main` (post-Lab 6 docs merge) | `d079bc65182b973c962a1be6efa60eca0b421c52` | PR `#96` | `2026-11-23T10:19:27Z`; `L0u1sss` `APPROVED` `2026-11-23T10:16:58Z` (`d6d505f`) | Reconciled Lab 6 UAT handoff & findings (`Finding 05`, `UAT-07 UX Note`) |
| **Pre-Change Contract Revision** | `sprint/2-staging` | `7e111101a5fd4c0c1a54b62d75063b37901db13c` | PR `#98` / Issue `#97` | `2026-11-24T09:54:41Z`; `L0u1sss` 9× `CHANGES_REQUESTED` + `APPROVED` `2026-11-24T09:54:02Z` (`92710ee`) | Updated SRS rev 6, System SDS rev 7, and Sprint 2/3 feature contracts **before** code changes |
| **Maintenance Change Implementation** | `sprint/2-staging` | `8b493796a676342b2efce82c9ed7e8414abdbe80` | PR `#109` / Issue `#103` | `2026-11-24T18:12:02Z` (head `0d9fd3d`); `L0u1sss` `APPROVED` `2026-11-24T18:11:29Z` | Implements `A-11` approval workflow, bundles, 1–14d duration, `Finding 05`, `UAT-07` hints |
| **Current Staging Integration** | `sprint/2-staging` | `d4b11422c4f699cbb1556bc2a611917d42c20535` | PR `#116` / Issue `#115` | `2026-11-26T09:03:04Z`; `L0u1sss` `APPROVED` `2026-11-26T09:02:27Z` (`76632df`) | Latest integrated staging commit (`CI & Docker Build` run `45788402551` passed) |
| **Release `main` & GCP Deployed Revision** | `main` / Cloud Run `pewdiy` | `[PENDING_RELEASE_PR_AND_GCP_DEPLOY]` | `[PENDING]` | `[PENDING]` | To be populated after Task 3 release promotion & Cloud Run deployment |

### Intervening Sprint 2 / 3 Development on `sprint/2-staging`

All intervening work merged into `sprint/2-staging` between the pre-change contract baseline (`7e11110`) and current staging (`d4b1142`) was independently reviewed by `L0u1sss`:

| PR | Issue | Scope Summary | Merge Commit (Short / Full) | Merged At (UTC) | Reviewer Outcome (`L0u1sss`) |
| --- | --- | --- | --- | --- | --- |
| `#107` | `#101` | `ARCH-01` Phase P4 legacy HTML retirement & shared UI primitives | `ad60778` / `ad60778d37ff78bf9f97c1dc97db55311befaea9` | `2026-11-24T12:43:12Z` | `CHANGES_REQUESTED` (`11:45:30Z`), `APPROVED` (`12:33:32Z`) |
| `#108` | `#102` | `F-08` catalog CRUD, images, retire, search/filter/sort, and `UAT-07` UI | `c0a13ad` / `c0a13ad41d05126dd60f0f6be6be9f32a6cbe777` | `2026-11-24T15:16:20Z` | `CHANGES_REQUESTED` (`14:12:36Z`), `APPROVED` (`15:12:00Z`) |
| `#110` | `#104` | `F-06` two-step return, `F-08` loan views/history, printable slip, `Finding 05` loans UI | `6a5f5ff` / `6a5f5ff84f16100762a44122d047dbd763f23e73` | `2026-11-25T09:50:14Z` | `CHANGES_REQUESTED` (`09:07:25Z`), `APPROVED` (`09:49:52Z`) |
| `#111` | `#105` | `F-07` overdue derivation (`Asia/Bangkok`) & persistent in-app notifications | `50a6b9d` / `50a6b9d54889a1c77897f5b278f40f33a1f658c6` | `2026-11-25T10:22:56Z` | `APPROVED` (`10:22:44Z`) |
| `#112` | `#106` | `F-09` inventory reporting summary & Sprint 2 verification evidence sync | `9e8a5e3` / `9e8a5e3edd6b41d64dca77a561e6bc61ba79fb77` | `2026-11-25T11:53:48Z` | `CHANGES_REQUESTED` (`10:59:18Z`), `APPROVED` (`11:42:54Z`) |
| `#114` | `#113` | Zero-scroll blended bundle tables, universal pagination, 1,000-char counter, request expiration & pending queue limits | `22b1ad7` / `22b1ad7d22e6a9c859f6277bb3581657a8d604c0` | `2026-11-25T16:45:53Z` | `CHANGES_REQUESTED` (`16:27:56Z`), `APPROVED` (`16:45:28Z`) |
| `#116` | `#115` | Enforce Equipment name (`120`), category (`60`), description (`1,000`) limits & overflow wrap | `d4b1142` / `d4b11422c4f699cbb1556bc2a611917d42c20535` | `2026-11-26T09:03:04Z` | `APPROVED` (`09:02:27Z`) |

---

## Part A — Change Impact and Updated Contract

### A.1 Change Request Specification (`EV-L7-A1`)

- **Tracking & Scope Basis:** Issues [#97](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/97) (contract reconciliation), [#103](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/103) (maintenance change implementation), and [#117](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/117) (Lab 7 maintenance & release readiness).
- **TA Announcement Note (`2026-11-26`):** Per the `2026-11-26` TA announcement, prior instructor/TA pre-approval of the Lab 7 change topic was waived; the team selected a non-trivial Sprint 1 maintenance change modifying delivered `F-04` (Borrowing Request) and `F-05` (Checkout & Active Loan) behavior while preserving Sprint 1 invariants and remediating Lab 6 UAT UX findings.

#### Summary of Rule Changes (Sprint 1 Baseline vs Revised Behavior)

| Area | Old Sprint 1 Rule (`b03c904`) | New Revised Rule (`7e11110` contract → `8b49379` / `d4b1142` implementation) |
| --- | --- | --- |
| **1. `F-04`/`F-05` Checkout Lifecycle (`A-02` → `A-11`)** | **Direct Checkout (`A-02`):** A submitted borrowing request (`SUBMITTED`) was directly eligible for Custodian checkout without an intermediate approval step; only `SUBMITTED` and `CHECKED_OUT` derived states existed. | **Approval-Gated Checkout (`A-11`):** Requests enter `PENDING` (`approval_status = 'PENDING'`). Custodian must explicitly `APPROVE` or `REJECT` (`PENDING → APPROVED → CHECKED_OUT` or `PENDING → REJECTED`); Borrower may `CANCEL` unfulfilled requests (`PENDING/APPROVED → CANCELLED`). Checkout of any non-`APPROVED` request is rejected with HTTP `409 NOT_APPROVED`. *(Subsequent staging polish in PR `#114` / SRS rev 7 added derived `EXPIRED` status for 7d pending / 3d approved windows → `409 REQUEST_EXPIRED`.)* |
| **2. `F-05` Loan Duration (`BR-07` / `A-03`)** | **Fixed 7-Day Due Date:** `due_on` was always assigned automatically as `checkout_date + 7` calendar days in `Asia/Bangkok`; borrowers had no duration input. | **Borrower-Selected Duration (`1–14` Calendar Days):** Borrowers select `requested_days` (`1–14` integer days, defaulting to `7` when omitted for backward compatibility on `POST /api/requests`), persisted on the request/bundle. At checkout, `due_on` is computed as `checkout_date (Asia/Bangkok) + requested_days`. Values outside `1–14` or non-integers (`0`, `15`, `1.5`, strings) are rejected with `400 VALIDATION_ERROR`. |
| **3. Lab 6 `Finding 05` & `UAT-07` UX Clarity** | **Generic Conflict & Implicit Bounds:** `CheckoutRequest.tsx` displayed a generic message (`"This request cannot be checked out. Refresh requests and availability."`) for all `409` conflicts (`Finding 05`); request quantity inputs lacked explicit `1–N` range hints (`UAT-07 UX Note`). | **Distinct `409` Feedback & Explicit Bounds:** `CheckoutRequest.tsx` maps `409` codes to explicit actionable messages (`INSUFFICIENT_AVAILABILITY`, `ALREADY_CHECKED_OUT`, `NOT_APPROVED`, `EQUIPMENT_RETIRED`, `REQUEST_EXPIRED`). `CreateRequestPage.tsx` displays explicit range hints (`allowed: 1–{maxQty}` and `1–14` calendar days) and field validation errors before submit. |

#### Boundaries, Invalid Cases, and Access Expectations

- **Role & Ownership Matrix (`FR-04`, `FR-05`, `BR-04`, `BR-05`, `NFR-01`, `NFR-02`):**
  - **Unauthenticated callers:** All protected `/api/requests/*`, `/api/request-bundles/*`, and `/api/loans/*` endpoints return `401` with no private record data.
  - **`BORROWER`:** May create single/bundle requests (`POST /api/requests`, `POST /api/request-bundles`), view own requests/loans, and cancel own unfulfilled `PENDING`/`APPROVED` requests (`POST /api/requests/:id/cancel`, `POST /api/request-bundles/:bundleId/cancel`). Calling `approve`, `reject`, or `checkout`, or acting on/reading another borrower's request/loan, returns `403 FORBIDDEN` without leaking target record fields.
  - **`CUSTODIAN`:** May view active `PENDING`/`APPROVED` queue, `approve` / `reject` `PENDING` requests/bundles, and `checkout` `APPROVED` requests/bundles (single or atomic bundle). Cannot submit borrowing requests or cancel a borrower's request (`403 FORBIDDEN`), and cannot view `REJECTED` or `CANCELLED` requests via `GET /api/requests/:id` (`403 FORBIDDEN`).
- **Boundary & Validation Guards:**
  - `requested_days`: integer `1 <= requested_days <= 14` (default `7` on `POST /api/requests` if omitted). `0`, `-1`, `15`, `1.5`, `null`, boolean, or string → `400 VALIDATION_ERROR`.
  - `purpose_category`: allow-listed enum (`COURSE_PROJECT`, `CAPSTONE`, `LAB_RESEARCH`, `PERSONAL_CLUB`, `OTHER`; default `"OTHER"` on single-item `POST /api/requests` if omitted); invalid value → `400 VALIDATION_ERROR`.
  - `purpose_detail`: trimmed string up to `500` chars in PR `#109` (expanded to `1,000` chars in PR `#114`); over-limit → `400 VALIDATION_ERROR`.
  - `items` in bundle: non-empty array with unique `equipment_id`s (`1–20` in PR `#109`, tightened to `1–10` in PR `#114`) and `1 <= quantity_requested <= quantity_available`; `RETIRED` item → `409 EQUIPMENT_RETIRED`; stock shortfall → `409 INSUFFICIENT_AVAILABILITY`; non-`APPROVED` checkout → `409 NOT_APPROVED`; already fulfilled → `409 ALREADY_CHECKED_OUT`; invalid state transition (e.g., approve `APPROVED`/`CANCELLED`, cancel `CHECKED_OUT`) → `409 INVALID_STATE_TRANSITION`.
  - **Non-reservation (`BR-12`):** Creating or approving single/bundle requests locks `equipment` in ascending `id` order (`FOR UPDATE`) to validate `ACTIVE` and stock without decrementing `quantity_available`. Stock changes only upon committed `Loan` insertion at checkout.

---

### A.2 Impact Traceability Table (`EV-L7-A1`)

| Req ID | Feature | Affected SRS / System SDS / Feature SDS Sections | AC & STS Test IDs | Code Modules | N/A or Unchanged Notes |
| --- | --- | --- | --- | --- | --- |
| `FR-01`–`FR-05`, `BR-10`, `NFR-01`–`NFR-03` | `F-01` Authentication & RBAC | `docs/srs.md` §4.1, §5, §6; `docs/system-sds.md` §6.2, §7.1–§7.2 | `AC-F01-01..12` (Sprint 1 regression); `TEST-F11-02`, `TEST-F11-04` (role/owner denial) | `server/src/services/authz.ts` (reused) | **N/A (auth transport & schema unchanged):** `sessions` table, opaque `pew_session` cookie (`60`/`480` min), anti-CSRF (`APP_ORIGIN`), and Argon2id hashing (`password.ts`) were not modified. |
| `FR-06`–`FR-08` | `F-02` / `F-03` Catalog & Availability | `docs/srs.md` §1.3, §4.2, §5 (`BR-01`, `BR-12`); `docs/system-sds.md` §3.3 | `AC-F02-01..08`, `AC-F03-01..07` (Sprint 1 regression); `AC-F11-01`, `AC-F11-02` | `server/src/services/catalog.ts` (read), `server/src/services/borrowing-request.ts` (`RETIRED` guard) | **Formula N/A / Unchanged:** `held(item) = sum(quantity_borrowed WHERE returned_at IS NULL)` and `available(item) = quantity_total - held(item)` (`F-03`) are untouched; `BR-12` non-reservation preserved. (`F-08` CRUD/images/retire landed separately in PR `#108`.) |
| `FR-11`, `FR-12`, `FR-13`, `BR-01`, `BR-04`, `BR-05`, `BR-12`, `A-11` | `F-04` Borrowing Request (→ `F-11` Extensions) | `docs/srs.md` §4.3, §5 (`BR-01`, `BR-12`), §7.1 (`A-02`, `A-11`); `docs/system-sds.md` §2.2, §3.1–§3.2, §6.2; `docs/sprints/sprint-1/f-04-borrowing-request.md`; `docs/sprints/sprint-2/f-11-approval-bundles-notifications.md` §2 | `AC-F04-01..10` (regression); `AC-F11-01`, `AC-F11-02`, `AC-F11-04`; `TEST-F11-01`, `TEST-F11-02`, `TEST-F11-04` | `server/src/db/migrations.ts`, `server/src/services/borrowing-request.ts`, `server/src/routes/request-routes.ts`, `client/src/pages/CreateRequestPage.tsx`, `client/src/pages/RequestsPage.tsx`, `client/src/lib/api.ts` | Replaced Sprint 1 `SUBMITTED`-only lifecycle with `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` / `CHECKED_OUT`, `request_bundles`, `purpose_category`/`purpose_detail`, `requested_days`, and `UAT-07` `1–N` range hints. |
| `FR-14`, `FR-15`, `FR-16`, `BR-02`, `BR-03`, `BR-07`, `BR-11`, `NFR-04`–`NFR-06` | `F-05` Checkout & Active Loan (→ `F-11` Extensions) | `docs/srs.md` §4.4, §5 (`BR-02`, `BR-03`, `BR-07`), §7.1 (`A-03`, `A-11`); `docs/system-sds.md` §3.1, §3.3, §3.4; `docs/sprints/sprint-1/f-05-checkout-active-loan.md`; `docs/sprints/sprint-2/f-11-approval-bundles-notifications.md` §2 | `AC-F05-01..12` (regression); `AC-F11-03`, `AC-F11-05`; `TEST-F11-03`, `TEST-F11-05` | `server/src/services/loan.ts`, `server/src/routes/request-routes.ts`, `server/src/routes/loan-routes.ts`, `client/src/components/CheckoutRequest.tsx`, `client/src/components/LoanDetails.tsx`, `client/src/pages/LoansPage.tsx` | Enforces `approval_status === 'APPROVED'` (`409 NOT_APPROVED`), adds atomic `checkoutBundle(...)`, computes `due_on` via `checkoutDueOn(now, timeZone, requestedDays)` (`1–14` days, `Asia/Bangkok`), fixes `Finding 05` `409` UI copy, and adds printable loan slip. |
| `BR-13` (subset: approval/rejection alerts) | `F-07` Notifications (cross-link from `F-11`) | `docs/srs.md` §4.5 (`FR-19`), §5 (`BR-13`); `docs/system-sds.md` §3.1; `docs/sprints/sprint-2/f-11-approval-bundles-notifications.md` §2 | `AC-F11-02`; `TEST-F11-02` | `server/src/services/borrowing-request.ts` (`REQUEST_APPROVED`/`REQUEST_REJECTED` insert) | Overdue derivation & notification read/clear API belong to `F-07` (PR `#111`), not the `A-11` request/checkout change itself. |
| `FR-17`, `FR-18`, `FR-20`, `FR-21`, `BR-08`, `BR-09` | `F-06` Return, `F-08` Loan History, `F-09` Reporting | `docs/srs.md` §4.4–§4.5; `docs/sprints/sprint-2/f-06-return.md`, `f-08-catalog-search-loans.md`, `docs/sprints/sprint-3/f-09-inventory-reporting.md` | Outside PR `#109` scope (`F-06`/`F-08`/`F-09` delivered in PRs `#108`, `#110`, `#112`) | — | **N/A to this maintenance change:** Return (`F-06`), catalog CRUD (`F-08`), and reporting (`F-09`) were separate Sprint 2/3 feature PRs. |

#### Preserved Sprint 1 Invariants & Regression Protection

- **`BR-03` Stock & Single-Unit Invariant (`0 <= held <= quantity_total`):** Preserved in `server/src/services/catalog.ts` and `server/src/services/loan.ts` (`assertCheckoutAvailable` + Equipment-first `FOR UPDATE` row locking in ascending `equipment_id` order); protected by `server/tests/availability.test.ts`, `server/tests/loan.test.ts`, and `server/tests/sprint1-integration.test.ts`.
- **`BR-04` Custodian-Only Checkout & `BR-05` Borrower Isolation:** Preserved in `server/src/services/loan.ts` (`user.role !== "CUSTODIAN"` check, alongside `requireRole("CUSTODIAN")` route guards in `server/src/routes/request-routes.ts`, `server/src/routes/loan-routes.ts`, and `server/src/services/authz.ts`) and `server/src/services/borrowing-request.ts` (owner-scoped queries and `403 FORBIDDEN` on cross-borrower reads/cancels); protected by `server/tests/authz.test.ts`, `server/tests/borrowing-request.test.ts`, and `server/tests/sprint2-integration.test.ts`.
- **`BR-10` Argon2id Password Hashing & `F-01` Session Security:** Untouched in `server/src/services/password.ts` and `server/src/services/session.ts`; protected by `server/tests/password.test.ts`, `server/tests/session.test.ts`, `server/tests/auth.test.ts`, and `server/tests/auth-routes.test.ts`.
- **`BR-12` Non-Reservation:** Preserved across `create`, `createBundle`, `decide` (`APPROVE`), and `decideBundle`; neither `PENDING` nor `APPROVED` requests decrement `quantity_available`; protected by `server/tests/borrowing-request.test.ts` and `server/tests/sprint2-integration.test.ts`.

---

### A.3 Revised Engineering Contract & Pre-Implementation Teammate Review (`EV-L7-A2`)

#### Old (Sprint 1 `b03c904`) vs New (Revised `7e11110` / `d4b1142`) Contract Excerpts

1. **SRS Business Rules & Design Decisions ([`docs/srs.md`](../../srs.md) §5 & §7.1):**

   | Rule / Decision | Old Sprint 1 Contract (`b03c904`) | New Revised Contract (`docs/srs.md` rev 6–7) |
   | --- | --- | --- |
   | **`BR-02` Checkout Gate** | *"Checkout of an unavailable item should be **rejected**."* — Checkout when Available Quantity = 0 is rejected. | *"Checkout of an unavailable or unapproved item/request should be **rejected**."* — Checkout when Available Quantity = 0 or request is not `APPROVED` is rejected; no loan is created and availability is unchanged. |
   | **`BR-07` Loan Duration** | *"The **due date** of a loan is assigned automatically at checkout as **checkout date + 7 calendar days** (team decision)."* | *"The **due date** of a loan is assigned automatically at checkout as **checkout date + requested duration (`1–14` calendar days, default `7`)** in `Asia/Bangkok` (A-03 rev)."* — Invalid durations outside `1–14` are rejected. |
   | **`A-02` / `A-11` Workflow** | **`A-02`:** *"Borrowing Approval = Direct Checkout — no separate approval step before checkout; a request proceeds to checkout directly."* **`A-11`:** *"Sprint 1 has no approval step before checkout (A-02); an approval workflow is added in Sprint 2 only."* | **`A-02`:** *"Sprint 1 had no approval step; Sprint 2 introduces Custodian `APPROVE` / `REJECT` prior to checkout (`PENDING → APPROVED → CHECKED_OUT`)."* **`A-11`:** *"Sprint 2 adds Custodian `APPROVE`/`REJECT`, Borrower `CANCEL`, multi-item `request_bundles`, and purpose metadata."* Requests (`PENDING` or `APPROVED`) still never reserve units (`BR-12`). |

2. **Feature SDS & Acceptance / STS Excerpts ([`f-05-checkout-active-loan.md`](../../sprints/sprint-1/f-05-checkout-active-loan.md) vs [`f-11-approval-bundles-notifications.md`](../../sprints/sprint-2/f-11-approval-bundles-notifications.md)):**
   - **Sprint 1 `F-05` Contract:** `POST /api/requests/{requestId}/checkout` accepted `{}` for any `SUBMITTED` request (`Direct Checkout is confirmed: no separate approval`) and fixed `due_on = checkout_date (Asia/Bangkok) + 7 days`.
   - **Revised Sprint 2 `F-11` Contract (`AC-F11-01..05` & `TEST-F11-01..05`):**
     - `AC-F11-01` / `TEST-F11-01`: `POST /api/request-bundles` creates a multi-item `PENDING` bundle with purpose and `1–14` day duration without changing `quantity_available` (`BR-12`); invalid durations (`0`, `15`) or duplicate/empty items return `400`.
     - `AC-F11-02` / `TEST-F11-02`: Custodian approves/rejects `PENDING` request/bundle → `200`, creates `REQUEST_APPROVED`/`REQUEST_REJECTED` notification, leaves `quantity_available` unchanged; Borrower calling approve/reject receives `403`.
     - `AC-F11-03` / `TEST-F11-03`: Checkout of `PENDING`/`REJECTED`/`CANCELLED` request returns `409 NOT_APPROVED`; checkout of `APPROVED` request/bundle creates Loan(s) with `due_on = checkout_date + requested_days` (`Asia/Bangkok`).
     - `AC-F11-04` / `TEST-F11-04`: Owning Borrower cancels `PENDING`/`APPROVED` unfulfilled request/bundle → `200 CANCELLED`; cross-owner Borrower or Custodian cancel returns `403`; cancelling `CHECKED_OUT` returns `409`.
     - `AC-F11-05` / `TEST-F11-05`: `CheckoutRequest.tsx` shows distinct `INSUFFICIENT_AVAILABILITY` vs `ALREADY_CHECKED_OUT` vs `NOT_APPROVED` errors (`Finding 05`); Loan Detail provides printable slip; legacy `.html` routes are retired (`Phase P4`).

#### Pre-Implementation Teammate Contract Review Timeline (PR `#98` before PR `#109`)

Teammate `L0u1sss` reviewed PR `#98` (`docs/sprint2-contracts-and-docs` → `sprint/2-staging`, author `Peepipat-Suesoongnuen`) across **9 iterative `CHANGES_REQUESTED` rounds** before approving and merging the updated contracts **8 hours and 17 minutes prior** to PR `#109` implementation merge:

| Event / Review Round | Actor | Outcome / Commit SHA | Timestamp (UTC) |
| --- | --- | --- | --- |
| PR `#98` Review 1 | `L0u1sss` | `CHANGES_REQUESTED` (`bdcc8127f48bbe6e1fde42113969ed0480f740d7`) | `2026-11-23T16:23:03Z` |
| PR `#98` Review 2 | `L0u1sss` | `CHANGES_REQUESTED` (`e03d6d44070cbb6234e13072c65de8abbf1398dc`) | `2026-11-23T17:08:25Z` |
| PR `#98` Review 3 | `L0u1sss` | `CHANGES_REQUESTED` (`99f3fc77286c9565fa86fd5b9305842a4b8deec1`) | `2026-11-23T17:30:18Z` |
| PR `#98` Review 4 | `L0u1sss` | `CHANGES_REQUESTED` (`095af4b3fc46a3c1ed0d6c1865e9c9afbab6ebd6`) | `2026-11-23T17:49:57Z` |
| PR `#98` Review 5 | `L0u1sss` | `CHANGES_REQUESTED` (`13d61d6408027fc73a215add5f7043b78326ae1d`) | `2026-11-23T18:33:50Z` |
| PR `#98` Review 6 | `L0u1sss` | `CHANGES_REQUESTED` (`3a51db648844026240954bf1e13c2bfa89f02bdb`) | `2026-11-23T19:15:10Z` |
| PR `#98` Review 7 | `L0u1sss` | `CHANGES_REQUESTED` (`cd180c36407b2686aec527a164b43178dcd2f1b2`) | `2026-11-23T19:45:57Z` |
| PR `#98` Review 8 | `L0u1sss` | `CHANGES_REQUESTED` (`817531d79220f152b33dd69d0339caee02027d60`) | `2026-11-24T08:41:58Z` |
| PR `#98` Review 9 | `L0u1sss` | `CHANGES_REQUESTED` (`c44c3ec5b359ba55ac815ae9432783bae8db0af9`) | `2026-11-24T09:38:29Z` |
| **PR `#98` Final Approval** | `L0u1sss` | `APPROVED` (`92710ee5e422a970b1394d98fb71ef8c72a85dbb`) | `2026-11-24T09:54:02Z` |
| **PR `#98` Merged (`sprint/2-staging`)** | `Peepipat-Suesoongnuen` | Merge commit `7e111101a5fd4c0c1a54b62d75063b37901db13c` | `2026-11-24T09:54:41Z` |
| **PR `#109` Implementation Approved & Merged** | `L0u1sss` / `Peepipat-Suesoongnuen` | `APPROVED` `2026-11-24T18:11:29Z` (`0d9fd3d`); merged `8b493796a676342b2efce82c9ed7e8414abdbe80` | `2026-11-24T18:12:02Z` |

---

## Part B — Maintenance Implementation, TDD, and Regression

### B.1 RED Evidence — Pre-Change Failure (`EV-L7-B1`)

Following the pre-change contract merge (`7e11110`, PR `#98`), failing tests were written first against the Sprint 1 baseline (`c0a13ad` and prior) before implementing the `A-11` and `BR-07` changes (recorded in [`docs/sprints/sprint-2/tdd-evidence-s2.md`](../../sprints/sprint-2/tdd-evidence-s2.md) §2):

1. **`BR-07` Flexible `1–14` Day Loan Duration ([`server/tests/sprint2-rules.test.ts`](../../../server/tests/sprint2-rules.test.ts#L4-L17)):**
   - **14-day boundary:** `checkoutDueOn(new Date("2026-11-23T12:00:00Z"), "Asia/Bangkok", 14)` failed against the Sprint 1 hardcoded `+ 7` calendar-day calculation:
     ```text
     AssertionError: expected '2026-11-30' to be '2026-12-07'
     ```
   - **`Asia/Bangkok` midnight rollover (`1` day):** `checkoutDueOn(new Date("2026-11-23T18:00:00Z"), "Asia/Bangkok", 1)` (`2026-11-24T01:00:00+07:00` in Bangkok → expected `+1` day `2026-11-25`) failed against the Sprint 1 hardcoded `+ 7` rule:
     ```text
     AssertionError: expected '2026-12-01' to be '2026-11-25'
     ```
2. **`A-11` Pre-Checkout Approval Gate & Bundles ([`server/tests/sprint2-integration.test.ts`](../../../server/tests/sprint2-integration.test.ts#L312-L450)):**
   - Before PR `#109`, `POST /api/requests/:id/checkout` allowed direct checkout of unapproved requests (no `409 NOT_APPROVED` guard), and `/api/request-bundles` / `/api/request-bundles/:bundleId/checkout` routes returned `404` prior to migration and service/router implementation.
3. **Follow-up Sprint 2 Lifecycle & Limit TDD (`#113` / PR `#114`, `22b1ad7`):**
   - Integration specs in `server/tests/sprint2-integration.test.ts` asserted `409 REQUEST_LIMIT_EXCEEDED` on a 6th active pending request, `EXPIRED` + `409 REQUEST_EXPIRED` past `expires_at` (`7d` pending / `3d` approved), `POST /api/loan-bundles/:bundleId/request-return`, and `1,000`-character `purpose_detail` vs `1,001`-character `400 VALIDATION_ERROR` — all failing (`400`/`404`/`200` instead of `409`) before implementation.

---

### B.2 GREEN Implementation & Code Diff (`EV-L7-B2`)

The maintenance change landed in PR [`#109`](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/109) (Issue `#103`, head `0d9fd3d`, merged `8b49379`; `git diff c0a13ad..8b49379 --stat`: `30 files changed, 2714 insertions(+), 416 deletions(-)`).

#### Key Implementation Hunks (`git diff c0a13ad..8b49379`)

1. **`server/src/services/loan.ts` — `businessDateInZone`, `requested_days` `due_on`, `NOT_APPROVED` gate, and atomic `checkoutBundle`:**

```diff
-/** A calendar date in an explicit IANA zone, independent of the host timezone. */
-export function checkoutDueOn(instant: Date, timeZone: string): string {
+/** Business calendar date YYYY-MM-DD in an explicit IANA zone, independent of host OS zone. */
+export function businessDateInZone(instant: Date, timeZone: string): string {
   const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
   const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
-  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + 7));
+  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
+  return date.toISOString().slice(0, 10);
+}
+
+/** Due date = checkout business calendar date + requestedDays (1..14, default 7). */
+export function checkoutDueOn(instant: Date, timeZone: string, requestedDays = 7): string {
+  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
+  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
+  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + requestedDays));
   return date.toISOString().slice(0, 10);
 }
...
       if ((await client.query("SELECT id FROM loans WHERE request_id=$1", [requestId])).rowCount) {
         throw new RequestError(409, "ALREADY_CHECKED_OUT", "Request has already been checked out.");
       }
+      if (record.approval_status !== "APPROVED") {
+        throw new RequestError(409, "NOT_APPROVED", "Request must be approved before checkout.");
+      }
       const stock = await getEquipment(client, equipmentId);
       if (!stock) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
       assertCheckoutAvailable(stock.quantity_total, stock.quantity_total - stock.quantity_available, record.quantity_requested);
       if (!this.options.timeZone) throw new RequestError(503, "CALENDAR_POLICY_UNCONFIGURED", "Checkout is temporarily unavailable.");
       const now = (this.options.now ?? (() => new Date()))();
-      const dueOn = checkoutDueOn(now, this.options.timeZone);
+      const days = Number(record.requested_days ?? 7);
+      const dueOn = checkoutDueOn(now, this.options.timeZone, days);
```

2. **`server/src/services/borrowing-request.ts` — `validateRequestedDays` (`1–14` integer guard) & `PURPOSE_CATEGORIES`:**

```diff
+export function validateRequestedDays(days: unknown): number {
+  if (days === undefined) return 7;
+  if (typeof days !== "number" || !Number.isSafeInteger(days) || days < 1 || days > 14) {
+    throw new RequestError(400, "VALIDATION_ERROR", "requested_days must be an integer between 1 and 14.");
+  }
+  return days;
+}
```

   *(PR `#109` also added `createBundle`, `decide` / `decideBundle` with `REQUEST_APPROVED` / `REQUEST_REJECTED` notifications, and owner-only `cancel` / `cancelBundle` without decrementing `quantity_available`.)*

3. **`client/src/components/CheckoutRequest.tsx` — `Finding 05` `409` Conflict Code Mapping & Bundle Checkout:**

```diff
+function conflictMessage(code: string): string {
+  switch (code) {
+    case "INSUFFICIENT_AVAILABILITY":
+      return "Insufficient equipment stock available for checkout. Refresh requests and availability.";
+    case "ALREADY_CHECKED_OUT":
+      return "This request has already been checked out. Refresh requests.";
+    case "NOT_APPROVED":
+      return "Approve this request before checking it out.";
+    case "EQUIPMENT_RETIRED":
+      return "Retired equipment cannot be checked out.";
+    default:
+      return "This request cannot be checked out. Refresh requests and availability.";
+  }
+}
```

   *(Follow-up Slice 7 PR `#114` extended `conflictMessage` with `REQUEST_EXPIRED`.)*

#### GREEN Verification Summary on PR `#109` (`0d9fd3d` → `8b49379`)

- **PR Head CI (`0d9fd3d`):** GitHub Actions `CI & Docker Build` run [`45445038308`](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/45445038308) (`2026-11-24T17:07:34Z`) — `success`.
- **Merge Commit CI (`8b49379` on `sprint/2-staging`):** GitHub Actions `CI & Docker Build` run [`45456902039`](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/45456902039) (`2026-11-24T18:12:04Z`, `Node v24.15.0`, `PostgreSQL 17.12`):
  - Server (`vitest run`): **20 files, 246 passed, 0 failed, 0 skipped** (`9.37s`)
  - Client (`vitest run`): **8 files, 84 passed, 0 failed, 0 skipped** (`3.63s`)
  - Browser E2E (`playwright test`): **60 passed, 0 failed, 0 skipped, 0 flaky** (`34.20s`)
  - Total app tests on PR `#109` merge: **390 passed, 0 failed, 0 skipped**.

---

### B.3 Regression Suite Results (`EV-L7-B3`)

#### Local Verification on Integrated Staging Tree (`d4b1142` Codebase)

Environment observed locally: `Node v24.19.0`, `npm 11.17.0`, `Vitest 5.1.0`, `Playwright 1.64.1`, local `PostgreSQL 17` (`postgresql-x64-17` accepting connections on `:5432`).

| Command | Scope | Observed Result |
| --- | --- | --- |
| `npm run build` | Server TypeScript compile (`tsc`) | Exit `0` |
| `npm --prefix client run typecheck` | Client TypeScript check (`tsc --noEmit`) | Exit `0` |
| `npx tsc --project e2e/tsconfig.json --noEmit` | E2E TypeScript check | Exit `0` |
| `npm --prefix client run build` | Production Vite bundle (`vite v8.3.6`) | Exit `0` (`dist/assets/index-voGUzSgX.js`, `370.31 kB`) |
| `npm --prefix client test` | Client component & page Vitest suite | **9 files passed (9), 96 tests passed (96)** (`3.24s`) |
| `npm test` | Server unit + real PostgreSQL API/integration Vitest suite | **19 files passed \| 1 skipped (20), 291 tests passed \| 2 skipped (293)** (`13.15s`; `server/tests/migration-repair.test.ts` skipped locally because `MIGRATION_REPAIR_TEST_DATABASE_URL` is unset in `.env`) |
| Targeted `npx vitest run ...` | `sprint2-rules.test.ts`, `sprint2-integration.test.ts`, `loan.test.ts`, `loan-unit.test.ts`, `borrowing-request.test.ts`, `authz.test.ts`, `sprint1-integration.test.ts` | **7 files passed (7), 206 tests passed (206)** (`7.71s`, including `50` two-worker + `1` same-request `TEST-F05-04/05` races) |
| `npm run test:e2e` | Local Playwright runner | Exit `1` (`Error: http://localhost:3000/login is already used`) because port `3000` was occupied by an active local server process; full Playwright suite verified in CI below |

#### Full Clean-Commit CI Pipeline on `d4b1142` (`sprint/2-staging`)

Authoritative full-suite execution ran on **GitHub Actions `CI & Docker Build` run [`45788402551`](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/45788402551)** (`2026-11-26T09:03:07Z`, commit `d4b11422c4f699cbb1556bc2a611917d42c20535`, `Node v24.15.0`, `PostgreSQL 17.12 (Debian 17.12-1.pgdg13+1)`):

- **Job `test-and-docker` (`139800949302` — `success`):**
  - `deploy/tests/test_deploy_workflow.sh` & `python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'`: **7 tests passed** (`0.006s`)
  - `server-build`, `client-typecheck`, `e2e-typecheck`, `client-build`: all exit `0`
  - `tooling-tests` (`scripts/tests/evidence.test.mjs`): **12 tests passed, 0 failed, 0 skipped** (`4.51s`)
  - `server-migration` + `server-tests`: **20 test files, 293 passed, 0 failed, 0 skipped** (`9.49s`; includes `migration-repair.test.ts` (`2`), `sprint1-integration.test.ts` (`134`), `borrowing-request.test.ts` (`24`), `loan.test.ts` (`12`), `loan-unit.test.ts` (`12`), `sprint2-integration.test.ts` (`13`), `sprint2-rules.test.ts` (`3`), `catalog.test.ts` (`11`), `authz.test.ts` (`8`), `auth-routes.test.ts` (`13`), `auth.test.ts` (`7`), `availability.test.ts` (`9`), `session.test.ts` (`7`), `password.test.ts` (`4`), `config.test.ts` (`10`), `health-routes.test.ts` (`4`), `http-server.test.ts` (`1`), `restart-e2e.test.ts` (`2`), `seed-safety.test.ts` (`15`), `borrowing-request-unit.test.ts` (`2`))
  - `client-tests`: **9 test files, 96 passed, 0 failed, 0 skipped** (`4.57s`)
  - `browser-migration` + `browser-seed` + `browser-tests` (`playwright test`): **60 passed, 0 failed, 0 skipped, 0 flaky** (`36.9s`: `auth-journey` `9`, `borrowing-request` `6`, `catalog-journey` `12`, `checkout` `9`, `sprint1-integration` `3`, `sprint2-journey` `3`, `ui-layout` `3`, `ui-states` `15`)
  - Production `Dockerfile` build: exit `0`
- **Job `Docker image readiness (C-03)` (`139800949445` — `success`):** Built root image, proved `/api/ready` against live PostgreSQL, and verified no baked environment secrets.

#### Regression Preservation & Legitimate Sprint 1 Test Updates

- **Preserved Sprint 1 Invariants:** `TEST-F05-14/16` in `server/tests/loan.test.ts` (including `fixture(200, 200)` checking out `200` units with no extra borrower cap), `TEST-F05-04/05` (`50` independent two-worker races + `1` same-request race serialized `[201, 409]`), `F-01`/`F-10` RBAC & borrower isolation (`server/tests/authz.test.ts`, `server/tests/sprint1-integration.test.ts`), and `BR-12` non-reservation all pass without relaxed assertions.
- **Legitimate Sprint 1 Test Updates for `A-11`:** In PR `#109`, `server/tests/loan.test.ts`, `server/tests/sprint1-integration.test.ts`, and `e2e/specs/checkout.spec.ts` were updated so checkout test setups approve requests (`POST /api/requests/:id/approve` or `approval_status = 'APPROVED'`) prior to calling `/checkout`, and assert `APPROVED` instead of `SUBMITTED` after approval, matching the revised `A-11` contract while keeping all `BR-03`/`BR-04`/`BR-05`/`BR-12` invariants intact.

---

### B.4 Review, Integration, `main` Release & GCP Deployment (`EV-L7-B4`)

- **Teammate Peer Review & Staging Integration:**
  - **PR [`#109`](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/109) (`0d9fd3d` → `8b49379`):** Reviewed and `APPROVED` by `L0u1sss` at `2026-11-24T18:11:29Z` (*"A-11 workflow is consistently enforced across the service and route layers... I did not identify a blocking correctness issue in this review."*), backed by CI runs `45445038308` and `45456902039`.
  - **Staging Head (`d4b1142` on `sprint/2-staging`):** Integrated via PR `#116` (`L0u1sss` `APPROVED` `2026-11-26T09:02:27Z`, merged `2026-11-26T09:03:04Z`), verified by CI run `45788402551`.
- **Release PR (`sprint/2-staging` → `main`) & GCP Cloud Run Deployment Gate:**
  - **Release PR & `main` Merge SHA:** `[PENDING_RELEASE_PR_AND_GCP_DEPLOY]` — Release PR from `sprint/2-staging` (`d4b1142` / current docs) to `main` has not yet been opened/merged.
  - **Lab 5 GCP Cloud Run Deployment (`pewdiy`):** `[PENDING_RELEASE_PR_AND_GCP_DEPLOY]` — Currently serving Sprint 1 baseline `pewdiy-00008-mfk` (`b03c904`); production image build/deploy and post-deployment live checks (verifying changed `A-11` approval gate + `BR-07` `1–14` day duration alongside preserved Sprint 1 `BR-04`/`BR-05` role and borrower isolation) will be recorded in Part D once the release PR merges and Cloud Run deploys.

---

## Part C — Software Maintenance and Quality Metrics

*(Placeholder — to be completed in Tasks 4–5.)*

---

## Part D — Release Readiness and Deployment Verification

*(Placeholder — to be completed in Tasks 3 & 5.)*
