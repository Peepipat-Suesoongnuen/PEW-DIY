# Lab 6 — Independent Sprint 1 UAT

> **Tracking:** Parent [Issue #80](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/80) · Part A [#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81) · Part B [#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82) · Part C [#83](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/83) · Part D [#84](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/84)
>
> **Source:** `Lab_6_Sprint_1_UAT.pdf`, Parts A–D and submission checklist
>
> **Status:** UAT plan prepared; release handoff, execution, findings, retest, and acceptance are **pending**. This document does not claim that a partner test or acceptance has occurred.

## 1. Purpose, roles, and scope

This is the PEW-DIY Product Team's executable handoff for another team to test the delivered Sprint 1 product. The partner team is the **UAT Team** and must independently execute the cases on the exact deployed release recorded below. Our team must also act as UAT Team for the partner's Sprint 1 release; that separate Part B work is not represented as complete here.

The product scope is the implemented Sprint 1 features **F-01–F-05** and their agreed acceptance criteria. Use the [Sprint 1 contracts](../../sprints/sprint-1/README.md), [verification matrix](../../sprints/sprint-1/verification-matrix.md), and [UAT evidence pack](../../verification/sprint-1/README.md) as requirement and automated-test references. F-10 supports integration/evidence and is not an additional user-facing product feature. Do not accept unfinished Sprint 2/3 functionality (including return, overdue handling, catalog edits, or staff loan history) as part of this UAT.

The automated checks in the evidence pack are supporting evidence only; they do not replace the other team's manual, user-facing execution or its independent decision.

### Current completion state

| Part | State |
|---|---|
| A — PEW-DIY UAT preparation/handoff ([#81](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/81)) | Cases and templates prepared below; the handoff is not ready until the release and environment fields in §2 are completed and shared privately. |
| B — Independent UAT of partner product ([#82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82)) | **Pending** partner identity, release, access, and scheduled execution. |
| C — Findings and triage ([#83](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/83)) | **Pending** actual execution/findings; no findings have been invented. |
| D — Fixes/retest/final decision ([#84](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/84)) | **Pending** triage and partner retest. No acceptance is claimed. |

## 2. Release handoff — complete before inviting testers

The following values must identify the *same* release throughout execution and in the final acceptance record. The current repository `main` commit is not evidence of a deployed release; complete these fields from the actual deployment and review/run records. See the [Lab 5 deployment guide](../lab-05/deployment.md) for the release and smoke-check procedure.

| Handoff field | Value |
|---|---|
| Product team / project | PEW-DIY / D.I.Y. Room Equipment Borrowing System |
| Sprint 1 requirements and contract revision | F-01–F-05; record the exact reviewed contract/version used for the release |
| Git release tag and full commit SHA | **PENDING — verify from the release record** |
| Deployed image digest and active service revision | **PENDING — verify from the deployment workflow/revision** |
| UAT application URL and verification time | **PENDING — verify the active URL before the session** |
| Product Team participants | **PENDING — record both students and IDs in the submission PDF** |
| UAT Team / independent tester names | **PENDING — record both students and IDs before execution** |
| Handoff date and agreed test window | **PENDING** |
| Private credential handoff channel | **PENDING — use the course-approved private channel; never record credential values here** |
| Deployment smoke-check evidence | **PENDING — link the actual run and its result** |

If the deployed revision changes after handoff, stop, record the new version, and obtain the UAT Team's agreement before continuing. Results from different revisions must not be combined into one acceptance decision.

### Accounts, data, and safe environment

- Provide the labels and roles **B-A** (Borrower A), **B-B** (Borrower B), and **C-A** (Custodian A). The Product Team sends their usable credentials privately. Record only the labels/roles in the PDF and evidence; never record passwords, cookies, tokens, hashes, or credential screenshots.
- Use synthetic data only. Preferred test fixtures are [E-ONE](../../sprints/sprint-1/fixtures.md) (total 1), [E-MANY](../../sprints/sprint-1/fixtures.md) (total 3), and [E-ZERO](../../sprints/sprint-1/fixtures.md) (total 0). Before execution, map each symbolic label to the actual catalog item and record its visible name/ID in the private run record. Do not assume the deployed catalog contains these fixtures.
- Run state-changing scenarios only against a **dedicated, isolated UAT deployment/database** whose owner has approved the test data and reset procedure. A successful checkout permanently changes inventory state in Sprint 1; there is no Sprint 1 return or delete-request workflow. Do not run these cases on a shared/production dataset or reset a shared database.
- Before each case, the Product Team prepares the stated starting state in the isolated environment and gives the UAT Team the required account labels and item/record references. Reset only that isolated UAT database using its documented owner-approved procedure. Never use application startup, an undocumented endpoint, or an unapproved production seed/reset to clean data.
- The test database role, deployment owner, reset/reseed operator, and cleanup method must be recorded before the session. If the isolated deployment, required fixture, or safe reset is unavailable, mark the affected case **BLOCKED** and report the dependency; do not improvise against live data.

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
- **Setup/cleanup:** Record the created request ID for UAT-04 or UAT-05. Do not delete it; clean up only by the approved isolated-database reset.
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
- **Preconditions:** Fresh isolated E-ONE with total/available `1/1` and no loans. B-A, B-B, and C-A can sign in. Use two separate Borrower sessions.
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
- **Preconditions:** Isolated environment contains one submitted request owned by B-A, and at least one request and active loan owned by B-B. Record their opaque IDs as synthetic references. B-A is signed in.
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
Case ID:
UAT tester / team:
Date and start/end time (timezone):
Tested release tag + full commit SHA:
Deployed image digest / service revision:
Environment URL:
Synthetic inputs / account labels / record IDs:
Actual result:
Outcome: NOT RUN | PASS | FAIL | BLOCKED
Evidence IDs / filenames:
Cleanup performed and by whom:
```

### Findings reported by the UAT Team

For every reproducible failure, open or link a tracking Issue and retain the evidence with the case record.

| Field | Required record |
|---|---|
| Finding/Issue ID; product owner/team; reporter | Actual GitHub Issue reference, team, and tester |
| Tested version; linked UAT case / requirement | Full commit, deployed revision, case ID, and `FR`/`BR`/`AC` |
| Preconditions, synthetic data, steps | Enough detail for another person to reproduce |
| Expected vs actual; evidence | Separate values, timestamped evidence IDs, no secrets |
| Classification | Accepted defect / duplicate (link original) / not-defect / enhancement |
| Severity and user impact | Critical / major / minor per course rubric; explain impact and workaround, if any |
| Owner, fix status, disposition | Named owner, reasoned decision, status, and partner notification |

Triage every finding received about PEW-DIY, including a recorded `None received` only after the partner confirms the completed test set. Reproduce and clarify before dismissal. A failed Sprint 1 requirement is not an enhancement. Critical/major accepted defects block acceptance; minor defects must be fixed or explicitly accepted by the UAT Team as documented limitations. An out-of-scope enhancement need not be implemented.

### Correction and independent retest record

For each accepted defect, preserve the complete trace: original finding → RED regression test that fails on the defective version → GREEN fix → relevant regression results → fix branch from `sprint/1-staging` → substantive teammate PR review → passing CI/staging integration → reviewed release to `main` → deployed revision and smoke check → independent retest by the UAT Team.

| Finding / Issue | RED test, command, SHA, actual output | Fix / GREEN result and regression output | PR review / CI / release | Deployed revision / smoke check | Partner retest case, tester, actual result |
|---|---|---|---|---|---|
| **PENDING — populate only for a real accepted defect** | | | | | |

If no legitimate product defect is found, do not fabricate one or deliberately break the accepted release. Follow the course requirement: request an instructor/TA-approved controlled exercise on an isolated version/branch, keep it separate from the healthy accepted release, and preserve the same RED/GREEN/review/release/retest chain. Record any unavailable exercise or replacement tester as an unresolved dependency.

## 5. Partner UAT, final decision, and submission

Part B (our team testing the other team's product) needs the partner team's handoff. Record it separately; do not treat our own automated suite as independent partner testing.

| Partner handoff field | Value |
|---|---|
| Partner project/team and both participating students/IDs | **PENDING** |
| Partner Sprint 1 scope, release SHA/tag, deployed revision and URL | **PENDING** |
| Received UAT case package, private account labels, and safe setup/cleanup | **PENDING** |
| Agreed test window and tester assignments | **PENDING** |
| Case-by-case actual outcomes, evidence, findings, and partner retest | **PENDING** |
| If blocked: notification to instructor/TA and response | **PENDING — retain actual notification evidence** |

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
