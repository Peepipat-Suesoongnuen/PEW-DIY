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
| [Part C](#part-c--software-maintenance-and-quality-metrics) | Five objective engineering metrics, reconcilable source tables, and `<= 100`-word interpretation | `EV-L7-C1`, `EV-L7-C2` | Complete |
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

### C.1 Five Dated Engineering Metrics (`EV-L7-C1`)

- **Repository Scope:** `Peepipat-Suesoongnuen/PEW-DIY` (GitHub Issues, Pull Requests, and GitHub Actions workflows).
- **Observation Window:** `2026-11-23T00:00:00Z` – `2026-11-26T13:15:00Z` UTC (`d079bc6` on `main` through `d4b1142` on `sprint/2-staging`, prior to `#117` Lab 7 documentation commits).

| Metric | Definition & Scope | Window / Snapshot | Value | Source / Evidence ID |
| --- | --- | --- | --- | --- |
| **1. Completed Issues** | GitHub issues in `CLOSED` state within window (`6` Lab 6 reconciliation `#80`–`#84`, `#90`; `1` contract/docs `#97`; `2` Sprint 2 parent epics `#99`, `#100` delivered via slices `#101`–`#106`; `8` implementation slice issues `#101`–`#106`, `#113`, `#115`; `#117` remains `OPEN` for Lab 7). | `2026-11-23T00:00:00Z` – `2026-11-26T13:15:00Z` UTC | **`17` closed** (`17/18` = `94.4%` of active window issues; `1` open: `#117`) | `EV-L7-C2` (§C.2.1); GitHub Issues `#80`–`#84`, `#90`, `#97`, `#99`–`#106`, `#113`, `#115`, `#117` |
| **2. Merged PRs** | Pull requests merged into `main` (`#96`) or `sprint/2-staging` (`#98`, `#107`–`#112`, `#114`, `#116`), all independently reviewed and `APPROVED` by `L0u1sss`. | `2026-11-23T00:00:00Z` – `2026-11-26T13:15:00Z` UTC | **`10` merged** (`1/10` = `10.0%` → `main`; `9/10` = `90.0%` → `sprint/2-staging`; `10/10` = `100.0%` `APPROVED`; `7/10` = `70.0%` after `CHANGES_REQUESTED`) | `EV-L7-C2` (§C.2.2); PRs `#96`, `#98`, `#107`–`#112`, `#114`, `#116` |
| **3. Automated Test Results** | Authoritative full `npm run test:ci` suite on clean staging head `d4b1142` (`Node v24.15.0`, `PostgreSQL 17.12`), alongside local tree verification on `d4b1142`. | Snapshot `d4b1142` (`2026-11-26T09:03:07Z` CI; `2026-11-26` local) | **`449/449` (`100.0%`) passed**, `0` failed, `0` skipped (`293` server + `96` client + `60` E2E; plus `12/12` tooling & `7/7` deploy tests). *Local partial:* `291/293` (`99.3%`, `2` skipped) server + `96/96` (`100.0%`) client; local E2E exited `1` (port `3000` in use). | `EV-L7-B3`, `EV-L7-C2` (§C.2.3); CI run `45788402551` |
| **4. UAT Defect Status** | Product-side Sprint 1 findings from Lab 6 interim UAT (`Finding 05` Minor UX + `UAT-07 UX Note` Enhancement) tracked against Sprint 2 fixes (`#109`, `#110`, `#114`); separate Partner UAT Part B (`#82`) remains `BLOCKED`. | Window `2026-11-23` – `2026-11-26` UTC | **`2/2` (`100.0%`) Product-side findings resolved** (`0` open critical/major defects); Partner UAT Part B (`#82`) unreceived / formal UAT retest sign-off pending | `EV-L7-A1`, `EV-L7-C2` (§C.2.4); [Lab 6 README](../lab-06/README.md) |
| **5. CI Run Outcomes (`sprint/2-staging`)** | All `CI & Docker Build` workflow runs on `sprint/2-staging` (`push` merge runs + `pull_request` feature-branch runs targeting `sprint/2-staging`). | `2026-11-23T00:00:00Z` – `2026-11-26T13:15:00Z` UTC (`34` runs) | **`33/34` (`97.1%`) `success`**, **`1/34` (`2.9%`) `failure`** (`45406971680` on `3f9b679`, fixed in `81e6250`/`cb5321f`), **`0/34` (`0.0%`) `cancelled`** (`10/10` = `100.0%` push + `23/24` = `95.8%` PR) | `EV-L7-C2` (§C.2.5); GitHub Actions `CI & Docker Build` |

---

### C.2 Reconcilable Source Tables (`EV-L7-C2`)

#### C.2.1 Closed Issues in Observation Window (`17` Closed, `1` Open)

| # | Issue | Title | Role / Category | State | Closed At (UTC) |
| --- | --- | --- | --- | --- | --- |
| 1 | `#80` | `[Lab 6] Prepare Sprint 1 UAT handoff and track independent acceptance` | Lab 6 UAT parent | `CLOSED` | `2026-11-23T08:32:34Z` |
| 2 | `#81` | `[Lab 6 / Part A] Finalize the executable Sprint 1 UAT handoff` | Lab 6 Part A | `CLOSED` | `2026-11-23T08:32:44Z` |
| 3 | `#82` | `[Lab 6 / Part B] Execute independent UAT on the partner Sprint 1 release` | Lab 6 Part B (`BLOCKED` record) | `CLOSED` | `2026-11-23T08:32:49Z` |
| 4 | `#83` | `[Lab 6 / Part C] Report, classify, and disposition UAT findings` | Lab 6 Part C | `CLOSED` | `2026-11-23T08:32:56Z` |
| 5 | `#84` | `[Lab 6 / Part D] Resolve release blockers and obtain independent UAT decision` | Lab 6 Part D | `CLOSED` | `2026-11-23T08:33:00Z` |
| 6 | `#90` | `[Lab 6] Coordinate missing UAT handoff prerequisites` | Lab 6 prerequisites | `CLOSED` | `2026-11-23T08:33:04Z` |
| 7 | `#97` | `docs(sprint2): reconcile SRS/SDS/plan and establish Sprint 2 & 3 contracts` | Pre-change contract (`PR #98`) | `CLOSED` | `2026-11-24T10:12:18Z` |
| 8 | `#99` | `feat(sprint2): implement backend API & DB migration for F-06, F-07, F-08, A-11, and F-09` | Sprint 2 backend parent epic (slices `#101`–`#106`) | `CLOSED` | `2026-11-24T12:44:46Z` |
| 9 | `#101` | `feat(sprint2): ARCH-01 Phase P4 legacy HTML retirement and shared UI primitives` | Slice `S2-01` (`PR #107`) | `CLOSED` | `2026-11-24T13:06:35Z` |
| 10 | `#100` | `feat(sprint2): overhaul client UI/UX, Lab 6 fixes (Finding 05, UAT-07, Phase P4), and E2E tests` | Sprint 2 client parent epic (slices `#101`–`#106`) | `CLOSED` | `2026-11-24T15:29:41Z` |
| 11 | `#102` | `feat(sprint2): F-08 catalog CRUD, images, retire, search/filter/sort, and UAT-07 UI` | Slice `S2-02` (`PR #108`) | `CLOSED` | `2026-11-24T16:09:49Z` |
| 12 | `#103` | `feat(sprint2): A-11 approval workflow, multi-item bundles, 1-14d duration, and request UI` | Slice `S2-03` (`PR #109`) | `CLOSED` | `2026-11-24T18:14:13Z` |
| 13 | `#104` | `feat(sprint2): F-06 two-step return, F-08 loan views/history, printable slip, and Finding 05 loans UI` | Slice `S2-04` (`PR #110`) | `CLOSED` | `2026-11-25T09:53:22Z` |
| 14 | `#105` | `feat(sprint2): F-07 overdue derivation and persistent in-app notifications` | Slice `S2-05` (`PR #111`) | `CLOSED` | `2026-11-25T10:28:52Z` |
| 15 | `#106` | `feat(sprint3): F-09 inventory reporting summary progress and Sprint 2 verification evidence sync` | Slice `S2-06` (`PR #112`) | `CLOSED` | `2026-11-25T11:46:31Z` |
| 16 | `#113` | `feat(s2-07): UI/UX zero-scroll blended bundle tables, universal pagination, 1,000-char counter, request expiration & pending queue limits` | Slice `S2-07` (`PR #114`) | `CLOSED` | `2026-11-25T16:54:22Z` |
| 17 | `#115` | `feat(s2-08): enforce Equipment name (120), category (60), description (1,000) limits & overflow wrapping` | Slice `S2-08` (`PR #116`) | `CLOSED` | `2026-11-26T09:47:03Z` |

*(Open issue in window: `#117` `docs(lab7): prepare Lab 7 maintenance metrics, Sprint 1 change evidence, and release readiness`, created `2026-11-26T13:04:41Z`, state `OPEN`. Reconciliation: `6` Lab 6 + `1` contract + `2` parent epics + `8` slices = `17` closed; `17 / (17 + 1) = 94.4%` closed.)*

#### C.2.2 Merged Pull Requests in Observation Window (`10` PRs)

| # | PR | Title | Head → Base | Merge SHA | Merged At (UTC) | `L0u1sss` Review History (UTC) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `#96` | `release: promote Lab 6 UAT documentation and evidence to main` | `sprint/1-staging` → `main` | `d079bc6` | `2026-11-23T10:19:27Z` | `CHANGES_REQUESTED` (`09:49:22Z`); `APPROVED` (`10:16:58Z`) |
| 2 | `#98` | `docs(sprint2): reconcile baseline docs and add Sprint 2 & 3 contracts` | `docs/sprint2-contracts-and-docs` → `sprint/2-staging` | `7e11110` | `2026-11-24T09:54:41Z` | `9×` `CHANGES_REQUESTED` (`2026-11-23T16:23:03Z`..`2026-11-24T09:38:29Z`); `APPROVED` (`09:54:02Z`) |
| 3 | `#107` | `feat(sprint2): ARCH-01 Phase P4 legacy HTML retirement and shared UI primitives (#101)` | `feat/s2-01-p4-and-ui-primitives` → `sprint/2-staging` | `ad60778` | `2026-11-24T12:43:12Z` | `CHANGES_REQUESTED` (`11:45:30Z`); `APPROVED` (`12:33:32Z`) |
| 4 | `#108` | `feat(sprint2): F-08 catalog CRUD, images, retire, search/filter/sort, and UAT-07 UI (#102)` | `feat/s2-02-f08-catalog-crud-search` → `sprint/2-staging` | `c0a13ad` | `2026-11-24T15:16:20Z` | `CHANGES_REQUESTED` (`14:12:36Z`); `APPROVED` (`15:12:00Z`) |
| 5 | `#109` | `feat(s2): implement A-11 approval workflow, bundles, and 1-14 day duration (#103)` | `feat/s2-03-a11-approval-bundles` → `sprint/2-staging` | `8b49379` | `2026-11-24T18:12:02Z` | `APPROVED` (`18:11:29Z`) |
| 6 | `#110` | `feat(s2): implement F-06 two-step return, F-08 loan views, and printable slip (#104)` | `feat/s2-04-f06-return-f08-loans` → `sprint/2-staging` | `6a5f5ff` | `2026-11-25T09:50:14Z` | `CHANGES_REQUESTED` (`09:07:25Z`); `APPROVED` (`09:49:52Z`) |
| 7 | `#111` | `feat(s2): implement F-07 overdue derivation and in-app notifications (#105)` | `feat/s2-05-f07-overdue-notifications` → `sprint/2-staging` | `50a6b9d` | `2026-11-25T10:22:56Z` | `APPROVED` (`10:22:44Z`) |
| 8 | `#112` | `feat(s3): implement F-09 inventory reporting summary and sync Sprint 2 evidence (#106)` | `feat/s2-06-f09-reporting-and-evidence` → `sprint/2-staging` | `9e8a5e3` | `2026-11-25T11:53:48Z` | `CHANGES_REQUESTED` (`10:59:18Z`); `APPROVED` (`11:42:54Z`) |
| 9 | `#114` | `feat(s2-07): UI/UX zero-scroll blended bundle tables, universal pagination, 1,000-char counter, request expiration & pending queue limits (#113)` | `feat/s2-07-ui-ux-bundle-expiry-limits` → `sprint/2-staging` | `22b1ad7` | `2026-11-25T16:45:53Z` | `CHANGES_REQUESTED` (`16:27:56Z`); `APPROVED` (`16:45:28Z`) |
| 10 | `#116` | `feat(s2-08): enforce Equipment name (120), category (60), description (1,000) limits & overflow wrap (#115)` | `feat/s2-08-equipment-field-limits` → `sprint/2-staging` | `d4b1142` | `2026-11-26T09:03:04Z` | `APPROVED` (`09:02:27Z`) |

*(All `10/10` (`100.0%`) merged PRs were authored by `Peepipat-Suesoongnuen` and `APPROVED` by `L0u1sss`: `7/10` (`70.0%`) required `CHANGES_REQUESTED` before approval; `3/10` (`30.0%`) were `APPROVED` on first review.)*

#### C.2.3 Automated Test Suite Breakdown on `d4b1142` (`449/449` App Tests)

| Suite / Environment | Command / Job | Passed | Failed | Skipped | Total | Pass Rate | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **CI Server (`d4b1142`)** | `CI & Docker Build` (`45788402551`) | `293` | `0` | `0` | `293` | `293/293` (`100.0%`) | `20` files (`PostgreSQL 17.12`, includes `migration-repair.test.ts` `2/2`) |
| **CI Client (`d4b1142`)** | `CI & Docker Build` (`45788402551`) | `96` | `0` | `0` | `96` | `96/96` (`100.0%`) | `9` files (`Vitest` + React Testing Library) |
| **CI Browser E2E (`d4b1142`)** | `CI & Docker Build` (`45788402551`) | `60` | `0` | `0` | `60` | `60/60` (`100.0%`) | `8` Playwright spec files, `0` flaky |
| **Total `npm run test:ci` (`d4b1142`)** | `45788402551` (`test-and-docker`) | **`449`** | **`0`** | **`0`** | **`449`** | **`449/449` (`100.0%`)** | Auxiliary CI checks in same job: `12/12` (`100.0%`) tooling + `7/7` (`100.0%`) deploy |
| **Local Server (`d4b1142`)** | `npm test` (local Windows + PG `17`) | `291` | `0` | `2` | `293` | `291/293` (`99.3%`) | `migration-repair.test.ts` (`2`) skipped (`MIGRATION_REPAIR_TEST_DATABASE_URL` unset) |
| **Local Client (`d4b1142`)** | `npm --prefix client test` | `96` | `0` | `0` | `96` | `96/96` (`100.0%`) | `9` files (`3.24s`) |
| **Local E2E (`d4b1142`)** | `npm run test:e2e` | `0` | `0` | `0` | `0` | Exit `1` (pre-test) | Aborted because local `http://localhost:3000/login` was occupied |

#### C.2.4 UAT Defect Disposition Summary (`2/2` Product-Side Resolved)

| Finding ID | Origin (`Lab 6`) | Severity / Type | Resolution in Sprint 2 | Status |
| --- | --- | --- | --- | --- |
| `Finding 05` | Partner interim UAT `UAT-05` (`F-05` checkout conflict UX) | Minor — Accepted Limitation | `CheckoutRequest.tsx` maps `409` codes (`INSUFFICIENT_AVAILABILITY`, `ALREADY_CHECKED_OUT`, `NOT_APPROVED`, `EQUIPMENT_RETIRED`, `REQUEST_EXPIRED`) + `F-08` loans UI (`PR #109`, `#110`, `#114`) | **Resolved (`1/2`)** (awaiting partner retest sign-off) |
| `UAT-07 UX Note` | Partner interim UAT `UAT-07` (`F-04` quantity bounds UX) | Minor — Enhancement | `CreateRequestPage.tsx` adds explicit `allowed: 1–{maxQty}` and `1–14` day range hints + `1,000`-char counter (`PR #109`, `#114`) | **Resolved (`2/2`)** (awaiting partner retest sign-off) |
| Partner UAT Part B (`#82`) | Our team testing partner Sprint 1 release | External dependency | No partner handoff, URL, cases, or credentials received | **`BLOCKED`** (not counted as resolved) |

#### C.2.5 `sprint/2-staging` `CI & Docker Build` Run Log (`34` Runs: `33/34` `success`, `1/34` `failure`, `0/34` `cancelled`)

| # | Run ID | Event | Source Branch / PR | Head SHA | Created At (UTC) | Conclusion |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `45204212328` | `push` | `sprint/2-staging` (`PR #96`) | `d079bc6` | `2026-11-23T15:20:57Z` | `success` |
| 2 | `45204865229` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `bdcc812` | `2026-11-23T15:24:26Z` | `success` |
| 3 | `45220576433` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `e03d6d4` | `2026-11-23T16:48:06Z` | `success` |
| 4 | `45226976916` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `99f3fc7` | `2026-11-23T17:22:35Z` | `success` |
| 5 | `45229041371` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `095af4b` | `2026-11-23T17:33:56Z` | `success` |
| 6 | `45234422720` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `13d61d6` | `2026-11-23T18:04:22Z` | `success` |
| 7 | `45244452653` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `3a51db6` | `2026-11-23T19:01:04Z` | `success` |
| 8 | `45251878877` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `cd180c3` | `2026-11-23T19:43:26Z` | `success` |
| 9 | `45331541275` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `817531d` | `2026-11-24T05:11:34Z` | `success` |
| 10 | `45361076153` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `c44c3ec` | `2026-11-24T09:00:22Z` | `success` |
| 11 | `45368968449` | `pull_request` | `docs/sprint2-contracts-and-docs` (`PR #98`) | `92710ee` | `2026-11-24T09:50:15Z` | `success` |
| 12 | `45369665588` | `push` | `sprint/2-staging` (`PR #98`) | `7e11110` | `2026-11-24T09:54:43Z` | `success` |
| 13 | `45380309426` | `pull_request` | `feat/s2-01-p4-and-ui-primitives` (`PR #107`) | `65aae5e` | `2026-11-24T11:01:37Z` | `success` |
| 14 | `45394185211` | `pull_request` | `feat/s2-01-p4-and-ui-primitives` (`PR #107`) | `72fbef1` | `2026-11-24T12:30:35Z` | `success` |
| 15 | `45396243115` | `push` | `sprint/2-staging` (`PR #107`) | `ad60778` | `2026-11-24T12:43:15Z` | `success` |
| 16 | `45406971680` | `pull_request` | `feat/s2-02-f08-catalog-crud-search` (`PR #108`) | `3f9b679` | `2026-11-24T13:46:51Z` | **`failure`** |
| 17 | `45408360281` | `pull_request` | `feat/s2-02-f08-catalog-crud-search` (`PR #108`) | `81e6250` | `2026-11-24T13:54:54Z` | `success` |
| 18 | `45419429143` | `pull_request` | `feat/s2-02-f08-catalog-crud-search` (`PR #108`) | `cb5321f` | `2026-11-24T14:55:00Z` | `success` |
| 19 | `45423568227` | `push` | `sprint/2-staging` (`PR #108`) | `c0a13ad` | `2026-11-24T15:16:23Z` | `success` |
| 20 | `45445038308` | `pull_request` | `feat/s2-03-a11-approval-bundles` (`PR #109`) | `0d9fd3d` | `2026-11-24T17:07:34Z` | `success` |
| 21 | `45456902039` | `push` | `sprint/2-staging` (`PR #109`) | `8b49379` | `2026-11-24T18:12:04Z` | `success` |
| 22 | `45461878291` | `pull_request` | `feat/s2-04-f06-return-f08-loans` (`PR #110`) | `0f9edef` | `2026-11-24T18:39:28Z` | `success` |
| 23 | `45588663516` | `pull_request` | `feat/s2-04-f06-return-f08-loans` (`PR #110`) | `e053c9b` | `2026-11-25T09:46:57Z` | `success` |
| 24 | `45589188640` | `push` | `sprint/2-staging` (`PR #110`) | `6a5f5ff` | `2026-11-25T09:50:17Z` | `success` |
| 25 | `45593080783` | `pull_request` | `feat/s2-05-f07-overdue-notifications` (`PR #111`) | `b54b5f1` | `2026-11-25T10:14:36Z` | `success` |
| 26 | `45594442163` | `push` | `sprint/2-staging` (`PR #111`) | `50a6b9d` | `2026-11-25T10:22:58Z` | `success` |
| 27 | `45599575015` | `pull_request` | `feat/s2-06-f09-reporting-and-evidence` (`PR #112`) | `d696ff0` | `2026-11-25T10:55:28Z` | `success` |
| 28 | `45605000517` | `pull_request` | `feat/s2-06-f09-reporting-and-evidence` (`PR #112`) | `5a9cc54` | `2026-11-25T11:30:04Z` | `success` |
| 29 | `45608649394` | `push` | `sprint/2-staging` (`PR #112`) | `9e8a5e3` | `2026-11-25T11:53:51Z` | `success` |
| 30 | `45642517090` | `pull_request` | `feat/s2-07-ui-ux-bundle-expiry-limits` (`PR #114`) | `b1d11cb` | `2026-11-25T15:12:24Z` | `success` |
| 31 | `45656224601` | `pull_request` | `feat/s2-07-ui-ux-bundle-expiry-limits` (`PR #114`) | `c273e9c` | `2026-11-25T16:39:17Z` | `success` |
| 32 | `45657456393` | `push` | `sprint/2-staging` (`PR #114`) | `22b1ad7` | `2026-11-25T16:45:56Z` | `success` |
| 33 | `45778987562` | `pull_request` | `feat/s2-08-equipment-field-limits` (`PR #116`) | `76632df` | `2026-11-26T07:55:49Z` | `success` |
| 34 | `45788402551` | `push` | `sprint/2-staging` (`PR #116`) | `d4b1142` | `2026-11-26T09:03:07Z` | `success` |

*(Reconciliation: `10/10` (`100.0%`) `push` runs `success` + `23/24` (`95.8%`) `pull_request` runs `success` + `1/24` (`4.2%`) `pull_request` run `failure` = `33/34` (`97.1%`) `success`, `1/34` (`2.9%`) `failure`, `0/34` (`0.0%`) `cancelled`. Outside the `sprint/2-staging` metric scope, `main` (`PR #96`) ran `2/2` (`100.0%`) `success` (`45155042767` `CI & Docker Build` and `45155042849` `Deploy demo`), and `sprint/1-staging` ran `3/3` (`100.0%`) `success` (`45144617086`, `45154332191`, `45154343680`).)*

---

### C.3 Evidence-Based Interpretation (`<= 100 Words`)

Although `sprint/2-staging` integrates 9 PRs with 33/34 (97.1%) CI passes and 449/449 (100.0%) tests passing on `d4b1142`, `main` and Cloud Run `pewdiy` still serve Sprint 1 (`b03c904`), local runs hit environment parity gaps (2 skipped migration-repair tests; port 3000 E2E collision), Partner UAT (`#82`) is blocked, and `F-09` CSV/benchmark scope remains open. **Action:** `Peepipat-Suesoongnuen` (with `L0u1sss` review) will merge the `sprint/2-staging` to `main` release PR and deploy Lab 5 Cloud Run with smoke checks before 2026-11-29, targeting Final Delivery (2026-12-13) for `F-09`.

---

## Part D — Release Readiness and Deployment Verification

*(Placeholder — to be completed in Tasks 3 & 5.)*
