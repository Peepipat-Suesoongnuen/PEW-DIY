# PEW-DIY

**D.I.Y. Room Equipment Borrowing System**

A university equipment-borrowing system for the D.I.Y. Room, which supports students working on projects involving Arduino and related electronics.

## Project Documentation

- [Software Requirements Specification (SRS)](docs/srs.md)
- [System-Level Design Specification (SDS)](docs/system-sds.md)
- [Sprint 1 Engineering Contracts (Part E)](docs/sprints/sprint-1/README.md) — feature specifications, AC/STS mapping and Product DoD

## Project Structure

```text
PEW-DIY/
├── client/            # Frontend application (structure prepared; framework/UI comes with F-02+)
├── server/
│   ├── src/           # Backend application: config, db, routes, services
│   └── tests/         # Unit + API/integration tests (outside build output)
├── docs/              # SRS, SDS, feature inventory, traceability, sprint plans and contracts
├── package.json       # Shared root configuration (single package)
└── AGENT.md           # Repository agent instructions
```

Deployment remains a modular monolith: one application container serves UI and API (SDS §2.2/§8.2).

## Development Setup (Sprint 1)

Prerequisites: **Node.js 24.15+** (or 22.22.2+ / 26+ — matches the `jsdom`
engine range used by the client test suite; earlier 24.x versions trigger an
npm engine warning), **PostgreSQL 17+**, npm.

```bash
# 1. Install dependencies
npm install
npm --prefix client install        # frontend app (React + Vite + Tailwind v4)
npx playwright install chromium    # browser for the E2E suite (one-time)

# 2. Create the two databases (dev and test — kept separate per SDS §4)
psql -U <admin> -c "CREATE DATABASE pewdiy_dev;"
psql -U <admin> -c "CREATE DATABASE pewdiy_test;"

# 3. Configure environment (auto-loaded by the app and test runner)
cp .env.example .env
#    Edit .env: DATABASE_URL, TEST_DATABASE_URL, APP_ORIGIN, and seed
#    passwords (SEED_PASSWORD_BA/BB/CA — local only, never committed).

# 4. Apply migrations to the dev database
npm run migrate

# 5. Seed the demo accounts (B-A, B-B, C-A) and synthetic equipment
#    fixtures (E-ONE/E-MANY/E-ZERO) — upsert-safe, rerun-friendly
npm run seed

# 6. Run the test suite against the test database (55 tests)
npm test
npm --prefix client test           # frontend component/page tests

# 7. Build the frontend (client/dist — served by Express together with the
#    legacy .html pages; see ARCH-01 section 12.1)
npm run build:client

# 8. Start the development server
npm run dev   # http://localhost:3000 → React UI: /login, /catalog
              #                        → legacy UI: /login.html, /catalog.html

# Optional: run the Core UI E2E suite (Playwright, 3 viewports)
npm run test:e2e
```

**Environment loading:** scripts and tests load `.env` automatically via
`process.loadEnvFile()` (Node built-in). Explicitly exported environment
variables take precedence over `.env` values. There is no built-in fallback
for required configuration — a missing key stops startup (fail-closed).

## Project Status

Initial project setup. Product requirements and implementation details are being defined by the team.

## Borrowing Requests (F-04 / Issue #11)

After `npm run migrate` and the existing synthetic seed, open the React app (`/login`), sign in as Borrower, open an available item, and submit a positive quantity up to its current availability. Success opens **My requests**, where list/detail reads survive reload. Custodian sees the **Submitted requests** queue but cannot create requests. Requests do not reserve stock; repeated requests have no additional per-borrower cap (SRS A-12).

Migration 002 creates `borrowing_requests`; migration003 now supplies the Loan relation owned by Issue #12. Historical F-04 results remain in [F-04 execution/TDD evidence](docs/sprints/sprint-1/tdd-evidence-f04.md); fresh F-05 runs verify the fulfilled-request transition and previously Loan-gated cases. No `.env` secret or demo password belongs in Git.

## Checkout and Active Loans (F-05 / Issue #12)

Set `APP_TIMEZONE=Asia/Bangkok` and run `npm run migrate` on the development database. Migration003 creates `loans` with unique request linkage and FK/positive-quantity constraints. As Custodian, open **Submitted requests**, inspect a request and choose **Check out**. The committed result shows the active loan, full requested quantity and due date. As Borrower, open **My loans** to read/reload only your own active loans.

Checkout rechecks stock inside a PostgreSQL transaction, serializing on Equipment then Request row locks across app processes. Requests reserve no stock. Unavailable/repeated checkout returns409 without another loan; failures roll back. Due date is the Asia/Bangkok checkout calendar date +7 days, while the checkout instant is UTC. Missing timezone disables checkout safely; invalid timezone prevents startup. Return/overdue/general staff loan history remain later-sprint work.

Tests require a dedicated `TEST_DATABASE_URL`. Apply the checked-in migrations to that test database **before test discovery**, so existing relation-gated F-03/F-04 tests execute. `npm test` includes two actual API processes racing 50 independent requests, rollback/dirty-read checks and restart of the production application entrypoint. `npm run test:e2e` includes F-05 scenarios using temporary schemas in the test database; its test DB role needs CREATE SCHEMA privilege. These tests never expose their fault/barrier hooks through the production application. See [F-05 execution/TDD evidence](docs/sprints/sprint-1/tdd-evidence-f05.md) for commands, actual environments and pending review/release gates.
