# F-03 — Equipment Availability

> **Deliverable:** D1-05 Part E | **Implementation issue:** [D1-06.3 / #10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10)
>
> **Revision:** 1, 2026-11-05 | **Status:** Draft proposals for team decision and peer review; not approved for implementation
>
> **Execution status:** Every test below is **PLANNED — NOT RUN**. No availability code, migration or executable test exists at this baseline.

## 1. Requirement Links, Scope, and Dependencies

Sources: [SRS](../../srs.md) rev 2, [Feature Inventory](../../features.md) rev 1, [System SDS](../../system-sds.md) rev 2 §3.3/§6, and [sprint plan](../plan.md). The course basis is D1 §3.5 (PDF p.4) and group specification §8.2 (PDF p.10). Shared payload/access/error conventions and synthetic data are in [shared conventions](shared-conventions.md) and [fixtures](fixtures.md).

| Basis | F-03 responsibility / enforcement owner |
|---|---|
| FR-07, A-01/A-04, BR-03 | Derive/display Available Quantity from aggregate catalog stock and persisted held units; represent single-unit exclusivity as the quantity invariant. |
| BR-01 / F-04 | Supply authoritative DB availability for request-time validation; non-reservation is the SDS proposal, not a new confirmed rule. |
| BR-02/03, NFR-05 / F-05 | Supply checkout availability; F-05 enforces stock/repeated-checkout/concurrency rejection using DB transactions. |
| BR-11, NFR-04 (S1) | Derivation reads persisted loans/catalog after restart; F-10 coordinates evidence. |
| NFR-06 (checkout S1) | F-05 writes atomically; F-03 must not publish an uncommitted quantity as a successful post-checkout result. |
| NFR-01/02 / F-01 | Equipment/availability reads require real authentication and allow both defined roles. |

Dependencies: F-01 protected reads; F-02 Equipment records/shared list/detail representation; F-04/F-05 persisted request/loan relations and transaction services. F-03 can be unit-specified before checkout exists, but its real-DB post-checkout verification depends on F-05. No separate stock endpoint, editable stock counter, approval/reservation system, return API, overdue calculation, history view or catalog management is introduced here.

## 2. Domain Behavior, Workflow, and Boundary Rules

The invariant is Confirmed by SRS BR-03; the derived implementation and non-reserving request behavior are **Proposed** in SDS §3.2–§3.3:

```text
held(item)               = sum(quantity still held by its active loans)
quantity_available(item) = quantity_total(item) - held(item)
valid state              = 0 <= held(item) <= quantity_total(item)
availability             = AVAILABLE if quantity_available >= 1,
                           otherwise UNAVAILABLE for a valid zero result
```

1. On an authenticated catalog/detail read, query persisted Equipment and its held quantities using a consistent DB read; return both quantity and label from that same result.
2. In Sprint 1 an active loan contributes its positive `quantity_borrowed`. A submitted request has no Loan and contributes zero under the proposed non-reservation model. No mutation is performed by reading availability.
3. F-04 validates current DB availability when creating a request. F-05 rechecks current DB availability in its serialized checkout transaction; an earlier UI quantity is never an allocation guarantee.
4. Once F-05 commits a quantity-one checkout of E-ONE, a subsequent fresh read returns `0/UNAVAILABLE`. Repeated or competing checkout cannot consume the same exclusive unit twice.
5. After an app restart, compute the same result from the same persisted catalog/loan rows. Do not reconstruct held stock from browser memory or a process-local counter.

**Boundary handling:** total zero/held zero is valid and unavailable; total one/held one is unavailable; total three/held two is one available. Negative totals, nonpositive/noninteger held contributions or held greater than total are invalid data, not normal stock levels. Prevent invalid writes at the owning service/DB boundary. If invalid stored data is detected on read, return a safe internal error and record a redacted diagnostic; do not clamp with `max(0, available)` or silently hide overselling as valid zero stock.

SRS OQ-02 remains Open: no assumption that each request is restricted to one, nor that larger quantities are permitted without limit. Every unconditional checkout scenario below uses quantity one. Multiple independent quantity-one loans illustrate aggregation without deciding the maximum units of one loan. Future partial-return accounting remains conditional on the coupled OQ-02/BR-09 decision; no return behavior is implemented in Sprint 1.

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

**Data/migration changes:** no extra persisted `quantity_available` counter or stock table is proposed. F-02 creates Equipment; F-04/F-05 create Request/Loan relations and positive quantity/unique fulfillment constraints. F-03 adds the aggregate read/query or view, with Equipment→Request→Loan linkage. Engine-specific index/query/view migrations must be documented if introduced after stack selection; do not claim a view migration exists. No auth, role or credential schema change is needed here. The transaction protocol belongs to F-05 and SDS §3.3; an in-process lock cannot substitute for database consistency.

## 5. Acceptance Criteria

Every row is a proposed criterion, **PLANNED — NOT VERIFIED**.

| ID | Acceptance outcome | Requirement basis |
|---|---|---|
| AC-F03-01 | For valid persisted stock, available quantity equals total minus held units, with exact zero/positive label boundaries; aggregation includes all active loans for the item. | FR-07, A-01/A-04, BR-03 |
| AC-F03-02 | Authenticated list/detail responses show matching derived values when no write intervenes; both roles may read, anonymous/invalid credentials are denied, and no borrower/loan/credential data is exposed. | FR-07, NFR-01/02 |
| AC-F03-03 | A submitted request alone leaves availability unchanged under the reviewed non-reservation proposal; a committed quantity-one checkout of E-ONE changes its fresh read from `1/AVAILABLE` to `0/UNAVAILABLE`. | FR-07, BR-02/03, SDS §3.2/3.3 |
| AC-F03-04 | Valid zero stock is returned successfully. Invalid aggregate inputs/state are rejected or reported as safe internal errors; negative availability is neither published as valid data nor clamped to zero. | BR-03, SDS §3.3 |
| AC-F03-05 | UI distinguishes total/available, positive/zero, loading/error and stale data; zero disables a Borrower request affordance, while stock conflict/success triggers fresh server read rather than client authority. | FR-07, SDS §5 |
| AC-F03-06 | Restart against the same store preserves derived availability; a rolled-back checkout leaves it unchanged; DB failure does not masquerade as zero stock. | BR-11, NFR-04/06 (S1) |
| AC-F03-07 | Checkout validation reads authoritative current stock under F-05's transaction protocol; a stale positive UI value cannot allow another checkout once E-ONE is held, and no read mixes committed/uncommitted allocation state. | BR-02/03, NFR-05/06 (F-05 enforcement) |

## 6. Software Test Specification

**Every row: PLANNED — NOT RUN; actual test file/command/result/tested SHA: NOT AVAILABLE.** Real DB integration is required for authoritative stock/persistence/transaction claims. Unit/component tests are complementary evidence. Fixture symbols, account roles and clean-reset procedures come from [fixtures](fixtures.md).

| Test ID / linked AC | Level | Concrete precondition/input | Action | Expected result |
|---|---|---|---|---|
| TEST-F03-01 / AC-F03-01, AC-F03-04 | Unit | `(total, held)` cases `(0,0)`, `(1,0)`, `(1,1)`, `(3,2)` with integer quantities | Execute pure availability/label calculation for each case | Respectively `0/UNAVAILABLE`, `1/AVAILABLE`, `0/UNAVAILABLE`, `1/AVAILABLE`; no clamp or mutation. |
| TEST-F03-02 / AC-F03-01 | API/DB integration | E-MANY total 3; two distinct active loans of quantity 1, one for B-A and one for B-B, each linked through its own request; authenticated C-A | Read E-MANY through list and detail | Each result is total 3, available 1, `AVAILABLE`; both persisted loan contributions included. No borrower/loan details exposed. Fixture preparation follows approved quantity policy. |
| TEST-F03-03 / AC-F03-02 | API/DB integration | Clean fixtures; valid B-A then C-A; no intervening mutation | Read list and detail for all three items as each role; repeat with absent/invalid credentials | Authenticated values match and are E-ONE `1`, E-MANY `3`, E-ZERO `0`; labels correct; anonymous/invalid calls return 401 without equipment/private data. No stock endpoint or writes required. |
| TEST-F03-04 / AC-F03-03 | API/DB integration | E-ONE total 1/no loans; B-A authenticated; quantity-one policy valid under either OQ-02 alternative | Read E-ONE, submit a quantity-one request through F-04, read again; C-A checks it out through F-05; read again | Values `1/AVAILABLE`, `1/AVAILABLE`, then `0/UNAVAILABLE`; one persisted active loan after commit. Request creation itself does not reserve stock under the proposal. |
| TEST-F03-05 / AC-F03-04 | Unit | Invalid aggregate cases total `-1`, held `-1`, held `1.5`, or total 1/held 2 | Run the calculation/validation boundary with each case | Explicit integrity/validation failure; not a valid negative result or clamped `0/UNAVAILABLE`. No DB corruption need be introduced for this unit test. |
| TEST-F03-06 / AC-F03-04 | API/service integration | Controlled data-access test seam reports an inconsistent aggregate total 1/held 2; B-A authenticated | Read E-ONE detail | Safe 500 `INTERNAL_ERROR` with request identifier; no negative quantity, fabricated normal zero, stack/SQL or private loan data. Separately verify structural invalid writes are rejected in F-02/F-05 DB tests. |
| TEST-F03-07 / AC-F03-05 | UI/E2E | Real seeded app; B-A; E-ONE available and E-ZERO unavailable | Open list/details; create/request and complete E-ONE checkout with C-A through the cross-role journey; refresh Borrower catalog | Total and available shown separately; E-ZERO request disabled/explained; E-ONE transitions to unavailable only from committed server state. Custodian readout agrees. |
| TEST-F03-08 / AC-F03-05 | UI/component | Controlled delayed read, then 503; previous display had E-ONE available 1; separate successful zero and conflict cases | Refresh availability; deliver delayed/error/zero/conflict responses separately | Loading/error never shown as actual zero; stale value not represented as confirmed current; zero disables request; conflict causes re-fetch without unauthorized client stock write. |
| TEST-F03-09 / AC-F03-06 | Restart/API/DB integration | E-ONE has one persisted active quantity-one loan; snapshot `0/UNAVAILABLE` | Restart application with same DB; re-authenticate and read list/detail; then temporarily make DB unavailable | Same zero/label after restart; DB failure yields safe 503 rather than a fabricated normal stock result. |
| TEST-F03-10 / AC-F03-06, AC-F03-07 | API/DB transaction integration | E-ONE available 1; submitted quantity-one request; C-A; barrier after Loan insert/before commit; independent reader DB connection | Hold checkout at the barrier; concurrently GET equipment list/detail through a separate connection while the transaction is open; then release the barrier into a forced rollback and perform fresh API/DB reads | Reader returns prior committed availability1 or blocks until rollback, then returns1; it never returns uncommitted0. After rollback no loan is stored and request remains unfulfilled. Use a bounded reader wait and recorded barrier/release ordering; this supplements F-05 atomicity checks. |
| TEST-F03-11 / AC-F03-07 | API/DB integration | B-B has read E-ONE as available; B-A request was then successfully checked out by C-A, leaving E-ONE held; a second previously submitted quantity-one request exists for B-B | Attempt checkout of B-B request using the earlier positive UI observation; re-read E-ONE | Safe F-05 insufficient-stock conflict, still exactly one active loan, `0/UNAVAILABLE`, no negative quantity. F-05 separately owns repeated competing-attempt concurrency verification for NFR-05. |

Before implementation, baselining must resolve the non-reservation proposal and quantity policy. No test above is a substitute for the full F-05 real-DB concurrency protocol or F-10 end-to-end evidence. No Sprint 2 return tests are silently counted here.

## 7. Definition of Done, Open Decisions, and Evidence

The [Product Definition of Done](product-dod.md) applies. F-03 additionally requires all seven AC linked to actual meaningful tests, real-DB aggregate/post-checkout/rollback/restart evidence, matching UI/list/detail values, no private stock-detail leakage, and agreement with the reviewed F-04/F-05 transaction contracts. Preserve the intended failing stock-rule test and subsequent passing implementation versions; no stub assertion or screenshot alone proves availability correctness. Teammate review/integration/release remains required before declaring implementation Issue #10 complete.

Open gates: SDS-OQ-01 engine/query/isolation/migration syntax; SDS-OQ-02 authentication through F-01; review of SDS non-reserving requests; SRS OQ-01 catalog fixtures and OQ-02 multi-unit/limit/full-versus-partial-return policy. The unconditional invariant is already confirmed and is not reopened. Returned-unit accounting is a later-sprint conditional design, not an implemented loan state here.

## 8. Revision History

| Revision | Change | Basis / evidence status |
|---|---|---|
| 1 — 2026-11-05 | Initial F-03 availability contract, proposed UI/API/data behavior, seven AC and eleven planned tests | D1-05; SRS rev 2, SDS rev 2, Part B rev 1, sprint plan at baseline `c78ad95`; no implementation/test result |
