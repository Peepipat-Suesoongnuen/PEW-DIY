# Sprint 2 TDD Evidence (RED -> GREEN)

## Target Pure Rule Tests (`server/tests/sprint2-rules.test.ts`)

### 1. RED Phase (Pre-Implementation at commit `8031e06`)
Command: `npx vitest run server/tests/sprint2-rules.test.ts`
Result: **FAILED (2 failed)**
- `checkoutDueOn` with `requestedDays = 14`: expected `"2026-12-07"`, received `"2026-11-30"` (hardcoded 7-day Sprint 1 rule).
- `isLoanOverdue`: expected `false` when returned even if past due date, and `false` on equality (`dueOn === today`).

### 2. GREEN Phase & Full CI Suite Verification
Command: `npm run test:ci` (`CI_TEST_DATABASE_URL` + `MIGRATION_TEST_DATABASE_URL`, `NODE_ENV=test`)
Result (**PASS**, PostgreSQL `17.11`, Node `v24.19.0`, see `ci-results/summary.json`):
- **Server suite:** **279 passed, 0 failed, 0 skipped** (includes `sprint2-rules.test.ts`, `sprint2-integration.test.ts`, `sprint1-integration.test.ts`, `loan.test.ts` N=50 two-worker serialization races, `migration-repair.test.ts`, `restart-e2e.test.ts`).
- **Client suite:** **65 passed, 0 failed, 0 skipped** (Vitest + TypeScript `tsc --noEmit` + Vite production build).
- **Playwright E2E suite:** **60 passed, 0 failed, 0 skipped, 0 flaky** across `desktop-chromium`, `tablet-chromium`, and `mobile-chromium` viewports.
