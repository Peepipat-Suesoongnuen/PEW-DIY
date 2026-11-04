# F-02 — Equipment Catalog (Seed and Read)

> **Deliverable:** D1-05 Part E | **Implementation issue:** [D1-06.2 / #9](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9)
>
> **Revision:** 1, 2026-11-05 | **Status:** Draft proposals for team decision and peer review; not approved for implementation
>
> **Execution status:** Every test below is **PLANNED — NOT RUN**. No application, migration or executable test exists at this baseline.

## 1. Requirement Links, Scope, and Dependencies

The baseline is [SRS](../../srs.md) rev 2, [Feature Inventory](../../features.md) rev 1, [System SDS](../../system-sds.md) rev 2, and the [three-sprint plan](../plan.md). The course basis is `project_deliverable_1_v1.pdf` §3.5 (PDF p.4) and `group_work_specs_v1.pdf` §8.2 (PDF p.10). Requirement text remains in those source documents.

| Basis | Responsibility in this contract |
|---|---|
| FR-06, FR-08 | Persist a reproducible synthetic catalog and expose its list/detail to authenticated users. |
| FR-07 / F-03 | Include availability in the shared equipment representation; calculation belongs to [F-03](f-03-equipment-availability.md). |
| NFR-01/02 / F-01 | Enforce authentication on both reads; both Borrower and Custodian may read the room catalog. |
| BR-11, NFR-04 (Sprint 1) | Catalog and availability read-back use the same durable store after an application restart; F-10 coordinates full persistence evidence. |
| NFR-08 / F-10 | Provide migration/seed instructions for the reproducible setup; F-10 verifies the complete fresh setup target. |
| NFR-07 | Preserve the catalog performance target for Sprint 3; no performance result is claimed here. |
| BR-06, FR-09/10 | Catalog writes/search are allocated to Sprint 2; this contract introduces neither a management endpoint nor a search feature. |

Dependencies are F-01 authentication, the selected database/migration tooling, and F-03 for availability fields. F-04 consumes item identifiers and availability for request entry. The test fixtures are defined in [fixtures](fixtures.md); they are synthetic proposals pending SRS OQ-01, not the real approved catalog. Shared API/access/error behavior is in [shared conventions](shared-conventions.md).

**In scope:** seed + authenticated list/detail + read-only catalog UI. **No change to scope:** no create/edit/delete/retire operations, total adjustments, search/filter, return, history, or reporting. F-02 does not create borrowing requests or perform checkout.

## 2. Behavior, Workflow, and Rules

All screen/API/schema choices below are **Proposed**. SRS requirements remain Confirmed; unresolved choices are listed in §8.

1. An explicit seed procedure inserts the agreed synthetic Equipment fixtures into the development/test database. It is not an automatic destructive application-startup operation.
2. Borrower or Custodian logs in through F-01 and opens the catalog. The server authenticates the caller and reads persisted Equipment rows plus F-03 availability.
3. The catalog displays each item's name, description, category, total quantity, available quantity and availability label. Selecting an item opens its detail using its opaque identifier.
4. Borrower sees navigation to the F-04 request form when the selected item is available. Custodian sees the same catalog data without a Borrower request action. Hiding controls is not authorization.
5. A missing item produces a safe not-found state. An empty catalog is a successful empty result, distinct from a failed database query.

Catalog reads never mutate stock, requests or loans. Read responses contain no borrower identities, loan records, credential data or password hashes. No borrower ownership predicate applies to the shared room catalog; this does not grant access to another borrower's requests/loans. Authentication and wrong-role checks on protected mutations remain F-01/F-04/F-05 responsibilities.

## 3. UI Specification

Proposed navigation: login → catalog → item detail → optional F-04 request form. Direct item-detail navigation must run the same protected API read as navigation from the list.

| State | Observable behavior |
|---|---|
| Loading | Indicate loading until the response arrives; do not render an unreceived quantity as zero. |
| Loaded | Show the persisted fields and F-03 availability consistently in list and detail. |
| Empty | Show that the catalog has no items; do not show a generic server-error message. |
| Missing item | Explain that the item could not be found and offer catalog navigation. |
| 401 | Clear stale private identity/state and return to login using shared F-01 behavior. |
| Safe server failure | Show a generic retry message/request identifier; never render SQL, stack traces, connection strings or private data. |

The catalog has no editing form or quantity input in Sprint 1. Input validation is limited to safe identifier handling and the shared request contract; search/filter inputs are not introduced.

## 4. API Specification

| Method/path | Input and permission | Success |
|---|---|---|
| `GET /api/equipment` | No request body; authenticated Borrower or Custodian | `200 {"data": [equipment, ...]}`; empty catalog is `200 {"data": []}`. |
| `GET /api/equipment/{equipmentId}` | One opaque item identifier; authenticated Borrower or Custodian | `200 {"data": equipment}` for an existing item. |

Both routes use the same equipment object:

| Field | Logical API type and meaning |
|---|---|
| `id` | Opaque string identifying Equipment; callers must not assume a numeric/UUID encoding. |
| `name`, `description`, `category` | Strings read from the persisted synthetic catalog. |
| `quantity_total` | Integer, at least zero. |
| `quantity_available` | Integer derived by F-03; never accept this field as a client stock update. |
| `availability` | `AVAILABLE` when `quantity_available >= 1`, otherwise `UNAVAILABLE` for valid zero stock. |

The shared envelope is `{"error":{"code":"...","message":"...","requestId":"..."}}`. Proposed feature results are `401 UNAUTHENTICATED` without valid authentication, `404 NOT_FOUND` for an unknown well-formed opaque ID, and `503 SERVICE_UNAVAILABLE` for an unavailable database. Unexpected internal failures use the shared safe `500 INTERNAL_ERROR` convention. For syntactically valid requests, authentication precedes protected item lookup and domain validation; an anonymous caller receives no item data, including for an unknown identifier. Basic HTTP/parser failures may return a safe 400 under the shared exception. Identifier validation follows the selected representation; this draft does not invent a numeric-ID grammar.

**No-change layers:** no catalog mutation API, no authentication endpoint/schema changes beyond consuming F-01, and no loan/request creation here. Availability extends this representation through F-03 rather than a second endpoint. Pagination/search/filter are not silently added to this Sprint 1 proposal; if needed, record and review a contract revision first.

## 5. Data, Constraints, Migrations, and Seed

Proposed Equipment fields are `id` (PK), `name`, `description`, `category`, and `quantity_total` (integer, `>= 0`). All fields are required; `name` is nonempty, while `description` may be an empty string under the shared convention. Text lengths, detailed category validation and PK storage await SDS-OQ-01 and must be recorded with the selected schema before implementation; no item-name uniqueness rule is assumed. Foreign keys from BorrowingRequest preserve catalog history. Availability is derived under F-03, not an additional editable catalog counter.

The Equipment migration creates its PK, required fields, integer total column and database check rejecting negative totals. The typed seed/data boundary must reject fractional inputs before persistence rather than rely on an engine's implicit integer coercion. Zero is valid. User/role migrations come from F-01; request/loan migrations come from F-04/F-05. No serial-unit, catalog-status, retirement, return or search schema is added in Sprint 1. A later migration may introduce these only under its own reviewed contract.

Apply the selected versioned migrations to an empty isolated database, then explicitly seed the [fixture catalog](fixtures.md): E-ONE (`quantity_total=1`), E-MANY (`3`), E-ZERO (`0`). Fixture symbols map to actual opaque IDs. Content/fixture keys must be deterministic; running the seed twice must not duplicate items or overwrite existing stock, requests, loans or identity/role data. Test reset is a separate deliberate operation. Actual catalog content remains SRS OQ-01, and actual commands/tool syntax remain SDS-OQ-01. Do not claim these procedures are runnable yet.

## 6. Acceptance Criteria

These are proposed observable criteria; every row is **PLANNED — NOT VERIFIED**.

| ID | Acceptance outcome | Requirement basis |
|---|---|---|
| AC-F02-01 | Each authenticated role can list the seeded items and open E-ONE detail; responses/UI show the agreed Equipment fields, and list/detail refer to the same persisted item. No credentials or borrower/loan details appear. | FR-06/08, NFR-01/02 |
| AC-F02-02 | An empty database returns `200 data=[]` and an empty UI state; an unknown item returns safe `404 NOT_FOUND` and a missing-item UI state. Neither case fabricates a catalog item. | FR-06 |
| AC-F02-03 | Both read endpoints reject absent, invalid, expired or logged-out credentials with 401 and no protected catalog data. Both real roles remain permitted after valid login. | NFR-01/02, F-01 |
| AC-F02-04 | Repeating the explicit seed produces no duplicate fixture items and preserves existing totals, requests, loans and identity/role data. Demo/test content is synthetic and credentials never appear in tracked fixture/log output. | FR-08, NFR-08, SDS §4 |
| AC-F02-05 | The schema rejects missing required fields and negative totals, and typed seed/data validation rejects fractional quantities before storage; `quantity_total=0` is valid. These failures create no partial Equipment record. | FR-06, SDS §3/4 |
| AC-F02-06 | Loading, loaded, empty, missing, unauthenticated and error states are distinguishable; catalog/detail navigation works for both roles, with no catalog editing or search controls added. | FR-06, SDS §5 |
| AC-F02-07 | A DB/internal failure yields a safe shared error and recoverable UI state, without stack/SQL/credentials/private data or a false empty-catalog success. | SDS §6, NFR-01 |
| AC-F02-08 | After an application restart against the same durable database, fixture IDs/content and catalog read-back are unchanged; no startup reseed clears domain data. | BR-11, NFR-04 (S1) |

## 7. Software Test Specification

All tests use isolated synthetic data. **Every row: PLANNED — NOT RUN; actual test file/command/result/tested SHA: NOT AVAILABLE.** Automated API/DB tests must use the real selected database, not mock-only persistence. UI state simulation supplements those tests.

| Test ID / linked AC | Level | Concrete precondition/input | Action | Expected result |
|---|---|---|---|---|
| TEST-F02-01 / AC-F02-01, AC-F02-03 | API/DB integration | Clean fixture catalog E-ONE=1, E-MANY=3, E-ZERO=0; valid B-A, then C-A authentication | Call `GET /api/equipment` as each role | 200 list contains exactly the seeded items in this isolated fixture; each object matches persisted fixture fields/F-03 quantities. No user/loan/credential properties. No row mutation. |
| TEST-F02-02 / AC-F02-01 | API/DB integration | Same fixture; E-ONE actual ID; valid B-A and C-A | Call detail for E-ONE and compare with its list entry for each role | 200 object has the same ID, text, total and availability as the persisted item/list entry; no private fields. |
| TEST-F02-03 / AC-F02-02 | API/DB integration | Authenticated B-A; first an empty Equipment table, then the clean fixtures and a valid-looking absent opaque ID (symbol E-MISSING) | Read list in the empty fixture; then read E-MISSING detail | First 200 `data=[]`; second 404 `NOT_FOUND` with safe envelope; no item inserted. |
| TEST-F02-04 / AC-F02-03 | API integration | Fixture catalog; each of absent, invalid, expired and logged-out F-01 credentials | Call both list and E-ONE detail for each credential state | Each call returns 401 `UNAUTHENTICATED` with no catalog/private data and no DB writes. Mechanism-specific credential construction follows F-01 after its open choices are resolved. |
| TEST-F02-05 / AC-F02-04 | DB/setup integration | Apply migrations; seed once; create a valid quantity-one request/loan for E-ONE using the reviewed F-04/F-05 setup; snapshot item IDs/totals and all request/loan/user/role rows | Run the explicit seed a second time and compare snapshots/counts | No duplicate fixtures or changed IDs/totals/domain/identity rows; logs contain no credential/hash values. Does not reset the existing loan. |
| TEST-F02-06 / AC-F02-05 | DB/seed integration | Empty isolated DB with Equipment migration | In separate rolled-back cases insert missing required field and total `-1`; pass fractional total `1.5` through the typed seed/data boundary; then insert a valid zero-total record | Invalid cases rejected without stored partial row; fractional input is not silently rounded/coerced; zero-total record accepted. Concrete tool operations await stack selection. |
| TEST-F02-07 / AC-F02-01, AC-F02-06 | UI/E2E | Seeded running app; log in as B-A, then C-A | Navigate catalog → E-ONE detail → catalog | Correct fixture fields and quantities displayed for both roles; Borrower has the available-item request affordance, Custodian does not; no catalog editing/search controls. |
| TEST-F02-08 / AC-F02-02, AC-F02-06, AC-F02-07 | UI/component | Delayed catalog response; then empty, 404 detail, 401 and 503 responses using a controlled test harness | Open list/detail and deliver each response separately | Loading is visible before completion; each distinct empty/missing/login/error state is correct; no false zero stock or leaked response internals. This is UI evidence, not DB persistence evidence. |
| TEST-F02-09 / AC-F02-07 | API/DB integration | B-A authenticated; controlled real DB unavailability; safe recovery path | Call list and E-ONE detail while DB unavailable, then restore DB and retry | Safe 503 envelope; no SQL/stack/connection details or false `data=[]`; retry returns actual persisted data. |
| TEST-F02-10 / AC-F02-08 | Restart integration | Seeded running app with persisted fixtures and a known request/loan from F-04/F-05; record pre-restart IDs/content | Restart only the application with the same DB, obtain valid authentication, read list/detail and domain records | Identical persisted catalog/domain records; F-03 availability reflects the same held units. No automatic reset. Redeployment evidence remains Lab 5/F-10. |

Complete fresh-setup timing and the Sprint 3 performance measurement are allocated to F-10 and the later verification respectively; they are not counted as executed tests here.

## 8. Definition of Done, Open Decisions, and Evidence

The [Product Definition of Done](product-dod.md) applies. F-02 additionally needs every AC above mapped to real tests/results, reviewed migration/seed instructions, both-role list/detail evidence, non-destructive reseed and restart read-back, and updated README setup. Preserve contract revisions before implementation; meaningful defects require intended failing-test then passing-test evidence. Teammate review/integration/release and recorded limitations must be evidenced, not inferred from this draft.

Open gates: SDS-OQ-01 stack/database/tools/physical schema/commands; SDS-OQ-02 F-01 authentication; SRS OQ-01 actual catalog; review of proposed field limits and API/UI behavior. OQ-02 does not change catalog totals, but loan-dependent setup in TEST-F02-05/10 must follow the approved F-04/F-05 quantity policy. Quantity-one fixtures do not decide whether larger loans are allowed. Implementation Issue #9 remains unverified.

## 9. Revision History

| Revision | Change | Basis / evidence status |
|---|---|---|
| 1 — 2026-11-05 | Initial F-02 feature design, proposed UI/API/data/seed behavior, eight AC and ten planned tests | D1-05; SRS rev 2, SDS rev 2, Part B rev 1, current sprint plan at baseline `c78ad95`; no implementation/test result |
