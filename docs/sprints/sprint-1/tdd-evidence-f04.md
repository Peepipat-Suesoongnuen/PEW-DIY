# F-04 Implementation and TDD Evidence

> **Recorded:** 2026-11-06 | **Revision:** 2 | **Scope:** Issue #11 request UI/API/schema only | **Status:** Implementation/test source at `6b4c35d`; documentation corrections local; independent peer review and F-05-dependent verification pending

## 1. Version and Environment

Current submitted implementation/test source: **`6b4c35dc8d45f88217905b050db75fd7ad5ff5e4`**, based on `4e4e62c` (merged PR #35). During PR #36 remediation, a fresh-database server rerun verified that submitted code directly. Only documentation is changed in this remediation. No GitHub CI pass, teammate approval or issue completion is claimed.

**Historical provenance (rev 1):** the initial tests ran on uncommitted local changes before `6b4c35d` existed; the fingerprint below records that actual candidate instead of inventing a tested commit for the earlier run. All 19 recorded source/test file hashes were rechecked against the current working files and match. Client/browser results below remain those earlier fingerprinted runs; they were not rerun for these documentation-only edits.

Changed source/test snapshot SHA-256: `e5550dddbd4aa9ad93fc880ff9ee96e04da40b36cedf5dd8b79c98b753affd97`. The file hashes in §6 identify the historical candidate and match the submitted implementation/test files; they are not relabelled as a different historical run.

Actual local engines: Windows; Node.js 24.14.0 for server/build/Playwright; Node.js 24.15.0 via temporary npm runtime for client Vitest (jsdom's declared engine minimum); PostgreSQL **18.4**, isolated temporary local cluster and separate API/browser test databases. The selected product baseline is PostgreSQL17; **this environment did not independently verify PostgreSQL17**. The latest reviewer reports a separate PostgreSQL17.11 / Node24.19 run; that is attributed separately below. PostgreSQL18 is verified in this local environment, not unverified globally. No development/production DB or external data was used. No fake Loan table/residue schema was created to unlock dependency-gated cases.

## 2. User Decision and Implementation

The user explicitly confirmed during this work session: **multiple units up to current available stock; no additional per-borrower cap; full return per loan**. SRS A-12/BR-01/BR-09 record that user-confirmed implementation choice as a new 2026-11-06 decision, not one falsely attributed to prior PRs. **PR #36 requests shared-team ratification before merge.** The user has said a confirmation exists and will supply its link/text; no such artifact has yet been received or found in Issue #11 comments, so team ratification is not claimed here. Requests remain non-reserving (BR-12). Return implementation is still Sprint2.

- Migration002 creates only borrowing_requests, positive INTEGER quantity, non-cascading User/Equipment foreign keys and owner/item indexes.
- POST /api/requests authenticates and requires Borrower before body validation, locks the Equipment row, re-reads stock, rejects unavailable/excess quantities, inserts the server-owned request and commits before success.
- GET list is owner-filtered for Borrower and submitted-only for Custodian. Existing foreign request IDs yield safe403; no private record appears in a denial.
- Request state is derived from the real Loan relation when #12 installs it; without loans the state is SUBMITTED. No approval, checkout, Loan DDL, return or reservation operation is added.
- React UI provides bounded quantity form, pending protection, success redirect, My/Submitted Requests list/detail, opaque-ID encoding, reload, unavailable/conflict/401/503 states and safe retry guidance.
- A stable session-expiry callback prevents protected-page effects from restarting and discarding the form when identity loading completes; the new tests exposed the previous callback-instability race.

## 3. Authentic RED → GREEN (TEST-F04-13)

Command: `npx vitest run server/tests/borrowing-request-unit.test.ts`.

**RED, before BR-01 implementation:** the new service guard was a no-op; the assertion `expect(() => assertRequestAvailable(0)).toThrow("INSUFFICIENT_AVAILABILITY")` failed with `expected [Function] to throw an error`. Actual result: **1 failed, 1 passed**. This was a behavior assertion failure, not a missing module or tool setup failure.

**GREEN:** implementing the guard and its RequestError code made the **same unchanged assertion** pass; result **2 passed**. A transient intermediate run exposed the error-message/code mismatch and it was corrected in the implementation, without weakening the test.

The RED/GREEN states were consecutive local edits during this session, not separate committed SHAs. The original no-op was `export function assertRequestAvailable(_available: number): void {}`. Current source and tests are fingerprinted below. Future commit evidence must not fabricate historical commits from these local runs.

## 4. Executed Results

| Check / command | Actual result | Scope / limit |
|---|---|---|
| `npm test` (fresh isolated database; checked-in migrations only) | **85 passed, 6 skipped**, 11 test files passed | Reproduced directly at `6b4c35d` during PR #36 remediation. `borrowing_requests.created_at DEFAULT now()` is present, but `loans` is absent. See [raw output](pr36-clean-db-results.txt). |
| `npx --yes --package=node@24.15.0 node node_modules/vitest/vitest.mjs run` (cwd client/) | **57 passed**, 7 files | Includes14 new F-04 UI/component cases; unit/component responses are explicitly mocked, not presented as DB evidence. |
| `npx playwright test --config e2e/playwright.config.ts` | **42 passed** | Real browser/app/API/migrated DB at desktop1280×800, tablet768×1024, mobile390×844; includes6 F-04 scenario runs. |
| `npm run build` | PASS | Server TypeScript production build |
| `npm --prefix client run typecheck` and `npm --prefix client run build` | PASS | Client type check and production build |

Real-DB/API tests: [borrowing-request.test.ts](../../../server/tests/borrowing-request.test.ts); domain RED/GREEN regression: [borrowing-request-unit.test.ts](../../../server/tests/borrowing-request-unit.test.ts); actual app process stop/start: [restart-e2e.test.ts](../../../server/tests/restart-e2e.test.ts); mocked UI tests: [borrowing-request.test.tsx](../../../client/src/test/borrowing-request.test.tsx); browser journey: [borrowing-request.spec.ts](../../../e2e/specs/borrowing-request.spec.ts). Commands used only isolated databases; reusable passwords/tokens/cookies are omitted. Browser passwords were generated transiently, passed through private process environment and never committed or printed.

### Separate reviewer-reported run (not merged into the local result)

[Latest PR #36 review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/36#pullrequestreview-5803634169) reports **91 passed / 0 skipped** on **PostgreSQL17.11 / Node24.19**, plus client57/57 and browser42/42. This is reviewer-reported evidence, not an independently reproduced run in this workspace. Its database relation inventory, setup SQL and raw output have not been supplied here.

The fresh local probe shows `requests=borrowing_requests`, `loans=null`, `created_at default=now()` before `npm test`, followed by **85/6**. The six skips are controlled by `loanRelationsExist()` (`to_regclass` for BOTH relations), not by the timestamp default. Repairing `created_at` alone cannot switch that gate. The checked-in migration002 creates only requests; the Loan migration belongs to #12.

Therefore **91/0 must remain a separately attributed reviewer result until the schema/setup evidence is reconciled**. Do not silently replace clean-database85/6 with91/0, invent Loan DDL to enable tests, or remove the existing PG18 evidence. Request the reviewer's relation inventory/setup/logs to determine why their six gated tests executed. Client/browser counts agree across the reports, but that does not establish identical database setup.

## 5. Per-STS Status and Remaining Scope

| STS | Actual evidence / outcome | Status |
|---|---|---|
| TEST-F04-01 | Real POST201 + fresh owner detail/DB read; generated ID/time/owner match | EXECUTED |
| TEST-F04-02 | Zero-stock409 and no inserted request/stock mutation | EXECUTED |
| TEST-F04-03 | Parameterized invalid/extra/type/quantity and malformed JSON400; no writes | EXECUTED |
| TEST-F04-04 | Unknown item404 and forged owner/status/time/id/loan fields400 | EXECUTED |
| TEST-F04-05 | A/B owner-filtered list and foreign detail403; browser denial also verified | EXECUTED |
| TEST-F04-06 | Real Custodian submitted queue/detail and create403 verified; checked-out exclusion/checkout workflow waits for actual #12 migration/behavior | PARTIAL — F-05 dependency |
| TEST-F04-07 | Repeated/competing requests leave stock unchanged verified; checkout→CHECKED_OUT/stock decrement still waits for #12 | PARTIAL — F-05 dependency |
| TEST-F04-08 | Actual application process stopped/started against same store without reseed; identical request JSON returned using valid session | EXECUTED |
| TEST-F04-09 | Quantity validation, pending/duplicate prevention, redirect/reload/detail, safe conflict/401/503, failed stock-refresh disabling, empty/denied states; real browser submit/reload across3 viewports | EXECUTED |
| TEST-F04-10 | Stock3 accepts quantity1/3 and repeated3; rejects4; stock remains3; no additional per-user cap | EXECUTED |
| TEST-F04-11 | All3 request routes reject anonymous/invalid/revoked sessions; staff creation denied; hostile Origin rejected | EXECUTED |
| TEST-F04-12 | Constructor-only test hook throws after INSERT/before COMMIT; fresh DB read shows rollback; safe500; clean retry succeeds | EXECUTED |
| TEST-F04-13 | Authentic local RED→GREEN as §3 | EXECUTED |
| TEST-F04-14 | Own200, existing foreign403, absent404 with no private payload | EXECUTED |

AC-F04-01/02/03/04/07/08/09/10 are verified for the implemented request-only candidate. AC-F04-05/06 remain **PARTIAL** because their fulfilled/checkout portions depend on Issue#12. Do not close Issue#11 or claim complete Product DoD from these results alone. Contract approval, substantive other-student review/integration, actual submitted-SHA evidence, full Loan lifecycle and eventual release/deployment verification remain separate obligations.

## 6. Changed Source/Test Hashes

| File | SHA-256 |
|---|---|
| `client/src/App.tsx` | `c83e58b59f68ff87e8cd159ad43fc97a8970a42bc90a1da544b028904fb674e1` |
| `client/src/components/AppShell.tsx` | `7ec05f3362634ce4b9afb464511916df71b485634c27af919c6c4742e4a30a0b` |
| `client/src/components/RequestToBorrow.tsx` | `237204ecd9b1796f60c3b2b1815f371946bdc4276fdfd757ed80b66096e8a322` |
| `client/src/lib/api.ts` | `7a0dabd9223a9ffb4079c8193e5db426b906c85a90ace63765e6f6130e7293cd` |
| `client/src/lib/paths.ts` | `73ede4b6a936d2d0c7151d8ad541a2e049bf19575c6bc0cda01e08fedbb1fdfc` |
| `client/src/lib/session.tsx` | `f04d3279ec98c4979bfa828c9fdee68e7b012a6b71c57f8f2b158349d07b369c` |
| `client/src/pages/ItemDetailPage.tsx` | `3f714c6f1f82e7685bb757fa017d9d000ffa251748647e440ccd48970b991ca2` |
| `client/src/pages/RequestsPage.tsx` | `88505ca90cd5054dd7cbfd156e2d93de2c09ffdae96bb8b34be9074d0ddff247` |
| `client/src/test/borrowing-request.test.tsx` | `d6f73d902cdc15fc01f012fa064c5f5a6044d42463b403876273f84c44038f64` |
| `e2e/specs/borrowing-request.spec.ts` | `04ab35a47f2d2641659ee674aac888c8b1de0635de7a0dcfd209b25bb0e2ff19` |
| `server/src/db/migrations.ts` | `177ae3d8b1d4e1e0390d3c214316581b8d2ba83e0195ac3addfbcb7b339342ad` |
| `server/src/routes/auth-routes.ts` | `91fe1a41b13759c6ff0222faef721ec91358acdf2314091cf10ad5438a5203bc` |
| `server/src/routes/request-routes.ts` | `9d4e24d855c23c4da6dffa56ad32e301ec513d2caff83d0ea32ab47d0953ebcd` |
| `server/src/services/authz.ts` | `b55d51470f611ba3f752c37457ee2e4dd3acabd59a527d2ba88876c1964a717d` |
| `server/src/services/borrowing-request.ts` | `b830492b3c74829cfb195bdf4c61807b07279a8feb00f5e21e2598d6b14abdfa` |
| `server/tests/borrowing-request-unit.test.ts` | `577adfecd38b73326630b8da7a3b20cbbcfb93baf6610668873a8d024acedc23` |
| `server/tests/borrowing-request.test.ts` | `0a82246a9b477ce1c598473bb9cf6c8e06a07b975067a8ed4c0c064ab65f1ab2` |
| `server/tests/harness.ts` | `b39ce6d6055f9ccbf2de16da6bcddaab742ca6e92ee29dd9bd9e307cb9919f3c` |
| `server/tests/restart-e2e.test.ts` | `394db30a28c0f4b023224394cf9b9baa7b2b2bb27f71995edd2ed185b8f52cb9` |

## 7. Reproduction Handoff

Use the checked-in dependency lockfiles and a compatible Node runtime. Create isolated development/test PostgreSQL databases, supply the documented configuration privately, run npm ci (root and client), npm run migrate, the synthetic seed with private seed inputs, client build and the commands above. `TEST_DATABASE_URL` must name an isolated test database: existing tests deliberately reset fixture data. Browser E2E must use the same selected APP_ORIGIN/PORT/E2E_BASE_URL and a separate seeded test database, not production.

After #12 installs actual Loan migration/checkout behavior, re-run TEST-F04-06/07 and the6 skipped integration cases from a clean database using real migrations. Do not invent Loan DDL in this feature to manufacture a pass. Record resulting actual files/commands/SHA/results before promoting partial AC status.

## 8. PR #36 Remediation Record

- Reproduced the submitted source on a new database using real checked-in migrations; raw output records PostgreSQL18.4 / Node24.14.0, `DEFAULT now()`, no Loan relation, and85/6.
- Preserved the reviewer-reported PG17.11 / Node24.19 result91/0 as a separate, unreconciled run rather than falsifying environment or counts.
- Aligned F-03 quantity references and repaired malformed ASCII separators in the affected engineering documents.
- Team-ratification provenance is explicitly pending the promised confirmation artifact; no confirmation comment, approval or merge is fabricated.
