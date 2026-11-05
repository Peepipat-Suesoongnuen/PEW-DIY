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

Prerequisites: **Node.js 24+**, **PostgreSQL 17+**, npm.

```bash
# 1. Install dependencies
npm install

# 2. Create the two databases (dev and test — kept separate per SDS §4)
psql -U <admin> -c "CREATE DATABASE pewdiy_dev;"
psql -U <admin> -c "CREATE DATABASE pewdiy_test;"

# 3. Configure environment (auto-loaded by the app and test runner)
cp .env.example .env
#    Edit .env: DATABASE_URL, TEST_DATABASE_URL, APP_ORIGIN, and seed
#    passwords (SEED_PASSWORD_BA/BB/CA — local only, never committed).

# 4. Apply migrations to the dev database
npm run migrate

# 5. Seed the demo accounts (B-A, B-B, C-A) — upsert-safe, rerun-friendly
npm run seed

# 6. Run the test suite against the test database (39 tests)
npm test

# 7. Start the development server
npm run dev   # http://localhost:3000
```

**Environment loading:** scripts and tests load `.env` automatically via
`process.loadEnvFile()` (Node built-in). Explicitly exported environment
variables take precedence over `.env` values. There is no built-in fallback
for required configuration — a missing key stops startup (fail-closed).

## Project Status

Initial project setup. Product requirements and implementation details are being defined by the team.
