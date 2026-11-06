# F-03 TDD Evidence — RED → GREEN (Issue #10, Equipment Availability)

> **Issue:** [#10 — D1-06.3](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) · **Contract:** `f-03-equipment-availability.md` (D1-05 Part E) · **Data model:** `docs/system-sds.md` §3.1/§3.3 (D1-03)
> **Rule (Product DoD):** authentic RED (assertions fail for the intended behavior before implementation) then GREEN, with commands/results preserved.

## Cycle 1 — Derivation, aggregate read, integrity boundary

**RED** (`npx vitest run server/tests/availability.test.ts`, tests written first):

```
× computes total minus held with exact zero/positive boundaries (TEST-F03-01)
× rejects invalid aggregate inputs explicitly — never clamps (TEST-F03-05)
× shows correct values for clean fixtures as both roles... (TEST-F03-03)
× aggregates all active loans for the item without exposing loan/borrower details (TEST-F03-02)
× a submitted request alone leaves availability unchanged (AC-F03-03 first half)
× a committed quantity-one loan flips E-ONE 1/AVAILABLE → 0/UNAVAILABLE (AC-F03-03 second half)
× a fully returned loan contributes zero held units (edge, D1-03 §3.3)
× returns 500 INTERNAL_ERROR with requestId and leaks no quantity/stack/loan data (TEST-F03-06)
× rejects non-positive loan and request quantities at the database boundary (AC-06.3-03)
Test Files  1 failed (1) · Tests  9 failed (9)
```

**Gaps proven:** (a) no integrity error type/validation existed — invalid aggregates were silently accepted and `held > total` produced a negative `available`; (b) held was hard-coded to `0` (`toView(..., deriveAvailability(total, 0))`) so active loans were invisible to the API; (c) the Request/Loan persistence from the approved data model (D1-03 §3.1) did not exist, so no held source could be read; (d) no data-layer positive-quantity constraints.

**Implementation (same cycle):**
1. `server/src/db/migrations.ts` — migration 002: `borrowing_requests` + `loans` per D1-03 §3.1 exact shape (Loan resolves borrower/equipment through its request; `request_id` UNIQUE = one loan per request; CHECKs `quantity_requested > 0` / `quantity_borrowed > 0` = D1-03 integrity rules backing AC-06.3-03). Ownership recorded in the migration header: schema only — request/checkout business logic and the checkout transaction stay F-04 (#11) / F-05 (#12) per f-03 §4 / f-05 §3.
2. `server/src/services/catalog.ts` — `AvailabilityIntegrityError`; `deriveAvailability(total, held)` validates integers/`total >= 0`/`held >= 0`/`held <= total` and throws explicitly (**never clamps**); aggregate read = **single SQL statement** with `Equipment → borrowing_requests → loans` linkage summing `quantity_borrowed` of active loans (`returned_at IS NULL`) — one statement snapshot avoids mixed total/held (f-03 §4).
3. `server/src/routes/equipment-routes.ts` — `AvailabilityIntegrityError` → **safe 500 `INTERNAL_ERROR`** + requestId + **redacted** warning (no quantities/SQL/loan rows in the log or body; f-03 §2/§4).

**GREEN** (`npx vitest run server/tests/availability.test.ts`):

```
Test Files  1 passed (1) · Tests  9 passed (9)
```

## Cycle 2 — Restart persistence (TEST-F03-09)

Test added first in `server/tests/restart-e2e.test.ts` (real process stop/start):
persisted active loan fixture (total 2 / held 1) → assert `1/AVAILABLE` before hard restart → restart → same `1/AVAILABLE` from the same durable store.

**GREEN:** `Tests  2 passed (2)` (original TEST-F02-10 process-restart evidence + TEST-F03-09) — availability is derived from persisted rows, so restart recomputes the identical result (AC-06.3-05).

## Cycle 3 — UI rule: loading/failed fetch is not zero stock (TEST-F03-08, implementable part)

Test added first in `client/src/test/catalog-page.test.tsx`: delayed read renders the loading state **without any fabricated quantity**; a failed (503) refresh shows the safe error and **no stock figure at all** (f-03 §3: "Loading/failed fetch is not zero stock"; never label stale/absent data as confirmed current).

**GREEN:** `client` suite `Tests  43 passed (43)`.

## Cycle 4 — Scope MOVE per team decision (2026-11-06): DDL to #11/#12

The Issue #10 independent audit found the Request/Loan DDL conflicts with
contract ownership (f-03 §4 line 68, f-04 §3, f-05 §3: "F-04/F-05 create
Request/Loan relations"). Team resolution: **MOVE** —

- Migration 002 removed from #10; the exact schema/constraints/indexes that
  #11 (`borrowing_requests`) and #12 (`loans`) must implement are documented
  in the handover note in `server/src/db/migrations.ts`.
- The F-03 aggregate read (services/catalog.ts) keeps its Equipment→Request→
  Loan linkage query and now probes for the relations at read time
  (PostgreSQL `to_regclass`, documented per f-03 §4): while they are absent,
  held is definitionally zero ("no loans possible yet" boundary). Both read
  variants remain single statements (no mixed snapshot, f-03 §4).
- Real-DB loan-dependent tests are **dependency-gated** (`describe.skipIf`,
  auto-enable when the relations land) — assertions verbatim from the RED
  phase, never weakened. Handover: TEST-F03-02, AC-F03-03 (both halves), the
  returned-loan edge case, the AC-06.3-03 data-layer CHECKs and TEST-F03-09
  (restart + loan fixture).

**Gate verification (real runs):** on a clean scratch DB without the
relations: `Tests 4 passed | 5 skipped` (runnable = TEST-F03-01/03/05/06;
gated = the five loan-dependent tests) and the equipment-only aggregate path
serves correct values; on the current test DB (relations present from the
pre-MOVE development migration) the gated tests run and pass against the
linkage path. Both code paths therefore execute real reads.

## Test results (post-MOVE, all suites)

| Suite | Command | Result |
|---|---|---|
| Server (runnable F-03 tests + existing suite) | `npm test` | **65/65 passed** (9 files) — with the pre-MOVE residue relations present, the 5 gated tests also execute and pass; on a clean DB they skip until #11/#12 ship DDL |
| Client | `npm --prefix client test` | **43/43 passed** |
| Core UI E2E (3 viewports) | `npm run test:e2e` | **36/36 passed** |
| Builds / typecheck | `npm run build`, `build:client`, client `tsc --noEmit` | exit 0 |

## Contract test mapping (f-03 §6) and deferred dependencies (post-MOVE)

| Contract test | Status here | Evidence |
|---|---|---|
| TEST-F03-01 (unit boundaries) | ✅ RUN | availability.test.ts |
| TEST-F03-02 (two active loans aggregate) | ⏳ **DEPENDENCY-GATED → #11/#12 schema** | availability.test.ts (skipIf; auto-enables) |
| TEST-F03-03 (clean values both roles, 401s) | ✅ RUN | availability.test.ts |
| TEST-F03-05 (invalid aggregates rejected) | ✅ RUN | availability.test.ts |
| TEST-F03-06 (inconsistent aggregate → safe 500) | ✅ RUN | availability.test.ts (controlled data-access seam) |
| TEST-F03-08 (UI loading/error ≠ zero) | ✅ PARTIAL | client catalog-page.test.tsx — the request-affordance/conflict halves belong to #11/#12 UI |
| TEST-F03-09 (restart persistence, loan fixture) | ⏳ **DEPENDENCY-GATED → #11/#12 schema** | restart-e2e.test.ts (skipIf; auto-enables) |
| AC-F03-03 (non-reservation + committed-loan flip) | ⏳ **DEPENDENCY-GATED → #11/#12 schema** | availability.test.ts (skipIf; auto-enables) |
| AC-06.3-03 data-layer CHECKs | ⏳ **DEPENDENCY-GATED → #11/#12 DDL** | availability.test.ts (skipIf; auto-enables) — business layer half ✅ RUN (TEST-F03-05) |
| TEST-F03-04 (F-04→F-05 full checkout journey) | ⏳ dependency-gated | F-04 (#11) + F-05 (#12) features |
| TEST-F03-07 (cross-role checkout E2E) | ⏳ dependency-gated | needs #11/#12 journeys |
| TEST-F03-10/11 (checkout transaction barriers, competing checkouts) | ⏳ F-05 owned | f-03 §6: "supplements F-05 atomicity checks"; NFR-05 verified at #12 |

## Notes

- **Non-reservation model** (SDS §3.2 proposal, f-03 §2 rule 2): a submitted request contributes zero held units — the test is dependency-gated with the schema; the model remains an **OPEN gate** (f-03 §7 "review of SDS non-reserving requests") — NOT treated as approved by this work. **→ Resolved 2026-11-06 (after this evidence was written):** team decision **Direction A** confirms the model — SRS BR-12/A-11 added and the f-03 §7 gate closed accordingly (docs updated in this PR).
- **Contract baseline gate also remains OPEN** (f-03 header "not approved for implementation"; §7 open gates) — the confirmed invariant is BR-03's formula only. **→ Header updated 2026-11-06:** "Contract approval: Pending team baseline approval" — the gate stays OPEN until the team baselines the contracts.
- **No stored availability counter** (f-03 §4): values are derived at read time; "update after checkout" therefore requires no availability write — a committed loan row changes the next fresh read (gated test), and the real checkout trigger is F-05's transaction (Issue #12, "ผูกกับ #12" per Issue #10 task 3).
- **No clamping** (f-03 §2): `held > total` raises `AvailabilityIntegrityError` → safe 500; `max(0, …)` is deliberately absent.
- **OQ-02 unchanged:** every scenario uses quantity-one loans (f-03 §2); no multi-unit policy is assumed.
- **Dev/test DB residue:** the pre-MOVE development migration left empty `borrowing_requests`/`loans` tables in the local dev/test databases (0 rows — verified). Left in place deliberately (no DROP without team sign-off); #11/#12 migrations should assert shape or the team may drop the empty residue before landing their DDL.
