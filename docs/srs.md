# Software Requirements Specification (SRS)

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Deliverable:** D1-01 Part A — SRS and Product Scope (Project Deliverable 1)
> **Issue:** [D1-01] | **Status:** Draft for team review | **Language:** English (team decision)
> **Reference:** `group_work_specs_v1.pdf` (Theme 2: Inventory and Borrowing System), `project_deliverable_1_v1.pdf` §3.1
>
> ID conventions: `FR-xx` Functional Requirements · `BR-xx` Business Rules · `NFR-xx` Non-Functional Requirements · `A-xx` Assumptions / Design Decisions · `OQ-xx` Open Questions

---

## 1. Stakeholder Problem and Chosen Context

### 1.1 Stakeholder Problem

The D.I.Y. Room is a university room where students build course and personal projects, especially Arduino, electronics, and prototyping work. The room lends equipment (development boards, sensors, tools, consumables) to students. Today this lending process is not managed systematically: it is difficult to know which equipment is available, who currently holds an item, when items are due back, and what remains in inventory. This causes unavailability conflicts, lost track of loans, overdue items going unnoticed, and no reliable inventory records.

### 1.2 Chosen Context

PEW-DIY is a full-stack **D.I.Y. Room Equipment Borrowing System** for a single university D.I.Y. Room. The system manages equipment inventory and the borrow/return lifecycle so that students can check availability and request equipment, and staff can control checkout/return and monitor inventory.

### 1.3 Ubiquitous Language (Domain Glossary)

| Term | Definition |
|---|---|
| **Equipment Item (Item)** | A catalog record of lendable equipment type (e.g., Arduino Uno), tracked by **quantity** (team decision: Quantity Tracking). |
| **Total Quantity** | Number of units of an item owned by the D.I.Y. Room. |
| **Available Quantity** | `Total Quantity − quantity currently held by Active Loans`. An item is **Available** when Available Quantity ≥ 1. |
| **Borrowing Request** | A borrower's persisted statement of intent to borrow an item (created only for available items). |
| **Checkout** | Custodian action that hands an item to a borrower: creates an **Active Loan** and decreases Available Quantity. |
| **Active Loan** | A loan record in the borrowed state, with a due date. Ends at **Return**. |
| **Return** | Custodian action that receives an item back: closes the Active Loan and increases Available Quantity. |
| **Overdue** | An Active Loan whose due date has passed without a return. |
| **Borrower** | A student who borrows equipment. |
| **Custodian** | A staff member who manages inventory and controls checkout/return. |

---

## 2. Actors and Responsibilities

| Actor | Responsibilities |
|---|---|
| **Borrower (Student)** | Log in/out; view and search the equipment catalog; check availability; submit borrowing requests; view own requests, active loans, and borrow/return history. **Cannot** perform checkout, return, or inventory management. |
| **Custodian (Staff)** | Maintain the equipment catalog (add/edit items and quantities); review borrowing requests; record checkout; record return; view overdue loans; view inventory reports and summaries. Acts within authorized scope only. |
| **System** | Enforce business rules and access control server-side; compute availability and overdue status; persist all state; provide reports. |

---

## 3. Product Scope

### 3.1 In Scope

The complete product covers the seven Theme 2 capabilities plus identity and access:

1. **Inventory Availability** — catalog of equipment items with quantity tracking and availability status.
2. **Borrowing Requests** — borrowers submit and track requests for available items.
3. **Checkout** — custodians record checkout, creating active loans and updating availability.
4. **Active Loans** — persistent loan records; borrowers see their own; custodians see all.
5. **Return** — custodians record return, closing loans and restoring availability.
6. **Overdue Status** — loans past their due date are identified and listed.
7. **Inventory Reporting** — summaries of inventory, loans, and overdue items.
8. **Identity and Access** — real authentication (login/logout/current-user), two roles (Borrower, Custodian), server-side authorization on every protected operation.

### 3.2 Explicit Exclusions (out of product scope)

| Exclusion | Reason |
|---|---|
| Real payment gateways, external messaging/email/SMS services, external APIs | Course spec: use synthetic data only |
| Self-registration, password recovery, email verification | Not required; seeded demo accounts suffice |
| Multiple roles per account | Not required by the specification |
| Fine/penalty management for overdue items | Overdue is status-only; penalties are a policy matter outside this product |
| Damage assessment / repair workflow | Not part of the theme's required capabilities |
| Barcode/RFID scanning, IoT integrations | Not required |
| Native mobile application | Web UI access only |
| Equipment reservation for future dates | Requests are for current borrowing only |

> Note on sprint allocation: Return, Overdue Status, Inventory Reporting, and full catalog management are **in product scope** but planned for later sprints (see Part D). Sprint 1 delivers the vertical slice defined in §7.

---

## 4. Functional Requirements (FR)

### 4.1 Identity and Access

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-01 | The system shall provide login with username and password, issuing a documented session/token; invalid credentials shall be rejected without revealing which field was wrong. | Sprint 1 |
| FR-02 | The system shall provide logout that invalidates the current session/token according to the documented lifecycle. | Sprint 1 |
| FR-03 | The system shall provide current-user identity retrieval so the UI and API know the acting user. | Sprint 1 |
| FR-04 | The system shall support exactly two roles: **Borrower** and **Custodian**, enforced server-side on every protected operation. | Sprint 1 |
| FR-05 | The system shall ensure a Borrower can access only their own requests and loans; cross-borrower access shall be denied. | Sprint 1 |

### 4.2 Inventory and Availability

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-06 | The system shall maintain an equipment catalog where each item has a name, description, category, total quantity, availability state, and (from Sprint 2) optional preview image (`image_url`) and catalog status (`ACTIVE`/`RETIRED`). | Sprint 1 (core) / Sprint 2 (`image_url`, `catalog_status`) |
| FR-07 | The system shall compute and display **Available Quantity** for each item so users can check availability before requesting. | Sprint 1 |
| FR-08 | The system shall provide a seeded demo catalog with reproducible seed data (synthetic). | Sprint 1 |
| FR-09 | The system shall allow a Custodian to create, update, and retire catalog items (including optional `image_url`) and adjust total quantity. | Sprint 2 (full management) |
| FR-10 | The system shall provide search, filter, and sorting of the catalog (by name/description query, category, availability, catalog status for custodians, and sort order). | Sprint 2 |

### 4.3 Borrowing Requests

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-11 | The system shall allow a Borrower to submit a borrowing request (single item or multi-item bundle from Sprint 2) for available items with borrowing purpose and requested duration (1–14 days), persist the request, and cancel own unfulfilled requests. | Sprint 1 (single) / Sprint 2 (bundle, purpose, duration, approval, cancel) |
| FR-12 | The system shall allow a Borrower to view their own requests with status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `CHECKED_OUT` in Sprint 2). | Sprint 1 / Sprint 2 (approval states) |
| FR-13 | The system shall allow a Custodian to view submitted requests, and (from Sprint 2) approve or reject pending requests before checkout. | Sprint 1 (view) / Sprint 2 (approve/reject) |

### 4.4 Checkout, Active Loans, Return

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-14 | The system shall allow a Custodian to record checkout for an approved request/bundle, creating persistent **Active Loan(s)** and updating availability atomically. | Sprint 1 / Sprint 2 (approval & bundle support) |
| FR-15 | The system shall maintain Active Loan records (borrower, item, quantity, checkout date, due date, status) and support printing an approved loan slip as evidence. | Sprint 1 / Sprint 2 (print slip) |
| FR-16 | The system shall allow a Borrower to view their own active loans and full loan history. | Sprint 1 (active) / Sprint 2 (full history) |
| FR-17 | The system shall allow a Borrower to submit a return notice on an own active loan and allow a Custodian to confirm return, closing the Active Loan and restoring availability atomically. | Sprint 2 |
| FR-18 | The system shall allow a Custodian to view all room loans (active, return-pending, overdue, and returned history). | Sprint 2 |

### 4.5 Overdue, Notifications, and Reporting

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-19 | The system shall compute Overdue status for active loans whose due date has passed, present an overdue list to Custodians, and show in-app notifications (request approval/rejection, due within 2 days, overdue) that users can mark read or clear. | Sprint 2 |
| FR-20 | The system shall provide inventory reports/summaries: items with quantities and availability, loans by status, overdue items. | Sprint 3 (contracts & initial summary in D2) |
| FR-21 | The system shall provide the Borrower's borrow/return history. | Sprint 2 |

---

## 5. Business Rules (BR)

Each rule is stated as testable behavior with its rejection/edge case.

| ID | Rule | Testable expectation | Sprint |
|---|---|---|---|
| BR-01 | A borrowing request may only be created for an `ACTIVE` item whose **Available Quantity ≥ 1** at the time of the request. Under A-12, the requested quantity is a positive integer not exceeding current Available Quantity. | Unavailable, retired, or insufficient quantity is rejected without creating a request; malformed quantities are rejected by validation. | Sprint 1 / Sprint 2 (`ACTIVE` check) |
| BR-02 | Checkout of an unavailable or unapproved item/request should be **rejected**. | Checkout when Available Quantity = 0 or request is not `APPROVED` is rejected; no loan is created and availability is unchanged. | Sprint 1 / Sprint 2 (`APPROVED` gate) |
| BR-03 | **Duplicate-active-loan prevention under Quantity Tracking:** Available Quantity must never fall below zero. For an item whose Total Quantity = 1 (a single exclusive unit), at most one Active Loan may exist at a time — the duplicate-loan rule is enforced as a special case of the quantity rule. | A second concurrent checkout of a single-unit item is rejected; competing attempts cannot oversell. | Sprint 1 |
| BR-04 | Only a **Custodian** may perform checkout, approve/reject requests, and confirm return; a **Borrower** may only submit a return notice (`request-return`) on their own active loan (without restoring stock). | A Borrower calling checkout, approve/reject, or confirm-return endpoints is rejected with HTTP 403; a Borrower requesting return on another borrower's loan is rejected with 403. | Sprint 1 / Sprint 2 |
| BR-05 | A Borrower may view only their own requests, loans, and notifications. | Requesting/acting on another borrower's request/loan/notification is denied without returning private data. | Sprint 1 / Sprint 2 |
| BR-06 | Only a **Custodian** may modify the catalog. | A Borrower calling catalog-write endpoints is rejected server-side; reducing `quantity_total` below `held(item)` is rejected with 409. | Sprint 1 (enforcement) / Sprint 2 (writes) |
| BR-07 | The **due date** of a loan is assigned automatically at checkout as **checkout date + requested duration (`1–14` calendar days, default `7`)** in `Asia/Bangkok` (A-03 rev). | A created loan's due date equals checkout date + approved/requested calendar days (`1–14`); invalid durations outside `1–14` are rejected. | Sprint 1 (7 days) / Sprint 2 (1–14 days) |
| BR-08 | A loan is **Overdue** when the current date (`Asia/Bangkok`) is later than its due date and no return confirmation (`returned_at`) has been recorded. | A loan past due date appears in the overdue list; a loan due today or a returned loan does not. | Sprint 2 |
| BR-09 | Return closes exactly one Active Loan (or bundle of loans) and restores all units it holds; **full-quantity return per loan** is selected in A-12 (partial returns are not selected). A Borrower return notice alone does not restore stock until Custodian confirms return. | Custodian confirm-return restores availability atomically; repeat return is rejected (`409`); return notice leaves availability unchanged until confirmed. | Sprint 2 |
| BR-10 | Passwords shall be stored only as salted hashes; plaintext password storage is prohibited. | No plaintext password exists in database or seed data. | Sprint 1 |
| BR-11 | All availability and loan state transitions shall be persisted and survive application restart **or redeployment**. Allocation by function: request/checkout persistence from Sprint 1; approval/return/catalog-write persistence from Sprint 2. | After restart or redeployment, loans/availability read back identically. | Sprint 1 / Sprint 2 |
| BR-12 | **Non-reservation:** a borrowing request — submitted, pending, or approved — never reserves units or reduces Available Quantity; only a committed **Active Loan** reduces Available Quantity (BR-03). | Creating or approving requests leaves Available Quantity unchanged; the reduction occurs only when a checkout commits an Active Loan. | Sprint 1 / Sprint 2 |
| BR-13 | **In-app notifications lifecycle:** the system notifies users of request approval/rejection and active loans due within 2 calendar days or overdue; read/cleared notifications remain dismissed across reloads without deleting domain loan/request records. | Dismissing (`read`) or clearing notifications hides them on subsequent fetches while leaving requests and loans intact. | Sprint 2 |

---

## 6. Non-Functional Requirements (NFR)

| ID | Requirement | Measurable target | Verification method | Sprint |
|---|---|---|---|---|
| NFR-01 | Authentication enforcement | 100% of protected API endpoints reject unauthenticated requests with **no private data in the response body** | Automated API tests (unauthenticated request to each protected endpoint) | Sprint 1 |
| NFR-02 | Authorization enforcement | 100% of protected operations reject wrong-role and cross-owner calls server-side (HTTP 403/denied), with **0** bypasses via direct API calls | Automated API tests (forbidden role, cross-borrower access) | Sprint 1 |
| NFR-03 | Credential protection | 0 plaintext passwords in database/seed; passwords verified by hash comparison only | Automated test + database inspection | Sprint 1 |
| NFR-04 | Data persistence and durability | All loans/requests/availability read back correctly after application restart **or redeployment** (e.g., a recreated container backed by the same persistent store); 0 data loss | Automated integration test (restart, then read); redeployment check after deployment exists: redeploy, then read — target for Lab 5 (deployment established) | Sprint 1 (restart) / Lab 5 (redeployment) |
| NFR-05 | Concurrency safety | Under competing checkout attempts for one item, oversold state (Available Quantity < 0 or duplicate active loans for a single-unit item) occurs in **0** of N test runs | Automated concurrency/integration test | Sprint 1 |
| NFR-06 | Transaction atomicity | Each of checkout and return updates loan record and availability together — partial updates occur in 0 cases when failures are injected; allocation by function: checkout atomicity from Sprint 1 (FR-14), return atomicity from Sprint 2 (FR-17) | Automated integration test | Sprint 1 (checkout) / Sprint 2 (return) |
| NFR-07 | Performance (baseline) | Catalog list (≤ 100 items) responds within **2 s** at the 95th percentile on the local environment | Manual timing / simple load check recorded in verification evidence | Sprint 3 |
| NFR-08 | Reproducible setup | A fresh environment reaches a running seeded app by following README steps only, in **≤ 15 minutes** | Manual setup run-through documented in release evidence | Sprint 1 |
| NFR-09 | Test automation | Automated tests cover 100% of Sprint 1 AC; test command exits non-zero on failure | Test report tied to release commit | Sprint 1 |

---

## 7. Assumptions, Design Decisions, and Open Questions

### 7.1 Confirmed Design Decisions (team-approved)

| ID | Type | Description | Resolution / Status |
|---|---|---|---|
| A-01 | Design Decision | **Inventory Tracking = Quantity Tracking** — items are tracked as aggregate quantities, not individual serial units. | **Confirmed** by team (2026-11-03) |
| A-02 | Design Decision | **Sprint 1: Direct Checkout; Sprint 2: Approval Workflow (`A-11`)** — Sprint 1 had no approval step; Sprint 2 introduces Custodian `APPROVE` / `REJECT` prior to checkout (`PENDING → APPROVED → CHECKED_OUT`). | **Confirmed** by team (Sprint 1 A-02; Sprint 2 A-11 approved 2026-11-23) |
| A-03 | Design Decision | **Loan Duration:** Sprint 1 fixed `checkout + 7 calendar days`; Sprint 2 allows Borrower-selected duration **`1–14` calendar days** (default `7`) calculated from checkout date in `Asia/Bangkok`. | **Confirmed** (Sprint 1: 7 days; Sprint 2 revision: 1–14 days, 2026-11-23) |
| A-04 | Design Decision | Under Quantity Tracking, the theme's "duplicate active loan for the same exclusive item" rule is enforced as a quantity rule (BR-03): single-unit items allow at most one active loan; in general Available Quantity must not fall below zero. | **Confirmed** by team (2026-11-03) |
| A-05 | Assumption | Seeded demo accounts (Borrower/Custodian) are sufficient; self-registration and password recovery are not required. | Per course spec §5.2 |
| A-06 | Assumption | All data is synthetic; no real payment, messaging, or external services are integrated. | Per course spec §5.3 |
| A-07 | Design Decision | Requirement and deliverable documents are written in **English**. | **Confirmed** by team (2026-11-03) |
| A-11 | Design Decision | **Non-reservation + Sprint 2 Approval Workflow (Direction A):** (1) Sprint 1 used Non-reservation + Direct Checkout; (2) a Borrowing Request (`PENDING` or `APPROVED`) does not reserve units and does not reduce Available Quantity (`BR-12`); only a committed Active Loan does; (3) Sprint 2 adds Custodian `APPROVE`/`REJECT`, Borrower `CANCEL`, multi-item `request_bundles`, and purpose metadata. | **Confirmed** by team (2026-11-06, Direction A; Sprint 2 details approved 2026-11-23) |
| A-12 | Design Decision | **Quantity/return policy:** multiple units per request are permitted up to current availability, with no additional per-borrower cap; each loan is returned in full (`Full-quantity return only`). Requests remain non-reserving under BR-12. In Sprint 2, Borrowers may submit a return notice (`request-return`) and Custodians confirm return (`return`) to restore stock atomically. | **Confirmed** (user choice 2026-11-06; Sprint 2 full-return & two-step notice/confirm approved 2026-11-23) |

### 7.2 Assumptions (working assumptions to be validated)

| ID | Type | Description | Resolution / Status |
|---|---|---|---|
| A-08 | Assumption | The system serves a single D.I.Y. Room (one inventory namespace; no multi-branch/multi-room support). | Open to challenge |
| A-09 | Assumption | Quantity Tracking applies uniformly to item types; larger quantities follow the recorded quantity/return policy. | Confirmed in A-12 |
| A-10 | Assumption | "Availability" means `ACTIVE` and lendable right now; retired items (`catalog_status = 'RETIRED'`) are excluded from new borrowing while preserving historical records. | **Confirmed** for Sprint 2 (`FR-09`) |

### 7.3 Open Questions (resolved for Sprint 2 where noted)

| ID | Question | Impact | Target / Status |
|---|---|---|---|
| OQ-01 | What is the actual initial equipment catalog? | Seed data content | Synthetic fixtures (`E-ONE`, `E-MANY`, `E-ZERO`) retained for Sprint 1/2 verification; Custodian CRUD (`FR-09`) enables creating real/demo items in Sprint 2 |
| OQ-02 | Multi-unit loans + return semantics (`A-12`) | Request/loan model and BR-09 return | **Resolved (Sprint 2, 2026-11-23):** multi-unit requests (single or bundle), **full-quantity return only** per loan, two-step Borrower return notice → Custodian confirm |
| OQ-03 | Loan-period differences / borrower selection (`BR-07`) | Checkout due-date calculation | **Resolved (Sprint 2, 2026-11-23):** Borrower chooses `1–14` calendar days (default `7`) at request time; Custodian confirms at checkout (`Asia/Bangkok`) |
| OQ-04 | What happens to overdue loans beyond listing? | BR-08 / notifications | **Resolved (Sprint 2, 2026-11-23):** Status-only + dismissible/clearable in-app alerts (`FR-19`, `BR-13`) for due ≤ 2 days and overdue; no fines or external email |
| OQ-05 | Should returned items record condition (ok/damaged)? | Excluded (§3.2) | Remains excluded; optional return note only |
| OQ-06 | Search specifics for FR-10 | Sprint 2 catalog search/filter/sort | **Resolved (Sprint 2, 2026-11-23):** Search `q` (name/description), filters (`category`, `availability`, `status`), and `sort` (name / available qty) |

---

*Document history: created in [D1-01] (Part A), rev 1 (commit `8252496`). Rev 2 (PR #15 review): added redeployment durability to NFR-04/BR-11 per `group_work_specs_v1.pdf` §5.1; split persistence/atomicity sprint allocation by function (request/checkout → Sprint 1, return → Sprint 2); added close-accounting guard to BR-09 and coupled-decision note to OQ-02. Rev 3 (2026-11-06, team decision Direction A): added BR-12 (non-reservation — requests never reserve or reduce Available Quantity) and A-11 (Non-reservation + Direct Checkout; Sprint 2 approval workflow whose pending requests do not reserve equipment). Existing FR/BR/NFR/A IDs are unchanged; no open question (OQ-01/OQ-02/OQ-03–OQ-06) is closed by this revision. FR/BR/NFR IDs are stable and will be referenced by Part B traceability, Part C SDS, and Sprint 1 contracts.*

**Revision 4 — 2026-11-06 (Issue #11 work-session user decision):** resolved OQ-02 as A-12 (multi-unit up to available stock, no additional per-borrower cap, full return per loan); elaborated BR-01 and fixed future BR-09 return policy. Existing requirement IDs preserved; return implementation remains Sprint 2. This records an explicit new decision, not a claim that earlier PRs had already resolved it.

**Revision 5 — 2026-11-06 (PR #36 provenance review):** distinguish the existing user-confirmed A-12 implementation choice from shared-team baseline ratification. Preserve the actual user decision and behavior; keep the team-confirmation evidence gate pending rather than inventing an Issue comment or peer approval.

**Revision 6 — 2026-11-23 (Sprint 2 Baseline Update):** resolved OQ-02/03/04/06 for Sprint 2; added `FR-06/09` `image_url` and `catalog_status`, `FR-10` sorting, `FR-11/12/13` Sprint 2 approval workflow + multi-item bundles + cancellation + purpose + 1–14 day duration, `FR-15` printable loan slip, `FR-17` two-step return notice/confirm, `FR-19`/`BR-13` dismissible/clearable in-app notifications. Preserved `BORROWER`/`CUSTODIAN` 2-role model (`FR-04`, `A-05`).
