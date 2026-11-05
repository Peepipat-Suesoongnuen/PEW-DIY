# UI-02 Evidence — Frontend Foundation & Core UI Implementation (Issue #33)

> Branch: `feature/ui-02-frontend-foundation-core-ui` · Date: 2026-11-06 ·
> Scope: Issue #33 (UI-02) — Login / Catalog / Item Detail per `docs/ui/ui-spec.md`.
> All numbers below are from real runs recorded during implementation.

## 1. Test Results (recorded counts — AC-10)

| Suite | Command | Result |
|---|---|---|
| Server suite (existing baseline — unchanged) | `npm test` (root) | **55/55 passed** (8 files) — same baseline as 2026-11-06 audit; no existing test was modified or deleted by this work |
| Client component/page tests (new, UI-02) | `npm test` (in `client/`) | **41/41 passed** (6 files) — includes 7 regression cases added for the PR #34 review fixes (logout-401, opaque-id URL encoding ×3, password clearing ×2, keyboard toggle) |
| Core UI E2E (new, UI-02) | `npm run test:e2e` (root) | **36/36 passed** (12 scenarios × 3 viewport projects) |
| Server build | `npm run build` | exit 0 |
| Client build | `npm run build` (in `client/`) | exit 0 — `client/dist` (index.html + hashed assets) |
| Client typecheck | `npx tsc --noEmit` (in `client/`) | exit 0 |

No existing test was changed except none: the only test-infrastructure edit is
`client/src/test/setup.ts` (new client suite) and the root `vitest.config.ts`
already excluded `client/**`, so the server baseline is untouched.

## 2. Acceptance Criteria Verification (Issue #33)

| AC | Status | Evidence |
|---|---|---|
| AC-1 Vite build + Express serve + SPA fallback + legacy coexistence | ✅ | `client/dist` built; `e2e/specs/ui-states.spec.ts` "serving contract" asserts `GET /` → 200 HTML, unknown `/api/*` returns the JSON envelope (never index.html), unknown HTML routes get the SPA shell, `GET /login.html` → 200 (legacy kept) |
| AC-2 Design tokens + no hard-coded colors | ✅ | `client/src/styles/tokens.css` `@theme` holds `#313B7B`/`#FFFFFF`; grep of `client/src/components|pages` finds 0 hex colors; values verified in built CSS (`dist/assets/*.css`) |
| AC-3 Shared components + component tests | ✅ | `client/src/components/` (Button, Field, Card, Table/Th, Badge=AvailabilityBadge, Alert, EmptyState, Loading, Nav/AppShell, AccountMenu, ItemCard, DetailList, QuantityDisplay) — `client/src/test/components.test.tsx` + `account-menu.test.tsx` |
| AC-4 Login per ui-spec §1 + AC-F01-11 | ✅ | `client/src/pages/LoginPage.tsx`; `login-page.test.tsx`; `e2e/specs/auth-journey.spec.ts` (login→catalog→logout, generic error identical for unknown user/wrong password, username preserved/password cleared, session-expiry notice) |
| AC-5 Catalog per ui-spec §2 (no search/filter) | ✅ | `client/src/pages/CatalogPage.tsx` (Table desktop/tablet, ItemCard mobile, states per f-02 §3, AccountMenu, logout-with-retry); `catalog-page.test.tsx`; `e2e/specs/catalog-journey.spec.ts` |
| AC-6 Item Detail per ui-spec §3 minus request panel | ✅ | `client/src/pages/ItemDetailPage.tsx` (info card, badge, Quantity Tracking, missing/error states, back link; **no** "Request to borrow" — asserted absent in e2e + component tests; panel belongs to #11) |
| AC-7 Responsive matrix 390/768/1280 | ✅ | `e2e/playwright.config.ts` projects `mobile/tablet/desktop-chromium`; `catalog-journey.spec.ts` "responsive surfaces" asserts ItemCard-only on <768 and Table-only on ≥768 per ui-spec §2.4 |
| AC-8 Shared UI states (loading/empty/error/validation/401) | ✅ | `e2e/specs/ui-states.spec.ts` (loading via delayed route, empty via mocked 200 `data: []`, error via mocked 503 with requestId, 401 → login + expiry notice) |
| AC-9 API integration matches F-01/F-02 contracts | ✅ | `client/src/lib/api.ts` consumes the existing envelopes unchanged (`{ data: … }`, `{ error: { code, message, requestId } }`); no server route/contract was modified (only static/SPA serving added in `auth-routes.ts`) |
| AC-10 Regression + new tests + evidence | ✅ | Table §1 — baseline 55/55 untouched; UI-02 tests 34 + 36 all green; counts recorded here |
| AC-11 Component Handoff for #10 | ✅ | Section §3 below + component docstrings in `client/src/components/AvailabilityBadge.tsx` |
| AC-12 Core UI E2E green at 3 viewports, no request-loans journey | ✅ | 36/36 (12 × 3); specs = `auth-journey` / `catalog-journey` / `ui-states` exactly per ARCH-01 §11 core mapping; `request-loans-journey` deliberately not created (belongs to #11/#12/#13) |

## 3. Component Handoff — AvailabilityBadge & QuantityDisplay (for #10 / F-03)

#10 connects real availability data to these components **without redesigning
them** (Issue #33 AC-11). The components are pure display; F-03 owns the
computation and post-checkout updates.

**Component interface**
- `client/src/components/AvailabilityBadge.tsx` → exports `AvailabilityBadge`, `QuantityDisplay`
- Used in: `CatalogPage` (both responsive surfaces), `ItemDetailPage`, `ItemCard`

**Props**

| Component | Prop | Type | Meaning |
|---|---|---|---|
| `AvailabilityBadge` | `availability` | `"AVAILABLE" \| "UNAVAILABLE"` | The `availability` API field, rendered as **text + color** (never color alone — ui-spec §2.2, decision C-2) |
| `QuantityDisplay` | `available` | `number` | `quantity_available` (rendered bold) |
| `QuantityDisplay` | `total` | `number` | `quantity_total` — renders `"{available} available of {total} total"` (SRS A-01 Quantity Tracking, ui-spec §3.2) |

**Data contract (existing API fields — do not add/remove fields)**

| Prop | Source field | Endpoint |
|---|---|---|
| `availability` | `availability` (`"AVAILABLE"`/`"UNAVAILABLE"`, consistent with the same object's quantities — f-03 response table) | `GET /api/equipment`, `GET /api/equipment/{equipmentId}` |
| `available` | `quantity_available` (integer, `0 <= quantity_available <= quantity_total`) | same |
| `total` | `quantity_total` | same |

**Usage example** (as used in `ItemDetailPage`):

```tsx
<div className="flex items-start justify-between gap-3">
  <h1>{item.name}</h1>
  <AvailabilityBadge availability={item.availability} />
</div>
<QuantityDisplay available={item.quantity_available} total={item.quantity_total} />
```

**Behavior notes for #10**
- Pass server-computed values unchanged; never compute availability client-side
  and never accept a client-supplied "available" flag (f-03 §"no client-supplied
  availability update").
- Badge text is `AVAILABLE` / `UNAVAILABLE` exactly (matches the API enum).
- Component tests pin this behavior: `client/src/test/components.test.tsx`
  ("AvailabilityBadge (handoff component for #10)" / "QuantityDisplay …").

## 4. Design decisions applied (no new decisions invented)

- Tokens: `#313B7B`/`#FFFFFF` **Confirmed**; text/border/semantic values =
  ui-spec §0.1 Proposed values used as specified. `color-primary-hover`
  (named in ui-spec §1.3 without a hex) is implemented as `#27305F`, a darker
  shade of the Confirmed primary — flag for team ratification alongside OQ-UI-1.
- Typography: Inter-only per OQ-UI-1 proposal (state unchanged — team decides).
- Nav links for later-sprint screens are rendered **only when their features
  land** (ui-spec §2.2 "no dead links") — Catalog + AccountMenu now; #11/#12 add
  their entries with their screens.
- Item Detail request panel (incl. OQ-UI-2 bounds and N-5 post-submit flow) is
  untouched — owned by #11.
- Images/sorting remain out (ui-spec OQ-UI-3/4 = Gap).

## 5. Tooling notes

- `@playwright/test` pinned to **1.64.1**: the registry mirror currently lacks
  `playwright-core@1.65.0` (the `^1.65` resolution fails); 1.64.1 is the newest
  resolvable stable pair. Revisit when the mirror syncs.
- Node minimum recorded as **24.15+** (README): `jsdom@31` engines are
  `^22.22.2 || ^24.15.0 || >=26.0.0` — earlier 24.x (e.g. 24.14.0) triggers an
  npm engine warning (PR #34 review, suggestion).
- Playwright run needs seeded accounts: `.env` `SEED_PASSWORD_BA/BB/CA` are read
  at runtime (`e2e/pages/fixtures.ts`) — never hardcoded, never logged.
- E2E serving contract note: unauthenticated `GET /api/unknown` returns 401 from
  the auth guard before the 404 handler (pre-existing contract behavior,
  unchanged by UI-02); the AC-1 invariant tested is "never the SPA shell".

## 6. PR #34 review fixes (2026-11-06)

| # | Finding (reviewer) | Root cause | Fix |
|---|---|---|---|
| 1 | Logout 401 kept stale identity + retry | `handleSignOut` treated 401 like uncertain failures | 401 → shared 401 behavior (expire + Login); retry only for network/500/503 (f-01 §2.3) |
| 2 | Detail links didn't encode opaque ids (`fixture#opaque`) | URL built with raw `item.id` at 3 call sites | `lib/paths.ts` `itemPath()` uses `encodeURIComponent` at every call site |
| 3 | Login kept the password on 503/network errors | Password cleared only in the 401 branch | Password cleared on every failed submit (validation + API + network); username preserved (f-01 §2.3 "preserve only safe input") |
| 4 | Password toggle not keyboard reachable | `tabIndex={-1}` removed tab stop | Removed; ui-spec §1.5 tab order (username → password → toggle → submit) verified by test |

Regression tests added: `account-menu.test.tsx` (401 logout),
`components.test.tsx` (ItemCard encoded href), `catalog-page.test.tsx` (encoded
hrefs + router round-trip of the opaque id), `api.test.ts` (encoded API URL),
`login-page.test.tsx` (password cleared on 503 + network + validation; keyboard
toggle order/activation/name).
