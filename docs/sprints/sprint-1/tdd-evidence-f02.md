# F-02 TDD / Fix Evidence — RED → GREEN

> **Issue:** [#9 — D1-06.2](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) · **Contract:** `f-02-equipment-catalog.md`
> **Rule (Product DoD):** authentic RED (assertion fails for the intended behavior before correction) then GREEN, with commands/results preserved.

## Cycle 1 — Validation boundary (original implementation, tests written first)

**RED** (test-first run before the catalog implementation was completed):

```
 FAIL  server/tests/catalog.test.ts > rejects negative total and fractional
       quantity at the typed boundary; zero total is valid (TEST-F02-06)
 Error: VALIDATION: id must be a nonempty string
 Test Files  2 failed | 4 passed (6)
      Tests  2 failed | 47 passed (49)
```

**Gaps proven:** (a) the valid zero-total case failed on a missing-id validation; (b) the `toThrow()` cases were **masked** — they passed for the wrong reason (id check), so the field-level checks were not actually exercised. **Correction:** isolate one field per case (spread base + vary field, assert on the error message) → strengthened tests, each rejection now proven for its intended reason.

**Second gap in the same run:** TEST-F01-14 expected `500` but the shared convention maps DB unavailability to **503 SERVICE_UNAVAILABLE** (f-02 contract §4). Test aligned to the contract's "Safe 500/503" wording with all no-leak assertions preserved (not weakened).

**GREEN:** `Tests 50 passed (6 files)` at commit `1dc9434`.

---

## Cycle 2 — UI safety and logout failure (PR #27 review findings)

Reviewer reproduced two real browser defects in `client/catalog.html`:
1. **P1 XSS**: item fields concatenated into `innerHTML` — HTML/JS in a DB field executes in the page.
2. **P2 logout**: handler ignored the HTTP status and redirected to login even when revocation failed (503) — leaving the server session valid while the UI claimed logout.

**Regression tests written first** (`server/tests/catalog-ui.test.ts`, jsdom harness loading the real `client/catalog.html` with a stubbed `fetch`), then run against the **pre-fix** page from `git show HEAD:client/catalog.html`:

```
 × renders HTML-bearing item fields as text — no element creation, no script execution
 × failed logout (503) shows a safe failure with retry — no redirect, session page stays
 × network-error logout also reports failure without redirect (uncertain outcome)
 Tests  3 failed | 1 passed (4)
```

**Corrections:**
1. Row cells built with `createElement("td")` + `textContent` (never `innerHTML`).
2. Logout redirects **only on confirmed 204**; failure/network error shows a safe message with a retry affordance and no redirect (F-01 contract §2.3 logout-failure behavior).

**GREEN** (same tests against the fixed page):

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

---

## Cycle 3 — Catalog DB failure recovery (PR #27 review finding)

Reviewer showed the old TEST-F02-09 failed at **authentication** first (broken pool + `cookie=any`) and accepted `401|503` — proving nothing about the catalog failure path.

**Fix approach (behavior tightened, not weakened):** a flaky pool wrapper that fails **only `equipment` reads** while session/auth queries pass through, driven by a **valid authenticated session**; assert `503 SERVICE_UNAVAILABLE` + safe envelope for both list and detail; then restore the DB and retry must return real data.

**GREEN** (final suite):

```
 Test Files  8 passed (8)
      Tests  55 passed (55)
```

---

## Cycle 4 — Real application process restart (PR #27 review finding)

Reviewer noted the previous "restart" evidence was only a new app instance in the same process.

**Correction:** `server/tests/restart-e2e.test.ts` spawns the **actual application process** (`node --import tsx server/src/index.ts`) against the durable test database, reads catalog data and a live session, **kills the process (SIGKILL)**, respawns it, and asserts: (a) the pre-restart session still authenticates, (b) catalog records are identical, (c) no startup reseed duplicates fixtures. The in-suite instance-level check was renamed to state its true scope ("new application instance").

**Verified run:**

```
 server/tests/restart-e2e.test.ts
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

---

## Final state

- `npm test` → **55/55 (8 files)** — includes UI regression (jsdom), catalog DB failure/recovery, and real process-restart evidence.
- `npm run build` → exit 0; `dist/` contains 0 test files.
- Still deferred (honest): full browser E2E rendering journeys (TEST-F02-07/08 browser portion, TEST-F01-13 Playwright track); loan-dependent portions of TEST-F02-05/10 (F-04/F-05 gated per contract §8).
