# Sprint 2 Engineering Contracts — Deliverable 2 Part B

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System  
> **Revision:** 1 — 2026-11-23 | **Status:** Baseline drafted prior to Sprint 2 implementation on `sprint/2-staging`  
> **Sources:** [SRS](../../srs.md) rev 6 · [Feature Inventory](../../features.md) rev 2 · [Traceability](../../traceability.md) rev 3 · [System SDS](../../system-sds.md) rev 7 · [Sprint Plan](../plan.md) rev 6  
> **Sprint 1 Baseline Reference:** `main` commit `b03c9043533a6dc1f8a6fb958983ddb0da9529c7` (deployed binary) / `d079bc6` (post-PR #96 docs merge)

---

## 1. Contract Index

| Feature / Scope | Contract File | Requirements Covered |
|---|---|---|
| **F-06** Return (Notice + Custodian Confirm) | [f-06-return.md](f-06-return.md) | `FR-17`, `BR-04`, `BR-09`, `BR-11(S2)`, `NFR-04(S2)`, `NFR-06(S2)` |
| **F-07** Overdue Status & In-App Notifications | [f-07-overdue-status.md](f-07-overdue-status.md) | `FR-19`, `BR-08`, `BR-13`, `NFR-01/02` |
| **F-08** Catalog CRUD, Search/Filter/Sort & Loan Views | [f-08-catalog-search-loans.md](f-08-catalog-search-loans.md) | `FR-06(S2)`, `FR-09`, `FR-10`, `FR-16(history)`, `FR-18`, `FR-21`, `BR-05`, `BR-06` |
| **S2 Extensions** Approval, Multi-Item Bundles, Duration, Print, UX Fixes | [f-11-approval-bundles-notifications.md](f-11-approval-bundles-notifications.md) | `FR-11/12/13/14/15(S2)`, `BR-01/02/07(1–14d)/12(A-11)`, `Finding 05`, `UAT-07`, `Phase P4` |
| **F-09** Inventory Reporting (Sprint 3 Contract + Progress) | [../sprint-3/f-09-inventory-reporting.md](../sprint-3/f-09-inventory-reporting.md) | `FR-20`, `NFR-07` |

---

## 2. Shared Sprint 2 Wire & Security Conventions

All rules from [Sprint 1 Shared Conventions](../sprint-1/shared-conventions.md) continue to apply:
- **Authentication & Authorization Precedence:** Every `/api/*` endpoint except `POST /api/auth/login` and `/api/health`, `/api/ready` requires a valid session cookie (`401 UNAUTHENTICATED`), checks role permissions (`403 FORBIDDEN`) before payload validation where appropriate, and checks ownership (`Loan → Request → Borrower`) before returning private data.
- **Anti-CSRF:** State-changing requests (`POST`, `PATCH`, `DELETE`) require valid `Origin`/`Referer` matching `APP_ORIGIN` (`403` otherwise).
- **Error Envelope:** `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
- **New Error Codes:** `ALREADY_RETURNED` (`409`), `NOT_APPROVED` (`409`), `EQUIPMENT_RETIRED` (`409`), `INVALID_STATE_TRANSITION` (`409`), `HELD_QUANTITY_CONFLICT` (`409`).
- **Date & Timezone Policy:** UTC instants (`TIMESTAMPTZ`) for events; `due_on` (`DATE`, `YYYY-MM-DD`) computed in `APP_TIMEZONE=Asia/Bangkok`.

---

## 3. Revision History

| Rev | Date | Change | Basis |
|---|---|---|---|
| 1 | 2026-11-23 | Initial Sprint 2 contract index and shared wire conventions prior to implementation | `docs/srs.md` rev 6; `project_deliverable_2_v1.pdf` §3.2 |
