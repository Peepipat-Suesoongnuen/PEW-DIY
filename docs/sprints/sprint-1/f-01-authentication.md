# F-01 — Authentication and Role-Based Access Control

> **Contract:** D1-05 Part E · Sprint 1 · Feature `F-01`
>
> **Implementation issue:** [#8 — D1-06.1](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) · **Contract issue:** [#5](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/5)
>
> **Revision:** 2 — 2026-11-06 · **Contract approval:** Pending team baseline approval and peer review · **Implementation status:** Implemented (Issue #8) · **Test status:** Executed — results in [tdd-evidence-f01.md](tdd-evidence-f01.md) (`npm test`)
>
> **Execution status:** F-01 test results (commands, outputs, RED→GREEN) are recorded in [tdd-evidence-f01.md](tdd-evidence-f01.md); the server suite passes 65/65 at the Issue #10 working tree (`npm test`, run 2026-11-06). STS rows below without a recorded per-row run remain **PLANNED — NOT RUN**; nothing is counted as PASS without evidence. The rev 1 statement described the rev 1 baseline only: "No application, credential mechanism, migration, or test implementation is delivered by this contract."

## 1. Identity, Requirement Links, and Boundaries

| Item | Contract basis |
|---|---|
| Purpose | Establish trusted current-user identity and enforce server-side role/record access across the Sprint 1 increment |
| Functional requirements | [SRS](../../srs.md) `FR-01`–`FR-05` |
| Business rules | `BR-04`, `BR-05`, `BR-06`, `BR-10`; checkout is Sprint 1, while return and catalog-write operations remain later-sprint scope |
| Non-functional requirements | `NFR-01`, `NFR-02`, `NFR-03`; F-10 coordinates integration and complete Sprint 1 verification |
| Design baseline | [System SDS](../../system-sds.md) §3.1, §4, §5, §6, §7 and §10 |
| Feature/dependency basis | [Feature Inventory](../../features.md) F-01; foundation with no prior feature dependency. Its integrated authorization checks require F-02–F-05 protected routes and fixtures to exist |
| Shared contract sources | [Shared conventions](shared-conventions.md), [fixtures](fixtures.md), [Product DoD](product-dod.md), and [verification matrix](verification-matrix.md) |

**In scope:** seeded Borrower/Custodian login, logout, current-user retrieval, salted-hash verification, authenticated principal resolution, role denial and request/loan ownership enforcement. The UI reflects the authenticated role but does not enforce authorization by hiding controls alone.

**Outside Sprint 1:** registration, password recovery, email verification, role-management APIs, multiple roles per account, third-party identity integration, return endpoints, catalog-write endpoints, and full staff loan/history views. Do not add these endpoints merely to populate security tests.

**Decision gates:** `SDS-OQ-01` (stack, migration/hash/test libraries and versions) and `SDS-OQ-02` (session/token mechanism, credential transport, expiry, revocation, CSRF and storage) remain **OPEN**. This contract specifies observable obligations and conditional alternatives; it does not choose either mechanism or a timeout duration. Before implementation, record the selected policy and replace conditional tests with its concrete configuration. Username normalization, accepted credential lengths and any existing-session replacement policy must be recorded with that selection. SRS OQ-01/OQ-02 affect dependent feature fixtures/contracts and are not resolved here.

## 2. Feature Design and Workflow

### 2.1 Authentication and Authorization Flow

1. A logged-out user opens Login and submits a username/password. Validate the allow-listed request shape and verify credentials against the seeded User record using the selected password library.
2. On success, establish a fresh authenticated credential through the selected mechanism. The principal's user ID and single role come from trusted server state, never from browser-supplied role/owner fields or an unverified token.
3. The UI obtains current-user identity after login and on authenticated reload. Every protected API operation independently resolves authentication; fetching current-user once does not authorize subsequent calls.
4. Apply role and record-scope checks before returning private records or executing domain writes. Borrower list queries include the current owner's predicate; request/loan details follow Loan → BorrowingRequest → Borrower as applicable.
5. Logout invalidates the current authenticated credential server-side before reporting success. Clear the browser's credential channel and private state. Replaying the logged-out credential must fail at current-user and every other implemented protected route.
6. Server-enforced expiry/revocation denies further protected access. The UI clears stale identity/private data on authentication denial and requests login again.

For a server-session choice, use new unpredictable session identifiers, trusted shared/durable session state, server-side expiry and server-side invalidation. For a token choice, select signature/claims validation and an explicit shared revocation/session policy that rejects replay after logout. Client-only deletion is insufficient. These are alternatives from SDS §7, not two parallel implementations. Credential creation must not adopt a client-selected pre-authentication identifier; the precise library/API remains gated by SDS-OQ-02.

### 2.2 Role and Record Scope

The authoritative list is the **complete implemented protected route inventory** in [shared conventions](shared-conventions.md), together with SDS §6.2. Expand the route-parameterized tests whenever a protected route is added; sampling only one endpoint cannot satisfy NFR-01/02.

| Operation family | Borrower | Custodian |
|---|---|---|
| Current-user / logout | Own identity/current credential | Own identity/current credential |
| Equipment and availability reads | Allowed catalog scope | Allowed catalog scope |
| Create request | Own request; owner assigned server-side | Denied; on-behalf borrowing is not in scope |
| Request reads | Own requests only | Submitted requests needed for checkout |
| Checkout | Denied even for own request | Allowed subject to F-05 rules |
| Active-loan reads in Sprint 1 | Own loans only | Created loan in checkout response; no general staff loan-list capability added here |

Unauthenticated protected calls return a safe 401. Authenticated wrong-role and cross-borrower detail calls return safe 403 responses. Own-list filtering must not reveal another Borrower's records, counts or private fields. A hidden/disabled UI control cannot substitute for these checks. BR-06 enforcement applies to any catalog-write operation when it exists; this contract does not pull Sprint 2 writes into Sprint 1.

### 2.3 UI States

- Login offers username/password fields, field-level validation and an explicit pending state that prevents accidental duplicate submissions. Preserve only safe input, such as the username, when showing an error; do not store passwords in browser storage or diagnostics.
- Invalid credentials show one generic message for unknown username and incorrect password. Validation and service errors use the shared safe-error behavior.
- After login/reload, navigation uses current-user's server-returned role. Borrowers see their own request/loan navigation; Custodians see the submitted-request checkout navigation.
- Logout remains accessible from authenticated screens. Show success only after server invalidation succeeds. On a failed or uncertain logout response, do not assert that the server credential is invalid; show a safe failure and permit a controlled retry/recheck.
- On successful logout, user change, or 401, remove private cached views and stale identity. Browser back navigation, a refresh and a later login as the other Borrower must not expose the previous user's private records.

## 3. Proposed API Contract

Domain fields use `snake_case`; the shared error envelope deliberately retains SDS's `requestId`. IDs are opaque strings. All examples describe shape only and contain no credential values. Common errors follow [shared conventions](shared-conventions.md): `VALIDATION_ERROR`/400, `INVALID_CREDENTIALS`/401, `UNAUTHENTICATED`/401, `FORBIDDEN`/403, `INTERNAL_ERROR`/500 and `SERVICE_UNAVAILABLE`/503.

| Method and path | Input and access | Success | Rejection / effects |
|---|---|---|---|
| `POST /api/auth/login` | JSON `{ "username": string, "password": string }`; login is available without an existing credential | 200 with `data.user` containing only `id`, `username`, `role`; selected credential transport established separately as documented below | 400 for malformed JSON, missing/non-string/empty required fields or extra server-controlled fields; 401 `INVALID_CREDENTIALS` for unknown user or incorrect password; no authenticated credential on rejection |
| `GET /api/auth/me` | Current credential through selected transport; no client-selected user/role | 200 with the same safe `data.user` shape for the authenticated principal | 401 `UNAUTHENTICATED` for missing, invalid, expired or revoked credential; no private identity in the rejection |
| `POST /api/auth/logout` | Current credential and JSON `{}`; chosen anti-CSRF evidence if applicable | 204 with no response body, after invalidating the current credential and clearing its browser transport | 401 `UNAUTHENTICATED` if no valid current credential; safe failure on inability to confirm invalidation; never report successful invalidation before commit |

`data.user` has this shape: `{ "id": "<opaque-user-id>", "username": "<synthetic-username>", "role": "BORROWER" }`; `CUSTODIAN` is the other permitted role. No password, password hash, session record, authorization flags or other user's fields appear in this object. `role`, `user_id`, `borrower_id` and caller-selected session/expiry fields are not accepted login identity overrides. Do not trim or transform the password before verification; the selected username policy must be consistent between seed, uniqueness checks and login.

**Credential transport remains conditional:** a cookie/session selection documents `Set-Cookie`, cookie scope/attributes, server validation and CSRF behavior; a token selection documents the legitimate issuance channel, bearer or protected-cookie transport, validation/revocation and safe client handling. The `data.user` shape alone does not issue a credential. Do not invent a token field or cookie name before SDS-OQ-02 is resolved. Secrets may appear only in the mechanism's intended credential transport, never in the user/error object, URL, logs or screenshots.

All protected route handlers use the same trusted principal and deny-by-default checks. Input validation never permits mass assignment of role/owner fields. Responses and diagnostics exclude private data on denial. Any unexpected auth/storage error returns the appropriate generic shared error and fails closed; it must not create or accept a fallback identity.

## 4. Data, Migrations, and Configuration

| Logical data | Proposed specification |
|---|---|
| User | Opaque `id`; unique username under the recorded normalization policy; `password_hash`; exactly one constrained role `BORROWER` or `CUSTODIAN` |
| Password verification | Maintained salted-password-hash library selected under SDS-OQ-01; compare through its verification function. Algorithm/library/cost remain recorded choices, not a new selection in this contract |
| Server-session option | Chosen session storage links trusted user, creation/expiry and revocation state, plus policy-specific activity/renewal fields. Exact schema/identifier handling awaits SDS-OQ-02 |
| Token option | Chosen signed-credential validation plus persisted/shared logout revocation/session state sufficient to reject old credentials through their validity period; schema/key/claim policy awaits SDS-OQ-02 |
| Private seed inputs | Fixture accounts `B-A`, `B-B`, `C-A` from [fixtures](fixtures.md). Password input arrives through ignored/private local procedure; only salted hashes enter persistent seed records. No plaintext passwords in tracked fixtures, database, logs or deliverable text |

Create User/role/uniqueness constraints before dependent request/loan foreign keys. Add only the selected authentication store via ordered version-controlled migrations; do not create both alternatives by default. Test empty-database migration and upgrade from the prior fixture schema, preserving user IDs and references. Seed reruns must not reset existing credentials or roles. Exact commands and versions are blocked by SDS-OQ-01 and must become verified README instructions before implementation is accepted.

Configuration names follow SDS §8 and [shared conventions](shared-conventions.md). Runtime configuration supplies only secrets required by the selected mechanism; no built-in credential/signing fallback is permitted. Document chosen expiry policy and a controlled clock seam for tests. A cookie-based choice must specify its anti-CSRF mechanism and deployed cookie attributes; a bearer-header choice must document client storage/origin handling. Local/deployed transport differences must be explicit rather than disabling production safeguards globally.

## 5. Acceptance Criteria

All criteria are proposed contract behavior awaiting team review. Mechanism-dependent criteria are **blocked for implementation verification** until SDS-OQ-01/02 are resolved; they are not marked passed by specifying them.

| AC ID | Observable acceptance criterion | Requirement basis | Planned tests |
|---|---|---|---|
| AC-F01-01 | Each valid seeded Borrower/Custodian can log in, obtain a fresh valid credential through the selected channel and retrieve their own safe `data.user` identity with the correct single role | FR-01, FR-03, FR-04 | TEST-F01-01, TEST-F01-04 |
| AC-F01-02 | Unknown username and wrong password both produce the same safe 401 `INVALID_CREDENTIALS` response policy, establish no usable credential and disclose no account/hash/password details | FR-01, NFR-03 | TEST-F01-02, TEST-F01-12 |
| AC-F01-03 | Malformed login input and forged identity/role/expiry fields are rejected with 400 `VALIDATION_ERROR`; no identity override, user/role mutation or credential is created | FR-01, FR-04 | TEST-F01-03 |
| AC-F01-04 | Current-user identity is derived from the authenticated principal; browser role/user tampering cannot change the returned identity or backend privileges | FR-03, FR-04, NFR-02 | TEST-F01-04, TEST-F01-09 |
| AC-F01-05 | Every implemented protected route rejects missing or invalid authentication with 401 `UNAUTHENTICATED`, no private data and no protected state change; expired/revoked credentials are equally denied | FR-04, NFR-01 | TEST-F01-05, TEST-F01-06, TEST-F01-07, TEST-F01-08, TEST-F01-16 |
| AC-F01-06 | Successful logout invalidates the current credential server-side before 204, clears its browser transport/private UI state, and replay fails; failure to invalidate cannot be reported as successful logout | FR-02, NFR-01 | TEST-F01-07, TEST-F01-13, TEST-F01-14, TEST-F01-16 |
| AC-F01-07 | The chosen server-enforced expiry policy accepts a credential before its configured expiry and denies it at/after expiry. Idle and absolute limits are exercised when the selected policy includes them; browser time changes cannot extend validity | FR-01, FR-02, NFR-01 | TEST-F01-08 |
| AC-F01-08 | All implemented protected operations enforce the shared role matrix through direct API calls; wrong-role callers receive 403 `FORBIDDEN` without private data or domain writes, regardless of UI state | FR-04, BR-04, BR-06, NFR-02 | TEST-F01-09 |
| AC-F01-09 | Borrower list results include only their own requests/loans; another Borrower's detail IDs produce safe 403 without their records. URL/body/query owner manipulation cannot widen scope | FR-05, BR-05, NFR-02 | TEST-F01-10 |
| AC-F01-10 | Seeded/stored passwords are salted hashes verified by the selected comparison function; no plaintext passwords or stored hashes leak through APIs/logs/tracked fixtures, and no auth credential leaks outside its intended transport | BR-10, NFR-03 | TEST-F01-11, TEST-F01-12 |
| AC-F01-11 | Login/current-user/logout UI handles validation, pending/success/error/401 states, uses the trusted role for navigation and clears stale private state on logout or user change; service failure never authenticates a fallback user | FR-01–FR-04, NFR-01/02 | TEST-F01-13, TEST-F01-14 |
| AC-F01-12 | The selected credential transport is validated on every protected call; cookie mode enforces its agreed anti-CSRF policy on state-changing requests and deployed cookie attributes, while bearer mode enforces its agreed transport/origin/storage rules. Neither mode trusts client role/expiry claims without server validation | FR-01–FR-04, NFR-01/02 | TEST-F01-15 |

## 6. System Test Specification (STS)

**Common preconditions:** proposed fixtures `B-A`, `B-B`, `C-A` and independent private test credential inputs from [fixtures](fixtures.md); isolated persistent test database; selected auth policy and test clock configured; [shared route inventory](shared-conventions.md) reconciled with every actually implemented Sprint 1 route. Dependent tests wait for F-02–F-05 routes. Use valid domain payloads permitted by their contracts so that authentication/authorization is the rejection under test. Snapshot relevant protected records before negative tests and compare after. No test password or reusable credential is printed or committed.

All rows are **PLANNED — NOT RUN**; record actual file/command/SHA/results later in the [verification matrix](verification-matrix.md). One parameterized TEST ID may generate several executable cases; future result counts must report those actual cases, not infer passes from the number of rows.

| Test ID / level | AC links | Fixture / precondition | Explicit input and action | Expected result / state |
|---|---|---|---|---|
| TEST-F01-01 — API/DB integration | AC-F01-01 | Fresh unauthenticated client for each of B-A, B-B and C-A; corresponding User hash/role seeded | POST login with that account's privately supplied valid credentials; capture the selected credential channel, then GET current-user with it | Login 200; credential is fresh and usable; `data.user` contains only the account's `id`, `username`, correct role; current-user 200 returns the same identity; no User role/credential mutation |
| TEST-F01-02 — API integration, negative | AC-F01-02 | No existing credential; B-A exists and a distinct synthetic username does not | Submit B-A with a wrong password, then the nonexistent username with a wrong password, using the same well-formed shape | Both 401 `INVALID_CREDENTIALS` with identical generic code/message and shared envelope shape (request IDs may differ); neither response reveals user existence or supplies a usable credential; subsequent current-user 401 |
| TEST-F01-03 — API integration, validation | AC-F01-03 | Unauthenticated client and seeded User snapshot | Parameterize malformed JSON, omitted username/password, wrong types, empty strings, and extra `role`, `user_id`, `borrower_id` or expiry override fields at login | Each rejected input returns 400 `VALIDATION_ERROR` with safe field detail only where applicable; no authenticated credential, User/role mutation or private details |
| TEST-F01-04 — API/UI integration | AC-F01-01, AC-F01-04 | Valid B-A credential; separate valid C-A client | GET current-user, alter only browser-local role/identity values to claim C-A, then GET current-user again and attempt a Custodian-only action using B-A's credential | Current-user remains B-A with role BORROWER; forged browser state grants no privilege; direct Custodian-only action 403 with no domain write; independent C-A client remains C-A |
| TEST-F01-05 — API integration, route-parameterized | AC-F01-05 | Entire implemented protected route inventory; no credential | Call every protected method/path with otherwise-valid fixture input and no credential, including current-user/logout; record one case per route | Every route returns 401 `UNAUTHENTICATED`, with no private response data or protected mutation; inventory has no untested protected route |
| TEST-F01-06 — API integration, route-parameterized | AC-F01-05 | Same inventory; selected credential transport known | Repeat every protected call using an unknown/corrupted credential; for signed tokens include invalid signature/required-claim variants defined by the chosen policy | Every invalid credential is rejected with 401 `UNAUTHENTICATED`; none becomes an anonymous/default privileged identity; no private response data or protected write |
| TEST-F01-07 — API/DB integration | AC-F01-05, AC-F01-06 | Valid B-A credential and protected-state snapshot | POST logout `{}` with valid credential/security evidence; retain the old credential only inside test memory, then replay it against current-user and every protected route | Logout 204 with empty body after committed invalidation; browser channel clearing matches selected policy; every old-credential replay returns 401, exposes no private data and causes no protected write |
| TEST-F01-08 — API integration with controlled clock | AC-F01-05, AC-F01-07 | Approved expiry policy/configured duration; valid credential created at controlled time `t0` | Call current-user immediately before configured expiry, at expiry, and after expiry; test idle/absolute limits separately if selected; alter browser clock without changing server clock | Before expiry: 200 while otherwise valid. At/after expiry: 401 on current-user and route-parameterized protected calls; client clock cannot extend validity; no expired-credential mutation. Exact times derive from approved policy, not a timeout invented here |
| TEST-F01-09 — API integration, role matrix | AC-F01-04, AC-F01-08 | Fresh B-A/B-B/C-A clients; valid target requests/domain input | For every implemented protected operation, execute the shared inventory's applicable wrong-role cases directly; include B-A checkout of own/other request and C-A request creation. Manipulate UI/extra role claims as separate attempts | Each wrong-role call 403 `FORBIDDEN` independent of visible UI; no private record or protected write. Legitimate calls are covered by feature positives; no Sprint 2 endpoint is added solely for this test |
| TEST-F01-10 — API/DB integration, ownership | AC-F01-09 | Requests/active loans separately owned by B-A and B-B; each authenticated in isolated client | As B-A, list own requests/loans and GET B-B detail IDs; repeat as B-B; try changing owner IDs in supported URL/body/query locations using otherwise-valid calls | Own lists contain only the caller's records and no other-owner counts/private fields; cross-owner details 403 without rows; unsupported owner overrides are safely rejected or cannot widen scope per the owning route contract; DB unchanged |
| TEST-F01-11 — DB/library integration | AC-F01-10 | Seeded users; selected hashing library, private test input and migration commands | Inspect User/seed persistence without printing secrets; verify correct/wrong input through the selected library; create isolated equal-password hash fixtures through the seed/library path; rerun seed | Stored values are salted password hashes; correct input verifies, wrong input fails; equal test inputs use distinct salts/hashes; no plaintext password columns/fixtures; seed rerun preserves existing IDs, hashes and roles |
| TEST-F01-12 — API/log/artifact inspection | AC-F01-02, AC-F01-10 | Captured test-only output sink; selected intended credential channel documented | Exercise successful/invalid login, current-user, logout and forced safe errors; inspect responses, URLs, logs and tracked seed/config artifacts for the private test password, stored hashes and captured credentials | Safe user/error objects, URLs and logs contain none of these secret values; no plaintext password in tracked artifacts; credentials appear only in explicitly intended issuance/transport, never incidental fields/diagnostics; report redacted evidence |
| TEST-F01-13 — Browser/E2E | AC-F01-06, AC-F01-11 | B-A/B-B private request/loan fixtures; C-A; browser with storage/cache inspection and controlled credential expiry/revocation | Exercise invalid login, successful B-A login, pending controls and reload/current-user; while B-A private data is open, expire/revoke its credential and trigger a protected read; inspect back/refresh, then authenticate again, logout and switch to B-B/C-A | Generic invalid feedback; no password persistence; trusted role navigation and pending controls; protected401 returns to login and clears B-A identity/private cache without back/refresh disclosure; successful logout/user change also clear private state; B-B never sees A records; C-A has authorized staff navigation only |
| TEST-F01-14 — API/UI integration, failure injection | AC-F01-06, AC-F01-11 | Controlled auth-storage failure; unauthenticated login client and separately authenticated logout client | Fail credential-state read/write during login; separately fail/reject logout invalidation before commit and observe UI plus credential-state outcome | Safe 500/503 shared response with no secret/internal details; failed login yields no usable identity; failed invalidation never returns 204 or a UI claim of confirmed server logout; no fallback identity or unrelated state mutation |
| TEST-F01-15 — API/browser integration, selected transport | AC-F01-12 | SDS-OQ-02 resolved and documented; valid clients plus hostile-origin/missing-security-evidence client | Cookie branch: inspect configured deployed cookie attributes and send state-changing requests with absent/forged anti-CSRF evidence. Bearer branch: tamper transport/token claims/signature and exercise approved origin/storage controls | Selected branch satisfies the approved policy; cookie attack requests are denied without writes; tampered/untrusted credentials cannot authenticate or change role/expiry; no credential leak in forbidden origin/client storage path. This row is BLOCKED, not skipped-as-pass, until concrete mechanism expectations are recorded |
| TEST-F01-16 — API/DB integration, revocation persistence | AC-F01-05, AC-F01-06 | Valid credential logged out successfully; same persistent auth store retained | Restart the application, then replay the logged-out credential against current-user and every implemented protected route | Previously revoked credential remains denied with 401 and no private data/write after restart; absent/cleared session state never restores authorization; no Lab 5 deployment or session-survival claim is inferred |

## 7. Feature Definition of Done and Evidence

This feature must satisfy every applicable [Product DoD](product-dod.md) gate plus:

- [ ] Resolve and record SDS-OQ-01/02 choices, credential input policy and concrete mechanism-specific tests; obtain team review of this proposed contract before implementation.
- [ ] Implement all applicable AC-F01-01–AC-F01-12 across the **complete existing protected route inventory**. Future endpoint additions inherit its authorization checks and test matrix; integration coverage cannot be claimed while F-02–F-05 routes are absent.
- [ ] Implement/run TEST-F01-01–TEST-F01-16 with real test files and route-parameterized results; retain negative security test evidence and meaningful RED → GREEN evidence for an access rule. Planned rows and unresolved branches do not count as passing tests.
- [ ] Record credential/hash inspection without exposing secrets; document reproducible private seed/setup and approved expiry/logout/current-user behavior.
- [ ] Link actual command, tested SHA, case counts and outcomes in the verification matrix; F-10 verifies integrated behavior without replacing F-01's security responsibility.
- [ ] Obtain substantive independent teammate review and follow the repository's staging/release workflow. Agent self-check, a draft contract, successful local tests or an unmerged approval alone do not make the feature Done.

## 8. Revision History

| Revision | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Proposed F-01 design/API/data contract, 12 AC and 16 planned STS rows; explicit stack/auth decision gates | SRS rev 2; Part B F-01; SDS rev 2; Part D rev 3; D1-05 Part E scope |
| 2 — 2026-11-06 | Documentation alignment (Issue #10 PR): status header split into Contract approval / Implementation / Test status with real evidence references; no contract text changed | tdd-evidence-f01.md (commands/results); `npm test` run 2026-11-06 |
