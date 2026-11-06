# Issue #13 review and release handoff

Local work is on `feature/13-sprint-1-integration-verification`, based on staging `5b064ea`. Actual local evidence is in [verification.json](run/verification.json), [AC results](run/ac-results.md) and [setup rehearsal](run/setup.json). Passing local tests do not identify a released main commit.

## Submitted feature PR and remediation

Original submitted commit: `2b76abb`; original message: `test(F-10): verify Sprint 1 integration and prepare Part F evidence (Refs #13)`.

Submitted PR #38 title: `test(D1-06.6): Verify Sprint 1 integration and prepare Part F evidence`.

Base: **sprint/1-staging**. Head: **feature/13-sprint-1-integration-verification**. Reviewer: **Peepipat-Suesoongnuen**, independent from author L0u1sss.

PR #38 body template (update validation/provenance from the latest clean-source run):

```markdown
## Summary

Adds integrated Sprint1 verification and a Part F evidence pack for F-01–F-05.
The runner builds and tests real UI/API/PostgreSQL behavior in fresh isolated schemas, records exact counts/source fingerprints, and resolves every contract AC to planned STS IDs and actual executed cases.

## Changes

- Add real production-HTTP protected-route/security/restart/seed checks and complete browser domain journeys.
- Add fail-closed verification and evidence audits, explicit test-DB migration, and timed fresh-source setup rehearsal.
- Record screenshots, two actual test excerpts, historical TDD provenance, reviewed workflow chains, both-student contributions and AI-use disclosure.
- Update README and F-10/verification documentation; report the actual database version in race evidence.

## Validation

- Server:164 passed /0 failed /0 skipped.
- Client:70 passed.
- Browser:54 passed across desktop/tablet/mobile, zero flaky cases.
- Build/typecheck:PASS.
- 49/49 application AC mapped to executed passing checks;57 total contract result rows with human/release criteria explicitly partial.
- Fresh-project setup rehearsal: latest actual duration is in run/setup.json; installed tools and potentially warm host caches disclosed, peer repetition pending.

Local Node24.15.0/PostgreSQL18.4 results are separate from earlier reviewer-reported PostgreSQL17 results. See docs/verification/sprint-1/README.md and run/verification.json for tested source/version and raw outputs. The original source was submitted as `2b76abb`; latest source SHA, dirty status and fingerprints are recorded by the runner. Commit remediation source and rerun before claiming clean-commit verification.

## Remaining gates

Refs #13 — keep the Issue open until reviewed integration and release are complete.
A-12 team ratification, other-student README repetition, human disclosure/TDD checks and final board evidence remain pending. This PR does not create a main release, merge itself, tag a release or claim the full submission PDF is complete.
```

The user already committed/pushed the original work and opened PR #38. Local remediation does not itself update GitHub. AGENT.md §11.1 requires authorization for further commits/pushes, and §12.3 requires the human Reviewer to merge. There is no self-approval or direct feature merge/push to main.

## Human gates and subsequent release sequence

1. Attach the actual teammate message/link ratifying A-12. Account identity alone is insufficient. Confirm contribution/AI disclosure, historical RED provenance and both students' final names/IDs for the cover. Record real evidence in `workflow.json` human_checks; do not change a status to VERIFIED without its artifact.
2. Have the teammate repeat the README setup from the declared prerequisites, record actual duration/exceptions, and capture final live board status. The connected GitHub tools did not expose Project reads, so no final board status was inferred.
3. PR #38 is already open. After authorization, commit the remediation source first, run `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1` on that same clean source commit, then commit regenerated evidence separately. Push the authorized changes to the existing PR; the other student re-reviews and merges it. An evidence-only descendant commit is accepted only if every canonical source hash still equals both the tested Git blob and the current file. Do not cherry-pick/rewrite historical RED commits to manufacture TDD history.
4. On the resulting staging merge SHA, rerun `npm run rehearse:sprint1`, `npm run verify:sprint1` and `npm run audit:sprint1`, update the candidate evidence/version and confirm no uncommitted application/test changes are being hidden behind HEAD. Current local results must not be relabeled as that merge SHA's run.
5. Prepare a **separate** reviewed release PR from `sprint/1-staging` to `main`, suggested title `release: deliver Sprint 1 borrowing and checkout increment`. Its body should name the actual latest staging candidate SHA, final49/49 application coverage and remaining human gates, with references to #6/#13 and Part F evidence. No release PR is opened prematurely by this task.
6. The human Reviewer approves/merges the release. Record the real main release SHA and optional release tag, rerun rehearsal and then verification on that exact main SHA, set `RELEASE_REF` to the actual commit/tag and run `npm run audit:sprint1 -- --require-release`. It exits1 for invalid source provenance, or exits2 after source validation when release/human evidence is absent; do not suppress or call that a pass.
7. Incorporate actual release outputs, board/history evidence, student names/IDs and selected Part F images/excerpts into the self-contained Parts A–F PDF. Validate page navigation and repository/release identity before submitting by8 November2026 23:59 Asia/Bangkok.

Docker/CI/CD/GCP and redeployment durability remain Lab5 work; return/overdue/history/reporting follow their planned sprints. No additional infrastructure is required merely to finish this local verification increment.
