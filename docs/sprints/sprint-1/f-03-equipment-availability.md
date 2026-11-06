# F-03 — Equipment Availability

> **Deliverable:** D1-05 Part E | **Implementation issue:** [D1-06.3 / #10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10)
>
> **Revision:** 4, 2026-11-06 | **Contract approval:** Pending team baseline approval and peer review — the Direction A points (Non-reservation + Direct Checkout) are **Confirmed** by team (2026-11-06); other draft proposals in this file remain unapproved | **Implementation status:** Implemented (Issue #10) | **Test status:** Partially executed — results in [tdd-evidence-f03.md](tdd-evidence-f03.md)
>
> **Execution status:** TEST-F03-01/03/05/06 executed (green) and TEST-F03-08 UI halves executed at component level — commands, outputs and RED→GREEN history in [tdd-evidence-f03.md](tdd-evidence-f03.md). TEST-F03-02 and the loan-fixture halves of AC-F03-03/AC-06.3-03 are **dependency-gated** on the Request/Loan schema owned by #11/#12 (auto-enable when present). TEST-F03-04/07/09/10/11 remain **PLANNED — NOT RUN** (need F-04/F-05 features or schema). The rev 1 statement below described the rev 1 baseline only: "Every test PLANNED — NOT RUN. No availability code, migration or executable test exists at this baseline." Rows without a recorded run remain **PLANNED — NOT RUN**; nothing is marked PASS without evidence.

## 1. Requirement Links, Scope, and Dependencies

Sources: [SRS](../../srs.md) rev 4, [Feature Inventory](../../features.md) rev 1, [System SDS](../../system-sds.md) rev 4 §3.3/§6, and [sprint plan](../plan.md). The course basis is D1 §3.5 (PDF p.4) and group specification §8.2 (PDF p.10). Shared payload/access/error conventions and synthetic data are in [shared conventions](shared-conventions.md) and [fixtures](fixtures.md).

| Basis | F-03 responsibility / enforcement owner |
|---|---|
| FR-07, A-01/A-04, BR-03 | Derive/display Available Quantity from aggregate catalog stock and persisted held units; represent single-unit exclusivity as the quantity invariant. |
| BR-01 / F-04 | Supply authoritative DB availability for request-time validation; non-reservation is **Confirmed** by team decision (Direction A, 2026-11-06; SRS BR-12). |
| BR-02/03, NFR-05 / F-05 | Supply checkout availability; F-05 enforces stock/repeated-checkout/concurrency rejection using DB transactions. |
| BR-11, NFR-04 (S1) | Derivation reads persisted loans/catalog after restart; F-10 coordinates evidence. |
| NFR-06 (checkout S1) | F-05 writes atomically; F-03 must not publish an uncommitted quantity as a successful post-checkout result. |
| NFR-01/02 / F-01 | Equipment/availability reads require real authentication and allow both defined roles. |

Dependencies: F-01 protected reads; F-02 Equipment records/shared list/detail representation; F-04/F-05 persisted request/loan relations and transaction services. F-03 can be unit-specified before checkout exists, but its real-DB post-checkout verification depends on F-05. No separate stock endpoint, editable stock counter, approval/reservation system, return API, overdue calculation, history view or catalog management is introduced here.

## 2. Domain Behavior, Workflow, and Boundary Rules

The invariant is Confirmed by SRS BR-03; the non-reserving request behavior is **Confirmed** by team decision (Direction A, 2026-11-06; SRS BR-12) and the derived read-time implementation below elaborates SDS §3.2–§3.3:

```text
held(item)               = sum(quantity still held by its active loans)
quantity_available(item) = quantity_total(item) - held(item)
valid state              = 0 <= held(item) <= quantity_total(item)
availability             = AVAILABLE if quantity_available >= 1,
                           otherwise UNAVAILABLE for a valid zero result
```

1. On an authenticated catalog/detail read, query persisted Equipment and its held quantities using a consistent DB read; return both quantity and label from that same result.
2. In Sprint 1 an active loan contributes its positive `quantity_borrowed`. A submitted request has no Loan and contributes zero under the confirmed non-reservation model (Direction A, 2026-11-06). No mutation is performed by reading availability.
3. F-04 validates current DB availability when creating a request. F-05 rechecks current DB availability in its serialized checkout transaction; an earlier UI quantity is never an allocation guarantee.
4. Once F-05 commits a quantity-one checkout of E-ONE, a subsequent fresh read returns `0/UNAVAILABLE`. Repeated or competing checkout cannot consume the same exclusive unit twice.
5. After an app restart, compute the same result from the same persisted catalog/loan rows. Do not reconstruct held stock from browser memory or a process-local counter.

**Boundary handling:** total zero/held zero is valid and unavailable; total one/held one is unavailable; total three/held two is one available. Negative totals, nonpositive/noninteger held contributions or held greater than total are invalid data, not normal stock levels. Prevent invalid writes at the owning service/DB boundary. If invalid stored data is detected on read, return a safe internal error and record a redacted diagnostic; do not clamp with `max(0, available)` or silently hide overselling as valid zero stock.

The quantity choice is recorded by the user in SRS A-12: multiple units up to available stock, no additional per-borrower cap and full return per loan. PR #36 requires team ratification before merge; this is a governance gate, not permission to assume a one-unit restriction or unlimited stock. Every unconditional checkout scenario below uses quantity one. Multiple independent quantity-one loans illustrate aggregation without deciding the maximum units of one loan. Future partial-return accounting remains conditional on the coupled OQ-02/BR-09 decision; no return behavior is implemented in Sprint 1.

## 3. UI Specification

F-03 extends F-02 catalog rows and item detail with `quantity_available` and an accessible `Available`/`Unavailable` label. Total quantity and available quantity must remain visibly distinct. Use server values; no client-supplied “available” flag or hidden browser stock count can authorize borrowing.

For a Borrower, a valid zero result disables the F-04 request affordance with an explanation. A positive result allows navigation to F-04 but does not promise allocation. Custodian sees the same stock readout; checkout authorization/validation belongs to F-05. Refresh the relevant item after successful checkout or a stock conflict. Do not display checkout success or decrement the authoritative quantity before the server commits.

Loading/failed fetch is not zero stock. Show a loading/error state until a trustworthy response is available; never leave an old quantity labelled as confirmed current after a failed refresh. F-01 governs 401/logout cache clearing. No stock editing UI, search/filter, return action or history UI is changed by F-03.

## 4. API and Data Specification

**No new endpoint:** F-03 extends `GET /api/equipment` and `GET /api/equipment/{equipmentId}` from [F-02](f-02-equipment-catalog.md). Both remain protected and accept no client-supplied availability update.

| Response field | Contract |
|---|---|
| `id`, `name`, `description`, `category`, `quantity_total` | F-02 representation; IDs are opaque strings. |
| `quantity_available` | Integer equal to the persisted-state formula; `0 <= quantity_available <= quantity_total` for valid data. |
| `availability` | Exactly `AVAILABLE` or `UNAVAILABLE`, consistent with the quantity in the same object. |

Proposed example for an isolated E-ONE fixture after one committed quantity-one checkout: its equipment object's `quantity_total=1`, `quantity_available=0`, `availability="UNAVAILABLE"`. There is no request/loan/user list inside that object. List and detail return the same values when no intervening state change occurs. Each API read must avoid a mixed snapshot such as a new total with stale held units; engine-specific query/isolation behavior must be fixed after SDS-OQ-01.

The safe error envelope is the [shared](shared-conventions.md) `error.code/message/requestId` object. F-02 owns 401/not-found behavior. Proposed availability-specific internal integrity failure uses `500 INTERNAL_ERROR`; do not return the invalid negative quantity or detailed loan rows. DB unavailability uses safe `503 SERVICE_UNAVAILABLE`, not a fabricated `0/UNAVAILABLE`. Checkout insufficient-stock rejection is F-05's 409 result, not an error returned for an ordinary zero-stock GET.

**Data/migration changes:** no extra persisted `quantity_available` counter or stock table is proposed. **Schema ownership (team decision — MOVE, 2026-11-06):** the BorrowingRequest DDL is owned by **#11 (F-04)** and the Loan DDL by **#12 (F-05)** — matching this contract's original allocation below — and the exact schema/constraints/indexes those migrations must create are recorded in the handover note in [`server/src/db/migrations.ts`](../../../server/src/db/migrations.ts). F-03 adds only the aggregate read/query or view, with Equipment→Request→Loan linkage; it must not create Request/Loan DDL itself (no duplicate migrations). Engine-specific index/query/view migrations must be documented if introduced after stack selection; do not claim a view migration exists. No auth, role or credential schema change is needed here. The transaction protocol belongs to F-05 and SDS §3.3; an in-process lock cannot substitute for database consistency.

## 5. Acceptance Criteria

> **Rev 1 wording (retained as history per course spec §8.3):** "Every row is a proposed criterion, PLANNED — NOT VERIFIED."

**Status per row (rev 3, 2026-11-06 — PR #35 re-review):** the last column records each AC's state against actual evidence (`EXECUTED (green)` / `PARTIAL` / `DEPENDENCY-GATED` / `PLANNED — NOT RUN`). An AC is **not** marked verified from unit/component or residue-DB evidence alone where acceptance requires real-DB integration after the real #11/#12 migrations. Outputs and RED→GREEN history: [tdd-evidence-f03.md](tdd-evidence-f03.md); tested SHA `5978061` (implementation `17d70bf`).

| ID | Acceptance outcome | Requirement basis | Status (evidence) |
|---|---|---|---|
| AC-F03-01 | For valid persisted stock, available quantity equals total minus held units, with exact zero/positive label boundaries; aggregation includes all active loans for the item. | FR-07, A-01/A-04, BR-03 | **PARTIAL** — boundaries EXECUTED (green) via TEST-F03-01 (unit); real-DB aggregation of all active loans DEPENDENCY-GATED (TEST-F03-02 → #11/#12 schema) |
| AC-F03-02 | Authenticated list/detail responses show matching derived values when no write intervenes; both roles may read, anonymous/invalid credentials are denied, and no borrower/loan/credential data is exposed. | FR-07, NFR-01/02 | **EXECUTED (green)** — TEST-F03-03, API/DB integration on real DB (`server/tests/availability.test.ts`); clean-DB and residue-DB runs agree; SHA `5978061` |
| AC-F03-03 | A submitted request alone leaves availability unchanged under the confirmed non-reservation model (Direction A, 2026-11-06; SRS BR-12); a committed quantity-one checkout of E-ONE changes its fresh read from `1/AVAILABLE` to `0/UNAVAILABLE`. | FR-07, BR-02/03/12, SDS §3.2/3.3 | **DEPENDENCY-GATED / PLANNED — NOT RUN** — fixture-level halves need the #11/#12 Request/Loan schema (auto-enable via skipIf); full journey TEST-F03-04 is PLANNED — NOT RUN (needs F-04/F-05 features) |
| AC-F03-04 | Valid zero stock is returned successfully. Invalid aggregate inputs/state are rejected or reported as safe internal errors; negative availability is neither published as valid data nor clamped to zero. | BR-03, SDS §3.3 | **EXECUTED (green)** — all linked tests ran at SHA `5978061` (impl `17d70bf`): TEST-F03-01/05 (unit rejection, no clamp) + TEST-F03-06 (API seam safe 500) in `server/tests/availability.test.ts`, and the zero-stock read is covered on real DB by TEST-F03-03 (E-ZERO). Note: the separate DB-boundary rejection of invalid **writes** is AC-06.3-03's data-layer CHECKs — DEPENDENCY-GATED on #11/#12 DDL (per TEST-F03-06's own deferral note to F-02/F-05 DB tests) |
| AC-F03-05 | UI distinguishes total/available, positive/zero, loading/error and stale data; zero disables a Borrower request affordance, while stock conflict/success triggers fresh server read rather than client authority. | FR-07, SDS §5 | **PARTIAL** — loading/error-never-zero halves EXECUTED (green) via TEST-F03-08 (client component, `client/src/test/catalog-page.test.tsx`); request-affordance and conflict/re-fetch halves are PLANNED — NOT RUN (#11/#12 UI) |
| AC-F03-06 | Restart against the same store preserves derived availability; a rolled-back checkout leaves it unchanged; DB failure does not masquerade as zero stock. | BR-11, NFR-04/06 (S1) | **DEPENDENCY-GATED / PLANNED — NOT RUN** — restart leg TEST-F03-09 needs #11/#12 schema (loan fixture, auto-enables via skipIf); rollback leg is F-05's protocol (PLANNED — NOT RUN); DB-failure→503 leg verified at F-02 (TEST-F02-09) |
| AC-F03-07 | Checkout validation reads authoritative current stock under F-05's transaction protocol; a stale positive UI value cannot allow another checkout once E-ONE is held, and no read mixes committed/uncommitted allocation state. | BR-02/03, NFR-05/06 (F-05 enforcement) | **PLANNED — NOT RUN** — F-05 (#12) enforcement (TEST-F03-10/11) |

## 6. Software Test Specification

**Rev 1 baseline (historical): at that baseline, every row was PLANNED — NOT RUN; actual test file/command/result/tested SHA: NOT AVAILABLE.** Retained verbatim as history per course spec §8.3 — it is **not** the current status; the per-row execution status in the table below is authoritative. Real DB integration is required for authoritative stock/persistence/transaction claims. Unit/component tests are complementary evidence. Fixture symbols, account roles and clean-reset procedures come from [fixtures](fixtures.md).

**Execution status per row (rev 3, 2026-11-06 — PR #35 re-review):** the last column records `EXECUTED (green)` / `PARTIAL` / `DEPENDENCY-GATED` / `PLANNED — NOT RUN` with the actual test file, command, result and tested SHA (outputs and RED→GREEN history in [tdd-evidence-f03.md](tdd-evidence-f03.md)). Verified at SHA `5978061` (implementation `17d70bf`); rows without a recorded run remain **PLANNED — NOT RUN**.

| Test ID / linked AC | Level | Concrete precondition/input | Action | Expected result | Execution status (file · command · result · tested SHA) |
|---|---|---|---|---|---|
| TEST-F03-01 / AC-F03-01, AC-F03-04 | Unit | `(total, held)` cases `(0,0)`, `(1,0)`, `(1,1)`, `(3,2)` with integer quantities | Execute pure availability/label calculation for each case | Respectively `0/UNAVAILABLE`, `1/AVAILABLE`, `0/UNAVAILABLE`, `1/AVAILABLE`; no clamp or mutation. | **EXECUTED (green)** — `server/tests/availability.test.ts` · `npx vitest run server/tests/availability.test.ts` · green (part of clean-DB 4 passed) · SHA `5978061` (impl `17d70bf`) |
| TEST-F03-02 / AC-F03-01 | API/DB integration | E-MANY total 3; two distinct active loans of quantity 1, one for B-A and one for B-B, each linked through its own request; authenticated C-A | Read E-MANY through list and detail | Each result is total 3, available 1, `AVAILABLE`; both persisted loan contributions included. No borrower/loan details exposed. Fixture preparation follows approved quantity policy. | **DEPENDENCY-GATED** → #11/#12 schema — `server/tests/availability.test.ts` (skipIf; auto-enables) · not run on clean DB · — |
| TEST-F03-03 / AC-F03-02 | API/DB integration | Clean fixtures; valid B-A then C-A; no intervening mutation | Read list and detail for all three items as each role; repeat with absent/invalid credentials | Authenticated values match and are E-ONE `1`, E-MANY `3`, E-ZERO `0`; labels correct; anonymous/invalid calls return 401 without equipment/private data. No stock endpoint or writes required. | **EXECUTED (green)** — `server/tests/availability.test.ts` · `npx vitest run server/tests/availability.test.ts` · green on clean-DB and residue-DB runs · SHA `5978061` (impl `17d70bf`) |
| TEST-F03-04 / AC-F03-03 | API/DB integration | E-ONE total 1/no loans; B-A authenticated; quantity-one policy valid under either OQ-02 alternative | Read E-ONE, submit a quantity-one request through F-04, read again; C-A checks it out through F-05; read again | Values `1/AVAILABLE`, `1/AVAILABLE`, then `0/UNAVAILABLE`; one persisted active loan after commit. Request creation itself does not reserve stock (confirmed non-reservation model, Direction A). | **PLANNED — NOT RUN** — needs F-04 (#11) + F-05 (#12) features · — · — |
| TEST-F03-05 / AC-F03-04 | Unit | Invalid aggregate cases total `-1`, held `-1`, held `1.5`, or total 1/held 2 | Run the calculation/validation boundary with each case | Explicit integrity/validation failure; not a valid negative result or clamped `0/UNAVAILABLE`. No DB corruption need be introduced for this unit test. | **EXECUTED (green)** — `server/tests/availability.test.ts` · `npx vitest run server/tests/availability.test.ts` · green · SHA `5978061` (impl `17d70bf`) |
| TEST-F03-06 / AC-F03-04 | API/service integration | Controlled data-access test seam reports an inconsistent aggregate total 1/held 2; B-A authenticated | Read E-ONE detail | Safe 500 `INTERNAL_ERROR` with request identifier; no negative quantity, fabricated normal zero, stack/SQL or private loan data. Separately verify structural invalid writes are rejected in F-02/F-05 DB tests. | **EXECUTED (green)** — `server/tests/availability.test.ts` (controlled seam) · `npx vitest run server/tests/availability.test.ts` · green · SHA `5978061` (impl `17d70bf`); structural-write-rejection portion belongs to F-02 (TEST-F02-06, executed) / F-05 (gated) |
| TEST-F03-07 / AC-F03-05 | UI/E2E | Real seeded app; B-A; E-ONE available and E-ZERO unavailable | Open list/details; create/request and complete E-ONE checkout with C-A through the cross-role journey; refresh Borrower catalog | Total and available shown separately; E-ZERO request disabled/explained; E-ONE transitions to unavailable only from committed server state. Custodian readout agrees. | **PLANNED — NOT RUN** — needs F-04/F-05 journeys (#11/#12) · — · — |
| TEST-F03-08 / AC-F03-05 | UI/component | Controlled delayed read, then 503; previous display had E-ONE available 1; separate successful zero and conflict cases | Refresh availability; deliver delayed/error/zero/conflict responses separately | Loading/error never shown as actual zero; stale value not represented as confirmed current; zero disables request; conflict causes re-fetch without unauthorized client stock write. | **PARTIAL** — loading/error-never-zero halves EXECUTED (green) in `client/src/test/catalog-page.test.tsx` · `npm --prefix client test` (43/43) · SHA `5978061`; zero-disables-request and conflict/re-fetch halves are PLANNED — NOT RUN (#11/#12 UI) |
| TEST-F03-09 / AC-F03-06 | Restart/API/DB integration | E-ONE has one persisted active quantity-one loan; snapshot `0/UNAVAILABLE` | Restart application with same DB; re-authenticate and read list/detail; then temporarily make DB unavailable | Same zero/label after restart; DB failure yields safe 503 rather than a fabricated normal stock result. | **DEPENDENCY-GATED** → #11/#12 schema — `server/tests/restart-e2e.test.ts` (skipIf; auto-enables) · — · — |
| TEST-F03-10 / AC-F03-06, AC-F03-07 | API/DB transaction integration | E-ONE available 1; submitted quantity-one request; C-A; barrier after Loan insert/before commit; independent reader DB connection | Hold checkout at the barrier; concurrently GET equipment list/detail through a separate connection while the transaction is open; then release the barrier into a forced rollback and perform fresh API/DB reads | Reader returns prior committed availability1 or blocks until rollback, then returns1; it never returns uncommitted0. After rollback no loan is stored and request remains unfulfilled. Use a bounded reader wait and recorded barrier/release ordering; this supplements F-05 atomicity checks. | **PLANNED — NOT RUN** — F-05 (#12) owned (transaction barrier) · — · — |
| TEST-F03-11 / AC-F03-07 | API/DB integration | B-B has read E-ONE as available; B-A request was then successfully checked out by C-A, leaving E-ONE held; a second previously submitted quantity-one request exists for B-B | Attempt checkout of B-B request using the earlier positive UI observation; re-read E-ONE | Safe F-05 insufficient-stock conflict, still exactly one active loan, `0/UNAVAILABLE`, no negative quantity. F-05 separately owns repeated competing-attempt concurrency verification for NFR-05. | **PLANNED — NOT RUN** — F-05 (#12) owned (conflict scenario) · — · — |

Baselining resolved the non-reservation question via team decision (Direction A, 2026-11-06; SRS BR-12/A-11); the quantity choice is recorded in SRS A-12, with team-ratification evidence pending PR #36 review. Quantity-one cases are test inputs, not an alternative policy. No test above is a substitute for the full F-05 real-DB concurrency protocol or F-10 end-to-end evidence. No Sprint 2 return tests are silently counted here.

## 7. Definition of Done, Open Decisions, and Evidence

The [Product Definition of Done](product-dod.md) applies. F-03 additionally requires all seven AC linked to actual meaningful tests, real-DB aggregate/post-checkout/rollback/restart evidence, matching UI/list/detail values, no private stock-detail leakage, and agreement with the reviewed F-04/F-05 transaction contracts. Preserve the intended failing stock-rule test and subsequent passing implementation versions; no stub assertion or screenshot alone proves availability correctness. Teammate review/integration/release remains required before declaring implementation Issue #10 complete.

Open gates: SRS OQ-01 catalog fixtures and team-ratification evidence for the user-recorded A-12 quantity/return choice (PR #36); SDS-OQ-03 business timezone/date-boundary representation (per SDS §10; needed for F-05 due-date tests). **Resolved (not gates anymore):** SDS-OQ-01 (stack — resolved at SDS rev 3: Node.js 24 + TypeScript 7 + Express 5 + PostgreSQL 17 + Vitest/Supertest, team decision D1/PR #22) and SDS-OQ-02 (authentication — server session + HttpOnly cookie + trusted-origin anti-CSRF, team decision D2/PR #22); and the non-reserving-requests review — team decision Direction A, 2026-11-06 (SRS BR-12/A-11). The unconditional invariant is already confirmed and is not reopened. Returned-unit accounting is a later-sprint conditional design, not an implemented loan state here.

## 8. Revision History

| Revision | Change | Basis / evidence status |
|---|---|---|
| 1 — 2026-11-05 | Initial F-03 availability contract, proposed UI/API/data behavior, seven AC and eleven planned tests | D1-05; SRS rev 2, SDS rev 2, Part B rev 1, sprint plan at baseline `c78ad95`; no implementation/test result |
| 2 — 2026-11-06 | Documentation alignment (Issue #10 PR): Direction A recorded as confirmed (non-reservation + Direct Checkout, SRS BR-12/A-11); schema ownership per team MOVE decision (#11/#12 DDL + `server/src/db/migrations.ts` handover note); status header split into Contract approval / Implementation / Test status with real evidence references (tdd-evidence-f03.md) | Team decision Direction A (2026-11-06); team MOVE decision (2026-11-06); tdd-evidence-f03.md (commands/results) |
| 3 — 2026-11-06 | PR #35 re-review fix: per-row AC (§5) and STS (§6) status aligned with actual evidence — EXECUTED (green) / PARTIAL / DEPENDENCY-GATED / PLANNED — NOT RUN — with test file, command, result and tested-SHA references; rev 1 status wording retained as history per course spec §8.3; no AC marked verified from unit/component or residue-DB evidence alone | PR #35 re-review 2026-11-06; tdd-evidence-f03.md; verified at SHA `5978061` (implementation `17d70bf`) |
| 4 — 2026-11-06 | Aligned current quantity wording and SRS/SDS references with the recorded A-12 user decision; team-ratification evidence remains pending and Loan-dependent execution status is unchanged | PR #36 review; SRS rev 4; no new F-03 runtime pass claimed |
