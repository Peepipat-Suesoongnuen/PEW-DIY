# PR38 review remediation

Review target: `2b76abbf7be1d6384ee4ae2dffa1808f71aeda82`; [review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5805879906). The previous agent authorization covered two local commits only and excluded push and GitHub writes. Actual repository state is separate: GitHub PR38 now has reviewed head `43bcdfe`, so the first remediation was subsequently published. This new local remediation does not itself authorize any further push or remote PR edit.

| Finding | Remediation | Verification |
|---|---|---|
| P2-1 source/version provenance | Commit remediation source first; default runner rejects dirty source. Clean runs record the actual source SHA. Audit validates canonical LF-normalized fingerprints against both tested Git blobs and current files, accepting a later evidence-only descendant commit | Current run/verification.json and evidence-audit.json record actual state. Candidate mode is explicit and cannot satisfy strict release provenance |
| P2-2 stale pre-commit prose | Record the actual original commit `2b76abb` and existing PR38; distinguish historical first-run evidence from current source/evidence commits | Pack README, test excerpts, workflow/contribution declaration, F10 contract and release handoff updated |
| P2-3 personal absolute paths | Shared sanitizer handles structured JSON, logs, commands, root/home/temp paths and trims trailing blank lines; history images use Git SHAs/dates/subjects and public account attribution instead of local display names | Artifact path scan plus portable-path regression test; no credential/private path included |
| P2-4 semantic process mapping | AC-F10-04/05/06/07/08 point to suite/failure probe/setup/TDD/workflow/release/disclosure checks TEST-F10-04..10; E2E journeys remain mapped only to behavioral AC | Generated57-row result table lists process artifacts and keeps human/release portions PARTIAL; duplicate viewport labels removed |

The complete server/client/browser regression remains164/70/54. Native tooling regression tests cover canonical hashes, mixed-slash path sanitization, dirty candidate rejection and evidence-only descendant commits. Exact current results, versions, commands and source SHA are in run/verification.json; no uncommitted state is labeled CLEAN_SOURCE_COMMIT.

The PR38 reviewer separately reports164/70/54 on Node24.19.0/PostgreSQL17.11, setup11.957s (warm cache). Local reruns use Node24.15.0/PostgreSQL18.4. Reviewer results are attributed in pr38-reviewer-results.json and not presented as local PG17 execution. CI/branch protection remain outside this bounded F10 remediation. Issue13 remains open for human gates and reviewed main release.

Release audit behavior: invalid/candidate source exits1; committed matching source with absent main release/human approvals exits2 NOT_RELEASED. An evidence-only commit must retain the tested source SHA, not rewrite it to pretend the evidence commit tested itself.

## Latest independent re-review (review 5806364064)

Reviewed head: `43bcdfe`; [review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5806364064). The reviewer confirms the previous four P2 findings are fixed. This round addresses:

| Finding | Change |
|---|---|
| P2-1 stale setup evidence | Require CLEAN_SOURCE_COMMIT and exact setup/verification tested_commit equality, successful rehearsal and valid duration before any suite/DB connection; independently enforce the same setup relationship in audit |
| P2-2 omitted product files | Share a complete manifest across dirty-source guard, fingerprints and audit; include HTML/CSS/config/assets and root configuration; audit exact key sets, tested Git blobs and current files |
| P3-1/2/3 traceability | Separate original2b76abb, first source8bff092 and published evidence43bcdfe; distinguish authorization from actual GitHub state; prepare updated PR text locally |
| P3-4 CI/protection | Record as known gap; no repository setting changes |
| P3-5 missing files | ENOENT produces a dirty source entry, including staged/unstaged deletions |
| P3-6 historical SHAs | Explicit full-history prerequisite with actionable shallow-clone failure |
| P3-7 release status | NOT_RELEASED is pending and absent from matched/pass checks; affected AC stays PARTIAL |

New regression tests reproduce omitted HTML/config/CSS changes, new assets, deleted files, incomplete hash maps and mismatched/candidate setup. Binary asset hashes are byte-exact. The initial RED run had5 passed/5 failed, including the actual false-clean HTML/deletion cases. The user authorized two additional local commits for this round (source/docs, then regenerated evidence), with no push or GitHub write. Full verification will run after the clean source commit; old artifacts must not be presented as this round's results.
