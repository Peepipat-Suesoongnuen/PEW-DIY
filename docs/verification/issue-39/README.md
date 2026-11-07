# Issue39 UI layout verification

Original local verification ran on7 November2026 (Asia/Bangkok), branch `fix/39-ui-layout-and-loan-details`, from working-tree changes based on `ef58fae`. On8 November2026 all six recorded changed-source fingerprints were independently matched against published commit `2b0df2d66455b23d8f3d0d613d6271f366adeaaf`. [results.json](results.json) now identifies that matched commit and preserves the original working-tree execution provenance separately; this is post-run reconciliation, not a claim of clean-checkout execution. These historical results do not describe the new review fix below. Existing F10 artifacts retain their historical source attribution.

The global root reserves a stable scrollbar gutter, with an always-scroll fallback for browsers without gutter support. Loan actions use a wrapping flex row with a16px gap. Own-loan borrower names come from the authenticated session; equipment names come from the existing catalog API. A catalog outage leaves loan data readable with an explicit unavailable-name fallback; a401 still expires the session. The shared checkout confirmation retains the resolved equipment name when the queue refreshes.

The current API does not expose another borrower's username to the Custodian checkout confirmation. Following F05 section3 and shared-conventions section3, that view retains the existing `loan.borrower_id` as the required borrower reference when no display name is supplied. It never substitutes the Custodian's own name. Own-loan detail/list pages continue to display the authenticated borrower's username. No profile API, role permission or loan response contract is added.

| Acceptance check | Actual result |
|---|---|
| Navigate catalog, loans, loan detail, requests and item detail with/without vertical scrolling | Nav/content displacement0px at390/768/1024/1280 |
| Back link and Refresh separation |16px at all four widths, above the12px requirement |
| Refresh hit target | Clicks at1%/10%/50%/90%/99% across the button trigger a successful detail GET and keep the detail URL; the back link still navigates normally |
| Readable loan data | Synthetic Tool Set / Student A shown, distinct internal equipment/borrower IDs absent from those fields |
| Regression tests | New real-browser test plus component cases for names, catalog outage,401 and detail refresh |

Original published-source client suite:74 passed/0 failed/0 skipped. Full browser suite:57 passed/0 failed/0 skipped/0 flaky. A targeted rerun of the three new project cases captures all four widths and desktop/mobile screenshots. Client typecheck/build, server build and E2E TypeScript checks passed on Node24.15.0/PostgreSQL18.4. The initial component RED run was observed in the session; no raw RED artifact is claimed. Current counts are extracted from actual JSON reporters.

The new browser test is [ui-layout.spec.ts](../../../e2e/specs/ui-layout.spec.ts). It creates its own PostgreSQL schema, synthetic identities with distinct username/ID values, real requests and checkouts, and an isolated app process. It cleans those resources after execution; product API responses are not intercepted. Desktop also tests1024px alongside1280px; the existing tablet/mobile projects cover768px/390px.

With the root README's dedicated migrated/seeded browser DB, private seed environment and built client configured:

```powershell
npm --prefix client test
npm --prefix client run typecheck
npm --prefix client run build
npx tsc --noEmit -p e2e/tsconfig.json
npm run test:e2e -- --workers=3 --retries=0
```

Target only the new regression with `npm run test:e2e -- ui-layout.spec.ts --workers=3 --retries=0`.

![Desktop loan details with separated actions and resolved names](desktop.png)

![Mobile loan details with separated actions and resolved names](mobile.png)

## Checkout borrower-reference review fix (8 November2026)

[PR41 review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/41#pullrequestreview-5813989510) identified that a generic unavailable message removed the required borrower reference from the committed checkout result. LoanDetails now prefers the provided username, falling back to the existing loan.borrower_id. Equipment-name enrichment, action layout, gutter and ownership rules are preserved.

The component checkout regression checks the actual borrower reference and rejects both a substituted staff username and the old unavailable text. The real-browser hold/checkout scenario checks the reference in the committed confirmation, while the layout/own-loan test verifies friendly borrower names remain present. The focused component regression failed before the correction (one selected test), then the full client suite passed74/74. The related real-browser suites passed12/12 with no skipped/flaky cases or retries; all four viewport layout/name checks remain passing. Client typecheck/build, server build and E2E typecheck passed on Node24.15.0/PostgreSQL18.4. [Current remediation results](checkout-reference-results.json) retain the actual reporter counts and scoped working-tree fingerprints separately from the historical published-source record. These tests were executed before committing; their original working-tree provenance is preserved rather than relabeled as clean-commit execution.

The reviewer also noted existing shared-DB server-suite isolation behavior; it is outside this UI correction. Verification here uses isolated synthetic schemas; no unrelated server-suite behavior is changed.
