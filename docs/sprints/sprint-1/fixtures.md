# Sprint 1 Fixture and Decision Parameters

> **Revision:** 1 — 2026-11-05 | **Status:** Proposed test design; no seed implementation or actual credentials
>
> Fixture keys below are symbolic labels, not real account credentials, database IDs, or the confirmed initial equipment catalog. SRS OQ-01 remains open. Apply the [shared conventions](shared-conventions.md) and the team's approved OQ-02 policy before execution.

## 1. Independent Base Fixture

Create a fresh isolated real test database using the selected migrations. Each test starts from its own reset/transaction-isolated fixture; tests do not depend on execution order. Reset is an explicit **test-database-only** setup operation, not app startup or a production seed operation.

| Key | Synthetic definition | Use |
|---|---|---|
| B-A | One User with role `BORROWER` | Owner of A requests/loans |
| B-B | A distinct User with role `BORROWER` | Cross-owner isolation and competing requests |
| C-A | One User with role `CUSTODIAN` | Checkout actor and queue access |
| E-ONE | Equipment: name `Synthetic single-unit fixture`, description `Test fixture`, category `Synthetic`, `quantity_total = 1` | Exclusive-item and concurrency boundaries |
| E-MANY | Equipment: name `Synthetic pooled fixture`, description `Test fixture`, category `Synthetic`, `quantity_total = 3` | Aggregate quantity calculations; total > 1 does not itself authorize a multi-unit loan |
| E-ZERO | Equipment: name `Synthetic zero-stock fixture`, description `Test fixture`, category `Synthetic`, `quantity_total = 0` | Unavailable display and request rejection |

Resolve each symbolic key to its actual generated opaque ID. Supply unique usernames and secrets privately through the eventual documented local seed procedure; do not put password values, bearer tokens, cookie values, or hashes into tracked fixtures/evidence. Valid-credential tests obtain secrets transiently and redact them from output. Unknown-user/invalid-password tests use synthetic transient inputs, not published account credentials.

Base fixture has no requests/loans: availability is 1/3/0 respectively. Empty-catalog tests use a separate empty database state. Read-only restart tests retain the same database and must not invoke seed/reset between the before/after reads.

## 2. Journey and Race Fixtures

| Key / scenario | Construction and observable state |
|---|---|
| R-ONE-A | B-A creates a quantity-1 request for E-ONE while it is available; `SUBMITTED`, no Loan |
| R-ONE-B | B-B also creates a quantity-1 request before either checkout; under the confirmed non-reservation model (Direction A, 2026-11-06) E-ONE remains available |
| L-ONE | C-A checks out R-ONE-A; one ACTIVE Loan, quantity 1, E-ONE availability 0; R-ONE-B remains unfulfilled |
| R-MANY-A | B-A requests one unit of E-MANY; quantity 1 avoids deciding multi-unit policy, but eligibility/limit decisions still gate implementation |
| Aggregate-held case | In an isolated valid fixture, two active one-unit loans for E-MANY hold 2; available = 1. Use eligible separate Borrower owners as approved by OQ-02; no partial return is implied. |
| Unknown resource | A syntactically valid opaque ID absent from the test DB, not another user's actual record |

Prefer constructing requests/loans through implemented APIs for end-to-end evidence. Narrow unit/integration setup may insert valid preconditions directly, but record what was seeded; never call such insertion an end-to-end workflow. Corruption tests insert deliberately invalid held/total state only in an isolated fault fixture and must not silently normalize negative availability.

For cross-owner tests, B-A receives no contents of B-B's request/loan when supplied its valid existing ID; verify both filtered lists and detail calls. Switching browser identities clears previous private state.

## 3. Parameters Requiring a Recorded Decision

| Parameter | Status and required resolution |
|---|---|
| Exact runtime/DB/migration/test tools; ID and text limits | **Open — SDS-OQ-01.** Use verified commands only after selection; record supported versions and README instructions. |
| Credential mechanism, transport, server expiry, revocation and CSRF | **Open — SDS-OQ-02.** Parameterize F-01 tests using the chosen mechanism, not both simultaneously. |
| Real initial catalog | **Open — SRS OQ-01.** Synthetic fixture names above do not close this question. |
| Quantity policy | **Open — SRS OQ-02.** Record one-unit versus multi-unit, per-borrower limits, fulfillment policy and full/partial return implications before baselining F-04/F-05. For positive-limit boundary tests use the actual approved limit, not an invented number. |
| Calendar timezone | **Open — SDS-OQ-03.** Record business timezone, UTC-to-local checkout date conversion and calendar addition; do not use the machine timezone implicitly. |
| Race repetition count | **Proposed test parameter: N = 50 independent races**, each two synchronized HTTP checkout calls targeting **two actual independent local API workers/processes** sharing the same real DB (one call per worker, separate DB connections). This prevents a single-process mutex from falsely proving DB safety; no Docker/GCP is needed. Record worker/connection topology, N and all outcomes. N is test design for NFR-05, not a changed business requirement or exhaustive proof. |
| Atomicity fault injection | **Proposed:** after Loan insert but before commit, force a deterministic transaction failure through an isolated test-only hook. Never expose a public HTTP fault trigger. Inspect actual persisted state from a fresh DB read after rollback. |

Calendar test vectors for the **selected** timezone include a normal day, a checkout crossing a UTC/local date boundary, a month-end, and year-end (e.g., local checkout date 2026-12-28 must produce due date 2027-01-04). Use explicit instants mapping to those local dates after timezone approval. Seven calendar days is the confirmed rule; no overdue endpoint is added to S1.

## 4. Revision History

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial symbolic fixtures, decision parameters, clock/race/rollback preconditions | Issue #5; SRS OQ-01/OQ-02, BR-03/07; SDS §3/§4/§10 |
| 2 ? 2026-11-06 | Recorded resolved quantity policy and concrete stock-boundary test vectors | User decision A-12 during Issue #11 implementation |
