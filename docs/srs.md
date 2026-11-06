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
| FR-06 | The system shall maintain an equipment catalog where each item has a name, description, category, total quantity, and availability state. | Sprint 1 (seed + read) |
| FR-07 | The system shall compute and display **Available Quantity** for each item so users can check availability before requesting. | Sprint 1 |
| FR-08 | The system shall provide a seeded demo catalog with reproducible seed data (synthetic). | Sprint 1 |
| FR-09 | The system shall allow a Custodian to create, update, and retire catalog items and adjust total quantity. | Sprint 2 (full management) |
| FR-10 | The system shall provide search/filter of the catalog (by name, category, availability). | Sprint 2 |

### 4.3 Borrowing Requests

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-11 | The system shall allow a Borrower to submit a borrowing request for an available item, persisting the request. | Sprint 1 |
| FR-12 | The system shall allow a Borrower to view their own requests with status. | Sprint 1 |
| FR-13 | The system shall allow a Custodian to view submitted requests. | Sprint 1 |

### 4.4 Checkout, Active Loans, Return

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-14 | The system shall allow a Custodian to record checkout for a request/item, creating a persistent **Active Loan** and updating availability atomically. | Sprint 1 |
| FR-15 | The system shall maintain Active Loan records (borrower, item, quantity, checkout date, due date, status). | Sprint 1 |
| FR-16 | The system shall allow a Borrower to view their own active loans and loan history. | Sprint 1 (active) / Sprint 2 (full history) |
| FR-17 | The system shall allow a Custodian to record return, closing the Active Loan and restoring availability atomically. | Sprint 2 |
| FR-18 | The system shall allow a Custodian to view all active loans. | Sprint 2 |

### 4.5 Overdue and Reporting

| ID | Requirement | Priority / Sprint |
|---|---|---|
| FR-19 | The system shall compute Overdue status for active loans whose due date has passed and present an overdue list to Custodians. | Sprint 2 |
| FR-20 | The system shall provide inventory reports/summaries: items with quantities and availability, loans by status, overdue items. | Sprint 3 |
| FR-21 | The system shall provide the Borrower's borrow/return history. | Sprint 2 |

---

## 5. Business Rules (BR)

Each rule is stated as testable behavior with its rejection/edge case.

| ID | Rule | Testable expectation | Sprint |
|---|---|---|---|
| BR-01 | A borrowing request may only be created for an item whose **Available Quantity ≥ 1** at the time of the request. Under A-12, the requested quantity is a positive integer not exceeding current Available Quantity. | Unavailable or insufficient quantity is rejected without a request; malformed quantities are rejected by validation. | Sprint 1 |
| BR-02 | Checkout of an unavailable item should be **rejected**. | Checkout when Available Quantity = 0 is rejected; no loan is created and availability is unchanged. | Sprint 1 |
| BR-03 | **Duplicate-active-loan prevention under Quantity Tracking:** Available Quantity must never fall below zero. For an item whose Total Quantity = 1 (a single exclusive unit), at most one Active Loan may exist at a time — the duplicate-loan rule is enforced as a special case of the quantity rule. | A second concurrent checkout of a single-unit item is rejected; competing attempts cannot oversell. | Sprint 1 |
| BR-04 | Only a **Custodian** may perform checkout and return. | A Borrower calling checkout/return endpoints is rejected with a forbidden result, enforced server-side. | Sprint 1 |
| BR-05 | A Borrower may view only their own requests and loans. | Requesting another borrower's request/loan is denied without returning private data. | Sprint 1 |
| BR-06 | Only a **Custodian** may modify the catalog. | A Borrower calling catalog-write endpoints is rejected server-side. | Sprint 1 (enforcement) |
| BR-07 | The **due date** of a loan is assigned automatically at checkout as **checkout date + 7 calendar days** (team decision). | A created loan's due date equals checkout date + 7 days. | Sprint 1 |
| BR-08 | A loan is **Overdue** when the current date is later than its due date and no return has been recorded. | A loan past due date appears in the overdue list; a returned loan does not. | Sprint 2 |
| BR-09 | Return closes exactly one Active Loan and restores all units it holds; **full-quantity return per loan** is selected in A-12 (partial returns are not selected). All held quantity must be accounted for at closure so held units cannot escape the BR-03 availability formula. | Full return restores availability; over/partial return is rejected under the selected policy; a loan cannot close while units remain held. | Sprint 2 |
| BR-10 | Passwords shall be stored only as salted hashes; plaintext password storage is prohibited. | No plaintext password exists in database or seed data. | Sprint 1 |
| BR-11 | All availability and loan state transitions shall be persisted and survive application restart **or redeployment**. Allocation by function: request/checkout persistence from Sprint 1; return persistence from Sprint 2 (FR-17). | After restart or redeployment, loans/availability read back identically. | Sprint 1 (request, checkout) / Sprint 2 (return) |
| BR-12 | **Non-reservation:** a borrowing request — submitted or pending — does not reserve units and does not reduce Available Quantity; only a committed **Active Loan** reduces Available Quantity (BR-03). This rule binds every request state, including a pending request under the Sprint 2 approval workflow (A-11). | Creating one or more requests for an item leaves Available Quantity unchanged; the reduction occurs only when a checkout commits an Active Loan; a pending request does not reserve equipment. | Sprint 1 (rule; also binds the Sprint 2 approval workflow) |

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
| A-02 | Design Decision | **Borrowing Approval = Direct Checkout** — no separate approval step before checkout; a request proceeds to checkout directly. *(Sprint 1 scope: the Sprint 2 approval workflow is recorded in A-11.)* | **Confirmed** by team (2026-11-03; Sprint 1 scoping confirmed 2026-11-06, Direction A) |
| A-03 | Design Decision | Due date is assigned automatically as **checkout date + 7 calendar days**; overdue is computed from this date. | **Confirmed** by team (2026-11-03) |
| A-04 | Design Decision | Under Quantity Tracking, the theme's "duplicate active loan for the same exclusive item" rule is enforced as a quantity rule (BR-03): single-unit items allow at most one active loan; in general Available Quantity must not fall below zero. | **Confirmed** by team (2026-11-03) |
| A-05 | Assumption | Seeded demo accounts (Borrower/Custodian) are sufficient; self-registration and password recovery are not required. | Per course spec §5.2 |
| A-06 | Assumption | All data is synthetic; no real payment, messaging, or external services are integrated. | Per course spec §5.3 |
| A-07 | Design Decision | Requirement and deliverable documents are written in **English**. | **Confirmed** by team (2026-11-03) |
| A-11 | Design Decision | **Non-reservation + Direct Checkout (Direction A):** (1) Sprint 1 uses Non-reservation + Direct Checkout; (2) a Borrowing Request does not reserve units and does not reduce Available Quantity (BR-12); only a committed Active Loan does; (3) Sprint 1 has no approval step before checkout (A-02); (4) an approval workflow is added in **Sprint 2 only** — its specification is deferred to the Sprint 2 contracts — and a pending request under it still does not reserve equipment (BR-12). | **Confirmed** by team (2026-11-06, Direction A) |
| A-12 | Design Decision | **Quantity/return policy:** multiple units per request are permitted up to current availability, with no additional per-borrower cap; each loan is returned in full. Requests remain non-reserving under BR-12, so repeated requests do not consume stock. Return implementation remains Sprint 2. | **Confirmed** by user in the Issue #11 work session, 2026-11-06; resolves OQ-02 |

### 7.2 Assumptions (working assumptions to be validated)

| ID | Type | Description | Resolution / Status |
|---|---|---|---|
| A-08 | Assumption | The system serves a single D.I.Y. Room (one inventory namespace; no multi-branch/multi-room support). | Open to challenge |
| A-09 | Assumption | Quantity Tracking applies uniformly to item types; larger quantities follow the recorded quantity/return policy. | Quantity policy resolved by A-12; no additional item-category rule introduced |
| A-10 | Assumption | "Availability" means lendable right now; repair/retired items are excluded from availability via catalog status. | Open to challenge |

### 7.3 Open Questions (not yet decided — do not treat as requirements)

| ID | Question | Impact | Target |
|---|---|---|---|
| OQ-01 | What is the actual initial equipment catalog? (Arduino Uno, ESP32, Breadboard, Jumper Wires, Sensors, Multimeter, Soldering Equipment are examples only, not confirmed) | Seed data content | Decide before Sprint 1 seed implementation |
| OQ-02 | **Resolved 2026-11-06:** multiple units up to current availability; no additional per-borrower cap; full return per loan (A-12). Original coupled quantity/return question was raised in PR #15 and remained open through rev 3. | Request validation + future checkout/BR-09 return semantics | Decision supplied by user during Issue #11 implementation; no return implementation in this issue |
| OQ-03 | Are there loan-period differences by item category (e.g., tools 7 days, consumables same-day)? | BR-07 generalization | Decide before Sprint 2 |
| OQ-04 | What happens to overdue loans beyond listing (reminders, suspension of borrowing rights)? | Out of scope currently; may extend BR-08 | Decide before Sprint 2 |
| OQ-05 | Should returned items record condition (ok/damaged)? | Excluded for now (§3.2) | Revisit after Sprint 2 |
| OQ-06 | Search specifics (fields, filters) for FR-10. | Sprint 2 contract detail | Decide before Sprint 2 |

---

*Document history: created in [D1-01] (Part A), rev 1 (commit `8252496`). Rev 2 (PR #15 review): added redeployment durability to NFR-04/BR-11 per `group_work_specs_v1.pdf` §5.1; split persistence/atomicity sprint allocation by function (request/checkout → Sprint 1, return → Sprint 2); added close-accounting guard to BR-09 and coupled-decision note to OQ-02. Rev 3 (2026-11-06, team decision Direction A): added BR-12 (non-reservation — requests never reserve or reduce Available Quantity) and A-11 (Non-reservation + Direct Checkout; Sprint 2 approval workflow whose pending requests do not reserve equipment). Existing FR/BR/NFR/A IDs are unchanged; no open question (OQ-01/OQ-02/OQ-03–OQ-06) is closed by this revision. FR/BR/NFR IDs are stable and will be referenced by Part B traceability, Part C SDS, and Sprint 1 contracts.*

**Revision 4 ? 2026-11-06 (Issue #11 work-session user decision):** resolved OQ-02 as A-12 (multi-unit up to available stock, no additional per-borrower cap, full return per loan); elaborated BR-01 and fixed future BR-09 return policy. Existing requirement IDs preserved; return implementation remains Sprint 2. This records an explicit new decision, not a claim that earlier PRs had already resolved it.
