# F-01 TDD Evidence — RED → GREEN

> **Issue:** [#8 — D1-06.1](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) · **Contract:** `f-01-authentication.md`
> **Rule:** DoD §1 requires authentic RED (assertion fails for the intended behavior before correction) then GREEN (same case passes after), preserved with commands/results. Tool/setup failures do not count as RED.

## Environment (recorded per run)

| Tool | Version |
|---|---|
| Node.js | v24.19.0 |
| TypeScript | 7.0.2 |
| Vitest | 5.1.0 |
| Express | 5.3.0 |
| PostgreSQL | 17.11 (local service, port 5432) |

Command for all runs: `npm test` (vitest run, file parallelism disabled, source tests only).

---

## Cycle 1 — Session idle expiry (TEST-F01-08)

**RED** (run before the correction, against the working tree — no SHA yet; output captured from the actual failing run):

```
 ❯ src/test/session.test.ts (7 tests | 1 failed) 91ms
 FAIL  src/test/session.test.ts > SessionStore > enforces idle expiry at the
       boundary using the injectable clock (TEST-F01-08)
 AssertionError: expected { user: { id: 'u-b-a', …(2) }, …(2) } to be null
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

**Behavior gap proven:** `resolve()` extended the sliding expiry *before* the
expiry boundary check, so a session could be extended at/after its own expiry.

**Correction:** enforce expiry before extending (deny-and-do-not-extend
ordering in `src/services/session.ts`), then correct the test to the actual
sliding semantics (idle = 60 min from last touch).

**GREEN** (same command, after correction; committed at `615171f`):

```
 Test Files  2 passed (2)
      Tests  11 passed (11)
```

The case remains as regression coverage in `src/test/session.test.ts`.

---

## Cycle 2 — Safe error envelopes, cookie type, anti-CSRF (PR #22 review)

**RED** (5 new regression tests written first; actual output):

```
 FAIL  src/test/auth-routes.test.ts > Regression — safe error envelopes
       (TEST-F01-03/06/14) > malformed JSON body returns 400 JSON envelope,
       never HTML (TEST-F01-03)
 FAIL  … > object-typed session cookie is denied with 401 JSON, not 500 HTML
       (TEST-F01-06)
 FAIL  … > auth storage failure returns safe 500 JSON without internal
       details (TEST-F01-14)
 FAIL  … > anti-CSRF origin enforcement (TEST-F01-15) > cross-origin logout
       is denied 403 and does NOT revoke the session
 FAIL  … > anti-CSRF origin enforcement (TEST-F01-15) > same-origin
       state-changing request is allowed

 Tests  5 failed | 33 passed (38)

AssertionError: expected 'text/html; charset=utf-8' to contain 'application/json'
AssertionError: expected 500 to be 401 // Object.is equality
AssertionError: expected 204 to be 403 // Object.is equality
```

**Behavior gaps proven (all reproduced by HTTP probes in review):**
1. Body-parser and unexpected auth errors fell through to Express's default
   `text/html` handler, leaking stack/internal details.
2. cookie-parser's JSON-cookie convention decoded `pew_session=j%3A%7B%7D`
   into an object; the untyped `as string` cast reached the digest and threw
   500 instead of denying 401.
3. No trusted-origin enforcement on state-changing requests — a cross-origin
   POST could force logout (204 + successful revocation).

**Corrections:**
1. Global safe error handler (JSON envelope for `entity.parse.failed` /
   unexpected errors; no stack or internal text) + request-id middleware moved
   ahead of the parser.
2. Type checks in `requireAuth` (authz.ts) and defense-in-depth guards in
   `SessionStore.resolve/revoke` — non-string cookie denies 401.
3. `requireTrustedOrigin` middleware (Origin, Referer fallback) on
   state-changing `/api` requests, configured via required `APP_ORIGIN`
   (fail-closed).

**GREEN** (same command, after corrections):

```
 Test Files  5 passed (5)
      Tests  38 passed (38)

npm run build  →  tsc exits 0
```

---

## Final state

- `npm test` → **38/38 passing** (5 files), source tests only (vitest config
  excludes `dist`), reproducible without shell exports (`.env` auto-loaded).
- `npm run build` → exits 0 (TypeScript 7, `moduleResolution: nodenext`).
- Deferred/blocked STS rows (TEST-F01-11/12 execution evidence, TEST-F01-13
  UI/E2E, TEST-F01-14 fault hooks at integration, TEST-F01-15 cookie-attack
  variants beyond origin) remain tracked per contract §7 — this increment does
  not claim them as passed.
