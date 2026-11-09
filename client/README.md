# PEW-DIY — Client (Frontend)

> **Status:** UI-02 (Issue #33) implemented — React + Vite + TypeScript + Tailwind CSS v4
> application (Login / Equipment Catalog / Item Detail) per `docs/ui/ui-spec.md`,
> approved via ARCH-01 (`docs/architecture/frontend-change-proposal.md`, PR #29).

This directory contains the PEW-DIY frontend application (Borrower and Custodian
screens). The deployment topology remains a **modular monolith**: the Express
application in `server/` serves this build (`client/dist`) together with the API
from one container (`docs/system-sds.md` §2.1 record, Lab 5 R-01).

## Layout

- `src/styles/tokens.css` — design tokens (Tailwind v4 CSS-first `@theme`);
  source of truth is `docs/ui/ui-spec.md` §0.1 (Navy `#313B7B` / White `#FFFFFF`
  are Confirmed team decisions — the token verification gate checks these)
- `src/components/` — shared custom components (ui-spec §0.2 vocabulary) incl.
  `AvailabilityBadge` + `QuantityDisplay`, handed off to #10 (F-03) for real
  availability data — see `docs/sprints/sprint-1/ui-02-evidence.md`
- `src/pages/` — Login, Catalog, Item Detail (ui-spec §1–§3)
- `src/lib/` — typed API client (`api.ts`) + session context (`session.tsx`)
- `src/test/` — component/page tests (Vitest + Testing Library)

## Commands (run from `client/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on :5173 (proxies `/api` to :3000) |
| `npm run build` | Production build → `client/dist` (served by Express) |
| `npm run typecheck` | TypeScript check |
| `npm test` | Component/page tests (Vitest) |

E2E tests (Playwright) live at the repository root: `e2e/` — run `npm run test:e2e`
from the root (starts the full app; see `e2e/playwright.config.ts`).

## Legacy pages (migration coexistence — ARCH-01 §12.1)

The framework-free pages `login.html`, `catalog.html`, `item.html` are **still
served** at their `.html` paths and keep their tests green (`server/tests/
catalog-ui.test.ts` etc.) until migration phase P4 replaces those assertions.
Real files always win over the SPA fallback. **Do not retire them until the P4
conditions in ARCH-01 §12.1 are met.**

See `README.md` (root) for setup, `docs/ui/ui-spec.md` for the UI specification,
and `docs/sprints/sprint-1/` for the feature contracts.
