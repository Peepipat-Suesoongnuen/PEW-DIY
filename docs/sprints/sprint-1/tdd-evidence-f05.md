# F-05 local implementation and verification evidence

Issue [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12), contract [F-05 revision3](f-05-checkout-active-loan.md). Local candidate on `feature/12-checkout-active-loan`, based on merged PR #36 (`de63590be05c8bb22c594be2ac6affe69f73ad8c`). No commit/push/PR/review/release was performed for this change. [SHA-256 source manifest](f05-source-manifest.json) identifies the tested candidate; HEAD alone does not identify these uncommitted changes.

## Decisions and authoritative sources

- Read `group_work_specs_v1.pdf` p.5 (Theme2: checkout, availability, exclusive-stock rejection, Borrower/Custodian access) and `project_deliverable_1_v1.pdf` pp.4/7 (contracts, STS, meaningful TDD and versioned execution evidence) from the supplied local `lab-document/` folder.
- Use SRS FR-14/15/16, BR-02/03/07/11/12 and NFR-04/05/06; F-05 rev2 was already recorded before implementation. No approval/return/overdue/reporting scope was added.
- PR #36 is merged. Its [final review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/36#pullrequestreview-5804196743) explains earlier 85/6 fresh-DB versus 91/0 residue-DB results; neither is relabeled as this run. A-12 remains user-confirmed with team ratification pending shared-baseline closure. Apply multi-unit up to stock, no additional borrower cap and full checkout per request.
- During this implementation the user explicitly confirmed **“ยืนยันใช้ Asia/Bangkok”** in response to the calendar-policy question. SDS revision6 records UTC event instants, Asia/Bangkok checkout date +7 calendar days, and fail-closed missing/invalid timezone. This is user confirmation, not an invented teammate approval.

## Actual results

| Check | Actual result | Artifact |
|---|---|---|
| Server, fresh isolated DB with only checked-in migrations001–003 | **115 passed, 0 skipped, 13 files** | [server output](f05-server-results.txt) |
| Client component/page suite | **70 passed, 8 files** | [client output](f05-client-results.txt) |
| Chromium browser E2E, three viewports | **51 passed, no retries needed** | [browser output](f05-browser-results.txt) |
| Two independent API processes | **50 distinct-request races +1 same-request race**, every outcome201/409 | [all race outcomes and worker PIDs](f05-race-results.json) |
| Server build, client typecheck and production build | PASS (exit0) | `npm run build`, `npm --prefix client run typecheck`, `npm --prefix client run build` |

Server/browser execution: Windows, Node24.14.0, PostgreSQL**18.4**, Vitest5.1.0 and Playwright1.64.1. Client suite: Node**24.15.0** through temporary `npx --package=node@24.15.0` because installed jsdom31 requires a newer runtime than the locally installed Node24.14.0. Dependency locks were not changed. The selected production database remains PostgreSQL17: **this candidate has not been independently verified on PG17**, and no old reviewer result is attributed to it.

The final server DB `pewdiy_f05_final_20261107` was newly created, migrated before Vitest discovery, and not seeded with residue Loan tables. Previously relation-gated F-03/restart cases run against the real migration003, with zero skips. The dedicated browser DB was `pewdiy_f05_browser_final_20261107`. F-05 browser scenarios create isolated temporary schemas with their own users/catalog/migrations and clean them afterward. Synthetic fixtures do not resolve OQ-01.

## STS and acceptance coverage

Executable files: [loan-unit.test.ts](../../../server/tests/loan-unit.test.ts), [loan.test.ts](../../../server/tests/loan.test.ts), [test-only worker](../../../server/tests/fixtures/loan-worker.ts), [client loan.test.tsx](../../../client/src/test/loan.test.tsx), [checkout.spec.ts](../../../e2e/specs/checkout.spec.ts). Worker/fault/clock seams live in test code or constructor dependencies; no production HTTP/config option activates them.

| STS | AC | Actual verification / outcome |
|---|---|---|
| TEST-F05-01 | 01 | API201, one persisted loan, server owner/item/quantity/actor/time/date, catalog available0, Borrower request CHECKED_OUT and own loan retrieval |
| TEST-F05-02 | 02 | Competing stale request gets409 INSUFFICIENT_AVAILABILITY, no extra loan; browser stale qty2 with only1 remaining rejected |
| TEST-F05-03 | 03 | Repeated checkout409 ALREADY_CHECKED_OUT, one loan/effect |
| TEST-F05-04 | 04 | N50 fresh independent races; two separately spawned Node API workers, separate pools/connections, per-call IPC barrier and one HTTP call per worker; every race one201/one409, count1, held1, available0 |
| TEST-F05-05 | 03/04 | Same request raced across the same two independent workers; one201/one409 ALREADY_CHECKED_OUT and unique request linkage |
| TEST-F05-06 | 05 | Pause after INSERT/before commit; independent pool connection sees prior stock and zero new loans; injected failure500 rolls back; retry201. Also supplies actual dirty-read evidence for TEST-F03-10 |
| TEST-F05-07 | 06 | Exact Bangkok dates immediately before/at local midnight, year and leap-month boundaries; additional DST-zone vector distinguishes calendar arithmetic from elapsed168h |
| TEST-F05-08 | 06 | Fixed instant 2026-12-27T17:00:00Z → Bangkok2026-12-28 → due2027-01-04 in response and stored DATE |
| TEST-F05-09 | 07 | Anonymous checkout/loan list/detail401; Borrower checkout403; hostile Origin403; expanded protected-route inventory covers invalid/revoked sessions |
| TEST-F05-10 | 08 | Owner-only loan list/detail200, foreign active ID403 with safe envelope, absent404, staff general loan list/detail403; returned fixture excluded without adding a return endpoint |
| TEST-F05-11 | 09 | API-created loan survives stopping the **production entrypoint** `server/src/index.ts` and starting a new process on the same DB without seeding; all response fields identical, availability unchanged and repeated checkout409 |
| TEST-F05-12 | 10 | Nine real-DB F-05 browser runs: hold-before-commit, forced rollback and stale conflict × desktop/tablet/mobile; empty staff queue/own loans, pending disabled/no premature success, committed details, Borrower reload, backend role/owner denials, refresh and no horizontal overflow. Component tests add safe uncertain-network/session/error states |
| TEST-F05-13 | 11 | Injected owner/actor/quantity/date/status/link fields, array/null bodies and NUL ID400; unknown request404; zero writes |
| TEST-F05-14 | 12 | User-recorded A-12: qty2/full fulfillment, insufficient stale qty2 rejected, qty200 accepted within stock after other loans (no extra borrower cap); shared-team ratification remains pending |
| TEST-F05-15 | 02/04 | Retained intended stock rejection assertion RED then GREEN; invalid held/total/fractional/nonpositive quantities rejected; available exclusive unit allowed |
| TEST-F05-16 | 01/04 | Pooled total3 with two qty1 loans → held2/available1, not incorrectly exclusive |

All16 STS designs have executed local coverage. This does **not** mark shared-baseline approval, integration, release or Product DoD complete. In particular AC-F05-12's policy is user-confirmed; independent team-ratification evidence is still needed for baseline closure. Issue #11's formerly deferred fulfilled-request exclusion and submitted→checked-out transition are additionally exercised here, without altering its historical request-only test results.

## Authentic local RED → GREEN

No RED commit exists: commits were not authorized. The initial local version of `server/src/services/loan.ts` had this deliberate pre-implementation stub:

```ts
export function assertCheckoutAvailable(total: number, held: number, quantity: number): void {}
```

Before implementing the rule, `npx vitest run server/tests/loan-unit.test.ts` actually ran the intended assertions on 2026-11-07 at00:33:23 local time. Its retained result excerpt:

```text
FAIL server/tests/loan-unit.test.ts > F-05 checkout invariant (TEST-F05-15)
  > rejects an unavailable exclusive unit
AssertionError: expected [Function] to throw an error
expect(() => assertCheckoutAvailable(1, 1, 1)).toThrow("INSUFFICIENT_AVAILABILITY");
Test Files 1 failed (1)
Tests 1 failed | 1 passed (2)
```

Then implemented integer/invariant checks and rejection of `quantity > total - held`. The original rejection and available-unit assertions were preserved; additional quantity/date boundary cases were added. The same command at00:35:04 produced:

```text
Test Files 1 passed (1)
Tests 12 passed (12)
```

The final fresh-DB full-suite run includes those12 unchanged assertions and 12 real-DB F-05 scenarios. These are actual local execution excerpts, not fabricated Git history or a collection/setup failure. Base SHA and final source fingerprint distinguish the uncommitted final version; a reviewed committed-version rerun remains part of the handoff.

## Reproduction

Use a dedicated disposable PostgreSQL test database. Set required values from `.env.example`, `APP_TIMEZONE=Asia/Bangkok`, and both database URLs to that isolated test DB for the server run. Never print/share passwords or cookie values. Apply migrations to the test DB before collection so relation probes enable existing F-03/restart tests:

```powershell
npm run migrate
$env:F05_RACE_EVIDENCE='docs/sprints/sprint-1/f05-race-results.json'
npm test
npm run build
npm --prefix client run typecheck
npm --prefix client run build
# Exact runtime used for the client suite (run from client/):
npx --yes --package=node@24.15.0 node node_modules/vitest/vitest.mjs run
```

For browser tests, use a separately migrated test DB and fresh locally supplied seed passwords. Set `PORT=3143`, `APP_ORIGIN=http://localhost:3143`, `E2E_BASE_URL=http://localhost:3143` and `TEST_DATABASE_URL` to that dedicated DB, run `npm run seed`, then `npx playwright test --config e2e/playwright.config.ts --workers=3`. F-05 uses temporary schemas; the test role needs CREATE SCHEMA permission. Local restart tests use ports3123/3158; race/browser test workers listen on OS-assigned loopback ports. No Docker or external deployment was used.

Pending: human commit/push/PR, peer review, A-12 team-ratification artifact, shared-baseline acceptance, PostgreSQL17 candidate verification and later F-10 integration/release evidence. The task did not write GitHub comments, modify Issue/Project state or merge anything.
