## Summary

Implements the **request-only increment of [D1-06.4] Borrowing Request (F-04)** against the engineering contract, SRS and UI specifications.

Adds request submission, persisted list/detail retrieval and the Custodian submitted-request queue, with backend ownership and stock validation.

**Refs #11 — Issue #11 stays open** for F-05-dependent verification and remaining completion gates.

## User-confirmed quantity policy — team ratification pending

Records the explicit user decision from 2026-11-06 as **SRS A-12**. PR #36 review requires a verifiable teammate/team ratification artifact before shared-baseline closure and merge; that artifact is still pending:

- Multiple units per request, up to current available quantity.
- No additional per-borrower cap.
- Full return per loan; return implementation remains Sprint 2.
- Requests do not reserve or reduce stock (BR-12).

This implementation choice was supplied by the user during implementation; it is not attributed to earlier PRs or represented as independent teammate approval. The user says a confirmation exists and will supply its link/text. Issue #11 currently has no confirmation comment; no comment or approval is fabricated.

## What's implemented

| Layer | Changes |
|---|---|
| Database | Migration 002 creates `borrowing_requests`, positive quantity constraint, non-cascading foreign keys and owner/item indexes |
| Application | Transactional availability check under an Equipment row lock; server-assigned owner, ID and creation time; rollback on failure |
| API | Borrower submission, owner-filtered reads, Custodian submitted queue, safe validation/access/conflict errors |
| UI | Quantity form, pending protection, success redirect, My/Submitted Requests list/detail, empty/error states and opaque-ID handling |
| Documentation | Quantity decision, revised F-04 contract, per-row AC/STS status, verification mapping and TDD evidence |

### API routes

- `POST /api/requests`
- `GET /api/requests`
- `GET /api/requests/{requestId}`

Custodians cannot create requests. Borrowers cannot read another Borrower's requests. The existing session and trusted-origin guards protect the new routes.

## Key design points

1. **Request submission does not allocate stock.** Multiple requests can reference the same available units; checkout must recheck stock in F-05.
2. **Ownership is server-controlled.** Injected owner/status/time fields are rejected, and list queries include the authenticated Borrower predicate.
3. **Loan ownership remains with Issue #12.** This PR creates no Loan schema or checkout endpoint to bypass dependency gates.
4. **UI success follows committed API success.** Conflicts refresh stock; failed refresh disables retry; uncertain network outcomes direct the user to inspect existing requests.
5. **Session callbacks remain stable.** Fixes a callback-instability race that could restart protected-page effects and discard an in-progress form.

## Validation — distinguish independently reproduced and reviewer-reported results

| Check | Result |
|---|---|
| Server suite, independently reproduced on a NEW database at `6b4c35d` | **85 passed / 6 skipped**, 11 files — Node24.14.0 / PostgreSQL18.4 |
| Client suite, earlier matching source fingerprint | **57 passed** |
| Browser E2E, earlier matching source fingerprint | **42 passed**, desktop/tablet/mobile |
| Server build | PASS |
| Client typecheck/build | PASS |
| Documentation links/tables/whitespace | PASS |

The server results include **26 new F-04 cases** and actual application-process restart verification. Browser results include **6 F-04 scenario runs**.

**Fresh-database check:** created a new isolated DB and ran only the checked-in migrations before `npm test`. `borrowing_requests.created_at` already has `DEFAULT now()`, while `to_regclass('loans')` is NULL. The six skips are controlled by `loanRelationsExist()`/`HAS_LOAN_RELATIONS`, not by the timestamp default. No Loan DDL or migration003 was added.

**Separate reviewer report:** [the latest review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/36#pullrequestreview-5803634169) reports **91 passed / 0 skipped on PostgreSQL17.11 / Node24.19**. Preserve that as reviewer-reported, not independently reproduced in this workspace. Its relation inventory/setup/raw logs are still needed to reconcile why all six Loan-gated cases ran. Do not relabel this run as the local clean-DB run.

Authentic local RED→GREEN evidence is recorded for unavailable-equipment rejection: the original unchanged assertion failed before implementation and passed afterward.

See `docs/sprints/sprint-1/tdd-evidence-f04.md` for commands, source fingerprint, environment and per-STS outcomes. Initial results identified the pre-commit candidate by fingerprint. A fresh server rerun now directly verifies submitted implementation/test source `6b4c35d`; all 19 original source/test hashes still match. Current remediation changes documentation only. The raw probe/test log is prepared locally as `docs/sprints/sprint-1/pr36-clean-db-results.txt` and will accompany the documentation correction.

## Remaining scope and limitations

- **AC-F04-05/06 remain PARTIAL:** submitted-queue/non-reservation behavior is verified; fulfilled-request exclusion and checkout transitions await Issue #12.
- The **6 skipped server cases** remain dependent on actual Loan schema/behavior.
- **PostgreSQL18.4 is independently verified locally.** PostgreSQL17.11 / Node24.19 verification is reviewer-reported and not independently reproduced here; the environments/results are not combined.
- Shared-team ratification evidence for A-12, re-review, integration and released-version evidence remain pending.

## Documentation remediation

F-03 quantity references are aligned with the recorded A-12 user choice and its pending team-ratification gate. Malformed ASCII question-mark separators in the engineering documents are repaired. Historical run provenance is retained; no code, tests, requirement behavior, Loan schema, issue status or approval is changed by this remediation.

## How to review

- Check ownership filtering, direct API denials and server-controlled fields.
- Review transaction boundaries, live quantity validation and rollback behavior.
- Verify the quantity decision is reflected consistently in code and documentation.
- Keep executed request behavior separate from F-05-dependent acceptance.

Refs #11
