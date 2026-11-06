# Actual test excerpts and TDD provenance

These are excerpts from executed tests, not pseudocode. Current results:164 server cases passed on Node24.15.0/PostgreSQL18.4. The tested staging product source is `5b064ea`; new verification tests are uncommitted and fingerprinted in [verification.json](run/verification.json).

## Domain rule: exclusive stock cannot produce a second loan

File: `server/tests/loan.test.ts`; exact test name fragment `rejects unavailable and repeated requests without mutation (TEST-F05-02/03)`. Setup uses a real PostgreSQL total1 item and two persisted eligible requests; checkout calls the actual Express route with a Custodian session. It proves insufficient stock and duplicate-request rejection with exactly one persisted loan.

```ts
  it("rejects unavailable and repeated requests without mutation (TEST-F05-02/03)", async () => {
    const { id, item } = await fixture(); const other = await second(item);
    expect((await checkout(id)).status).toBe(201);
    expect((await checkout(other)).body.error.code).toBe("INSUFFICIENT_AVAILABILITY");
    expect((await checkout(id)).body.error.code).toBe("ALREADY_CHECKED_OUT");
    expect((await pool.query("SELECT * FROM loans WHERE request_id=ANY($1::text[])", [[id, other]])).rowCount).toBe(1);
  });
```

Result:PASS in the recorded server suite. Expected:one successful checkout, then stock and duplicate conflicts without a second write. Actual:the assertions above passed. This is AC-F05-02/03 and AC-F10-02 coverage, supplementary to the50 independent two-process races.

## Role restriction: client input cannot grant checkout or staff loan-reading rights

File: `server/tests/sprint1-integration.test.ts`; exact generated test names begin `wrong role METHOD PATH is forbidden by server (TEST-F10-02)`. The beforeAll setup creates real Borrower/Custodian users with hashed private passwords, obtains cookies through the production login route, and starts the actual application entrypoint on loopback. Each protected single-role route is called with the opposite authenticated role; domain rows are compared before/after.

```ts
  it.each(PROTECTED_ROUTES.filter((r) => r.allowedRoles.length === 1))("wrong role $method $path is forbidden by server (TEST-F10-02)", async (route) => {
    const before = await domain();
    const path = route.path.replace("{requestId}", requestId).replace("{loanId}", loanId);
    const wrongRole = route.allowedRoles[0] === "CUSTODIAN" ? cookies[0] : cookies[2];
    const response = await call(route.method, path, wrongRole, { equipment_id: item, quantity_requested: 1 });
    expect(response.status).toBe(403); expect((await response.json()).data).toBeUndefined(); expect(await domain()).toEqual(before);
  });
```

Result:all4 role-matrix cases PASS in the recorded server suite. Expected:403/no private data/no domain writes. Actual:each backend assertion passed; this is not merely a hidden-button test. All10 protected routes are additionally exercised for anonymous, invalid, expired and revoked sessions, and revoked replay is checked again after a real process restart.

## Retained RED before GREEN: what is and is not established

| Rule | Actual RED record | GREEN version / current regression | Limit |
|---|---|---|---|
| F-05 unavailable exclusive stock, TEST-F05-15 | [F-05 TDD record](../../sprints/sprint-1/tdd-evidence-f05.md): the intended `assertCheckoutAvailable(1,1,1)` rejection assertion ran against an empty pre-implementation guard and failed;1 failed/1 passed at7 Nov00:33:23+07:00 | Same assertion passed after implementation (12 unit cases at00:35:04); GREEN committed in `70e7b5ef02b92b26745140f0485ad796ffbc52cc`; retained in `server/tests/loan-unit.test.ts` and this164-case run | RED was an observed local working-tree state with its source/output preserved in the evidence, not a committed SHA. No historical commit is fabricated |
| F-01 missing anti-CSRF evidence, TEST-F01-15 | [F-01 cycle3](../../sprints/sprint-1/tdd-evidence-f01.md): author-recorded actual failure1/38 when a no-Origin/no-Referer logout incorrectly revoked the session | Correction GREEN `288a1e3be3eb4689ff2e40a15379d1ed57684710`; same denial/no-revocation regression remains in `server/tests/auth-routes.test.ts`; current run PASS | Historical RED is author-reported local output, not independently reconstructed here. [PR #22 reviewer](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/22#pullrequestreview-5776247539) independently verified GREEN; human authenticity assessment remains pending |

The F-10 runner also retains an [intentional isolated failing assertion](run/runner-failure-probe.json) and verifies its nonzero exit before the clean product suites. That demonstrates runner behavior (TEST-F10-05); it is **not** counted as domain/security TDD or as a failing product test. New integration cases were added to close coverage gaps in already implemented behavior; no invented fail-first claim is attached to them.
