# Sprint 2 TDD Evidence & Committed Verification Record

> **Scope Note:** Tracks the authentic `RED → GREEN` TDD cycles and committed verification SHAs across vertical-slice Issues `#101`–`#106` (parent trackers `#99` and `#100`) landing on `sprint/2-staging`.

## 1. Committed Vertical-Slice Merge History (`sprint/2-staging`)

| Slice | Issue | PR | Merged Commit SHA | Scope |
|---|---|---|---|---|
| Slice 1 | `#101` | `#107` | `ad60778` | `ARCH-01 Phase P4` legacy `.html` retirement & migration repair |
| Slice 2 | `#102` | `#108` | `c0a13ad` | `F-08` Catalog CRUD, retire, `image_url`, search/filter/sort (`TEST-F08-01..04`) |
| Slice 3 | `#103` | `#109` | `8b49379` | `A-11` approval workflow, bundles, `1–14` day `BR-07` duration, `Finding 05`, `UAT-07` |
| Slice 4 | `#104` | `#110` | `6a5f5ff` | `F-06` two-step return, `F-08` loan views/history, `FR-15` printable slip, `Finding 05` Loans UI |
| Slice 5 | `#105` | `#111` | `50a6b9d` | `F-07` derived overdue (`BR-08`) & persistent in-app notifications (`TEST-F07-01..05`) |
| Slice 6 | `#106` | `#112` | `9e8a5e3` | Sprint 3 `F-09` Inventory Reporting (`GET /api/reports/summary`, `/reports`) & evidence sync |
| Slice 7 | Pending Issue | Pending PR | `feat/s2-07-ui-ux-bundle-expiry-limits` | UI/UX table proportion & bundle ergonomics (`shortRef`, sorting, bundle actions/return notice), `1,000`-char purpose counter, request expiration (`7d`/`3d`), and pending limit (`5` requests / `10` bundle items) |

## 2. Recorded TDD `RED → GREEN` Cycles (`server/tests/sprint2-rules.test.ts` & `sprint2-integration.test.ts`)

1. **`BR-07` Flexible 1–14 Day Duration (`#103` / `#109`):**
   - **RED:** `checkoutDueOn` with `requestedDays = 14` failed against Sprint 1 hardcoded 7-day rule (`expected '2026-11-30' to be '2026-12-07'`); `Asia/Bangkok` midnight rollover (`1` day) failed (`expected '2026-12-01' to be '2026-11-25'`).
   - **GREEN:** Implemented `businessDateInZone` and `requestedDays` parameter in `server/src/services/loan.ts` (`8b49379`).
2. **`F-06` Two-Step Return & `F-08` Loan Views (`#104` / `#110`):**
   - **RED:** `POST /api/loans/:loanId/return` returned `404` (`expected 404 to be 403`) before return routes/service existed.
   - **GREEN:** Implemented `requestReturn`, `confirmReturn`, `confirmBundleReturn`, and scoped `list`/`get` in `LoanService` (`6a5f5ff`).
3. **`BR-08` Derived Overdue Boundary & Notifications (`#105` / `#111`):**
   - **RED:** `isLoanOverdue` threw `TypeError: isOverdue is not a function`, and `GET /api/loans/:id` lacked `overdue` (`expected undefined to be false`).
   - **GREEN:** Exported `isLoanOverdue(dueOn, returnedAt, businessToday)` and `NotificationService` (`50a6b9d`).
4. **`F-09` Inventory Reporting Summary (`#106` / `#112`):**
   - **RED:** `GET /api/reports/summary` returned `404` (`expected 404 to be 401`) prior to `ReportingService` and `report-routes.ts`.
   - **GREEN:** Implemented `ReportingService.getSummary()` and `createReportRouter` (`CUSTODIAN` only) (`9e8a5e3`).
5. **UI/UX, Bundle Ergonomics, Expiration & Pending Queue Limits (`feat/s2-07-ui-ux-bundle-expiry-limits`):**
   - **RED:** Integration specs in `server/tests/sprint2-integration.test.ts` asserted `409 REQUEST_LIMIT_EXCEEDED` on the 6th active pending request, `EXPIRED` + `409 REQUEST_EXPIRED` past `expires_at` (`7d` pending / `3d` approved), `POST /api/loan-bundles/:bundleId/request-return` (`200` for owner / `403` cross-owner), and `1,000`-character `purpose_detail` acceptance vs `1,001`-character `400 VALIDATION_ERROR` — all failing (`400`/`404`/`200` instead of `409`) prior to implementation.
   - **GREEN:** Added `expires_at` column in `MIGRATION_004_SPRINT2_SQL`, implemented limits/expiry/short-ref filtering in `BorrowingRequestService` & `LoanService.requestBundleReturn`, added `table-fixed`, `shortRef`, sorting, and collapsible bundle controls in the React client, and verified `npm run test:ci` passing cleanly.
