# PR38 review remediation

Latest [independent review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5807698601): reviewed head `0316500e9b6ca93cf477b83f04d986adaf7a67ed`, REQUEST CHANGES. The reviewer confirms stale-setup and complete-fingerprint P2 fixes, reports no outstanding P0/P1/P2, and reproduces164 server/70 client/54 browser tests plus41 audit checks with8 pending gates. The five remaining corrections are addressed below.

## Authorization versus observed repository state

Previous agent authorizations allowed two local commits per round and excluded push/remote PR edits. Those authorizations describe the agent's action scope; they do not describe all later human/repository activity. GitHub now exposes both remediation pairs, with PR38 head `0316500` as observed7 November2026. Therefore the remediation is published on PR38. No assertion that those commits remain unpushed is made. This new local correction request does not authorize a further push or remote PR edit.

| Round | Tested source | Evidence / published head | Local result |
|---|---|---|---|
| Original submission | `2b76abb` | `2b76abb` | Historical setup61.812s |
| First remediation | `8bff092` | `43bcdfe` |164/70/54;5 tooling; setup22.417s |
| Second remediation | `8fb84f4` | `0316500` |164/70/54;11 tooling; setup23.746s |
| Current corrections | Pending fresh source commit | Pending regenerated evidence | Previous results above are historical; do not relabel them as this round |

Local full-suite measurements above use Node24.15.0/PostgreSQL18.4. Reviewer PG17 reproductions belong to the earlier reviews/heads and are separately attributed in pr38-reviewer-results.json and pr38-reviewer-rerun.json. The latest review of0316500 does not specify toolchain versions.

## Latest requested corrections

| Request | Correction |
|---|---|
|1. PR body and command order | Prepare pr38-description.md as a complete replacement body, with consistent SHA/result rows and `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1`. The obsolete appended Validation/Evidence prose must be removed, not left below the replacement |
|2. Publication wording | Separate prior local-only authorization from observed published PR head0316500; no global claim that no push occurred |
|3. README commit chain | Explicitly list original2b76abb, source8bff092/evidence43bcdfe, source8fb84f4/evidence0316500, and the current round separately |
|4. Unusable candidate option | Remove candidate bypass from verification, audit and source assertion; verification accepts no options, audit only --require-release. Unsupported options fail explicitly before suites/checks; clean committed source and matching setup remain mandatory |
|5. Tooling RED evidence | No retained artifact verifies the previous5-pass/5-fail tooling RED narrative. Mark it unverified; retain a new actual RED/GREEN pair for the CLI option regression without claiming it proves the earlier run |

## Retained CLI RED/GREEN evidence

The regression test `removed working-tree option is rejected explicitly by verification and audit before execution` is in scripts/tests/evidence.test.mjs. Before the fix it failed because verification handled the obsolete flag and continued to setup evidence validation rather than rejecting the option. The [RED output](tooling-option-red.txt) records0 passed/1 failed. After removing the bypass, the same test checks both entrypoints reject the option with exit1, zero steps/suites/audit checks; the [GREEN output](tooling-option-green.txt) records1 passed/0 failed. These two targeted observations ran on Node24.14.0. They are working-tree observations with logs, not invented historical commits. The full tooling suite is rerun separately on the clean source commit.

The earlier tooling5-pass/5-fail RED report has no retained raw artifact; its exact historical counts cannot be independently verified from the pack. Existing F01/F05 TDD evidence remains separately attributed and requires human authenticity assessment. No absent artifact is marked VERIFIED.

## Previously fixed review findings

Earlier source/evidence provenance, portable private-path sanitization, process AC mapping, stale setup rejection, exact product fingerprint keys, HTML/CSS/config/assets coverage, missing-file handling and full-history prerequisites remain in place. NOT_RELEASED is a pending check with no matched/pass entry. Prior real entrypoint probes are retained in run/setup-preflight-probes.json, run/audit-rejection-probes.json and run/source-guard-probe.json with their original source attribution; they must not be relabeled as current execution.

Normal audit should exit0 only after source/setup validation; strict release audit must still exit2 NOT_RELEASED while actual main release/human evidence is missing. Issue13 remains open. GitHub CI and branch protection are known gaps outside this bounded correction.
