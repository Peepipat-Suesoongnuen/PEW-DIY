# Proposed PR38 description (copy to the existing PR after evidence regeneration)

Refs #13. This PR verifies the Sprint1 authentication, catalog/availability, borrowing request and checkout/active-loan increment and prepares Part F evidence. It does not constitute a release from sprint/1-staging to main; Issue13 remains open for human/release gates.

## Changes

- Exercise real UI/API/PostgreSQL journeys, access control, restart durability and checkout races; map49 application AC and57 contract AC to executed checks or explicit pending human/release evidence.
- Bind setup evidence to the exact clean verification source commit before any suite starts; reject stale/candidate setup records.
- Use a shared complete product/test/tooling manifest for the dirty-source guard, fingerprints and audit, including HTML/CSS/config/assets and deleted files; validate the exact fingerprint key set and Git blobs.
- Keep NOT_RELEASED pending rather than matched/pass, document full-history prerequisites, sanitize portable evidence, and separate local execution from reviewer-reported results.

## Version and validation traceability

| Round | Source | Evidence/reviewed head | Results |
|---|---|---|---|
| Original submission | 2b76abb | 2b76abb | Historical local setup61.812s; original reviewer PG17 setup11.957s |
| First remediation | 8bff092 | 43bcdfe | Local PG18:164 server /70 client /54 E2E,5 tooling; setup22.417s |
| Independent re-review | 43bcdfe | 43bcdfe | Reviewer Node24.19/PG17.11:164/70/54,5 tooling; normal audit0, release-required2 |
| Latest remediation | Pending authorized local source commit | Pending fresh evidence | Do not substitute the previous round's results; record the new SHA, full-run counts, setup duration and audit exits after regeneration |

The first three rows describe separate historical measurements. Latest machine-readable results belong in run/verification.json and run/setup.json and must name the same source commit. A source-preserving evidence descendant may retain that tested source SHA.

## Remaining gates

A-12 shared-team ratification artifact, teammate README repetition, contribution/AI disclosure and RED authenticity sign-off, final board evidence, reviewed main release and final PDF remain pending. Application AC passing does not close these gates; five contract rows remain PARTIAL. CI and branch protection are known gaps outside this remediation scope. Local checks are not GitHub CI results.

This text is prepared locally; no GitHub PR edit is performed by the remediation task.
