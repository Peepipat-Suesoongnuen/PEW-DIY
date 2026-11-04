# F-05 — Checkout and Active Loan Contract

> **Revision:** 1 — 2026-11-05 | **Status:** Proposed draft; stack, quantity and calendar gates unresolved
>
> Implementation Issue: [#12 / D1-06.5](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12); contract Issue [#5](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/5). All STS cases are **PLANNED / NOT RUN**.

## 1. Identity, Requirements and Dependencies

F-05 implements FR-14/FR-15/FR-16 (active-loan portion), BR-02/BR-03/BR-07/BR-11 (checkout), NFR-04 (restart), NFR-05 and NFR-06 (checkout atomicity). It consumes F-01 role/owner enforcement (BR-04/BR-05), F-02 catalog, F-03 current availability and F-04 persisted requests. F-10 coordinates integrated/release evidence. See [SRS](../../srs.md), [Part B](../../features.md), [SDS §3](../../system-sds.md) and [plan](../plan.md).

Direct Checkout is confirmed: no separate approval. Assignment of the seven-calendar-day due date is **Sprint 1**, as clarified by SRS rev 2 and Issue #12; overdue computation, return, full history and Custodian general all-loans views are Sprint 2. The older parent Issue #6 exclusion of all due-date rules does not override that baseline.

## 2. Feature Design and Transaction

Custodian opens submitted queue → selects a request → sends checkout → backend rechecks current availability and request fulfillment → commits one Loan → UI displays that created Loan and refreshes queue/catalog. Borrower sees only their own active loans and refreshed stock. A request is intent, not a reservation; stock can change after submission.

**Proposed transaction protocol, elaborating SDS §3.3:**

1. Authenticate, require C-A/Custodian and validate route/body using shared guard precedence. Read request's immutable equipment reference; unknown request →404 without a write.
2. Begin a transaction; lock Equipment first, BorrowingRequest second, in a consistent order used by all inventory-affecting writers. Re-read the request, its unique loan link, current total and held quantities after the equipment lock using fresh committed-read semantics appropriate to the selected DB. A stale pre-lock snapshot is insufficient.
3. If already fulfilled, return safe 409 `ALREADY_CHECKED_OUT`; otherwise verify approved OQ-02 eligibility/quantity limits and `quantity_requested <= current_available`. Insufficient stock →409 `INSUFFICIENT_AVAILABILITY` without mutation.
4. Insert one Loan with unique `request_id`, requested quantity, authenticated actor, server checkout instant and server-derived due date. Proposed fulfillment is the full requested quantity, not split fulfillment; this must be accepted with OQ-02 before implementation.
5. Commit, then return 201. Request status and availability derive from the committed Loan relationship, so there are no independent counters/status flags to update inconsistently. Any pre-commit failure rolls back all transaction writes. Uniqueness conflicts/deadlock/serialization retries must never create a second loan; record engine-specific safe mapping/retry limits at stack baseline.

The confirmed invariant is `0 <= held <= quantity_total`, with `available = quantity_total - held`. During S1 each active loan holds its full positive `quantity_borrowed`. For total1, there can be at most one active quantity1 loan. Do not hide an oversold result by clamping it to zero. Concurrency control must work across DB connections/app workers, not only a local process mutex. Later return/quantity adjustments must use the same equipment serialization boundary.

Due-date calculation uses the chosen business timezone's checkout calendar date plus seven calendar days; store checkout instant in UTC and `due_on` as a date. Resolve SDS-OQ-03 before freezing exact clock tests; machine timezone or a literal 168-hour elapsed duration is not a substitute for the calendar policy. Clients cannot set due date, checkout actor, owner or loan status.

## 3. UI, API and Data Specification

UI states: C sees submitted queue and a checkout control; B has no checkout control. Disable repeat clicks while pending. Show the committed created-loan result with item/borrower reference, quantity, checkout and due date; no staff all-loans page is added. On stock/fulfillment conflict refresh queue/availability. On uncertain network response reconcile state rather than blindly retry; no success UI before commit. B's own active-loan page supports empty/loading/error/reload states and clears private records when identity changes.

Apply [shared conventions](shared-conventions.md):

| Method/path | Payload / successful result | Error scope |
|---|---|---|
| `POST /api/requests/{requestId}/checkout` | C only; exact body `{}`; 201 `data` with the created Loan representation | 401/403 guards; unknown404; extra fields400; unavailable/already-fulfilled409; safe500/503 on DB failure |
| `GET /api/loans` | B only; own active records in `data` array | Anonymous401; C403 for general loan list in S1 |
| `GET /api/loans/{loanId}` | B only; own active Loan in `data` | Other B's existing ID403; absent authorized-scope ID404; C403 |

Loan response: `id`, `request_id`, projected `borrower_id`/`equipment_id`, `quantity_borrowed`, `checked_out_by`, `checkout_at`, `due_on`, `status: ACTIVE`. Resolve ownership through Loan → BorrowingRequest → User, never a client owner or an unchecked Loan ID. Existing checked-out requests return ALREADY_CHECKED_OUT to an authorized checkout caller without creating/widening a staff history endpoint. Successful C checkout response may disclose that created loan as required by the workflow.

**Data/migrations:** add Loan PK, unique required BorrowingRequest FK, positive integer quantity, required Custodian actor FK, checkout timestamp and due date. Borrower/equipment are linked through Request rather than duplicate writable fields. A proposed nullable `returned_at`/`returned_by` pair can support the later lifecycle; leave unset in S1, do not implement return endpoints. `ACTIVE` is a derived representation, not an independently mutable request/loan status. Add request/active-loan lookup indexes supported by the selected schema. FKs protect references; services enforce actor roles and cross-row held/total invariant under transaction. User/Equipment/Request schemas otherwise stay owned by F-01/F-02/F-04; no mutable availability counter migration is needed. Pin physical types, DB isolation/lock syntax, transaction retry mapping and migration commands after SDS-OQ-01/OQ-02 decisions.

## 4. Acceptance Criteria

| ID | Observable outcome |
|---|---|
| AC-F05-01 | Authorized checkout of submitted quantity1 R-ONE-A creates exactly one persisted ACTIVE Loan; owner/item/quantity/actor are correct and availability becomes0 only after commit. |
| AC-F05-02 | Checkout of R-ONE-B after the last E-ONE unit is held returns409 INSUFFICIENT_AVAILABILITY, with request unfulfilled and no loan/stock change. |
| AC-F05-03 | Repeated checkout of an already fulfilled request returns409 ALREADY_CHECKED_OUT; no second loan or availability effect exists. |
| AC-F05-04 | Competing eligible requests for E-ONE cannot produce duplicate active loans or negative availability; all proposed N=50 independent two-call races preserve the invariant. |
| AC-F05-05 | A forced failure after Loan insert but before commit leaves zero new loan/fulfillment/stock effects after rollback; the same request can be checked out successfully afterward. |
| AC-F05-06 | Every successful loan's `due_on` equals the server checkout date in the approved business timezone plus seven calendar days, including UTC/local date, month/year boundaries. |
| AC-F05-07 | Anonymous checkout/read is denied401; Borrower checkout is denied403, even for their own request; no private data or domain writes result. |
| AC-F05-08 | B-A lists/reads only B-A's active loans, and B-B's existing loan ID is denied403 without private content. |
| AC-F05-09 | Loan/request/availability persist unchanged across application restart using the same database, including owner/actor/quantity/time/due data. |
| AC-F05-10 | UI checkout success displays the committed new Loan; conflict/empty/loading/error states and Borrower own-loan reload agree with API/DB, without approval/return/all-loans scope expansion. |
| AC-F05-11 | Extra checkout payload fields, invalid IDs or missing request yield safe400/404 as applicable; client-supplied owner/actor/quantity/date/status never controls persisted loan fields. |
| AC-F05-12 | The approved OQ-02 quantity/limit/fulfillment policy is enforced and held-unit accounting remains consistent; policy-dependent cases stay gated until the decision is recorded. |

## 5. Software Test Specification

Use [fixtures](fixtures.md), separate DB connections for races, the selected production-equivalent database engine, and explicit server-clock control. All cases are PLANNED / NOT RUN.

| Test ID | Linked AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F05-01 | AC-F05-01 | API/DB integration | Eligible R-ONE-A, available1; C-A; fixed explicit server instant under approved zone | POST checkout `{}`; fresh DB and catalog/request/owner-loan reads | 201; exactly one correct durable Loan; request CHECKED_OUT; availability0 |
| TEST-F05-02 | AC-F05-02 | API/DB integration | R-ONE-A/B submitted before stock is consumed; checkout A first | Checkout B; inspect before/after rows/stock | 409 insufficient; B stays SUBMITTED; only A's loan; availability0 |
| TEST-F05-03 | AC-F05-03 | API/DB integration | R-ONE-A already fulfilled | Repeat same checkout and inspect unique relation/stock | 409 ALREADY_CHECKED_OUT; exactly one loan/effect |
| TEST-F05-04 | AC-F05-04 | API/DB integration, concurrency | Fresh E-ONE/two eligible requests per race; N50; two independent local API workers sharing real DB, separate connections and synchronization barrier | Send one checkout HTTP call to each worker concurrently; wait for both; inspect committed rows from fresh connection | Each race: one201, one409, held1, availability0, at most one active loan; record all N outcomes and actual worker/connection topology; a shared in-process mutex cannot be the safety mechanism |
| TEST-F05-05 | AC-F05-03, AC-F05-04 | API/DB integration, concurrency | Fresh R-ONE-A; two independent local API workers and DB connections; authorized simultaneous calls for same request | Race same request with one call per worker and inspect committed unique request link | One201, one409 ALREADY_CHECKED_OUT; exactly one loan and stock effect |
| TEST-F05-06 | AC-F05-05 | API/DB integration, fault injection | R-ONE-A, available1; isolated test hook after loan insert/before commit | Force transaction failure; inspect via fresh connection; remove hook and retry | Safe500/503; no loan/fulfillment/stock effect after failure; later clean retry201 |
| TEST-F05-07 | AC-F05-06 | Unit | **Gated SDS-OQ-03**: selected zone; explicit instants at normal/local-midnight/month/year boundaries | Convert instant→business date and add7 calendar days | Exact expected dates; e.g. local 2026-12-28→2027-01-04; no system-timezone dependence |
| TEST-F05-08 | AC-F05-06 | API/DB integration | Approved zone and fixed clock across a UTC/local date boundary; submitted request | Checkout; read response and stored due_on/checkout_at | Server-derived date+7 matches clock policy in API and DB |
| TEST-F05-09 | AC-F05-07 | API/DB integration | Valid request and bodies; first no credential, then B-A credential | Direct checkout as anonymous/B-A; anonymous loan list/detail | Anonymous401; B-A checkout403; no private content or writes |
| TEST-F05-10 | AC-F05-08 | API/DB integration | A/B each owns a valid active loan in independent valid fixture; C-A identity available | B-A list/own detail/foreign detail; C-A general list/detail | Only A in B-A results; own200, foreign403; C-A403 for general loan read routes |
| TEST-F05-11 | AC-F05-09 | API/DB integration | Successful checkout; snapshot catalog/request/loan fields; retain same database | Stop/start app, reauthenticate, fresh API/DB reads without seed | Same IDs/fields/availability and ownership; zero data loss |
| TEST-F05-12 | AC-F05-10 | UI/E2E | Real app/DB; B-A request; C-A browser and separate B-A browser; test-only barrier before checkout commit; independent empty and forced-failure scenarios | Open empty submitted/own-loan lists; submit valid checkout and hold before commit to inspect pending UI, then release and inspect created Loan/B reload; separately force safe checkout failure and attempt stale queued request | Distinct empty states; pending controls prevent duplicate submits and no success is shown before commit; committed due/quantity/stock match DB; failed/conflicting checkout shows safe error and no false success; refreshed B own loans persist; no approval step |
| TEST-F05-13 | AC-F05-11 | API/DB integration | C-A; existing request plus injected owner/actor/due/quantity/status fields; absent/invalid IDs separately | POST each invalid body/ID | Extra fields400, syntactically invalid ID400 after syntax policy fixed, absent404; no writes |
| TEST-F05-14 | AC-F05-12 | Unit + API/DB integration | **Gated OQ-02** approved quantity/borrower/full-fulfillment policy and valid stock boundaries | Exercise permitted minimum, finite max/above-max only if such a cap is chosen, otherwise explicit no-policy-cap case; always exercise stock-insufficient quantity | Match recorded policy; held never exceeds total; no invented maximum or unapproved split fulfillment |
| TEST-F05-15 | AC-F05-02, AC-F05-04 | Unit, retained regression | Rule inputs total1/held0 and total1/held1, qty1; invalid held>total isolated case | Write stock rejection assertion RED, implement GREEN; evaluate invariant | Reject unavailable/invalid state, allow available1; preserve actual RED/GREEN SHAs/output |
| TEST-F05-16 | AC-F05-01, AC-F05-04 | API/DB integration | E-MANY total3; two eligible qty1 requests under approved borrower limits | Checkout both sequentially, read fresh list/detail availability | Two active qty1 loans, held2, availability1; pooled inventory not incorrectly treated as exclusive |

## 6. Feature DoD and Revision

Satisfy [Product DoD](product-dod.md) and all mapped AC/tests with exact tested SHA. Specifically retain real DB race results, transaction rollback evidence, ownership/security calls, server date-boundary results and actual rule RED/GREEN history. Resolve SDS-OQ-01/02/03 and OQ-02 before implementation baseline; do not treat synthetic quantity1 fixtures as closure of those decisions. Release/redeployment evidence follows F-10/Lab 5 allocation.

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial proposed F-05 transaction/UI/API/schema/AC/STS contract | Issue #5/#12; SRS rev 2; SDS rev 2; PR #15/17; plan rev 3 and PR #20 calendar gate |
