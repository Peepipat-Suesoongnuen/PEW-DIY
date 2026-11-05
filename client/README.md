# PEW-DIY — Client (Frontend)

> **Status:** Structure preparation only — **no frontend framework or UI is implemented here yet** (FIX-A scope).

This directory is the designated home of the PEW-DIY frontend application (Borrower and Custodian screens: login, catalog, borrowing request, checkout views — per `docs/system-sds.md` §5 UI states and the Sprint 1 feature contracts).

## Current state

- **Empty by design.** FIX-A prepares the client/server directory separation only. Framework selection and UI development belong to the F-01 remaining scope (AC-F01-11 UI) and F-02+ feature work — do not add a framework here without a reviewed decision.
- The deployment topology remains a **modular monolith**: one application container serves UI and API (`docs/system-sds.md` §2.2/§8.2, Lab 5 R-01). The client build will be served by the Express application in `server/` once it exists.

## Planned contents (when UI work starts)

- Frontend application source and its own build tooling (framework decision pending)
- Client-side tests (component/UI) alongside the source, following the repository test conventions

See `README.md` (root) for setup, and `docs/sprints/sprint-1/` for the UI behavior contracts.
