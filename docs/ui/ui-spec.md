# PEW-DIY UI Specification — Login · Catalog · Item Detail

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Issue:** [#30 — UI-01](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/30) · **Status:** Proposed — pending independent teammate review
> **Type:** Documentation & Design Specification only — no application code, no dependencies, no migration
> **Design baseline:** [Frontend Architecture Change Proposal](../architecture/frontend-change-proposal.md) (§7 Tailwind v4, §8 tokens, §9 Lucide, §10 breakpoints, §11 Playwright) — merged (PR #29)
> **Behavior sources:** [SRS](../srs.md) rev 2 · [SDS](../system-sds.md) §5 · contracts `f-01`–`f-05` (`../sprints/sprint-1/`)
> **Companion documents:** [wireframes.md](wireframes.md) · [mockups.html](mockups.html) · [design-decisions.md](design-decisions.md) · [traceability.md](traceability.md)
> **Status vocabulary:** **Confirmed** (team decision / approved requirement) · **Proposed** (needs team confirmation) · **Gap** (no requirement backs it — recorded, not invented)

---

## 0. Shared Visual and Interaction Rules (all pages)

### 0.1 Design Tokens (source of truth = Architecture Proposal §8)

| Use | Token | Value | Status |
|---|---|---|---|
| Primary actions, links, headings accent, nav | `color-primary` | `#313B7B` Classic Navy | **Confirmed** |
| Page background, cards | `color-background` | `#FFFFFF` Pure White | **Confirmed** |
| Body text | `color-text` | `#1F2430` | Proposed (ARCH §8.1) |
| Secondary text | `color-text-muted` | `#5B6270` | Proposed |
| Borders | `color-border` | `#D9DCE3` | Proposed |
| Semantic success/warning/danger | `color-success/warning/danger` | `#2E7D32` / `#B26A00` / `#B3261E` | Proposed |
| Typography | `font-sans` = Inter (+ system fallback); optional serif headings — see Open Questions | 12/14/16/20/24/32 scale | Proposed (ARCH §8.2) |
| Spacing | 4px grid (`space-1`…`space-16`) | — | Proposed |
| Radii | 6px controls / 8px cards | — | Proposed |

All component styles reference these tokens; **no hard-coded colors or off-grid spacing** (design-system rule).

### 0.2 Shared component vocabulary (Custom Components — Confirmed decision)

Button · Input/Label/FieldError · Card · Table · Badge · Alert · EmptyState · Loading · Nav/AppShell · AccountMenu · ItemCard (mobile list) · DetailList. Details in §5.3 per page; reuse across pages is mandatory where the purpose matches — no new abstraction for a single use.

### 0.3 Shared UI states (from contracts — Confirmed behavior)

| State | When | Behavior (contract source) |
|---|---|---|
| Loading | Request in flight | Indicate loading; **never render an unreceived quantity as zero** (f-02 §3) |
| Empty | Successful empty result | Dedicated empty message; **not** a generic server error (f-02 §3) |
| Error / safe server failure | 500/503 etc. | Generic retry message + requestId; never SQL/stack/connections/private data (f-02 §3, shared-conventions) |
| Validation | Bad input | Field-level messages; preserve safe input (username), never password (f-01 §2.3) |
| 401 Unauthorized | Missing/expired/revoked credential | Clear stale private state → return to login (f-01 §2.3, f-02 §3) |
| 403 Forbidden | Wrong role / cross-owner | Safe denial without target data |
| Conflict (409) | Availability changed under the user | Explain + re-fetch state (SDS §5) |
| Unavailable | Item availability = 0 | Show clearly; request action disabled (f-02 §3/§4) |

---

## 1. Page 1 — Login

**Requirements:** FR-01–FR-04, NFR-01/02 · **Contract:** `f-01` §2.3 UI states, §3 API · **AC:** AC-F01-01..04, AC-F01-11

### 1.1 Layout and Structure

Centered single-column layout on `color-background` (Pure White):

```text
┌────────────────────────────────────────────┐
│  [Logo] PEW-DIY                             │
│  D.I.Y. Room Equipment Borrowing System     │
│  ┌──────────────────────────────────────┐   │
│  │ Sign in                              │   │
│  │ Username                             │   │
│  │ Password            [eye icon]       │   │
│  │ [        Sign in        ]            │   │
│  └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

Component hierarchy: `AppShell(login variant)` → `Logo/AppIdentity` → `Card` → `LoginForm` → (`Field:Username`, `Field:Password` + `PasswordToggle`, `Button:primary`)

### 1.2 Page Elements

| Element | Spec |
|---|---|
| **Logo / App Identity** | Lucide `cpu` icon + wordmark "PEW-DIY"; subtitle "D.I.Y. Room Equipment Borrowing System" (`color-text-muted`) — academic/university identity, minimal |
| **Login form** | One `Card` (max-width 400px, centered) titled "Sign in" |
| **Input: Username** | Label "Username" (always visible); text input; autocomplete="username"; required |
| **Input: Password** | Label "Password"; type=password; autocomplete="current-password"; **visibility toggle** (Lucide `eye`/`eye-off`) — **Proposed**: purely client-side show/hide; never affects storage/logging (consistent with f-01: no password in browser storage) |
| **Primary action** | `Button` variant=primary, label "Sign in", full card width |
| **Secondary action** | **None** — registration is excluded (SRS §3.2); no "forgot password" (excluded) |

### 1.3 Interaction and UI States

| State | Trigger | UI behavior |
|---|---|---|
| Default | Page load | All fields empty; button enabled |
| Hover/Focus | Pointer/keyboard | Button hover: `color-primary-hover`; inputs show visible focus ring (accessibility) |
| Validation | Empty username/password on submit | Inline `FieldError` under each empty field ("Username is required."); no network call |
| **Loading (pending)** | Submit in flight | Button shows loading + **disabled** (prevents duplicate submits — f-01 §2.3); inputs disabled |
| **Authentication error** | 401 `INVALID_CREDENTIALS` | One **generic** `Alert` (danger): "Invalid credentials." — identical for unknown user and wrong password (FR-01/AC-F01-02); **preserve username, clear password** |
| Server error | 500/503 | Generic `Alert`: "Something went wrong. Please try again." + requestId (small muted text) |
| Success | 200 | Navigate → `/catalog` (both roles) |
| 401 on later calls | Session expired/revoked | Clear stale identity/private state → Login with `Alert` (info): "Your session has expired. Please sign in again." |

**Invalid input / failed authentication summary:** field-level errors for empty/malformed input (no API call); API-level failures show the single generic message; the form never reveals whether a username exists; password never re-rendered.

### 1.4 Responsive

| Viewport | Layout |
|---|---|
| Mobile (<768px) | Card full-width with 16px margins; inputs ≥44px height (touch target) |
| Tablet (≥768px) | Card max-width 400px centered |
| Desktop (≥1024px) | Card centered vertically and horizontally; no side imagery (minimal) |

### 1.5 Accessibility

Semantic `<form>` + `<label for>`; error messages linked via `aria-describedby`; failure `Alert` uses `role="alert"`; visibility toggle has accessible name ("Show password"/"Hide password"); keyboard: Tab order username → password → toggle → submit; Enter submits; contrast: navy on white ≥ 4.5:1 for text.

---

## 2. Page 2 — Catalog

**Requirements:** FR-06, FR-07 (Sprint 1) · **Contract:** `f-02` §3/§4, `f-03` availability · **AC:** AC-F02-01..08, AC-F02-06

### 2.1 Layout and Structure

AppShell with top navigation + page content:

```text
┌─────────────────────────────────────────────────────────────┐
│ [cpu] PEW-DIY   Catalog   My Requests   My Loans   [B-A ▾] │ ← Nav (Borrower)
├─────────────────────────────────────────────────────────────┤
│ Equipment Catalog                       [status summary]    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Table (desktop) / ItemCard list (mobile)                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Component hierarchy: `AppShell` → `Nav` (logo, role-aware links, `AccountMenu`) → `PageHeader` → `CatalogList` (`Table` desktop / `ItemCard`×N mobile) → `Badge` per row

### 2.2 Page Elements

| Element | Spec |
|---|---|
| **Application navigation** | `Nav`: Logo/wordmark (link → catalog), links per role — Borrower: Catalog, My Requests, My Loans; Custodian: Catalog, Submitted Requests (checkout queue). Links for later-sprint screens appear **only when their features land** (no dead links) |
| **User info / Account menu** | `AccountMenu` (right): current username + role label; menu contains "Sign out" (logout). On mobile: avatar-initials button + dropdown |
| **Catalog header** | Page title "Equipment Catalog"; optional status summary chip (e.g., "3 items · 2 available") — **Proposed** |
| **Search** | **Sprint 2 (FR-10, F-08)** — not rendered in Sprint 1 (contract f-02: "no search controls added"). When F-08 lands: search input in header row (name/category) |
| **Filtering / Sorting** | Filtering = FR-10 (Sprint 2, same treatment). **Sorting = Gap** — no FR supports it (see traceability.md) |
| **Item list** | Desktop ≥1024px: `Table` (dense data compare). Tablet: Table with reduced columns. Mobile: `ItemCard` list (stacked rows). *Reason:* quantity/availability comparison is the core catalog task (academic data clarity) — table wins on desktop; cards prevent horizontal overflow on mobile (ARCH §10) |
| **Availability status** | `Badge`: AVAILABLE → `color-success` text on tinted bg; UNAVAILABLE → `color-danger`. Always **text + color** (never color alone) |
| **Navigation to Item Detail** | Row/card click (whole row is the target) → `/items/:id`; keyboard: row is focusable link |

### 2.3 Interaction and UI States (contract f-02 §3)

| State | Behavior |
|---|---|
| Loading | Skeleton rows or `Loading` spinner in list area; quantities not rendered as 0 |
| Loaded | Rows show `name`, `description` (truncated 1 line), `category`, `quantity_total`, `quantity_available`, `availability` badge |
| Empty | `EmptyState`: "The catalog has no items yet." (distinct from error) |
| 401 | Clear stale state → Login (shared F-01 behavior) |
| Error (503/500) | `Alert` generic retry + requestId; never false-empty |
| Row unavailable | Row remains visible; badge shows UNAVAILABLE; detail navigation still allowed (read-only) |

### 2.4 Responsive

| Viewport | Navigation | List | Columns shown |
|---|---|---|---|
| Mobile <768 | Hamburger → slide-down menu; account = icon button | `ItemCard` stack (name, category, badge, available/total) | key fields only |
| Tablet ≥768 | Links visible, account menu right | `Table` compact | name, category, available, badge |
| Desktop ≥1024 | Full nav | `Table` full + content max-width 1200px centered | name, description, category, total, available, badge |

Overflow: long names wrap on mobile cards; table cells truncate with title tooltip on desktop.

### 2.5 Accessibility

`<nav>` + `aria-label`; table uses `<th>` scope; row links have accessible names ("View {item name}"); badges expose text; keyboard navigable rows; focus order: nav → content → rows.

---

## 3. Page 3 — Item Detail

**Requirements:** FR-06/FR-07 (read), FR-11 (request action) · **Contract:** `f-02` §2–§4, `f-04` §UI · **AC:** AC-F02-01/02/06, AC-F04-01..05

### 3.1 Layout and Structure

```text
┌─────────────────────────────────────────────────────────────┐
│ [cpu] PEW-DIY   Catalog   My Requests   My Loans   [B-A ▾] │
├─────────────────────────────────────────────────────────────┤
│ ← Back to catalog                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Item name                              [AVAILABLE badge] │ │
│ │ Description                                                 │
│ │ Category · Total · Available (DetailList)                 │ │
│ │ [ Request to borrow — quantity [1] — [Submit] ]  (B)      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Component hierarchy: `AppShell` → `Nav` → `BackLink` → `Card`(`DetailList` + `Badge`) → `RequestForm` (Borrower, available items only)

### 3.2 Page Elements

| Element | Spec | Requirement basis |
|---|---|---|
| **Item information** | `DetailList`: Name (heading), Description (body), Category, Quantity Information (Total / Available with label "of N total") | FR-06/07, API object fields |
| **Item image** | **Gap — not specified.** SRS FR-06 fields contain no image; **no image is designed and no requirement is invented for it** (recorded in traceability.md §4). If the team later approves catalog images, add via SRS change first | — |
| **Description** | Full text, wraps; empty string shows muted "No description" (description may be empty per contract) | FR-06 |
| **Availability** | `Badge` same as catalog (AVAILABLE/UNAVAILABLE) + explicit available quantity | FR-07 |
| **Quantity Information** | `quantity_available` (bold) "available of {quantity_total} total" — Quantity Tracking display (SRS A-01) | FR-06/07 |
| **Checkout Action** | **Terminology note:** the approved SRS/contracts define the item-detail action as **"Request to borrow" (FR-11/F-04)** within the **Direct Checkout** flow (SRS A-02: no approval stage — request proceeds directly to custodian checkout). There is no separate "checkout" button for Borrowers on this page (custodian checkout lives on the Submitted Requests screen, F-05). UI label: **"Request to borrow"** (button, primary) — visible only to Borrower on AVAILABLE items (f-02 §2: "Borrower sees navigation to the F-04 request form when the selected item is available. Custodian sees the same catalog data without a Borrower request action") | FR-11, A-02, f-02/§f-04 |
| **Quantity input** | `Input` number, default 1, min 1. **Conditional (Proposed, gated by OQ-02):** max bound and multi-unit eligibility await the OQ-02 decision (f-04 contract: "exact permitted maximum, multi-unit eligibility... must be settled by OQ-02"). Until decided: render the input with min=1 and a note that limits are pending team policy | FR-11, OQ-02 |
| **Validation** | Inline `FieldError`: quantity must be a positive integer; fractional/negative/zero rejected client-side (server enforces too) | f-04 |
| **Unavailable state** | Badge UNAVAILABLE + no request form (action hidden/disabled with explanation "This item is currently unavailable."); server remains authoritative (hidden ≠ authorization) | f-02 §2 |
| **Checkout error (request failure)** | `Alert` per error code: 409 INSUFFICIENT_AVAILABILITY → "This item is no longer available." + re-fetch stock; 401 → login; 500/503 → generic retry + requestId; preserve safe input | f-04 §API, shared-conventions |
| **Loading** | Page-level loading while detail loads; submit button loading+disabled while request in flight | f-02 §3 |
| **Success / Confirmation** | After 201: **navigate to My Requests** (f-04 §2: "UI opens My Requests"; AC-F04-08: submit → own-request display → reload) and display the confirmation there (e.g., success `Alert`: "Request submitted." at top of My Requests list). Per the approved contract this is a redirect, not stay-on-page + manual link. The My Requests screen itself belongs to F-04 UI (outside UI-01's 3 pages) — this spec defines the redirect behavior and where the confirmation appears. **No approval step shown anywhere** (Direct Checkout). If the team prefers stay-on-page + link instead, that would be a contract change and must be reviewed as a f-04 revision (recorded in design-decisions.md OQ-UI-6) | f-04 §2, AC-F04-08, SRS A-02 |

### 3.3 Interaction and UI States (summary)

Default → validate on submit → loading/pending → **success (redirect to My Requests; confirmation displayed there — f-04 §2/AC-F04-08)** or error (safe message per code + preserved input) · 404 missing item → `EmptyState`-style "Item not found" + "Back to catalog" · 401 → Login. Custodian view: same data, **no request form**.

### 3.4 Responsive

| Viewport | Layout |
|---|---|
| Mobile <768 | Single column: badge under title; DetailList stacked; request form full-width bottom; back link sticky-top |
| Tablet ≥768 | Card max-width 720px; form inline row (quantity + submit) |
| Desktop ≥1024 | Two-zone card: info left, request panel right (sticky); max-width 1200px |

### 3.5 Accessibility

Heading hierarchy (h1 = item name); `DetailList` uses `<dl>/<dt>/<dd>`; quantity input has label + `aria-describedby` for errors; badge text readable; back link has descriptive name; success alert `role="status"`, error alert `role="alert"`.

---

## 4. Cross-Page Consistency Rules

- All pages: `Nav` visible on authenticated pages only; Login standalone.
- Buttons/inputs follow ARCH §8.4 tokens everywhere; one visual language (Academic/Minimal).
- Error language: reuse the shared safe-error wording (never raw server text).
- Logout behavior (shared): success → Login; failure → safe message + retry (f-01 §2.3).
- No approval step, no individual-copy/serial tracking anywhere (team decisions: Direct Checkout + Quantity Tracking).

## 5. Open Questions / Items Needing Team Confirmation

| # | Item | Why | Proposal |
|---|---|---|---|
| OQ-UI-1 | Typography: Inter-only vs Inter + serif headings | ARCH §8.2 left it open | Inter-only (most minimal) — team picks |
| OQ-UI-2 | Quantity input bounds on Item Detail | SRS **OQ-02** (multi-unit loans + limits) unresolved | Render min=1 now; finalize bounds when OQ-02 decided (before F-04 contract baseline) |
| OQ-UI-3 | Item images | No FR supports images (Gap) | Keep out; requires SRS change if wanted |
| OQ-UI-4 | Sorting on Catalog | No FR supports sorting (Gap) | Keep out of scope |
| OQ-UI-5 | "Checkout Action" terminology on Item Detail | Task brief says "Checkout Action"; approved contracts define "Request to borrow" (FR-11) + custodian checkout (FR-14) | Spec follows approved SRS/contracts; **team confirm** the label wording |
