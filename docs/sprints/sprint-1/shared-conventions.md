# Sprint 1 Shared Contract Conventions

> **Revision:** 1 — 2026-11-05 | **Status:** Proposed, pending team baseline approval
>
> Source: [System SDS](../../system-sds.md) rev 2; [SRS](../../srs.md) rev 2. These conventions specify the proposed wire contract, not existing endpoints or approved stack choices. Decision gates are recorded in [README](README.md).

## 1. Contract and ID Rules

Feature contracts use `AC-F01-01` / `TEST-F01-01` through the equivalent F02/F03/F04/F05/F10 namespaces. These elaborate, rather than replace, the existing Issue AC IDs; the [verification matrix](verification-matrix.md) maps both. Deleted IDs are retired, not reused. Every STS row records its level, fixtures/input, action and observable expected result; all rows are **PLANNED / NOT RUN** until implementation evidence exists.

All newly specified methods/paths, wire fields, status/error choices, fixtures and test-design parameters are **Proposed**. Team-approved SRS rules remain **Confirmed**. Unresolved stack, auth, catalog, quantity and calendar choices remain **Open**. A contract may be reviewed as a draft while its dependent implementation remains gated. Do not treat a merged draft as a frozen implementation baseline.

## 2. Wire Representation and Validation

- Proposed API prefix: `/api`. Accept JSON objects for body-bearing operations; reject malformed JSON, wrong types, missing/unknown fields with `400 VALIDATION_ERROR`. Query features not specified here, such as search/filter, are not introduced in Sprint 1.
- Domain fields use `snake_case`; the existing SDS error envelope retains `requestId`. IDs are opaque nonempty JSON strings on the wire, independently of the selected DB primary-key type. Specify the supported ID syntax/length with the stack decision before baselining; valid-looking unknown fixture IDs exercise 404 cases.
- Success is `{ "data": <object-or-array> }`; lists return `data: []` when empty. A successful logout returns 204 with no body. Time instants use UTC ISO-8601 strings; `due_on` is `YYYY-MM-DD` in the selected business timezone. The timezone is not selected by this document.
- Required text must be nonempty for names/usernames; exact length limits and username normalization belong to the stack/auth baseline decision. `description` is a string and may be empty in test fixtures. Quantity values must be finite positive integers for requests/loans, and nonnegative integers for catalog totals. Resolved A-12 permits positive multi-unit requests up to current availability with no additional per-borrower cap; numeric strings, booleans, nulls, fractions, zero and negatives are rejected as request quantities.
- Ownership, roles, checkout actor/time/due date, derived quantity/status, and generated IDs are server-controlled. Reject attempts to submit these extra fields; never silently trust them. No new catalog-write, approval, return or reporting endpoints are introduced.

```json
{
  "error": {
    "code": "INSUFFICIENT_AVAILABILITY",
    "message": "Equipment is no longer available.",
    "requestId": "synthetic-request-id"
  }
}
```

| Result | Proposed code / meaning | Required observation |
|---|---|---|
| 200 | Successful read/login | Only allow-listed response fields |
| 201 | Persisted request/loan created | Return generated record after commit |
| 204 | Current credential invalidated at logout | No body; browser identity/private cache cleared |
| 400 | `VALIDATION_ERROR` | Safe generic/field feedback; no domain writes |
| 401 | `INVALID_CREDENTIALS` at login; `UNAUTHENTICATED` on protected routes | No private records or credential material |
| 403 | `FORBIDDEN` | Wrong role or cross-borrower access; no target record content |
| 404 | `NOT_FOUND` | Absent record within permitted scope; no private existence/owner metadata |
| 409 | `INSUFFICIENT_AVAILABILITY`; `ALREADY_CHECKED_OUT` | No partial writes or duplicate fulfillment |
| 500 / 503 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Safe failure; no SQL, stack trace, hashes, tokens or private payloads |

For a syntactically valid HTTP/JSON request, authenticate before domain access, check route-role permission before domain-field validation, and resolve record ownership before exposing resource fields. Thus anonymous calls yield 401 and an authenticated wrong-role call yields 403 even if domain fields are invalid. Basic HTTP/body-parser failures may produce safe 400 before application guards; security STS calls use valid syntax and existing fixture IDs to test the intended guard. Authorize independently of UI visibility and client IDs. Credential validation/transport/CSRF details are defined in F-01 after SDS-OQ-02. A denied or invalid operation must not mutate requests, loans or inventory. Safe auth metadata updates are not inventory mutations.

## 3. Complete Proposed Sprint 1 Route Inventory

`B` = Borrower, `C` = Custodian. Every route except login requires a currently valid credential. Anonymous callers receive 401. Direct requests to role-denied operations receive 403 even if the UI hides them.

| Method/path | Allowed role and record scope | Contract |
|---|---|---|
| `POST /api/auth/login` | Public credential exchange, generic invalid-credential error | [F-01](f-01-authentication.md) |
| `GET /api/auth/me` | B/C: self identity only | [F-01](f-01-authentication.md) |
| `POST /api/auth/logout` | B/C: current credential only | [F-01](f-01-authentication.md) |
| `GET /api/equipment` | B/C: room catalog | [F-02](f-02-equipment-catalog.md), [F-03](f-03-equipment-availability.md) |
| `GET /api/equipment/{equipmentId}` | B/C: room catalog item | [F-02](f-02-equipment-catalog.md), [F-03](f-03-equipment-availability.md) |
| `POST /api/requests` | B: create own; C denied under the PR #17 scope agreement | [F-04](f-04-borrowing-request.md) |
| `GET /api/requests` | B: own requests in either proposed state; C: submitted queue only | [F-04](f-04-borrowing-request.md) |
| `GET /api/requests/{requestId}` | B: own; C: submitted request needed for checkout | [F-04](f-04-borrowing-request.md) |
| `POST /api/requests/{requestId}/checkout` | C: existing request, including safe already-fulfilled conflict checking; B denied | [F-05](f-05-checkout-active-loan.md) |
| `GET /api/loans` | B: own active loans; C denied general all-loans listing until S2 | [F-05](f-05-checkout-active-loan.md) |
| `GET /api/loans/{loanId}` | B: own active loan; C receives created loan via checkout response, no general loan-detail endpoint permission in S1 | [F-05](f-05-checkout-active-loan.md) |

The Custodian queue/detail excludes checked-out requests; detail access to an existing checked-out request by C returns safe 403. Checkout itself can inspect fulfillment internally and returns 409 for an already fulfilled request. After an uncertain checkout response, C refreshes the submitted queue; a missing entry means inspect/reconcile the outcome rather than automatically retry. No staff history/all-loans capability is implied.

Request representation: `id`, `borrower_id`, `equipment_id`, `quantity_requested`, `created_at`, `status` (`SUBMITTED` / `CHECKED_OUT`). Loan representation: `id`, `request_id`, `borrower_id`, `equipment_id`, `quantity_borrowed`, `checked_out_by`, `checkout_at`, `due_on`, `status` (`ACTIVE`). Borrower/equipment in a loan response are projections through its request, not competing writable ownership fields. Equipment representation is defined by F-02/F-03. Auth identity is `id`, `username`, `role` only; credential transport fields remain conditional on the chosen mechanism.

The proposed response state labels elaborate SDS §3.1; they do not add an approval step. Endpoint access policy is a Part E proposal consistent with SDS §6.2. Any desired expansion requires team review and an explicit revision.

## 4. Shared Test Preconditions and Evidence Rules

Use [fixtures](fixtures.md) in isolated databases. API/DB integration means real HTTP/application routing plus the selected real database and migrations; a mocked repository alone cannot prove persistence, ownership filtering, transaction rollback or concurrency. Unit tests are appropriate for pure rules. UI/E2E tests exercise a real app/API/database, including reload and distinct browser identities; hiding controls alone never proves access enforcement.

NFR-01 tests enumerate **every implemented protected method/path** in the inventory, supplying valid resource IDs/bodies but no credential. NFR-02 tests cover every role-denied route/operation and cross-owner request/loan IDs; use B-A/B-B and C-A. If implementation changes a route, revise its contract and this inventory first, then extend the parameterized security suite; never silently omit new routes. Unsupported S2 writes/returns do not become S1 endpoints solely to manufacture denial coverage.

Unit design tests can be planned before stack selection. Execute integration/clock/transport tests only after their decision gates are resolved and actual test files exist. Record framework file/test names, command, exact tested SHA, environment, preconditions, expected/actual, PASS/FAIL/SKIPPED/NOT RUN and report link. A skipped conditional test must disclose its unresolved gate; it cannot be counted as passing AC coverage. Product completion follows [Product DoD](product-dod.md).

## 5. Revision History

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial proposed shared route, envelope, validation and evidence conventions | Issue #5; SRS rev 2; SDS rev 2; PR #17 role-scope discussion |
| 2 ? 2026-11-06 | Recorded A-12 request quantity bounds; F-04 execution status lives in its contract/evidence (the rev-1 NOT RUN wording is historical for cases now executed) | User policy decision; Issue #11 implementation |
