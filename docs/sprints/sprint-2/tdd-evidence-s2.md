# Sprint 2 TDD Evidence Plan & Local Pre-PR Observation

> **Scope Note:** This Docs PR (`docs/sprint2-contracts-and-docs`) defines the contracts and TDD plan before merging implementation Issues [#99](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/99) and [#100](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/100). `server/tests/sprint2-rules.test.ts` and implementation code are **not** yet committed in this PR; final committed TDD evidence will be updated with exact commit SHAs upon merging Issue #99.

## Planned RED -> GREEN Target (`server/tests/sprint2-rules.test.ts` — Issue #99)

### 1. Local Pre-Split RED Observation (Prior to Issue #99)
- `checkoutDueOn` with `requestedDays = 14`: failed against Sprint 1 hardcoded 7-day rule (expected `"2026-12-07"`, received `"2026-11-30"`).
- `isLoanOverdue`: failed against missing `isLoanOverdue` helper / returned-loan & equality (`dueOn === today`) boundary checks.

### 2. Local Pre-Split Candidate Observation (Non-Committed Working Tree)
- Prior to splitting changes into Issues #99 and #100, a local working-tree candidate ran `npm run test:ci` (PostgreSQL `17.11`, Node `v24.19.0`) and observed `279 server / 65 client / 60 browser` passes.
- **Disclosure:** That run was from a local uncommitted working-tree candidate and is **not** committed release evidence for `docs/sprint2-contracts-and-docs`. Re-verification on the exact committed SHAs of Issues #99 and #100 is required during their PR CI runs.
