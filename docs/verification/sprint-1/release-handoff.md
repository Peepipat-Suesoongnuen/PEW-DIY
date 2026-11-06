# Issue #13 review and release handoff

Local work is on `feature/13-sprint-1-integration-verification`, based on staging `5b064ea`. Actual local evidence is in [verification.json](run/verification.json), [AC results](run/ac-results.md) and [setup rehearsal](run/setup.json). Passing local tests do not identify a released main commit.

## Concrete feature PR prepared for human authorization

Suggested commit: `test(F-10): verify Sprint 1 integration and prepare Part F evidence (Refs #13)`.

Suggested feature PR title: `test(D1-06.6): Verify Sprint 1 integration and prepare Part F evidence`.

Base: **sprint/1-staging**. Head: **feature/13-sprint-1-integration-verification**. Reviewer: **Peepipat-Suesoongnuen**, independent from author L0u1sss.

Proposed PR body:

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
- Fresh-project setup rehearsal:61.812s with installed tools and potentially warm host caches; peer repetition pending.

Local Node24.15.0/PostgreSQL18.4 results are separate from earlier reviewer-reported PostgreSQL17 results. See docs/verification/sprint-1/README.md and run/verification.json for tested source/version and raw outputs. This candidate was verified before commit; rerun after commit to attach its final SHA.

## Remaining gates

Refs #13 — keep the Issue open until reviewed integration and release are complete.
A-12 team ratification, other-student README repetition, human disclosure/TDD checks and final board evidence remain pending. This PR does not create a main release, merge itself, tag a release or claim the full submission PDF is complete.
```

No commit/push/PR write is performed by preparing this text. AGENT.md §11.2 requires human approval for opening a PR; §12.3 requires the human Reviewer to merge. There is no self-approval or direct feature merge/push to main.

## Human gates and subsequent release sequence

1. Attach the actual teammate message/link ratifying A-12. Account identity alone is insufficient. Confirm contribution/AI disclosure, historical RED provenance and both students' final names/IDs for the cover. Record real evidence in `workflow.json` human_checks; do not change a status to VERIFIED without its artifact.
2. Have the teammate repeat the README setup from the declared prerequisites, record actual duration/exceptions, and capture final live board status. The connected GitHub tools did not expose Project reads, so no final board status was inferred.
3. After authorization, commit/push this bounded feature branch and open the feature PR into staging. The other student reviews it, resolves findings and merges it. Do not cherry-pick/rewrite historical RED commits to manufacture TDD history.
4. On the resulting staging merge SHA, rerun `npm run verify:sprint1` and `npm run audit:sprint1`, update the candidate evidence/version and confirm no uncommitted application/test changes are being hidden behind HEAD. Current local results must not be relabeled as that merge SHA's run.
5. Prepare a **separate** reviewed release PR from `sprint/1-staging` to `main`, suggested title `release: deliver Sprint 1 borrowing and checkout increment`. Its body should name the actual latest staging candidate SHA, final49/49 application coverage and remaining human gates, with references to #6/#13 and Part F evidence. No release PR is opened prematurely by this task.
6. The human Reviewer approves/merges the release. Record the real main release SHA and optional release tag, rerun verification on that exact main SHA, set `RELEASE_REF` to the actual commit/tag and run `npm run audit:sprint1 -- --require-release`. It exits2 while release/human evidence is absent; do not suppress or call that a pass.
7. Incorporate actual release outputs, board/history evidence, student names/IDs and selected Part F images/excerpts into the self-contained Parts A–F PDF. Validate page navigation and repository/release identity before submitting by8 November2026 23:59 Asia/Bangkok.

Docker/CI/CD/GCP and redeployment durability remain Lab5 work; return/overdue/history/reporting follow their planned sprints. No additional infrastructure is required merely to finish this local verification increment.
