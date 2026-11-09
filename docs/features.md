# Feature Inventory (Part B)

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Deliverable:** D1-02 Part B — Feature Inventory and Traceability | **Issue:** [D1-02]
> **Status:** Draft for team review | **Language:** English (team decision A-07)
> **Source of truth:** `docs/srs.md` (approved, rev 2). This document references requirement IDs and does not restate requirement text.
> **Reference:** `project_deliverable_1_v1.pdf` §3.2 | **Companion document:** `docs/traceability.md`
> ID conventions: `F-xx` features and named system responsibilities · `SN-xx` stakeholder needs (defined in this document only)

---

## 1. Stakeholder Needs → Feature Map

Stakeholder needs derived from the SRS §1.1 problem statement.

| ID | Stakeholder need | Addressed by |
|---|---|---|
| SN-01 | Know which equipment is available before borrowing | F-02, F-03, F-09 |
| SN-02 | Borrow equipment through a simple request → checkout process | F-04, F-05 |
| SN-03 | Know who currently holds each item and when it is due | F-05, F-08 |
| SN-04 | Notice overdue items | F-07 |
| SN-05 | Reliable, durable inventory and loan records | F-10 (verifying F-02–F-06) |
| SN-06 | Student data stays private; inventory control stays staff-only | F-01 |

## 2. Feature Inventory

| ID | Feature / responsibility | Description | Sprint | Related FR | Related BR | Related NFR | Dependencies | Tracked by |
|---|---|---|---|---|---|---|---|---|
| F-01 | Authentication and Role-Based Access Control | Login / logout / current-user identity; two roles (Borrower, Custodian) enforced server-side; ownership checks; salted-hash credentials | Sprint 1 | FR-01–FR-05 | BR-04, BR-05, BR-06, BR-10 | NFR-01, NFR-02, NFR-03 | — (foundation) | [D1-06.1] |
| F-02 | Equipment Catalog (seed and read) | Catalog items (name, description, category, total quantity); reproducible synthetic seed data; list/detail views for both roles | Sprint 1 | FR-06, FR-08 | — | NFR-07 (verify S3), NFR-08 (part) | F-01 | [D1-06.2] |
| F-03 | Equipment Availability | Compute and display Available Quantity (`Total − held`, never below zero); availability data used by request/checkout gates | Sprint 1 | FR-07 | BR-02\*, BR-03\* | NFR-05\* | F-02 | [D1-06.3] |
| F-04 | Borrowing Request | Borrower submits a request for an available item and views own requests; custodian views submitted requests | Sprint 1 | FR-11, FR-12, FR-13 | BR-01, BR-05, BR-12 | — | F-01, F-02, F-03 | [D1-06.4] |
| F-05 | Checkout and Active Loan | Custodian records checkout: creates persistent Active Loan with due date (**checkout + 7 days**, A-03/BR-07) and updates availability atomically; borrower views own active loans | Sprint 1 | FR-14, FR-15, FR-16 (active) | BR-02, BR-03, BR-07, BR-11 | NFR-04 (S1), NFR-05, NFR-06 (S1) | F-01, F-03, F-04 | [D1-06.5] |
| F-06 | Return | Custodian records return: closes the Active Loan and restores availability atomically | Sprint 2 | FR-17 | BR-09 | NFR-04 (S2), NFR-06 (S2) | F-05 | Part B only¹ |
| F-07 | Overdue Status | Compute overdue (now > due date, no return recorded) and present the overdue list to custodians | Sprint 2 | FR-19 | BR-08 | — | F-05 | Part B only¹ |
| F-08 | Catalog Management, Search, and Loan Views | Custodian creates/updates/retires items and adjusts quantities; catalog search/filter; custodian views all loans; borrower full loan history | Sprint 2 | FR-09, FR-10, FR-18, FR-21 | BR-06 | — | F-02, F-05 | Part B only¹ |
| F-09 | Inventory Reporting | Inventory/loan/overdue summaries and reports | Sprint 3 | FR-20 | — | NFR-07 (verify) | F-06, F-07, F-08 | Part B only¹ |
| F-10 | Sprint 1 Integration and Verification *(named system responsibility)* | End-to-end integration of F-01–F-05; test automation; reproducible setup; persistence/durability verification | Sprint 1 | — | BR-11 (verify) | NFR-08, NFR-09 | F-01–F-05 | [D1-06.6] |

\* **BR-02/BR-03/NFR-05** are *enforced* at checkout (F-05) using availability data maintained by F-03 — mapped to both features (cross-cutting rule).

¹ **F-06–F-09 are in product scope with sprint allocation recorded now** (per `project_deliverable_1_v1.pdf` §3.2: later-sprint requirements need a feature/responsibility and sprint allocation only). Their engineering contracts and issue tracking will be created as part of Deliverable 2 / Final Delivery planning. They are deliberately **not** GitHub sub-issues of [D1-06], because [D1-06] tracks *Working Sprint 1* only; this keeps "Sprint 1 complete" unambiguous and avoids duplicate/orphaned tracking later.

## 3. Cross-Cutting Responsibilities

| Responsibility | Requirement basis | Where verified |
|---|---|---|
| Server-side authorization enforcement | FR-04/FR-05, BR-04/05/06, NFR-01/02 | F-01 (tests at each protected operation; Sprint 1) |
| Persistence and durability | BR-11, NFR-04 | F-10 coordinates; request/checkout (Sprint 1), return (Sprint 2), redeployment (Lab 5) |
| Transaction atomicity | NFR-06 | Checkout: F-05 (Sprint 1); Return: F-06 (Sprint 2) |
| Credential protection | BR-10, NFR-03 | F-01 (Sprint 1) |
| Reproducible setup and test automation | NFR-08, NFR-09 | F-10 (Sprint 1) |

## 4. Explicit Non-Features (from SRS §3.2)

Not part of the product — tracked here to prevent scope creep: real payment gateways and external messaging/APIs · self-registration, password recovery, email verification · multiple roles per account · fine/penalty management · damage assessment / repair workflow · barcode/RFID scanning and IoT · native mobile application · future-date reservation.

## 5. Coverage Summary

| Requirement set | Count | Mapped to a feature/responsibility | Uncovered |
|---|---|---|---|
| Functional Requirements (FR-01–FR-21) | 21 | 21 | 0 |
| Business Rules (BR-01–BR-12) | 12 | 12 | 0 |
| Non-Functional Requirements (NFR-01–NFR-09) | 9 | 9 | 0 |

Detailed rows: see `docs/traceability.md`. No requirement is intentionally left uncovered.

## 6. Change Log

| Rev | Change | Basis |
|---|---|---|
| 1 | Initial feature inventory | `docs/srs.md` rev 2 (approved; merged to `sprint/1-staging`) |
