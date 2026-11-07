# Issue #13 review and release handoff

Local work is on `feature/13-sprint-1-integration-verification`, based on staging `5b064ea`. Actual local evidence is in [verification.json](run/verification.json), [AC results](run/ac-results.md) and [setup rehearsal](run/setup.json). Passing local tests do not identify a released main commit.

## Submitted feature PR and remediation

Original submitted commit: `2b76abb`; original message: `test(F-10): verify Sprint 1 integration and prepare Part F evidence (Refs #13)`.

Submitted PR #38 title: `test(D1-06.6): Verify Sprint 1 integration and prepare Part F evidence`.

Base: **sprint/1-staging**. Head: **feature/13-sprint-1-integration-verification**. Reviewer: **Peepipat-Suesoongnuen**, independent from author L0u1sss.

PR description updates are supplied in the user chat, as requested, rather than maintained as repository draft files. Replace the whole PR description with the supplied text so obsolete appended validation/version claims do not remain.

PR #38 is already open and the latest observed published head is0316500, containing the earlier authorized local remediation commits. Prior agent authorization excluded push; this does not imply the commits remain unpublished after later repository activity. This correction round does not itself update GitHub. AGENT.md §11.1 requires authorization for further commits/pushes, and §12.3 requires the human Reviewer to merge. There is no self-approval or direct feature merge/push to main.

## Human gates and subsequent release sequence

1. Attach the actual teammate message/link ratifying A-12. Account identity alone is insufficient. Confirm contribution/AI disclosure, historical RED provenance and both students' final names/IDs for the cover. Record real evidence in `workflow.json` human_checks; do not change a status to VERIFIED without its artifact.
2. Have the teammate repeat the README setup from the declared prerequisites, record actual duration/exceptions, and capture final live board status. The connected GitHub tools did not expose Project reads, so no final board status was inferred.
3. PR #38 is already open. After authorization, commit the remediation source first, run `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1` on that same clean source commit, then commit regenerated evidence separately. Push the authorized changes to the existing PR; the other student re-reviews and merges it. An evidence-only descendant commit is accepted only if every canonical source hash still equals both the tested Git blob and the current file. Do not cherry-pick/rewrite historical RED commits to manufacture TDD history.
4. On the resulting staging merge SHA, rerun `npm run rehearse:sprint1`, `npm run verify:sprint1` and `npm run audit:sprint1`, update the candidate evidence/version and confirm no uncommitted application/test changes are being hidden behind HEAD. Current local results must not be relabeled as that merge SHA's run.
5. Prepare a **separate** reviewed release PR from `sprint/1-staging` to `main`, suggested title `release: deliver Sprint 1 borrowing and checkout increment`. Its body should name the actual latest staging candidate SHA, final49/49 application coverage and remaining human gates, with references to #6/#13 and Part F evidence. No release PR is opened prematurely by this task.
6. The human Reviewer approves/merges the release. Record the real main release SHA and optional release tag, rerun rehearsal and then verification on that exact main SHA, set `RELEASE_REF` to the actual commit/tag and run `npm run audit:sprint1 -- --require-release`. It exits1 for invalid source provenance, or exits2 after source validation when release/human evidence is absent; do not suppress or call that a pass.
7. Incorporate actual release outputs, board/history evidence, student names/IDs and selected Part F images/excerpts into the self-contained Parts A–F PDF. Validate page navigation and repository/release identity before submitting by8 November2026 23:59 Asia/Bangkok.

Docker/CI/CD/GCP and redeployment durability remain Lab5 work; return/overdue/history/reporting follow their planned sprints. No additional infrastructure is required merely to finish this local verification increment.
