# Sprint 1 Planned Verification Matrix

> **Revision:** 2 — 2026-11-06 | **Contract approval:** pending team baseline approval (Direction A points **Confirmed** by team 2026-11-06) | **Status:** mapping only — execution status is recorded per row and stays **PLANNED / NOT RUN** unless a linked evidence file records an actual run

## 1. Reading and Evidence Rules

This index connects the [Part B baseline](../../traceability.md) and existing GitHub Issue AC to the concrete Part E AC/STS. Each feature contract defines the authoritative outcome, level, fixtures/input, action and expected result. A link below is planned coverage, not a passing test, executed test file or approval. No AC or TEST ID is silently renumbered.

`AC-Fxx-nn` and `TEST-Fxx-nn` are new contract namespaces; existing `AC-06.x-nn` and parent `AC-F-nn` remain unchanged. Complete corresponding decision gates before execution. A future result record must add actual test file/name, command, tested SHA, environment, expected/actual, status and artifact link; do not turn NOT RUN into PASS without evidence. A single planned STS row can generate several executable cases, so its row count is not a runtime pass count.

**Execution status legend (rev 2):** `EXECUTED (green)` = ran with a recorded passing result in a linked evidence file · `PARTIAL` = some planned cases ran, others gated/not run · `PLANNED — NOT RUN` = no recorded run. Evidence files with commands, outputs and RED→GREEN history: [tdd-evidence-f01.md](tdd-evidence-f01.md), [tdd-evidence-f02.md](tdd-evidence-f02.md), [tdd-evidence-f03.md](tdd-evidence-f03.md), [tdd-evidence-f04.md](tdd-evidence-f04.md). Implementation/test status is tracked separately from contract approval.

| Contract | AC definitions | Planned STS rows | Current result |
|---|---|---|---|
| [f-01-authentication.md](f-01-authentication.md) | 12 | 16 | PARTIAL — implemented (Issue #8); executed results in [tdd-evidence-f01.md](tdd-evidence-f01.md); per-row mapping pending |
| [f-02-equipment-catalog.md](f-02-equipment-catalog.md) | 8 | 10 | PARTIAL — implemented (Issue #9, PR #27); executed results in [tdd-evidence-f02.md](tdd-evidence-f02.md); per-row mapping pending |
| [f-03-equipment-availability.md](f-03-equipment-availability.md) | 7 | 11 | PARTIAL — implemented (Issue #10); TEST-F03-01/03/05/06 + 08-UI executed, 02/09 dependency-gated on #11/#12 schema — [tdd-evidence-f03.md](tdd-evidence-f03.md) |
| [f-04-borrowing-request.md](f-04-borrowing-request.md) | 10 | 14 | PLANNED — NOT RUN (not implemented; Issue #11) |
| [f-05-checkout-active-loan.md](f-05-checkout-active-loan.md) | 12 | 16 | PLANNED — NOT RUN (not implemented; Issue #12) |
| [f-10-integration-verification.md](f-10-integration-verification.md) | 8 | 10 | PLANNED — NOT RUN (not implemented; Issue #13) |
| **Total** | **57** | **77** | **Partial runtime results — tdd-evidence-f01/f02/f03.md; per-row PASS mapping pending** |

## 2. Every Contract AC → Planned TEST

### F-01

| Contract AC | Planned STS cases | Execution status |
|---|---|---|
| [AC-F01-01](f-01-authentication.md) | [TEST-F01-01](f-01-authentication.md), [TEST-F01-04](f-01-authentication.md) | NOT RUN |
| [AC-F01-02](f-01-authentication.md) | [TEST-F01-02](f-01-authentication.md), [TEST-F01-12](f-01-authentication.md) | NOT RUN |
| [AC-F01-03](f-01-authentication.md) | [TEST-F01-03](f-01-authentication.md) | NOT RUN |
| [AC-F01-04](f-01-authentication.md) | [TEST-F01-04](f-01-authentication.md), [TEST-F01-09](f-01-authentication.md) | NOT RUN |
| [AC-F01-05](f-01-authentication.md) | [TEST-F01-05](f-01-authentication.md), [TEST-F01-06](f-01-authentication.md), [TEST-F01-07](f-01-authentication.md), [TEST-F01-08](f-01-authentication.md), [TEST-F01-16](f-01-authentication.md) | NOT RUN |
| [AC-F01-06](f-01-authentication.md) | [TEST-F01-07](f-01-authentication.md), [TEST-F01-13](f-01-authentication.md), [TEST-F01-14](f-01-authentication.md), [TEST-F01-16](f-01-authentication.md) | NOT RUN |
| [AC-F01-07](f-01-authentication.md) | [TEST-F01-08](f-01-authentication.md) | NOT RUN |
| [AC-F01-08](f-01-authentication.md) | [TEST-F01-09](f-01-authentication.md) | NOT RUN |
| [AC-F01-09](f-01-authentication.md) | [TEST-F01-10](f-01-authentication.md) | NOT RUN |
| [AC-F01-10](f-01-authentication.md) | [TEST-F01-11](f-01-authentication.md), [TEST-F01-12](f-01-authentication.md) | NOT RUN |
| [AC-F01-11](f-01-authentication.md) | [TEST-F01-13](f-01-authentication.md), [TEST-F01-14](f-01-authentication.md) | NOT RUN |
| [AC-F01-12](f-01-authentication.md) | [TEST-F01-15](f-01-authentication.md) | NOT RUN |

### F-02

| Contract AC | Planned STS cases | Execution status |
|---|---|---|
| [AC-F02-01](f-02-equipment-catalog.md) | [TEST-F02-01](f-02-equipment-catalog.md), [TEST-F02-02](f-02-equipment-catalog.md), [TEST-F02-07](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-02](f-02-equipment-catalog.md) | [TEST-F02-03](f-02-equipment-catalog.md), [TEST-F02-08](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-03](f-02-equipment-catalog.md) | [TEST-F02-01](f-02-equipment-catalog.md), [TEST-F02-04](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-04](f-02-equipment-catalog.md) | [TEST-F02-05](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-05](f-02-equipment-catalog.md) | [TEST-F02-06](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-06](f-02-equipment-catalog.md) | [TEST-F02-07](f-02-equipment-catalog.md), [TEST-F02-08](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-07](f-02-equipment-catalog.md) | [TEST-F02-08](f-02-equipment-catalog.md), [TEST-F02-09](f-02-equipment-catalog.md) | NOT RUN |
| [AC-F02-08](f-02-equipment-catalog.md) | [TEST-F02-10](f-02-equipment-catalog.md) | NOT RUN |

### F-03

| Contract AC | Planned STS cases | Execution status |
|---|---|---|
| [AC-F03-01](f-03-equipment-availability.md) | [TEST-F03-01](f-03-equipment-availability.md), [TEST-F03-02](f-03-equipment-availability.md) | PARTIAL — TEST-F03-01 EXECUTED (green); TEST-F03-02 dependency-gated on #11/#12 schema ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |
| [AC-F03-02](f-03-equipment-availability.md) | [TEST-F03-03](f-03-equipment-availability.md) | EXECUTED (green) — TEST-F03-03 ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |
| [AC-F03-03](f-03-equipment-availability.md) | [TEST-F03-04](f-03-equipment-availability.md) | DEPENDENCY-GATED / PLANNED — NOT RUN — fixture-level halves dependency-gated on #11/#12 schema; TEST-F03-04 needs F-04/F-05 features ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |
| [AC-F03-04](f-03-equipment-availability.md) | [TEST-F03-01](f-03-equipment-availability.md), [TEST-F03-05](f-03-equipment-availability.md), [TEST-F03-06](f-03-equipment-availability.md) | EXECUTED (green) — TEST-F03-01/05/06 ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |
| [AC-F03-05](f-03-equipment-availability.md) | [TEST-F03-07](f-03-equipment-availability.md), [TEST-F03-08](f-03-equipment-availability.md) | PARTIAL — TEST-F03-08 UI halves EXECUTED (client component tests); TEST-F03-07 PLANNED — NOT RUN (needs F-04/F-05 journeys) ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |
| [AC-F03-06](f-03-equipment-availability.md) | [TEST-F03-09](f-03-equipment-availability.md), [TEST-F03-10](f-03-equipment-availability.md) | DEPENDENCY-GATED / PLANNED — NOT RUN — TEST-F03-09 dependency-gated on #11/#12 schema; TEST-F03-10 needs F-05 ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |
| [AC-F03-07](f-03-equipment-availability.md) | [TEST-F03-10](f-03-equipment-availability.md), [TEST-F03-11](f-03-equipment-availability.md) | PLANNED — NOT RUN — needs F-05 (Issue #12) enforcement ([tdd-evidence-f03.md](tdd-evidence-f03.md)) |

### F-04

| Contract AC | Planned STS cases | Execution status |
|---|---|---|
| [AC-F04-01](f-04-borrowing-request.md) | [TEST-F04-01](f-04-borrowing-request.md), [TEST-F04-12](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-02](f-04-borrowing-request.md) | [TEST-F04-02](f-04-borrowing-request.md), [TEST-F04-13](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-03](f-04-borrowing-request.md) | [TEST-F04-03](f-04-borrowing-request.md), [TEST-F04-04](f-04-borrowing-request.md), [TEST-F04-12](f-04-borrowing-request.md), [TEST-F04-14](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-04](f-04-borrowing-request.md) | [TEST-F04-05](f-04-borrowing-request.md), [TEST-F04-14](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-05](f-04-borrowing-request.md) | [TEST-F04-06](f-04-borrowing-request.md) | PARTIAL — F-05-dependent portion gated ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-06](f-04-borrowing-request.md) | [TEST-F04-07](f-04-borrowing-request.md) | PARTIAL — F-05-dependent portion gated ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-07](f-04-borrowing-request.md) | [TEST-F04-08](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-08](f-04-borrowing-request.md) | [TEST-F04-09](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-09](f-04-borrowing-request.md) | [TEST-F04-10](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |
| [AC-F04-10](f-04-borrowing-request.md) | [TEST-F04-11](f-04-borrowing-request.md) | EXECUTED — request-only behavior ([F-04 evidence](tdd-evidence-f04.md)) |

### F-05

| Contract AC | Planned STS cases | Execution status |
|---|---|---|
| [AC-F05-01](f-05-checkout-active-loan.md) | [TEST-F05-01](f-05-checkout-active-loan.md), [TEST-F05-16](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-02](f-05-checkout-active-loan.md) | [TEST-F05-02](f-05-checkout-active-loan.md), [TEST-F05-15](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-03](f-05-checkout-active-loan.md) | [TEST-F05-03](f-05-checkout-active-loan.md), [TEST-F05-05](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-04](f-05-checkout-active-loan.md) | [TEST-F05-04](f-05-checkout-active-loan.md), [TEST-F05-05](f-05-checkout-active-loan.md), [TEST-F05-15](f-05-checkout-active-loan.md), [TEST-F05-16](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-05](f-05-checkout-active-loan.md) | [TEST-F05-06](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-06](f-05-checkout-active-loan.md) | [TEST-F05-07](f-05-checkout-active-loan.md), [TEST-F05-08](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-07](f-05-checkout-active-loan.md) | [TEST-F05-09](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-08](f-05-checkout-active-loan.md) | [TEST-F05-10](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-09](f-05-checkout-active-loan.md) | [TEST-F05-11](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-10](f-05-checkout-active-loan.md) | [TEST-F05-12](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-11](f-05-checkout-active-loan.md) | [TEST-F05-13](f-05-checkout-active-loan.md) | NOT RUN |
| [AC-F05-12](f-05-checkout-active-loan.md) | [TEST-F05-14](f-05-checkout-active-loan.md) | NOT RUN |

### F-10

| Contract AC | Planned STS cases | Execution status |
|---|---|---|
| [AC-F10-01](f-10-integration-verification.md) | [TEST-F10-01](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-02](f-10-integration-verification.md) | [TEST-F10-02](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-03](f-10-integration-verification.md) | [TEST-F10-03](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-04](f-10-integration-verification.md) | [TEST-F10-04](f-10-integration-verification.md), [TEST-F10-05](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-05](f-10-integration-verification.md) | [TEST-F10-06](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-06](f-10-integration-verification.md) | [TEST-F10-07](f-10-integration-verification.md), [TEST-F10-10](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-07](f-10-integration-verification.md) | [TEST-F10-08](f-10-integration-verification.md) | NOT RUN |
| [AC-F10-08](f-10-integration-verification.md) | [TEST-F10-09](f-10-integration-verification.md), [TEST-F10-10](f-10-integration-verification.md) | NOT RUN |

## 3. SRS Requirements With Sprint 1 Allocation

The 31 requirement IDs below have Sprint 1 allocation in Part B/Part D (14 FR, 9 BR, 8 NFR). Cross-cutting mappings are intentional: F-10 coordinates verification; feature services retain enforcement. This does not move later-sprint portions into Sprint 1.

| Requirement | Feature / allocated portion | Contract AC; follow §2 for TEST mapping |
|---|---|---|
| FR-01 | F-01 | [AC-F01-01](f-01-authentication.md), [AC-F01-02](f-01-authentication.md), [AC-F01-03](f-01-authentication.md), [AC-F01-07](f-01-authentication.md), [AC-F01-12](f-01-authentication.md) |
| FR-02 | F-01 | [AC-F01-06](f-01-authentication.md), [AC-F01-07](f-01-authentication.md) |
| FR-03 | F-01 | [AC-F01-01](f-01-authentication.md), [AC-F01-04](f-01-authentication.md) |
| FR-04 | F-01 + protected operations | [AC-F01-05](f-01-authentication.md), [AC-F01-08](f-01-authentication.md), [AC-F01-12](f-01-authentication.md) |
| FR-05 | F-01/F-04/F-05 | [AC-F01-09](f-01-authentication.md), [AC-F04-04](f-04-borrowing-request.md), [AC-F05-08](f-05-checkout-active-loan.md) |
| FR-06 | F-02 | [AC-F02-01](f-02-equipment-catalog.md), [AC-F02-02](f-02-equipment-catalog.md), [AC-F02-05](f-02-equipment-catalog.md), [AC-F02-06](f-02-equipment-catalog.md) |
| FR-07 | F-03 | [AC-F03-01](f-03-equipment-availability.md), [AC-F03-02](f-03-equipment-availability.md), [AC-F03-03](f-03-equipment-availability.md), [AC-F03-04](f-03-equipment-availability.md), [AC-F03-05](f-03-equipment-availability.md), [AC-F03-06](f-03-equipment-availability.md), [AC-F03-07](f-03-equipment-availability.md) |
| FR-08 | F-02 | [AC-F02-04](f-02-equipment-catalog.md), [AC-F02-05](f-02-equipment-catalog.md) |
| FR-11 | F-04 | [AC-F04-01](f-04-borrowing-request.md), [AC-F04-02](f-04-borrowing-request.md), [AC-F04-03](f-04-borrowing-request.md), [AC-F04-06](f-04-borrowing-request.md), [AC-F04-09](f-04-borrowing-request.md) |
| FR-12 | F-04 | [AC-F04-04](f-04-borrowing-request.md), [AC-F04-07](f-04-borrowing-request.md), [AC-F04-08](f-04-borrowing-request.md) |
| FR-13 | F-04 | [AC-F04-05](f-04-borrowing-request.md) |
| FR-14 | F-05 | [AC-F05-01](f-05-checkout-active-loan.md), [AC-F05-02](f-05-checkout-active-loan.md), [AC-F05-03](f-05-checkout-active-loan.md), [AC-F05-04](f-05-checkout-active-loan.md), [AC-F05-05](f-05-checkout-active-loan.md) |
| FR-15 | F-05 | [AC-F05-01](f-05-checkout-active-loan.md), [AC-F05-06](f-05-checkout-active-loan.md), [AC-F05-09](f-05-checkout-active-loan.md), [AC-F05-11](f-05-checkout-active-loan.md) |
| FR-16 | F-05 active only; full history S2 | [AC-F05-08](f-05-checkout-active-loan.md), [AC-F05-09](f-05-checkout-active-loan.md), [AC-F05-10](f-05-checkout-active-loan.md) |
| BR-01 | F-04 gate using F-03 stock | [AC-F04-02](f-04-borrowing-request.md), [AC-F04-09](f-04-borrowing-request.md) |
| BR-02 | F-05 enforcement / F-03 data | [AC-F05-02](f-05-checkout-active-loan.md), [AC-F03-07](f-03-equipment-availability.md) |
| BR-03 | F-05 enforcement / F-03 invariant | [AC-F03-01](f-03-equipment-availability.md), [AC-F03-04](f-03-equipment-availability.md), [AC-F03-07](f-03-equipment-availability.md), [AC-F05-03](f-05-checkout-active-loan.md), [AC-F05-04](f-05-checkout-active-loan.md), [AC-F05-12](f-05-checkout-active-loan.md) |
| BR-04 | F-01/F-05 checkout; return S2 | [AC-F01-08](f-01-authentication.md), [AC-F05-07](f-05-checkout-active-loan.md) |
| BR-05 | F-01/F-04/F-05 | [AC-F01-09](f-01-authentication.md), [AC-F04-04](f-04-borrowing-request.md), [AC-F05-08](f-05-checkout-active-loan.md) |
| BR-06 | F-01 guards on existing operations; catalog writes S2 | [AC-F01-08](f-01-authentication.md) |
| BR-07 | F-05 date assignment, timezone gate | [AC-F05-06](f-05-checkout-active-loan.md) |
| BR-10 | F-01 | [AC-F01-10](f-01-authentication.md) |
| BR-11 | F-10 coordinates S1 request/checkout/restart; return S2, redeployment Lab5 | [AC-F02-08](f-02-equipment-catalog.md), [AC-F03-06](f-03-equipment-availability.md), [AC-F04-07](f-04-borrowing-request.md), [AC-F05-09](f-05-checkout-active-loan.md), [AC-F10-03](f-10-integration-verification.md) |
| BR-12 | F-04 request creation (no reserve/decrement); F-05 is the only decrement point | [AC-F03-03](f-03-equipment-availability.md), [AC-F04-06](f-04-borrowing-request.md) |
| NFR-01 | F-01 all protected routes | [AC-F01-05](f-01-authentication.md), [AC-F02-03](f-02-equipment-catalog.md), [AC-F04-10](f-04-borrowing-request.md), [AC-F05-07](f-05-checkout-active-loan.md) |
| NFR-02 | F-01 guards + feature operations | [AC-F01-08](f-01-authentication.md), [AC-F01-09](f-01-authentication.md), [AC-F04-04](f-04-borrowing-request.md), [AC-F04-05](f-04-borrowing-request.md), [AC-F04-10](f-04-borrowing-request.md), [AC-F05-07](f-05-checkout-active-loan.md), [AC-F05-08](f-05-checkout-active-loan.md) |
| NFR-03 | F-01 | [AC-F01-10](f-01-authentication.md) |
| NFR-04 | F-10 coordinates restart; redeployment remains Lab5 | [AC-F02-08](f-02-equipment-catalog.md), [AC-F03-06](f-03-equipment-availability.md), [AC-F04-07](f-04-borrowing-request.md), [AC-F05-09](f-05-checkout-active-loan.md), [AC-F10-03](f-10-integration-verification.md) |
| NFR-05 | F-05 real DB concurrency / F-03 data | [AC-F05-04](f-05-checkout-active-loan.md), [AC-F03-07](f-03-equipment-availability.md) |
| NFR-06 | F-05 checkout atomicity; return S2 | [AC-F05-05](f-05-checkout-active-loan.md), [AC-F03-06](f-03-equipment-availability.md), [AC-F03-07](f-03-equipment-availability.md) |
| NFR-08 | F-10 reproducible setup, NFR target unchanged | [AC-F10-05](f-10-integration-verification.md) |
| NFR-09 | F-10 automation/result evidence, 100% AC target unchanged | [AC-F10-04](f-10-integration-verification.md) |

FR-09/FR-10/FR-17–FR-21, BR-08/BR-09 and NFR-07 remain later-sprint requirements per Part B. FR-16 full history, return atomicity/persistence, future catalog writes and redeployment checks retain their allocated S2/Lab5 scope. BR-06's prospective write restriction is not evidence of an implemented S1 catalog-write endpoint. The complete 41-requirement product matrix remains in Part B; this subset is deliberately Sprint 1 only.

## 4. Existing Implementation Issue AC Alignment

Existing Issue IDs below are preserved. The proposed feature contracts elaborate each Issue outcome; they do not mark it complete. Each referenced contract AC resolves to its planned tests in §2.

| Existing Issue | Existing AC | Contract AC |
|---|---|---|
| [#8](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | AC-06.1-01 | [AC-F01-01](f-01-authentication.md), [AC-F01-02](f-01-authentication.md) |
| [#8](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | AC-06.1-02 | [AC-F01-06](f-01-authentication.md), [AC-F01-07](f-01-authentication.md) |
| [#8](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | AC-06.1-03 | [AC-F01-05](f-01-authentication.md) |
| [#8](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | AC-06.1-04 | [AC-F01-08](f-01-authentication.md), [AC-F05-07](f-05-checkout-active-loan.md) |
| [#8](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | AC-06.1-05 | [AC-F01-09](f-01-authentication.md), [AC-F04-04](f-04-borrowing-request.md), [AC-F05-08](f-05-checkout-active-loan.md) |
| [#8](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | AC-06.1-06 | [AC-F01-10](f-01-authentication.md) |
| [#9](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) | AC-06.2-01 | [AC-F02-04](f-02-equipment-catalog.md) |
| [#9](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) | AC-06.2-02 | [AC-F02-01](f-02-equipment-catalog.md), [AC-F02-06](f-02-equipment-catalog.md) |
| [#9](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) | AC-06.2-03 | [AC-F02-08](f-02-equipment-catalog.md) |
| [#9](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) | AC-06.2-04 | [AC-F02-05](f-02-equipment-catalog.md), [AC-F03-01](f-03-equipment-availability.md) |
| [#9](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) | AC-06.2-05 | [AC-F02-04](f-02-equipment-catalog.md), [AC-F01-10](f-01-authentication.md) |
| [#10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) | AC-06.3-01 | [AC-F03-01](f-03-equipment-availability.md), [AC-F03-02](f-03-equipment-availability.md) |
| [#10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) | AC-06.3-02 | [AC-F03-03](f-03-equipment-availability.md), [AC-F05-01](f-05-checkout-active-loan.md) |
| [#10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) | AC-06.3-03 | [AC-F03-04](f-03-equipment-availability.md), [AC-F03-07](f-03-equipment-availability.md), [AC-F05-04](f-05-checkout-active-loan.md) |
| [#10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) | AC-06.3-04 | [AC-F03-05](f-03-equipment-availability.md) |
| [#10](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) | AC-06.3-05 | [AC-F03-06](f-03-equipment-availability.md) |
| [#11](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | AC-06.4-01 | [AC-F04-01](f-04-borrowing-request.md) |
| [#11](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | AC-06.4-02 | [AC-F04-02](f-04-borrowing-request.md) |
| [#11](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | AC-06.4-03 | [AC-F04-04](f-04-borrowing-request.md), [AC-F04-08](f-04-borrowing-request.md) |
| [#11](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | AC-06.4-04 | [AC-F04-04](f-04-borrowing-request.md) |
| [#11](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | AC-06.4-05 | [AC-F04-05](f-04-borrowing-request.md), [AC-F04-06](f-04-borrowing-request.md) |
| [#11](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | AC-06.4-06 | [AC-F04-01](f-04-borrowing-request.md), [AC-F04-07](f-04-borrowing-request.md) |
| [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | AC-06.5-01 | [AC-F05-01](f-05-checkout-active-loan.md) |
| [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | AC-06.5-02 | [AC-F05-02](f-05-checkout-active-loan.md) |
| [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | AC-06.5-03 | [AC-F05-03](f-05-checkout-active-loan.md), [AC-F05-04](f-05-checkout-active-loan.md) |
| [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | AC-06.5-04 | [AC-F05-07](f-05-checkout-active-loan.md) |
| [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | AC-06.5-05 | [AC-F05-08](f-05-checkout-active-loan.md), [AC-F05-09](f-05-checkout-active-loan.md) |
| [#12](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | AC-06.5-06 | [AC-F05-04](f-05-checkout-active-loan.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-01 | [AC-F10-01](f-10-integration-verification.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-02 | [AC-F10-02](f-10-integration-verification.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-03 | [AC-F10-04](f-10-integration-verification.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-04 | [AC-F10-06](f-10-integration-verification.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-05 | [AC-F10-07](f-10-integration-verification.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-06 | [AC-F10-05](f-10-integration-verification.md), [AC-F10-08](f-10-integration-verification.md) |
| [#13](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | AC-06.6-07 | [AC-F10-08](f-10-integration-verification.md) |

### Parent #6 acceptance

| Existing parent AC | Contract AC |
|---|---|
| AC-F-01 | [AC-F10-01](f-10-integration-verification.md) |
| AC-F-02 | [AC-F01-01](f-01-authentication.md), [AC-F01-04](f-01-authentication.md), [AC-F01-05](f-01-authentication.md), [AC-F01-06](f-01-authentication.md), [AC-F01-08](f-01-authentication.md) |
| AC-F-03 | [AC-F05-01](f-05-checkout-active-loan.md), [AC-F05-02](f-05-checkout-active-loan.md), [AC-F05-04](f-05-checkout-active-loan.md) |
| AC-F-04 | [AC-F10-02](f-10-integration-verification.md), [AC-F10-04](f-10-integration-verification.md) |
| AC-F-05 | [AC-F10-06](f-10-integration-verification.md) |
| AC-F-06 | [AC-F10-07](f-10-integration-verification.md), [AC-F10-08](f-10-integration-verification.md) |
| AC-F-07 | [AC-F10-04](f-10-integration-verification.md), [AC-F10-08](f-10-integration-verification.md) |

The seven parent criteria include actual build/TDD/review/release evidence; the [F-10 contract](f-10-integration-verification.md) and [Product DoD](product-dod.md) require real artifacts and independent human assessment in addition to machine-verifiable checks. Drafting these rows is not that evidence.

## 5. Revision History

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial complete planned contract AC/TEST, S1 requirement and existing Issue AC mapping | Issue #5; six Part E revision-1 contracts; Parts A–D; Issues #6/#8–#13 |

F-04 update (2026-11-06): request-only actual execution is recorded above and in [F-04 evidence](tdd-evidence-f04.md); TEST-F04-06/07 remain partial until #12. No earlier feature status or deferred acceptance is promoted by this change.

Revision 3 (2026-11-06): linked F-04 actual candidate results, preserving F-05-dependent partial AC/STS; added no new AC IDs or test-pass claims for other features.
