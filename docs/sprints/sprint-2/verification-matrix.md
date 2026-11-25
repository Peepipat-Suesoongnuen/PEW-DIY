# Sprint 2 & Sprint 3 Progress Verification Matrix

> **Status:** Slices 1–6 (`#101`–`#106`) merged into `sprint/2-staging` (`9e8a5e3`); Slice 7 (UI/UX, bundle ergonomics, expiry & queue limits) verified on `feat/s2-07-ui-ux-bundle-expiry-limits`.
>
> **Scope Note:** Parent trackers [#99](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/99) (Backend) and [#100](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/100) (Frontend & E2E) were delivered via bounded vertical-slice Issues `#101`–`#106`. Remaining Sprint 3 items (`AC-F09-04` CSV export and `AC-F09-05` formal 100-item `NFR-07` benchmark) are scheduled for Sprint 3 Final Delivery by 13 Dec 2026.

| Feature / Requirement | Acceptance Criteria / Test ID | Verification Target | Status |
|---|---|---|---|
| **F-06 Two-Step Return** | `AC-F06-01..06` (`TEST-F06-01..06`) | `server/tests/sprint2-integration.test.ts`, `client/src/test/loan.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | Merged (`#104` / PR `#110` `6a5f5ff`) |
| **F-07 Overdue & Notifications** | `AC-F07-01..05` (`TEST-F07-01..05`) | `server/tests/sprint2-rules.test.ts`, `server/tests/sprint2-integration.test.ts`, `client/src/test/notifications-reports.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | Merged (`#105` / PR `#111` `50a6b9d`) |
| **F-08 Catalog CRUD, Search/Filter/Sort & Loans Views** | `AC-F08-01..06` (`TEST-F08-01..06`) | `server/tests/sprint2-integration.test.ts`, `client/src/test/catalog-page.test.tsx`, `client/src/test/loan.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | Merged (`#102` `c0a13ad`, `#104` `6a5f5ff`) |
| **A-11 Approval, Multi-Item Bundles, 1–14d Duration, Print Slip & Lab 6 Fixes** | `AC-F11-01..05`, `Finding 05`, `UAT-07`, `ARCH-01 Phase P4` | `server/tests/sprint2-rules.test.ts`, `server/tests/sprint2-integration.test.ts`, `server/tests/catalog.test.ts`, `client/src/test/*.test.tsx`, `e2e/specs/*.spec.ts` | Merged (`#101` `ad60778`, `#103` `8b49379`, `#104` `6a5f5ff`) |
| **F-09 Sprint 3 Inventory Reporting (Summary & `/reports`)** | `AC-F09-01..03` (`TEST-F09-01..03`) | `server/tests/sprint2-integration.test.ts`, `client/src/test/notifications-reports.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | Merged (`#106` / PR `#112` `9e8a5e3`) |
| **UI/UX, Bundle Ergonomics, Expiration & Queue Limits** | `1,000`-char `purpose_detail`, `5` active pending cap, `10` bundle items, `7d`/`3d` `EXPIRED`, `requestBundleReturn`, zero-scroll `table-fixed` blended bundle drawers, `shortRef`, sorting, universal `Pagination` | `server/tests/sprint2-integration.test.ts`, `client/src/test/{components,catalog-page,borrowing-request,loan,notifications-reports}.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | Implemented (`feat/s2-07-ui-ux-bundle-expiry-limits`, `npm run test:ci` verified) |
| **Sprint 1 Core Continuity (F-01..F-05, F-10)** | Existing Sprint 1 regression suite | Executed on `sprint/2-staging` CI on every slice | Active Baseline |
