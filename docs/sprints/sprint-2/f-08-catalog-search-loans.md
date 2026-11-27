# F-08 — Catalog Management, Search/Filter/Sort & Full Loan Views

> **Contract:** Sprint 2 · Feature `F-08`  
> **Revision:** 2 — 2026-11-28 · **Status:** Implemented & verified (`Slices #102, #104, #113, #115` → `main` `5f82a8e`)

---

## 1. Requirement Links & Boundaries

| Item | Basis |
|---|---|
| Functional Requirements | [SRS](../../srs.md) `FR-06(S2)`, `FR-09`, `FR-10`, `FR-16(history)`, `FR-18`, `FR-21` |
| Business Rules | `BR-05` (Borrower views own history only), `BR-06` (Custodian-only catalog writes; `new_total >= held`), `BR-11(S2)` |
| Non-Functional Requirements | `NFR-01`, `NFR-02`, `NFR-04(S2)` |
| Dependencies | `F-01`, `F-02`, `F-03`, `F-05`, `F-06` |

---

## 2. Feature SDS & Workflow

1. **Custodian Catalog Management (`FR-09`):**
   - **Create (`POST /api/equipment`):** Custodian creates a new item (`name` ≤ 120 chars, `category` ≤ 60 chars, `description` ≤ 1,000 chars, `quantity_total >= 0`, optional `image_url`). Defaults to `catalog_status = 'ACTIVE'`.
   - **Update / Adjust Quantity / Retire (`PATCH /api/equipment/:id`):** Locks `equipment` row `FOR UPDATE`, recomputes `held(item)` from active loans, and **rejects `quantity_total < held` with `409 HELD_QUANTITY_CONFLICT`**. Allows updating `name`, `description`, `category` (same `120/60/1,000` char bounds), `image_url`, and `catalog_status` (`ACTIVE` | `RETIRED`) without deleting historical requests/loans. Also enforces UI table/card text wrapping (`break-words`) and universal `Pagination` (`10` rows/page default, `5/10/20/50` selector).
2. **Catalog Search, Filter & Sort (`FR-10`):**
   - `GET /api/equipment?q=&category=&availability=&status=&sort=`
   - `q`: case-insensitive match on `name` or `description`.
   - `category`: exact category filter (when non-empty).
   - `availability`: `AVAILABLE` (`available >= 1`) | `UNAVAILABLE` (`available = 0`).
   - `status`: Borrowers always see `ACTIVE` items only in list; Custodians may filter `ACTIVE` | `RETIRED` | `ALL`.
   - `sort`: `name_asc` (default) | `name_desc` | `available_desc` | `available_asc`.
3. **Loan Views (`FR-16`, `FR-18`, `FR-21`):**
   - Borrower `/loans` (`GET /api/loans?scope=active|history|all`): views own active, return-pending, and returned loan history (`BR-05` enforced).
   - Custodian `/loans` (`GET /api/loans?scope=active|overdue|history|all`): views all room loans across borrowers (`FR-18`).
4. **UI/UX Standardization (`UI-02` S2 update):**
   - Shared `BackButton` across detail/create pages.
   - `CatalogPage` adds equipment thumbnail (`EquipmentImage`), row click indicator, search/filter/sort bar, Custodian `"Add Equipment"` button, and Borrower `"Create Request"` CTA.
   - `ItemDetailPage` presents structured boxes (`Image`, `Description`, `Category`, `Quantity`, `Status`), Custodian Edit/Retire controls, and Borrower `"Request this item"` shortcut (inline borrow form moved to `CreateRequestPage`).
   - `RequestsPage` and `LoansPage` use **standardized Tables** on desktop/tablet, remove `Refresh loans`, `View equipment`, and `View loan` clutter, and remove clickable link on equipment name in Request/Request details.

---

## 3. API & Data Definitions

### Data (`equipment` extensions in `MIGRATION_004_SPRINT2_SQL`)
- `image_url TEXT NOT NULL DEFAULT ''`
- `catalog_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (catalog_status IN ('ACTIVE', 'RETIRED'))`

### API
| Method & Path | Role & Scope | Errors |
|---|---|---|
| `GET /api/equipment` | `BORROWER` (`ACTIVE` only) / `CUSTODIAN` (`ACTIVE`/`RETIRED`/`ALL`) with `?q=&category=&availability=&status=&sort=` | `400` (invalid query enum), `401`, `503` |
| `POST /api/equipment` | `CUSTODIAN` only | `400`, `401`, `403` (Borrower) |
| `PATCH /api/equipment/:id` | `CUSTODIAN` only | `400`, `401`, `403` (Borrower), `404`, `409 HELD_QUANTITY_CONFLICT` |
| `GET /api/loans` | `BORROWER` (own; `scope=active\|history\|all`) / `CUSTODIAN` (room-wide; `scope=active\|overdue\|history\|all`) | `400`, `401`, `403` |
| `GET /api/loans/:id` | `BORROWER` (own active or historical) / `CUSTODIAN` (any room loan) | `401`, `403` (cross-owner Borrower), `404` |

---

## 4. Acceptance Criteria (AC-F08)

| AC ID | Observable Acceptance Outcome | Requirement Basis |
|---|---|---|
| **AC-F08-01** | Custodian creates item (`POST /api/equipment`) with `image_url` → `201`, persisted in DB and visible in catalog. | `FR-06`, `FR-09` |
| **AC-F08-02** | Custodian edits/retires item and increases/decreases `quantity_total`; reducing `quantity_total < held` returns `409 HELD_QUANTITY_CONFLICT`; retired items cannot be requested (`409 EQUIPMENT_RETIRED`) while keeping past loan history intact. | `FR-09`, `BR-01`, `BR-06` |
| **AC-F08-03** | Borrower calling `POST` or `PATCH /api/equipment` receives `403 FORBIDDEN` with zero mutations. | `BR-06`, `NFR-02` |
| **AC-F08-04** | `GET /api/equipment` filters accurately by `q`, `category`, `availability`, `status` (Custodian) and sorts by `name_asc/desc`, `available_asc/desc`. | `FR-10` |
| **AC-F08-05** | Custodian sees all room loans (`FR-18`); Borrower sees own active + returned history (`FR-16`, `FR-21`) and receives `403` on another Borrower's loan detail (active or historical). | `FR-16`, `FR-18`, `FR-21`, `BR-05` |
| **AC-F08-06** | UI renders standardized `BackButton`, table views on Catalog/Requests/Loans without `Refresh loans`/`View equipment`/`View loan` clutter, structured detail boxes, and equipment preview images. | `FR-06`, `FR-10`, `FR-18`, `FR-21` |

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Preconditions / Input | Action & Expected Result |
|---|---|---|---|---|
| **TEST-F08-01** | AC-F08-01 | API/DB integration | `C-A`; valid item payload + `image_url` | `POST /api/equipment` → `201`, read back via `GET /api/equipment/:id` |
| **TEST-F08-02** | AC-F08-02 | API/DB integration | Item with total `3`, held `2` (`available=1`); `C-A`, `B-A` | `PATCH` `quantity_total: 1` → `409 HELD_QUANTITY_CONFLICT`; `PATCH` `quantity_total: 2` → `200`; `PATCH` `catalog_status: "RETIRED"` → `200`, `B-A` request → `409 EQUIPMENT_RETIRED` |
| **TEST-F08-03** | AC-F08-03 | API/DB integration | `B-A`, anonymous | Anonymous → `401`; `B-A` `POST`/`PATCH` → `403` |
| **TEST-F08-04** | AC-F08-04 | API/DB integration | Mixed categories/availabilities/retired items | Query combinations of `q`, `category`, `availability`, `status`, `sort` match expected order/subset |
| **TEST-F08-05** | AC-F08-05 | API/DB integration | `B-A` active + returned loans; `B-B` loan; `C-A` | `C-A` sees all loans; `B-A` sees own history only; `B-A` reading `B-B` returned loan → `403` |
| **TEST-F08-06** | AC-F08-06 | UI/E2E | Desktop/mobile browsers (`C-A`, `B-A`) | Search/filter/sort updates catalog; Custodian creates/edits item; standardized tables & `BackButton` verified |

---

## 6. Definition of Done & Revision History
- Satisfies `AC-F08-01`..`06`, TDD RED→GREEN logs (`new_total < held`), peer review, and full regression.
- **Rev 1 (2026-11-23):** Initial Sprint 2 contract.
- **Rev 2 (2026-11-28):** Marked implemented & verified (`Slices #102` `c0a13ad`, `#104` `6a5f5ff`, `#113` `22b1ad7` pagination/table ergonomics, `#115` `d4b1142` `120/60/1,000` char field bounds & overflow wrap → `main` `5f82a8e`).
