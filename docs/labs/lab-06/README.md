# Lab 6 — Independent Sprint 1 UAT

> **Tracking:** Parent [Issue #80](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/80) · Part A [#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81) · Part B [#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82) · Part C [#83](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/83) · Part D [#84](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/84) · UAT blocker coordination [#90](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/90)
>
> **Source:** `Lab_6_Sprint_1_UAT.pdf`, Parts A–D and submission checklist
>
> **Status:** Isolated UAT environment (`pewdiy-uat`) provisioned and smoke-tested on 2026-11-22; participant names/IDs, private credential delivery, schedule, execution, findings, retest, and acceptance remain **pending**. This document does not claim that a partner test or acceptance has occurred.

## 1. Purpose, roles, and scope

This is the PEW-DIY Product Team's executable handoff for another team to test the delivered Sprint 1 product. The partner team is the **UAT Team** and must independently execute the cases on the exact deployed release recorded below. Our team must also act as UAT Team for the partner's Sprint 1 release; that separate Part B work is not represented as complete here.

The product scope is the implemented Sprint 1 features **F-01–F-05** and their agreed acceptance criteria. F-05's implementation commit and review are traceable to the deployed source; however, the local F-05 TDD record is for a different candidate and must not be presented as test evidence for that release. See the F-05 traceability record in §2. Use the [Sprint 1 contracts](../../sprints/sprint-1/README.md), [verification matrix](../../sprints/sprint-1/verification-matrix.md), and [UAT evidence pack](../../verification/sprint-1/README.md) as requirement and automated-test references. F-10 supports integration/evidence and is not an additional user-facing product feature. Do not accept unfinished Sprint 2/3 functionality (including return, overdue handling, catalog edits, or staff loan history) as part of this UAT.

The automated checks in the evidence pack are supporting evidence only; they do not replace the other team's manual, user-facing execution or its independent decision.

### Current tracker state

GitHub issue states as of 2026-11-22:

| Issue | GitHub state | Acceptance evidence |
|---|---|---|
| Parent [#80](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/80) | **OPEN** | **INCOMPLETE** — required child work and Lab 6 evidence are still pending. Reopened 2026-11-21; the issue body says to keep it open until these are complete. |
| Part A [#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81) | **OPEN** | **IN PROGRESS** — isolated UAT deployment (`pewdiy-uat`), database (`pewdiy_uat`), seed, and reset job are provisioned and smoke-tested; participant names/IDs, private credential delivery, and test window remain pending. Reopened 2026-11-21. |
| Part B [#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82) | **OPEN** | **BLOCKED** — partner handoff and independent execution evidence are absent. Reopened 2026-11-21. |
| Part C [#83](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/83) | **OPEN** | **BLOCKED** — neither UAT direction has completed results to triage. |
| Part D [#84](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/84) | **OPEN** | **BLOCKED** — triage, correction/retest, and final decision are pending. |
| UAT blocker coordination [#90](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/90) | **OPEN** | Coordination register is documented; external prerequisites remain pending. |

GitHub state is not completion evidence. Issues #80–#82 were closed by merged PRs #85–#87 on 2026-11-21 and reopened the same day with recorded rationale: those PRs documented pending or blocked UAT work, not completed acceptance. All six tracked issues are OPEN as of 2026-11-22, verified against the public issue pages. Their acceptance evidence remains incomplete as recorded above and in the issue comments. No UAT execution, partner result, or instructor/TA notification is claimed.

### Current completion state

| Part | State |
|---|---|
| A — PEW-DIY UAT preparation/handoff ([#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81)) | **IN PROGRESS** — cases, F-05 implementation trace, and isolated UAT service/DB (`pewdiy-uat` / `pewdiy_uat`) are ready; participant names/IDs, private credential delivery, and scheduling remain pending. |
| B — Independent UAT of partner product ([#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82)) | **BLOCKED** — no partner handoff, case package, release/access details, or test window is recorded; no partner-case execution is evidenced, and no instructor/TA notification is documented. |
| C — Findings and triage ([#83](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/83)) | **BLOCKED** — neither UAT direction has a completed results package to triage; no finding disposition or “none received” claim is recorded. |
| D — Fixes/retest/final decision ([#84](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/84)) | **BLOCKED** — Part C has no completed UAT results to triage, so no accepted finding is ready for correction or retest. No final decision is claimed. |

## 2. Release handoff — complete before inviting testers

The [Deploy demo run #6](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/44570631696) records the release actually deployed on 2026-11-19. Its commit, image digest, and revision below identify that deployment at that time; they do not prove that the revision is still current. Before handoff, confirm the live revision and record any change. See the [Lab 5 deployment guide](../lab-05/deployment.md) for the release and smoke-check procedure.

| Handoff field | Value |
|---|---|
| Product team / project | PEW-DIY / D.I.Y. Room Equipment Borrowing System |
| Sprint 1 requirements and contract revision | F-01 rev 2; F-02 rev 2; F-03 rev 4; F-04 rev 5; F-05 rev 3. F-05 implementation commit `70e7b5ef02b92b26745140f0485ad796ffbc52cc` is included in deployed source commit `b03c9043533a6dc1f8a6fb958983ddb0da9529c7`; see the traceability note below. |
| Git release tag and full commit SHA | No Git release tag is recorded in the deployment evidence. Deployed source commit / image tag: `b03c9043533a6dc1f8a6fb958983ddb0da9529c7` (`main`) |
| Deployed image digest and revision at deployment time | `asia-southeast1-docker.pkg.dev/cpe334-2026-pew-diy/pewdiy/pewdiy@sha256:e636ea0c95b027e68ab07ca550a9ce57f2343f99603391cc161936a220cbc2d4`; Cloud Run revision `pewdiy-00008-mfk` was serving 100% of traffic at 2026-11-19 16:51:03 UTC. **Reconfirm the active revision before UAT.** |
| Public demo URL and read-only verification | [https://pewdiy-qtz73ahnlq-as.a.run.app](https://pewdiy-qtz73ahnlq-as.a.run.app) — checked 2026-11-22: `/` and `/login` returned HTTP 200; `/api/ready` returned `{"status":"ready","db":"connected"}`. Shared demo only; do not run state-changing UAT here. |
| Isolated UAT service URL and tested release | [https://pewdiy-uat-qtz73ahnlq-as.a.run.app](https://pewdiy-uat-qtz73ahnlq-as.a.run.app) — Cloud Run service `pewdiy-uat` (`asia-southeast1`, project `cpe334-2026-pew-diy`); active revision `pewdiy-uat-00002-bnt` serving `100%` traffic on image `asia-southeast1-docker.pkg.dev/cpe334-2026-pew-diy/pewdiy/pewdiy@sha256:e636ea0c95b027e68ab07ca550a9ce57f2343f99603391cc161936a220cbc2d4` (`main` commit `b03c9043533a6dc1f8a6fb958983ddb0da9529c7`). Connected to dedicated database `pewdiy_uat` on `pewdiy-pg` (`APP_ORIGIN` matches the UAT URL). `python deploy/smoke_test.py https://pewdiy-uat-qtz73ahnlq-as.a.run.app` passed on 2026-11-22 (`/api/ready`, `/`, `/login`, `/api/equipment` 401; optional login check skipped). |
| Product Team participants | **PENDING — record both students and IDs in the submission PDF** |
| UAT Team / independent tester names | **PENDING — record both students and IDs before execution** |
| Handoff date and agreed test window | **PENDING** |
| Private credential handoff channel | **PENDING — use the course-approved private channel; never record credential values here** |
| Deployment smoke-check evidence | [Deploy demo run #6](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/44570631696) succeeded, including deployment verification and public-URL smoke checks. It reused an existing image (build/push skipped); it did not prepare isolated UAT data or a reset procedure. |
| Release regression baseline | [CI & Docker Build on `main`](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/actions/runs/44566327436) succeeded for the exact release commit above. A product-side local `npm run test:ci` on 2026-11-22 identified the same commit as `CLEAN_SOURCE_COMMIT` and passed 195 server, 74 client, and 57 Chromium cases with zero failed or skipped cases. |

### External prerequisite coordination — Issue #90

This register tracks who must provide each missing prerequisite and the next safe action. Responsible parties are roles because no individual names have been provided.

| Prerequisite | Responsible role | Current status and evidence | Next action |
|---|---|---|---|
| Current PEW-DIY deployed revision | Product Team deployment owner (`peepipat2549@gmail.com`) | Confirmed on 2026-11-22: demo `pewdiy` runs `pewdiy-00008-mfk` and isolated UAT `pewdiy-uat` runs `pewdiy-uat-00002-bnt` (100% traffic, commit `b03c9043533a6dc1f8a6fb958983ddb0da9529c7`, digest `sha256:e636ea0c95b027e68ab07ca550a9ce57f2343f99603391cc161936a220cbc2d4`). | Reconfirm revision if redeployed; record any `UAT-08` restart revision. |
| Isolated UAT deployment/database, fixture mapping, and reset/cleanup procedure | Product Team deployment owner (`peepipat2549@gmail.com`) | **READY** — `pewdiy-uat` (`https://pewdiy-uat-qtz73ahnlq-as.a.run.app`), database `pewdiy_uat`, migrations (`pewdiy-uat-migrate-stqff`), seed (`pewdiy-uat-seed-zxhdz`), and reset job (`pewdiy-uat-reset`) provisioned and smoke-tested on 2026-11-22. | Coordinate reset/restart windows with testers during execution. |
| Product/UAT participants, private account handoff, and session time | Product Team and UAT Team (students not identified) | **PENDING** — names/IDs, private handoff channel, and schedule are not recorded. | Confirm both teams' participants and session time; deliver account credentials privately and record only role labels here. |
| Partner identity, release, cases, safe access/setup, and test window | Partner Product Team (team/individuals not identified) | **BLOCKED** — no partner handoff or case package is recorded. [Part B](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82) | Obtain the exact scope/release, deployed URL/revision, cases, access/setup/cleanup instructions, tester identities, and agreed window. |
| Instructor/TA escalation if the partner or access is unavailable | UAT Team (sender not identified) | **NOT RECORDED** — no notification or response is documented; partner unavailability itself is not asserted. | If the partner, deployment, access, or replacement tester is unavailable, notify the instructor/TA promptly through the course-approved channel and retain the actual notification and response. |

### F-05 release traceability

F-05 revision 3 was implemented in [PR #37](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/37) at commit `70e7b5ef02b92b26745140f0485ad796ffbc52cc`, merged into `sprint/1-staging` at `5b064ea`. That implementation commit is an ancestor of the deployed source commit above. Comparing the release with the F-05 commit shows no later changes to the request/loan routes or services; the later `auth-routes.ts` change adds the readiness router.

The local [F-05 TDD record](../../sprints/sprint-1/tdd-evidence-f05.md) fingerprints a different candidate: 10 of its 20 source-manifest entries differ from commit `70e7b5e`. Its local test counts therefore do **not** validate the deployed implementation. The applicable committed-code evidence is the [independent review of PR #37](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/37#pullrequestreview-5804916583), which reports verification of exact commit `70e7b5e` (115 server, 70 client, 51 browser tests; build/typecheck passed on a fresh PostgreSQL 17.11 environment). Those are reviewer-reported results for the implementation commit, not a fresh test run on deployed commit `b03c904` and not independent partner UAT.

The public demo above is currently confirmed reachable, but its connected database is not an isolated UAT database. The checks on 2026-11-22 were read-only; **do not run state-changing UAT cases against this shared service**. A separate owner-approved UAT deployment/database, its URL, fixture mapping, reset operator/procedure, and current active revision have not yet been verified. Do not invite testers until those items and the private account handoff are complete.

If the deployed revision changes after handoff, stop, record the new version, and obtain the UAT Team's agreement before continuing. Results from different revisions must not be combined into one acceptance decision.

### Accounts, data, and safe environment

- Provide the labels and roles **B-A** (Borrower A), **B-B** (Borrower B), and **C-A** (Custodian A). `pewdiy-uat` seeds `B-A`, `B-B`, and `C-A` only (there is no `B-C` account; use `B-B` for the second Borrower steps). Their generated passwords are stored in Secret Manager (`pewdiy-uat-seed-password-ba`, `pewdiy-uat-seed-password-bb`, `pewdiy-uat-seed-password-ca`) and sent privately through the team channel. Record only the labels/roles in the PDF and evidence; never record passwords, cookies, tokens, hashes, or credential screenshots.
- Use synthetic data only. Preferred test fixtures are [E-ONE](../../sprints/sprint-1/fixtures.md) (total 1), [E-MANY](../../sprints/sprint-1/fixtures.md) (total 3), and [E-ZERO](../../sprints/sprint-1/fixtures.md) (total 0). Before execution, map each symbolic label to the actual catalog item and record its visible name/ID in the private run record. Do not assume the deployed catalog contains these fixtures.
- Run state-changing scenarios only against a **dedicated, isolated UAT deployment/database** whose owner has approved the test data and reset procedure. A successful checkout permanently changes inventory state in Sprint 1; there is no Sprint 1 return or delete-request workflow. Do not run these cases on a shared/production dataset or reset a shared database.
- Before each case, the Product Team prepares the stated starting state in the isolated environment and gives the UAT Team the required account labels and item/record references. Reset only that isolated UAT database using its documented owner-approved procedure. Never use application startup, an undocumented endpoint, or an unapproved production seed/reset to clean data.
- The test database role, deployment owner, reset/reseed operator, and cleanup method must be recorded before the session. If the isolated deployment, required fixture, or safe reset is unavailable, mark the affected case **BLOCKED** and report the dependency; do not improvise against live data.

### Proposed fixture preparation and case order

The isolated UAT environment (`pewdiy-uat`) is provisioned on `pewdiy_uat` with the exact `main` image digest (`@sha256:e636ea0c95b027e68ab07ca550a9ce57f2343f99603391cc161936a220cbc2d4`). Migrations (`pewdiy-uat-migrate`) and seeding (`pewdiy-uat-seed` with `SEED_MODE=cloud-demo` and `--cloud-demo`) ran cleanly against `pewdiy_uat`. Reset between case groups is performed by the deployment owner via `gcloud run jobs execute pewdiy-uat-reset --region asia-southeast1 --wait --project cpe334-2026-pew-diy` (clears `loans`, `borrowing_requests`, and `sessions` while preserving `users` and `equipment`). Restart without DB reset for `UAT-08` is performed via `gcloud run services update pewdiy-uat` with the same image digest.

| Fixture label | Seeded equipment ID | Display name | Starting total / available |
|---|---|---|---|
| E-ONE | `fixture-e-one` | Synthetic single-unit fixture | `1/1` |
| E-MANY | `fixture-e-many` | Synthetic pooled fixture | `3/3` |
| E-ZERO | `fixture-e-zero` | Synthetic zero-stock fixture | `0/0` |

The table lists the defaults in the [Sprint 1 seed script](../../../server/src/db/seed.ts). Confirm each ID, name, and starting quantity on the dedicated deployment and record any approved substitute in the execution record.

Product-side fixture rehearsal on 2026-11-22 used a clean checkout of `b03c9043533a6dc1f8a6fb958983ddb0da9529c7`, Node.js 24.15.0, and a temporary local PostgreSQL 18.4 instance. `npm run migrate` and `npm run seed` succeeded. The second seed reported all six existing records preserved. Readback confirmed fixture totals `1`, `3`, and `0`, B-A/B-B as Borrowers, C-A as Custodian, and zero requests and loans. Partner execution on the approved deployed environment remains pending.

| Order | Cases | Required starting state and records to keep |
|---|---|---|
| 1 | UAT-01 → UAT-02 → UAT-03 → UAT-04 → UAT-08 | Start with fresh seed data. Carry the UAT-03 request into UAT-04. Preserve the resulting request and loan through UAT-08 and keep the same database attached for the restart. |
| 2 | UAT-05 | Start with a fresh dataset. Both Borrowers create their requests against the same one-unit fixture before C-A checks either out. |
| 3 | UAT-06 | Start with a fresh dataset. B-B submits a quantity-one request for E-ONE and C-A checks it out. B-B and B-A each submit a separate quantity-one request for E-MANY. Record both submitted request IDs and B-B's active loan ID for the case. |
| 4 | UAT-07 | Start with a fresh dataset, with E-MANY at `3/3` and zero requests and loans. |

Capture the approved clean baseline after verifying seed accounts, stock, and zero requests and loans. Restore that baseline in the dedicated UAT database for each fresh dataset so the release and database connection stay the same. Rerunning the seed preserves existing rows and credentials. Before a reset, close test sessions, retain redacted results and any defect evidence, and have the operator verify the exact database and service against the handoff record. After a reset, recheck the dataset preconditions and share any changed credentials privately. After the final case or retest, the operator follows the agreed evidence retention and cleanup procedure for the UAT resources.

## 3. Executable UAT cases

All cases below start as **NOT RUN**. The UAT Team fills actual results and evidence during execution. Keep expected and actual results separate. Record one outcome per case: `PASS`, `FAIL`, or `BLOCKED`; a blocked case is not a pass.

### UAT-01 — Sign-in, role-specific navigation, and logout

- **Requirements:** F-01 `AC-F01-01/02/06/11`; F-02 `AC-F02-03/06`.
- **Purpose / roles:** Confirm both supported roles can use the deployed release, invalid credentials do not authenticate, and logout removes access. Tester uses B-A and C-A; use a deliberately invalid synthetic password for the negative attempt.
- **Preconditions:** Isolated UAT app is available at the recorded URL. B-A and C-A credentials have been privately provided. No existing browser session.
- **Actions:**
  1. Open the recorded URL in a fresh browser context and sign in as B-A with the privately supplied credential.
  2. Confirm catalog access and the Borrower navigation labels **My requests** and **My loans**. Sign out.
  3. Sign in as C-A and confirm catalog access and **Submitted requests** navigation; confirm no general **My loans** navigation is offered. Sign out.
  4. In a fresh context, submit a wrong password for a known account, then retry with the correct credential.
  5. After successful sign-in, sign out and navigate directly to `/requests` or `/loans`.
- **Expected:** Valid B-A/C-A sign-ins show the matching role and permitted navigation; invalid credentials show a generic failure and do not authenticate; logout returns to the login flow and protected pages do not expose prior private data.
- **Setup/cleanup:** No domain data is written. End signed out and close the contexts.
- **Evidence:** Record role, visible outcomes, timestamps, tested revision, and redacted screenshots. Never capture the credential field or browser storage/cookies.

### UAT-02 — Catalog and availability states

- **Requirements:** F-02 `AC-F02-01/02/03/06`; F-03 `AC-F03-01/02/04/05`.
- **Purpose / roles:** Confirm catalog and detail reads show persisted item fields and truthful stock for both roles.
- **Preconditions:** Isolated UAT catalog has approved synthetic fixtures or a recorded equivalent: one item with total/available `1/1`, one pooled item with `3/3`, and one zero-stock item `0/0`. Record the actual item names/IDs before the test.
- **Actions:**
  1. Sign in as B-A; open the equipment catalog and each prepared item detail.
  2. Record the displayed total, available quantity, and availability label for each item.
  3. Repeat the catalog/detail reads as C-A.
  4. Sign out and attempt to open the catalog URL in a fresh unauthenticated context.
- **Expected:** Both roles see matching catalog/detail values: `1/1 AVAILABLE`, `3/3 AVAILABLE`, and `0/0 UNAVAILABLE` for the mapped fixtures. Zero availability is not presented as an error or as available. An unauthenticated user is sent to sign-in and sees no protected catalog data.
- **Setup/cleanup:** Read-only. Do not change catalog/stock to create the fixture during the test.
- **Evidence:** Capture readable catalog/detail outcomes and the unauthenticated denial; redact account identity and all browser credentials.

### UAT-03 — Submit a request and verify it persists without reserving stock

- **Requirements:** F-04 `AC-F04-01/06/07/08`; F-03 `AC-F03-03`; F-02 catalog flow.
- **Purpose / roles:** Verify a Borrower request is stored and visible after navigation/reload, while stock remains available until checkout.
- **Preconditions:** Isolated fixture E-ONE (or recorded equivalent) has total/available `1/1` and no loans. B-A is signed in. Record the starting quantity.
- **Actions:**
  1. As B-A, open the available item and submit a request for quantity `1`.
  2. Open **My requests** and record the displayed request ID/status and equipment.
  3. Reload the page, reopen **My requests**, and open the request detail.
  4. Reopen the catalog/item detail and record its availability.
- **Expected:** The request is accepted once, displays the submitted record, and survives page reload. It remains `SUBMITTED`; equipment availability remains `1/AVAILABLE` because requests do not reserve stock.
- **Setup/cleanup:** Record the created request ID for UAT-04 and preserve it through UAT-08. Clean up only by the approved isolated-database reset.
- **Evidence:** Screenshot the submitted request and the post-reload state; record request ID, before/after stock, actual result, time, and exact tested release.

### UAT-04 — Custodian checkout and Borrower active-loan read-back

- **Requirements:** F-05 `AC-F05-01/06/08/09/10`; F-04 `AC-F04-05/06`; F-03 `AC-F03-03`.
- **Purpose / roles:** Complete the normal request-to-loan journey and verify the committed result is visible to its owner.
- **Preconditions:** UAT-03 request is still `SUBMITTED`; E-ONE has one available unit. B-A and C-A credentials are available in separate browser contexts.
- **Actions:**
  1. Sign in as C-A and open **Submitted requests**. Locate the exact UAT-03 request and choose **Check out** once.
  2. Record the success message, loan ID, quantity, checkout time, and due date shown after commit.
  3. Open the catalog again and record the changed availability.
  4. In the B-A context, open **My loans**, open the new loan, reload, and confirm the same loan is still present.
  5. Compare the due date with the local checkout calendar date in `Asia/Bangkok` plus seven calendar days. Do not use the computer's timezone as the expected result.
- **Expected:** One active loan is created for the entire requested quantity; the request is no longer available for another checkout; stock changes to `0/UNAVAILABLE` only after successful checkout. B-A sees only their own active loan, which persists after reload; due date is the Bangkok checkout date plus seven calendar days.
- **Setup/cleanup:** This consumes the E-ONE unit. Preserve the request/loan IDs as synthetic test references; reset only the isolated UAT database after all dependent cases.
- **Evidence:** Capture the Custodian committed-loan result, Borrower loan after reload, and post-checkout stock. Record IDs, UTC checkout instant, Bangkok date calculation, expected/actual due date, and tested revision.

### UAT-05 — Competing requests and unavailable-stock rejection

- **Requirements:** F-04 `AC-F04-02/06/09`; F-05 `AC-F05-02/03/04`; F-03 `AC-F03-03/07`.
- **Purpose / roles:** Exercise the stock boundary and verify a stale request cannot create a second loan.
- **Preconditions:** Fresh isolated E-ONE with total/available `1/1` and zero requests and loans. B-A, B-B, and C-A can sign in. Use two separate Borrower sessions.
- **Actions:**
  1. B-A submits quantity `1`; B-B submits quantity `1` before either request is checked out.
  2. Confirm both requests are visible to their respective Borrowers and the item remains `1/AVAILABLE`.
  3. As C-A, check out B-A's request.
  4. Still as C-A, attempt to check out B-B's previously submitted request.
  5. Re-read the two request statuses, active loans, and item availability using the permitted UI.
- **Expected:** Both requests may be submitted without reserving stock. The first checkout creates one loan and changes availability to zero. The competing checkout is rejected with a safe insufficient-stock message; B-B's request remains unfulfilled, no second loan is created, and availability never becomes negative.
- **Setup/cleanup:** Uses a fresh E-ONE state; do not repeat against the same already-consumed fixture. Reset only the approved isolated database.
- **Evidence:** Capture both pre-checkout requests, the rejected checkout, and the final unchanged/consistent state. Include request/loan IDs and before/after quantities.

### UAT-06 — Forbidden role and cross-owner access

- **Requirements:** F-01 `AC-F01-04/05/08/09/12`; F-04 `AC-F04-04/10`; F-05 `AC-F05-07/08`.
- **Purpose / roles:** Verify role and owner restrictions using a real browser session, not only hidden UI controls.
- **Preconditions:** B-A and B-B each have a submitted E-MANY request. B-B also owns the active E-ONE loan prepared above. Record the two request IDs and the loan ID as synthetic references. B-A is signed in.
- **Actions:**
  1. As B-A, open `/requests/<B-B-request-id>` and `/loans/<B-B-loan-id>` in the same authenticated browser. Record the visible rejection without copying any private record fields.
  2. Replace the ID below with B-A's own synthetic submitted-request ID, then run it in the browser developer console on the **same application origin**:
     ```js
     const OWN_SUBMITTED_REQUEST_ID = 'paste-own-synthetic-request-id';
     fetch('/api/requests/' + encodeURIComponent(OWN_SUBMITTED_REQUEST_ID) + '/checkout', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: '{}'
     }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));
     ```
  3. Record the returned status/code, then re-open the request, loan list, and catalog as the authorized owners/C-A to verify whether anything changed.
- **Expected:** Cross-owner detail attempts are forbidden and disclose no B-B record contents. Borrower checkout returns HTTP `403` with a safe error; the request remains submitted and no loan or stock change occurs. A hidden checkout button alone is not a pass.
- **Setup/cleanup:** Use only the isolated synthetic test deployment. The console request uses the current same-origin session; do not print or copy cookie/session values.
- **Evidence:** Record response status/error code, affected request/loan counts and stock before/after. Redact console output that contains credentials or unrelated private data.

### UAT-07 — Input/business-rule rejection without state change

- **Requirements:** F-04 `AC-F04-02/03/09`; F-05 `AC-F05-11`; F-02/F-03 stock boundaries.
- **Purpose / roles:** Confirm rejected values and forged server-owned fields do not create or alter domain records.
- **Preconditions:** Fresh isolated available item with total/available `3/3`, no requests or loans; B-A is signed in. Record request/loan counts and stock before the test.
- **Actions:**
  1. Replace the item placeholder below with the recorded synthetic item ID, then submit quantity `0` and quantity `4` in separate calls from the same-origin browser console:
     ```js
     const RECORDED_ITEM_ID = 'paste-isolated-synthetic-item-id';
     const submitTestRequest = (quantity, extra = {}) =>
       fetch('/api/requests', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ equipment_id: RECORDED_ITEM_ID, quantity_requested: quantity, ...extra })
       }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));
     await submitTestRequest(0);
     await submitTestRequest(4);
     ```
  2. Submit quantity `1` with an injected server-owned field: `await submitTestRequest(1, { borrower_id: 'forged-synthetic-owner' })`. Do not use a real person's identifier.
  3. Re-read My requests and availability. The Product Team may attach a sanitized read-only database snapshot as supplemental evidence; it must not replace the UAT Team's observation.
- **Expected:** Invalid/over-stock quantities and forged server-owned fields are rejected with safe validation/availability errors. No rejected attempt appears in My requests, changes ownership, or alters stock; the Product Team may corroborate no-write behavior with a sanitized read-only database snapshot.
- **Setup/cleanup:** Isolated synthetic data only. The first successful case is intentionally not expected; if a request is unexpectedly created, mark **FAIL**, retain it for triage, and do not erase it before recording evidence.
- **Evidence:** Record each status/error code and before/after state. The browser console request is manual API-assisted UAT; label it as such.

### UAT-08 — Persisted state after application restart

- **Requirements:** F-01 `AC-F01-06/11`; F-02 `AC-F02-08`; F-04 `AC-F04-07`; F-05 `AC-F05-09`.
- **Purpose / roles:** Verify server-side records survive an application restart without reset/reseed.
- **Preconditions:** Isolated deployment has a recorded request and active loan. The deployment owner approves the restart procedure and confirms the same database will remain attached. Save synthetic record IDs and a redacted before-state snapshot.
- **Actions:**
  1. As B-A, record the own request/loan IDs, statuses, quantities, due date, and stock values. Sign out.
  2. Ask the deployment owner to restart/redeploy the **same immutable application image digest** against the same database, without changing application code, migration, seed, or data. Record the resulting service revision. If the image digest or database changes, stop and establish a new tested-release baseline before continuing.
  3. After readiness is restored, sign in again as B-A and C-A. Read the same records and catalog state.
- **Expected:** The same request/loan IDs, ownership, quantities, due date, statuses, and availability are present after restart. Logout's old session is not reused; new sign-in succeeds. No data is reset or silently recreated.
- **Setup/cleanup:** This operation is performed only by the authorized owner on the isolated UAT deployment. A new platform revision with the same image digest and data is recorded in the handoff; do not merge results from a different image/database.
- **Evidence:** Capture redacted before/after reads, restart/deployment record, exact tested image/revision, and timestamps.

## 4. Execution records and finding management

Copy one record per case. Complete actual result in the UAT Team's own words; do not copy the expected result into that field.

```text
Case ID / partner package version:
Product / partner team:
Partner requirement / acceptance criterion:
Both student testers (names/IDs) and who performed each action:
Date and start/end time (timezone):
Tested release tag + full commit SHA:
Deployed image digest / service revision:
Environment URL:
Synthetic inputs / account labels / record IDs:
Expected result (as provided by the product team):
Actual result:
Protected data/state before and after (for forbidden/denied actions):
Outcome: NOT RUN | PASS | FAIL | BLOCKED
Evidence IDs / filenames:
Cleanup performed and by whom:
```

### Findings reported by the UAT Team

Part C covers both directions: findings from our independent UAT of the partner product in [#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82), and findings the partner reports after testing PEW-DIY in [#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81). For every reproducible failure, open or link a tracking Issue and retain the evidence with the case record.

| UAT direction | Available results | Triage state |
|---|---|---|
| Partner tests PEW-DIY ([#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81)) | No completed partner case results are recorded; the handoff remains blocked. | **BLOCKED** — no actual finding set to disposition. |
| PEW-DIY tests partner product ([#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82)) | No partner handoff, cases, release, access, or session is recorded. | **BLOCKED** — no actual finding set to disposition. |

No finding records are available to triage yet. This is **not** a `None received` result: record that only after the relevant agreed UAT session is complete and its testers confirm the final results. Do not infer that no defects exist from the absence of records.

| Field | Required record |
|---|---|
| Finding/Issue ID; product owner/team; reporter | Actual GitHub Issue reference, team, and tester |
| Tested version; linked UAT case / requirement | Full commit, deployed revision, case ID, and `FR`/`BR`/`AC` |
| Preconditions, synthetic data, steps | Enough detail for another person to reproduce |
| Expected vs actual; evidence | Separate values, timestamped evidence IDs, no secrets |
| Classification | Accepted defect / duplicate (link original) / not-defect / enhancement |
| Severity and user impact | Critical / major / minor per course rubric; explain impact and workaround, if any |
| Owner, fix status, disposition | Named owner, reasoned decision, status, and partner notification |

Triage every actual finding received from either UAT direction, including duplicates and justified not-defects. Reproduce and clarify before disposition. A failed Sprint 1 requirement is not an enhancement. Critical/major accepted defects block acceptance; minor defects must be fixed or explicitly accepted by the UAT Team as documented limitations. An out-of-scope enhancement need not be implemented.

Copy this record for each actual finding; keep the expected and actual results separate:

```text
Finding / Issue ID:
UAT direction, product/team, and reporter:
Tested release SHA / image / revision:
UAT case and Sprint 1 requirement / AC:
Synthetic preconditions and reproduction steps:
Expected result:
Actual result:
Evidence IDs:
Severity and user impact:
Disposition and evidence-based rationale:
Owner and status:
Partner notification and response:
```

### Correction and independent retest record

For each accepted defect, preserve the complete trace: original finding → RED regression test that fails on the defective version → GREEN fix → relevant regression results → fix branch from `sprint/1-staging` → substantive teammate PR review → passing CI/staging integration → reviewed release to `main` → deployed revision and smoke check → independent retest by the UAT Team.

**Part D status: BLOCKED.** Neither UAT direction has a completed results package for Part C to triage, so there are no accepted findings to correct or independently retest. No Part D execution or final decision is claimed. Missing results are not a `None received` disposition or evidence that no defect exists. Only if completed UAT and triage establish that no legitimate defect exists should an instructor/TA-approved controlled exercise be considered; no approval or exercise is recorded.

| Finding / Issue | RED test, command, SHA, actual output | Fix / GREEN result and regression output | PR review / CI / release | Deployed revision / smoke check | Partner retest case, tester, actual result |
|---|---|---|---|---|---|
| **PENDING — populate only for a real accepted defect** | | | | | |

Only after the relevant UAT sessions and Part C triage are complete, if no legitimate product defect is found, do not fabricate one or deliberately break the accepted release. Follow the course requirement: request an instructor/TA-approved controlled exercise on an isolated version/branch, keep it separate from the healthy accepted release, and preserve the same RED/GREEN/review/release/retest chain. Record any unavailable exercise or replacement tester as an unresolved dependency.

## 5. Partner UAT, final decision, and submission

Part B (our team testing the other team's product) needs the partner team's handoff. Record it separately; do not treat our own automated suite as independent partner testing.

**Part B execution status: BLOCKED.** The current Issue #82 and repository handoff records do not identify the partner team or students, provide the partner's Sprint 1 cases or deployed release, or give safe access/setup/cleanup instructions and a test window. No partner-case execution is recorded, and no result or evidence is claimed. The UAT-01–UAT-08 cases in §3 are for PEW-DIY and are not substitutes for partner-provided cases. No instructor/TA notification or response is recorded; Issue #82 requires prompt notification when the partner, deployment, access, or replacement tester is unavailable. Send that notification through the course-approved channel and retain the actual response; this record does not claim it was sent.

| Partner handoff field | Value |
|---|---|
| Partner project/team and both participating students/IDs | **BLOCKED — not provided in Issue #82 or the current handoff records** |
| Partner Sprint 1 scope, release SHA/tag, deployed revision and URL | **BLOCKED — not provided** |
| Received UAT case package, private account labels, and safe setup/cleanup | **BLOCKED — not received** |
| Agreed test window and tester assignments | **BLOCKED — not agreed** |
| Case-by-case actual outcomes, evidence, findings, and partner retest | **NOT RUN — no partner cases or release were provided** |
| If blocked: notification to instructor/TA and response | **NOT RECORDED — send promptly through the course-approved channel and retain actual evidence** |

The independent UAT Team records exactly one final decision for the specific deployed revision:

```text
Decision: NOT RECORDED
Tested Sprint 1 release (tag / commit / deployed revision):
Independent UAT Team and tester names:
Execution date/time:
Cases PASS / FAIL / BLOCKED:
Accepted defects still open, by severity:
Accepted minor limitations (or "none") and UAT Team agreement:
Evidence references:
Decision rationale / conditions:
UAT Team confirmation:
```

Permitted outcomes are `Accepted`, `Accepted with explicitly documented minor limitations`, or `Not Accepted`. The UAT Team alone confirms independent acceptance. Use `Not Accepted` when critical/major accepted defects remain unresolved or required tests are blocked; never imply an unsigned or pending record is acceptance.

For the single PDF submitted through LEB2, include both students/IDs, project and repository URL, exact tested release/URL, Parts A–D navigation with page numbers/evidence IDs, all cases and actual results, selected readable screenshots/logs, outgoing and received finding dispositions, RED/GREEN and reviewed deployment evidence where applicable, final independent decision, contribution table, AI-use declaration, and limitations/dependencies. Include evidence in the PDF itself with internal page references; external links alone are insufficient. Keep synthetic data only and exclude passwords, tokens, cookies, and production secrets.

## 6. Contract traceability and references

| UAT case | Key user-facing Sprint 1 coverage |
|---|---|
| UAT-01 | F-01 login/role/logout; F-02 authenticated catalog access |
| UAT-02 | F-02 catalog/detail and F-03 available/zero-stock display |
| UAT-03 | F-04 request creation, owner read-back, persistence, non-reservation |
| UAT-04 | F-05 committed checkout, due date, own active loan and read-back |
| UAT-05 | F-04 competing requests; F-05 unavailable/repeated checkout; F-03 stock invariant |
| UAT-06 | F-01 role/owner enforcement; F-04/F-05 forbidden operations |
| UAT-07 | F-04 validation and availability boundaries; no-write rejection |
| UAT-08 | F-01 logout, F-02 catalog, F-04 request, and F-05 loan persistence |

This manual set targets user-visible journeys and important negative/boundary behavior; it does not claim exhaustive execution of every contract AC, expiry timeout, malformed transport, concurrency race, or database fault-injection case. Use the [verification matrix](../../sprints/sprint-1/verification-matrix.md) and [Part F evidence](../../verification/sprint-1/README.md) for the automated coverage and clearly distinguish those results from independent UAT.

References: [Sprint 1 contracts](../../sprints/sprint-1/README.md), [symbolic synthetic fixtures](../../sprints/sprint-1/fixtures.md), [Lab 5 release/deployment procedure](../lab-05/deployment.md), [GitHub Issue #80](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/80), and `Lab_6_Sprint_1_UAT.pdf` supplied for this task.
