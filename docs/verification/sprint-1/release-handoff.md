# Sprint 1 release handoff — PR #42 / Refs #6 #13

As observed on 10 November2026, [release PR #42](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/42) is open from `sprint/1-staging` at candidate `d291873c10c2021d4eb5ebe733aa68012f813678` into `main` at `7bf6c8d7d1a220dbc05526c7b980fb31bde85d2c`. Author: L0u1sss; independent reviewer: Peepipat-Suesoongnuen. Actual local source attribution, results and setup timing are in [verification.json](run/verification.json), [AC results](run/ac-results.md) and [setup.json](run/setup.json). Candidate verification is not a main release.

## Completed feature integration and historical evidence

Original submitted commit: `2b76abb`; original message: `test(F-10): verify Sprint 1 integration and prepare Part F evidence (Refs #13)`.

Submitted PR #38 title: `test(D1-06.6): Verify Sprint 1 integration and prepare Part F evidence`.

Base: **sprint/1-staging**. Head: **feature/13-sprint-1-integration-verification**. Reviewer: **Peepipat-Suesoongnuen**, independent from author L0u1sss.

PR description updates are supplied in the user chat, as requested, rather than maintained as repository draft files. Replace the whole PR description with the supplied text so obsolete appended validation/version claims do not remain.

PR #38 was independently [approved](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5812734835) and merged into staging at `ef58fae87e6a262a30df8b9d65480924add2d516` on7 November2026. PR #41 then integrated the UI fixes and PR #43 integrated CI; staging now contains all three. There is no remaining feature13 integration gate. Authorization for commits/pushes, repository settings and reviewer requests remains subject to AGENT.md; this local correction does not itself change GitHub or merge a PR.

The `8676957` source / `dad4cd8` evidence pair is historical:164 server/70 client/54 browser, setup38.044s. Its raw artifacts remain recoverable from Git at `dad4cd8:docs/verification/sprint-1/run/`; they do not verify `d291873`. The current `run/` evidence is regenerated on `d291873` with164 server/74 client/57 browser and49/49 application AC. The [PR #42 review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/42#pullrequestreview-5829522619) independently reports the same product counts, two green hosted runs (`42654888341`, `42655734483`) and setup25.367s on that candidate. Reviewer results/timing are separate from this local run.

## Human gates and subsequent release sequence

1. Attach the actual teammate message/link ratifying A-12. Account identity alone is insufficient. Confirm contribution/AI disclosure, historical RED provenance and both students' final names/IDs for the cover. Record real evidence in `workflow.json` human_checks; do not change a status to VERIFIED without its artifact.
2. Have the teammate repeat the README setup from the declared prerequisites, record actual duration/exceptions, and capture final live board status. The connected GitHub tools did not expose Project reads, so no final board status was inferred.
3. Current candidate `d291873` is clean committed source. Run `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1` in that order; publish the regenerated evidence and documentation after commit/push authorization. An evidence-only descendant commit is accepted only if every canonical source hash still equals both the tested Git blob and the current file. Do not manufacture historical RED commits. A new source change requires a new rehearsal and complete verification.
4. Update the existing PR #42 body with `Refs #6 #13`, candidate SHA `d291873`, actual164/74/57 results,49/49 application coverage and remaining gates. Description text is supplied in chat, not in a PR-specific draft file. Request independent re-review of the new head after authorized publication; do not treat the earlier head's approval/checks as checks of an unseen revision.
5. A repository administrator must configure `Build and regression tests` as a required check on `main` and `sprint/1-staging`, with teammate review. CI is implemented in PR #43; branch-protection enforcement is not verified by the local audit. Check the current PR revision's hosted result before merging PR #42.
6. The human Reviewer approves/merges the release. Record the real main release SHA and optional release tag, rerun rehearsal and then verification on that exact main SHA, set `RELEASE_REF` to the actual commit/tag and run `npm run audit:sprint1 -- --require-release`. It exits1 for invalid source provenance, or exits2 after source validation when release/human evidence is absent; do not suppress or call that a pass.
7. Incorporate actual release outputs, board/history evidence, student names/IDs and selected Part F images/excerpts into the self-contained Parts A–F PDF. Validate page navigation and repository/release identity. The specified D1 deadline was8 November2026 23:59 Asia/Bangkok; no on-time submission or completed PDF is claimed here.

Docker packaging, CD/GCP and redeployment durability remain Lab5 work; return/overdue/history/reporting follow their planned sprints. CI exists, while deployment and required-check enforcement are separate remaining steps. Normal audit exit0 confirms structural candidate evidence with disclosed human gates; strict release audit exit2 `NOT_RELEASED` is expected until the real main release and human evidence exist.
