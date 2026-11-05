# Frontend Architecture Change Proposal — React + Vite + Tailwind CSS + Playwright

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Type:** Architecture Change Proposal (Documentation only — no scaffold, dependency, source-code, or migration changes in this revision)
> **Issue:** [#28 — ARCH-01](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/28) · **Status:** Proposed — pending peer review and team approval
> **Basis:** Team decisions confirmed 2026-11-05 (recorded in §2; these are **Confirmed**, not proposals)
> **Related:** [System SDS](../system-sds.md) §2/§5 · [Sprint Plan](../sprints/plan.md) · [Sprint 1 contracts](../sprints/sprint-1/README.md) · [SRS](../srs.md)

---

## 1. Purpose

The team has confirmed the frontend architecture and UI design direction (§2). This proposal converts those decisions into a reviewable architecture and specification that:

1. defines the frontend project structure and toolchain integration,
2. specifies the design system (tokens, typography, colors, spacing, components, responsive behavior),
3. defines the Playwright browser E2E strategy,
4. analyses impact on requirements, contracts, tests and the sprint plan,
5. proposes the migration path from the current plain-HTML UI, and
6. lists the documents that must change, with reasons.

**No implementation starts until this proposal passes review and is approved** (Issue #28 AC-4/AC-5). All technology selections in §2 are team decisions; everything else in this document is **Proposed** and marked where it needs team confirmation (mainly typography in §8.2).

## 2. Confirmed Team Decisions

| Category | Decision | Status |
|---|---|---|
| Frontend Framework | **React** | Confirmed (team, 2026-11-05) |
| Build Tool | **Vite** | Confirmed |
| CSS Framework | **Tailwind CSS** | Confirmed |
| Design Direction | **Academic / University + Minimal & Clean** | Confirmed |
| Design System | **Centralized Design Tokens** | Confirmed |
| Primary Color | **Classic Navy `#313B7B`** | Confirmed |
| Background Color | **Pure White `#FFFFFF`** | Confirmed |
| Responsive Design | **Desktop, Tablet, Mobile** | Confirmed |
| Browser E2E Testing | **Playwright** | Confirmed |
| UI Components | **Custom Components** | Confirmed |
| Icon Library | **Lucide Icons** | Confirmed |

## 3. Impact Analysis

### 3.1 Requirements (SRS) — **no requirement changes needed**

The framework is an implementation/design choice, not a requirement. All UI-related requirements keep their meaning:

| Requirement | Impact |
|---|---|
| FR-01–FR-05 (auth/roles/ownership) | None — API behavior unchanged; UI renders the same states |
| FR-06/FR-07 (catalog + availability display) | None — display obligations unchanged |
| FR-11–FR-16 (requests/loans UI in Sprint 1–2) | None |
| NFR-01/02 (no private data on denial) | Strengthened — React rendering avoids the innerHTML class of defects fixed in PR #27 |
| NFR-07 (performance) | React/Vite build must stay within the same target (catalog list ≤ 100 items, p95 ≤ 2 s) — unchanged |
| NFR-08 (reproducible setup) | Setup steps grow (client install/build) — README updates cover it; target unchanged (≤ 15 min) |
| AC-F01-11, AC-F02-06 (UI states) | Behavior unchanged; implementation moves to React components + Playwright evidence |

**No new requirements are created to support the framework** (scope control). Where a screen exists in SDS §5 or contracts, the React work implements that existing behavior only.

### 3.2 Engineering Contracts (Part E) — behavior unchanged, implementation-tech notes only

| Contract | Impact |
|---|---|
| `f-01` §2.3 UI states | Behavior identical (pending/generic error/stale-state clearing). No AC change. |
| `f-02` §3 UI Specification | State table (loading/loaded/empty/missing/401/safe-failure) becomes the React component state contract — unchanged semantics |
| `f-03`–`f-05` UI sections | To be implemented in React when those features start; **no contract rewrite required** — screen behavior already specified |
| `shared-conventions` §2 | API envelope/routes unchanged; UI consumes the same endpoints |
| `product-dod` | Evidence expectations unchanged; browser E2E evidence now has a defined tool (Playwright) |

**API contracts are not modified** (scope control): the React client consumes `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/equipment[/{id}]` exactly as specified.

### 3.3 Tests — planned replacement and compatibility migration (no coverage loss)

**Correction (PR #29 review):** not all tests are unaffected — several depend on the legacy page paths:

| Existing | Impact |
|---|---|
| API/DB tests (`server/tests/*` — auth, authz, catalog API, session, seed) | **Unaffected** — server behavior, not UI technology |
| `server/tests/catalog.test.ts` UI page-serving assertions (`GET /login.html`, `/catalog.html`, `/item.html`) and the UI-to-API journey test | **Affected** — these assert legacy page paths; see compatibility plan §12.1 (kept passing through P1–P3) and retirement/updates at P4 |
| `server/tests/restart-e2e.test.ts` readiness probe (`GET /login.html` on app start) | **Affected** — readiness probe migrates to the React entry point at P4 (§12.1) |
| `server/tests/catalog-ui.test.ts` (jsdom, 4 tests) | **Proposed replacement** during migration: component tests (Vitest + React Testing Library) cover the same assertions (XSS-safe text rendering, logout failure states). *Do not delete before replacements pass.* |
| Deferred browser E2E (TEST-F01-13, TEST-F02-07/08) | **Resolved tooling question:** Playwright (team decision) — strategy in §11 |

### 3.4 Sprint Plan (Part D) — no allocation change

Sprint allocation (F-01..F-05 + F-10 in Sprint 1; F-06..F-08 Sprint 2; F-09 Sprint 3) stands unchanged (scope control). The UI migration is **infrastructure work within Sprint 1** — sequenced so feature work (F-03 onward) lands directly in React (§13). The C-04 UI readiness dependency (plan.md §11.4) is strengthened: React UI + Playwright evidence directly serve Lab 5 C-04 and Deliverable 1 screenshots.

## 4. Conflicts with Current Documentation — identified with proposed fixes

| # | Document | Conflict with team decision | Proposed fix | When |
|---|---|---|---|---|
| C-1 | `docs/system-sds.md` §2.1 "Web UI" row | Still records UI framework as an open selection ("Framework or server-rendered UI…") | Record the team selection (React + Vite + Tailwind) with reference to this proposal; close the UI-framework gap in §2.1 | Implementation PR (Phase 1) — keeps SDS revision tied to executed work |
| C-2 | `client/README.md` | Says "no frontend framework… do not add a framework without a reviewed decision" | This proposal **is** the reviewed decision; README updated when scaffolding lands (Phase 1) | Implementation PR |
| C-3 | `server/tests/catalog-ui.test.ts` | jsdom harness tests plain-HTML pages that will no longer exist after migration | Replace with component tests (same assertions) + Playwright E2E **before** removing the plain-HTML pages (Phase 4) | Migration PR |
| C-4 | `docs/system-sds.md` §5 UI spec | Uses generic "proposed UI names"; no design-system reference | Add reference to the Design System (§8 of this doc) as the visual source of truth; behavior table stays authoritative | Implementation PR |
| C-5 | Historical evidence (`tdd-evidence-f01/f02.md`, `test-results-*`) | References plain-HTML/jsdom work | **No change** — historical evidence is immutable (Lab 5 R-10 "keep the history") | — |

## 5. Proposed Frontend Architecture and Project Structure

**Topology (unchanged, Confirmed):** modular monolith — one container serves UI and API (SDS §2.2/§8.2, Lab 5 R-01). Vite builds static assets; the Express app in `server/` serves them.

```text
PEW-DIY/
├── client/                        # React + Vite + Tailwind frontend
│   ├── index.html                 # Vite entry
│   ├── package.json               # client dependencies (react, vite, tailwindcss, lucide-react, ...)
│   ├── vite.config.ts             # build config + dev proxy → server API
│   ├── tsconfig.json              # extends root conventions
│   ├── src/
│   │   ├── main.tsx               # app bootstrap
│   │   ├── App.tsx                # router + layout shell
│   │   ├── api/                   # typed API client (same endpoints/contracts)
│   │   ├── components/            # custom UI components (§10)
│   │   │   ├── ui/                # Button, Input, Card, Table, Alert, Badge, EmptyState, Loading, Nav
│   │   │   └── layout/            # AppShell, PageHeader
│   │   ├── pages/                 # Login, Catalog, ItemDetail, ... (one per SDS §5 screen)
│   │   ├── hooks/                 # useAuth, useCatalog, ...
│   │   ├── styles/                # tailwind entry + @theme design tokens (§7/§8)
│   │   └── test/                  # component tests (Vitest + Testing Library)
│   └── e2e/                       # (alternative location — see §11; root e2e/ proposed)
├── e2e/                           # Playwright specs (root — mirrors TokTickIT reference)
│   ├── playwright.config.ts
│   └── specs/                     # auth, catalog, journey specs
├── server/                        # unchanged — serves client build in production
└── package.json                   # root: scripts delegate (npm --workspace or --prefix client)
```

**Integration rules:**
- Dev: Vite dev server proxies `/api` → Express (same-origin behavior preserved, incl. cookie + `Origin` CSRF policy).
- Prod/build: `vite build` outputs `client/dist/`; Express serves it (static middleware already present in `auth-routes.ts`). **No change to API routes or server contracts.**
- Root remains the single entry point for scripts (`npm run dev` starts both; `npm run build` builds both) — keeps NFR-08 reproducibility.

## 6. React + Vite Integration

| Item | Proposal |
|---|---|
| Language | TypeScript (consistent with server) |
| React version | 18/19 stable at implementation time; pinned in `client/package.json` + lockfile |
| Routing | `react-router-dom` (client-side routing per SDS §5 navigation) |
| Data layer | Typed `fetch` client in `src/api/` (reuse shared-conventions shapes); no new API contract |
| State | React state + small context for auth (`useAuth`) — no heavy state library needed at this scale |
| Env | `VITE_*` vars only for public config (e.g., none secret — server holds secrets per SDS §8) |
| Build | `vite build` → `client/dist` → served by Express |

### 6.1 Development Ports, Trusted Origin, and Vite Proxy (PR #29 review)

A proxy alone does **not** make the browser's `Origin` match the backend configuration. The current guard (`requireTrustedOrigin` in `server/src/routes/auth-routes.ts`) compares the request `Origin` header **exactly** against `config.appOrigin` (then `Referer` fallback) on every state-changing request, and `.env.example` currently defines `APP_ORIGIN=http://localhost:3000`. With a Vite dev server on another port, React UI requests would be rejected **403 FORBIDDEN before reaching login logic** (reproduced by the review). The guard is **not** weakened or bypassed for development — instead the trusted-origin value must match the origin the browser actually sends.

| Item | Value |
|---|---|
| Backend dev port | **3000** (`PORT` in `.env`; unchanged) |
| Vite frontend dev port | **5173** (Vite default) |
| `APP_ORIGIN` — local dev **with** Vite dev server | `http://localhost:5173` (the browser's real origin) |
| `APP_ORIGIN` — local run serving the built client/legacy pages from Express only | `http://localhost:3000` |
| `APP_ORIGIN` — production | `https://<deployed-public-url>` (the URL users open; matches SDS §8.2 HTTPS deployment) |

**Proxy behavior:** `vite.config.ts` sets `server.proxy: { "/api": "http://localhost:3000" }`. The proxy **forwards request headers unchanged**, so the backend receives the genuine browser `Origin: http://localhost:5173`. The Origin header is **not rewritten** by the proxy — rewriting it would defeat the guard's purpose. The browser sees one origin (5173), so cookies/session behave as same-origin; the backend validates that same value against `APP_ORIGIN`.

**Frontend authentication interaction:** login/logout/fetch calls use `credentials: "same-origin"` and are sent to same-origin `/api/...` paths (through the proxy in dev, directly in production). Browsers attach `Origin` automatically on state-changing requests; non-browser clients must send `Origin` explicitly (existing rule, unchanged).

**Verification gates (must all pass before migration is accepted):**
1. Login from the React UI succeeds (200 + session cookie set).
2. Logout from the React UI succeeds (204 confirmed; UI follows its failure-aware behavior otherwise).
3. State-changing request with a **hostile Origin** is rejected 403 and the session is not affected.
4. State-changing request with a **missing Origin** (and missing/foreign Referer) is rejected 403.
5. Existing API and CSRF behavior remains intact — the backend test suite (incl. TEST-F01-15 cases) passes unchanged; the guard implementation is not modified.

## 7. Tailwind CSS Configuration

**Decision:** Tailwind CSS is Confirmed (team). **Version pinned at P1: Tailwind v4** (latest stable; record the exact patch version in the implementation PR). The v3/v4 configuration models are materially different — v4 does **not** auto-detect `tailwind.config.ts` (official upgrade guide: "JavaScript config files … are no longer detected automatically in v4"). The approaches are not interchangeable:

### 7.1 Tailwind v4 (selected — CSS-first)

- **Vite plugin integration:** `@tailwindcss/vite` plugin in `vite.config.ts` (no PostCSS/Tailwind config file required).
- **Theme = CSS-first:** the centralized design tokens (§8) are defined with `@theme` in the CSS entry (`src/styles/theme.css`), e.g.
  ```css
  @import "tailwindcss";
  @theme {
    --color-primary: #313B7B;        /* Classic Navy — Confirmed */
    --color-background: #FFFFFF;     /* Pure White — Confirmed */
    /* …remaining §8 tokens (Proposed)… */
  }
  ```
  Tokens become Tailwind utilities (`bg-primary`, `bg-background`, …) automatically.
- **Legacy JS config (only if required later):** must be loaded **explicitly** via the CSS `@config "../../tailwind.config.js";` directive — it is never picked up automatically. Note: `corePlugins`, `safelist` and `separator` are not supported in v4 (v4 equivalents: `@source inline()` for safelisting). Do not plan on these options.
- Content detection in v4 is automatic (source scanning of the project); no `content` paths array needed.

### 7.2 Tailwind v3 (fallback — only if the team later requires v3)

- PostCSS plugin (`tailwindcss` + `autoprefixer`); `tailwind.config.js`/`.ts` **is** auto-detected; theme extension via `theme.extend` with the §8 tokens; `content` paths required (`client/src/**/*.{ts,tsx}`).
- If v3 is ever chosen instead, the theme values in §8 translate mechanically into `theme.extend`; do **not** assume the v4 `@theme` block works under v3.

### 7.3 Token verification gate (P1)

Custom design tokens must be proven live, not just declared: build the client and render a verification page/component that uses `bg-primary` and `bg-background`; assert the computed styles resolve to **`#313B7B`** (Classic Navy) and **`#FFFFFF`** (Pure White) — via component test (computed style) or a Playwright assertion. Record the evidence in the P1 PR. A configuration that compiles but renders default colors fails this gate.

## 8. Proposed Design System Specification

### 8.1 Color Tokens (Confirmed values where marked)

| Token | Value | Status |
|---|---|---|
| `color-primary` | `#313B7B` (Classic Navy) | **Confirmed** |
| `color-primary-hover` | `#27305F` (≈10% darker) | Proposed |
| `color-primary-soft` | `#EEF0F7` (very light navy tint for backgrounds/badges) | Proposed |
| `color-background` | `#FFFFFF` (Pure White) | **Confirmed** |
| `color-surface` | `#FFFFFF` + 1px `color-border` | Proposed |
| `color-text` | `#1F2430` (near-black, high contrast on white) | Proposed |
| `color-text-muted` | `#5B6270` (secondary text) | Proposed |
| `color-border` | `#D9DCE3` | Proposed |
| `color-success` / `color-warning` / `color-danger` | `#2E7D32` / `#B26A00` / `#B3261E` (accessible on white) | Proposed |
| Availability states | AVAILABLE → `color-success`; UNAVAILABLE → `color-danger` | Proposed |

### 8.2 Typography (Proposed — needs team confirmation)

| Token | Value | Rationale |
|---|---|---|
| `font-sans` (body/UI) | **Inter**, fallback `system-ui, sans-serif` | Clean, minimal, highly legible for data tables |
| `font-serif` (headings, optional academic accent) | **Source Serif 4**, fallback `Georgia, serif` | "Academic / University" character for page titles only — optional; alternative is Inter with weight contrast only (even more minimal) |
| Scale | 12 / 14 / 16 / 20 / 24 / 32 px (Tailwind `xs…2xl`) | 6-step scale covers all SDS §5 screens |
| Body | 16px / 1.5 line-height | Readability |

*Team decision needed:* Inter-only (pure minimal) vs Inter + serif headings (academic accent). Defaults to Inter-only if no preference is recorded before implementation.

### 8.3 Spacing, Radii, Elevation

- Spacing: Tailwind 4px grid (`space-1` = 0.25rem … `space-16`); no off-grid values.
- Radii: `6px` controls, `8px` cards — minimal & clean.
- Elevation: at most one subtle shadow level for cards (`0 1px 2px rgba(31,36,48,0.08)`); prefer borders over shadows.

### 8.4 Component Guidelines (Custom Components)

| Component | Notes |
|---|---|
| Button | Variants: primary (navy), secondary (outline), danger; sizes sm/md; loading + disabled states |
| Input/Label/Error | Field-level validation text; error styling via `color-danger` |
| Card | Surface + border + radius-8; content containers for item detail |
| Table | Catalog/list rows; text-only cell rendering (XSS-safe by design — React text nodes) |
| Badge | Availability/status chips (AVAILABLE/UNAVAILABLE, request/loan states) |
| Alert | Safe error messages (shared error envelope codes → human text; never raw server text) |
| EmptyState / Loading | Distinct states per SDS §5 (empty ≠ error ≠ loading) |
| Nav/AppShell | Role-aware navigation (Borrower vs Custodian), logout action |
| Icons | Lucide (§9) |

## 9. Lucide Icons Usage

- Library: `lucide-react` (tree-shaken imports).
- Usage: navigation affordances, buttons (login/logout/back), status hints (check/alert), empty-state illustration accents.
- Rules: icons are decorative supplements — never replace required text labels; size tokens (16/20px) from the type scale; color inherits text token (navy/muted/danger); no emoji as UI icons.

## 10. Responsive Breakpoints and Layout Behavior

Responsive requirement (Confirmed): **Desktop, Tablet, Mobile**. Mapping to Tailwind defaults:

| Viewport | Breakpoint | Layout behavior |
|---|---|---|
| Mobile | base (< 768px) | Single column; catalog table → stacked cards; nav collapses to top bar; forms full-width |
| Tablet | `md` (≥ 768px) | Two-column where useful (detail side panel); catalog table with reduced columns |
| Desktop | `lg` (≥ 1024px) | Full table; sidebar/top nav; content max-width 1200px centered |

- Touch targets ≥ 40px on mobile; forms usable at 360px width.
- Playwright E2E runs the critical journey at all three viewports (§11).

## 11. Proposed Playwright E2E Strategy

| Item | Proposal |
|---|---|
| Location | `e2e/` at repository root (mirrors TokTickIT reference); config `e2e/playwright.config.ts` |
| Browser | Chromium first (primary); WebKit/Firefox optional later — keep cost low |
| Viewports | Desktop (1280×800), Tablet (768×1024), Mobile (390×844) — the confirmed responsive set |
| Fixtures | Seeded accounts (B-A/B-B/C-A) + synthetic equipment (fixture-e-one/many/zero) via existing seed; test DB or reset procedure documented |
| Style | Page-object-lite: `e2e/pages/` + `e2e/specs/`; no framework beyond Playwright |
| Retries | 1 retry locally; CI policy defined at Lab 5 |

**Spec mapping (covers the previously deferred rows):**

| Spec | Covers | Contract |
|---|---|---|
| `auth-journey.spec.ts` | login → catalog → logout; invalid login; session-expiry redirect | TEST-F01-13, AC-F01-11 |
| `catalog-journey.spec.ts` | list → detail → back; both roles; empty/missing states | TEST-F02-07, AC-F02-06 |
| `ui-states.spec.ts` | loading/empty/401/error states (via route interception) | TEST-F02-08 |
| `accessibility-smoke.spec.ts` | keyboard nav + contrast smoke (minimal, academic quality bar) | optional, Proposed |
| `request-loans-journey.spec.ts` | **Sprint 1:** request → checkout → active loans journey (F-04/F-05) | TEST-F01-13 (extended), F-04/F-05 UI — **specs added when F-04/F-05 are ready, within Sprint 1, and complete before integrated release verification of Deliverable 1 (D1)** |
| `return-history-journey.spec.ts` | **Sprint 2:** return + full history journeys (F-06/F-08) — existing later-sprint allocation unchanged | F-06/F-08 specs (Sprint 2) |

- **Regression policy:** browser E2E runs before each PR once the migration lands (command documented in README); CI wiring at Lab 5 (R-05).
- Component tests (Vitest + Testing Library) complement E2E for state-level assertions (replacement of the jsdom suite — §3.3).

## 12. Migration Strategy from Current UI

Current state: `client/login.html`, `client/catalog.html`, `client/item.html` (plain HTML/JS, framework-free) + `server/tests/catalog-ui.test.ts` (jsdom). Express serves `client/` statically.

| Phase | Content | Gate |
|---|---|---|
| **P0** | This proposal reviewed and approved | **This PR** |
| **P1** | Scaffold `client/` (Vite + React + TS + Tailwind + Lucide), design tokens, AppShell; serve `client/dist` from Express; update `client/README.md` + SDS §2.1 record (C-1, C-2) | New PR after P0 approval |
| **P2** | Custom components (§8.4) + component-test harness (Vitest + Testing Library) | PR |
| **P3** | Migrate 3 screens (Login/Catalog/ItemDetail) to React against the same API; keep plain-HTML pages alongside until P4 passes (no coverage gap) | PR |
| **P4** | Test migration: component tests replacing jsdom assertions + Playwright specs (§11) green → retire `catalog-ui.test.ts` + plain-HTML pages (C-3) | PR |
| **P5** | F-03..F-05 UI lands directly in React (existing contracts) | Feature PRs |

**Risks and mitigations:**

### 12.1 Legacy/React Compatibility and Page-Serving Migration Plan

**Current state (verified):** `server/tests/catalog.test.ts` asserts `GET /login.html`, `/catalog.html`, `/item.html`; `server/tests/restart-e2e.test.ts` uses `GET /login.html` as its readiness probe. Express serves `client/` statically. These assertions must keep passing until replaced.

**P1–P3 — coexistence (legacy pages keep working untouched):**

| Surface | Served by | Paths |
|---|---|---|
| Functional UI (all three screens) | **Legacy HTML pages** (unchanged) | `/login.html`, `/catalog.html`, `/item.html` |
| React app (growing) | Vite build `client/dist` served by Express | `/` (index.html) + React routes `/login`, `/catalog`, `/items/:id` — extension-less paths do not collide with the legacy `.html` paths |
| API | Express routers (unchanged) | `/api/*` |

- During P1–P3 the legacy pages remain the **serving source of truth** for the migrated screens; React pages are validated in parallel (component tests + Playwright). Existing tests keep passing because the legacy paths remain served.
- Express static precedence: real files (`*.html`) always win over the SPA fallback (below) — a legacy page keeps its URL until it is retired.

**P4 — test migration and retirement (no coverage loss):**

| Existing assertion | Action at P4 |
|---|---|
| `catalog.test.ts` page-serving assertions (`/login.html`, `/catalog.html`, `/item.html`) | **Update** to the React entry (`GET /` → 200 `index.html`) and, where the assertion proved the UI→API journey, **replace with** Playwright `catalog-journey.spec.ts`/`auth-journey.spec.ts` (which cover the same AC via the real UI). Only retire the legacy assertions **after** the Playwright specs pass. |
| `catalog.test.ts` UI-to-API-to-DB journey test | Replaced by Playwright journey specs (stronger evidence — real browser); API-level leg stays as the existing API tests |
| `restart-e2e.test.ts` readiness probe `GET /login.html` | **Change to** `GET /` (React entry returns 200 `index.html`) — no new API endpoint is introduced (API contracts unchanged). If a health check is ever wanted, it requires a contract revision first, not part of this migration. |
| `catalog-ui.test.ts` (jsdom) | Retired after component tests reproduce its assertions (already planned in §3.3) |

**SPA routing (fallback) rules:**
- Express adds a **history-API fallback** middleware: GET/HEAD requests that (a) accept `text/html`, (b) do **not** start with `/api/`, and (c) do not match an existing static file → serve `client/dist/index.html`. This makes **direct URL navigation and browser refresh work** for all supported React routes.
- **`/api/*` must never fall through to `index.html`** — API paths continue to hit the API routers and return the existing API contract behavior, including the JSON 404 error envelope for unknown `/api` routes (unchanged).
- Unknown non-API, non-static HTML paths return the SPA shell (client-side router shows its own not-found state); unknown `/api` paths return the safe JSON 404 — the two not-found behaviors remain distinct.

| Risk | Mitigation |
|---|---|
| Deliverable 1 deadline (8 Nov) — screenshots/UI evidence needed | P1–P3 are small (3 screens); if time tightens, F-03 API work proceeds in parallel — UI migration does not block API features |
| Windows/native build issues (as seen with tooling before) | Pin versions in lockfile; use prebuilt binaries; verify `npm run build` early in P1 |
| Tailwind v3 vs v4 differences | Pin one version in P1 and record it; config in §7 assumes either with minor syntax change |
| Playwright browser download / CI weight | Chromium-only first; document install step in README (NFR-08 budget) |
| Coverage gap during migration | Keep plain-HTML pages + jsdom tests until replacements pass (P4 gate) |
| CSRF/origin behavior in dev proxy | Vite proxy preserves same-origin; `Origin` header policy unchanged (document in P1) |

## 13. Documents to Modify (with reasons)

| Document | Change | Reason | When |
|---|---|---|---|
| `docs/system-sds.md` §2.1 | Record React+Vite+Tailwind as the selected UI stack (close open row) | Team decision; SDS is stack source of truth | P1 PR |
| `docs/system-sds.md` §5 | Add Design System reference (§8 of this proposal) as visual source | Visual standards authority; behavior table unchanged | P1 PR |
| `client/README.md` | Reflect framework decision + build/run commands | Removes "framework pending" status (C-2) | P1 PR |
| `README.md` (root) | Setup: client install/build commands (NFR-08) | Reproducible setup | P1 PR |
| `docs/sprints/sprint-1/verification-matrix.md` | Update UI-test rows when replacements land (jsdom → component/Playwright) | Evidence mapping must stay true | P4 PR |
| `server/tests/catalog-ui.test.ts` | Retire after replacements pass (C-3) | No duplicate/divergent UI harnesses | P4 PR |
| This document (`docs/architecture/frontend-change-proposal.md`) | Revision history as decisions/implementation progress | Traceability | ongoing |

**Not modified (with reason):** SRS (no requirement change), API contracts (endpoints/behavior unchanged), `plan.md` (sprint allocation unchanged), historical evidence (immutable), `shared-conventions` (wire contract unchanged).

## 14. Verification for This Proposal

- [x] All 11 team decisions recorded in §2 and propagated to structure/design/testing sections
- [x] Impact analysis covers Requirements, Contracts, Tests, Sprint Plan (§3)
- [x] Conflicts with current documentation identified with proposed fixes (§4)
- [x] Frontend project structure, React/Vite integration, Tailwind config, design tokens/theme, typography/colors/spacing/components, breakpoints, custom components, Lucide, Playwright strategy all specified (§5–§11)
- [x] Migration plan with dependencies and risks (§12)
- [x] Document change list with reasons (§13)
- [x] **No scaffold, no dependency install, no source-code change, no migration, no SRS/BR/API/sprint changes** — documentation only (Issue #28 AC-4/AC-5)

## 15. Revision History

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial Architecture Change Proposal: team decisions recorded (§2), impact analysis (§3), conflicts (§4), proposed structure/design-system/Playwright strategy (§5–§11), migration plan (§12), document change list (§13) | Team decisions 2026-11-05 (React/Vite/Tailwind/Playwright/tokens/navy/white/responsive/custom components/Lucide); SDS §2.1/§2.2/§5; Sprint 1 contracts UI sections; PR #27 UI question thread; Issue #28 |
| 2 — 2026-11-05 | PR #29 review (4 P2): (1) §11 Playwright mapping — F-04/F-05 request→checkout→loans journey corrected to **Sprint 1** (specs added when F-04/F-05 ready, complete before D1 integrated release verification); return/history stays Sprint 2; (2) §3.3/§12.1 — corrected "tests unaffected" overclaim: catalog.test.ts page-serving assertions and restart-e2e readiness probe identified as legacy-page-dependent; added Legacy/React compatibility & page-serving migration plan (P1–P3 coexistence, P4 assertion updates/retirement without coverage loss, SPA fallback rules incl. `/api/*` never served index.html); (3) §6.1 — ports + trusted-origin + Vite proxy configuration (backend 3000 / Vite 5173 / APP_ORIGIN dev+prod values, proxy forwards Origin unchanged, guard not weakened) with 5 verification gates; (4) §7 — Tailwind version-specific config: pin **v4** at P1, CSS-first `@theme` + `@tailwindcss/vite`, JS config only via explicit `@config` (v4 does not auto-detect it), v3/v4 separated, token verification gate for `#313B7B`/`#FFFFFF`; §5 structure line aligned | PR #29 review by L0u1sss; Tailwind official upgrade guide (`tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file`); `server/tests/catalog.test.ts`, `server/tests/restart-e2e.test.ts`, `server/src/routes/auth-routes.ts`, `.env.example` verified |
