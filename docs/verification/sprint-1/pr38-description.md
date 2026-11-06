# Proposed PR38 description (ready to copy to the existing PR)

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
| Latest remediation | 8fb84f4c0803b12cbdd65275e4361a0aaeb88a23 | Evidence-only descendant containing this pack (see Git history) | Local Node24.15/PG18.4:164 server/70 client/54 E2E,11 tooling; setup23.746s; build/typecheck PASS; normal audit0, release-required2 NOT_RELEASED |

The first three rows describe separate historical measurements. Three actual entrypoint probes reject stale/candidate/missing-commit setup with exit1 and zero started suites. All49 application AC pass; contract mapping remains52 PASS/5 PARTIAL. Latest machine-readable results belong in run/verification.json and run/setup.json and must name the same source commit. A source-preserving evidence descendant may retain that tested source SHA.

## Remaining gates

A-12 shared-team ratification artifact, teammate README repetition, contribution/AI disclosure and RED authenticity sign-off, final board evidence, reviewed main release and final PDF remain pending. Application AC passing does not close these gates; five contract rows remain PARTIAL. CI and branch protection are known gaps outside this remediation scope. Local checks are not GitHub CI results.

This text is prepared locally; no GitHub PR edit is performed by the remediation task.
