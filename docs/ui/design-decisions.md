# PEW-DIY UI Design Decisions — UI-01

> **Issue:** [#30 — UI-01](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/30) · **Companion of:** [ui-spec.md](ui-spec.md) · [wireframes.md](wireframes.md) · [mockups.html](mockups.html)
> **Status vocabulary:** **Confirmed** (team decision / approved requirement) · **Proposed** (needs team confirmation) · **Gap** (no requirement backs it)

---

## 1. Layout Decisions

| # | Decision | Rationale | Status |
|---|---|---|---|
| L-1 | **Login = centered single card** | Single-purpose screen with one action; centered card is the academic/minimal convention and needs no explanation | Proposed (follows ARCH §8) |
| L-2 | **Catalog = AppShell (top nav) + data table on desktop** | Catalog's core task is comparing quantities/availability across items — a table serves data comparison better than cards on wide screens (academic data clarity) | Proposed |
| L-3 | **Catalog = ItemCard list on mobile** | Tables overflow horizontally on narrow viewports; cards stack without overflow (ARCH §10 responsive behavior) | Proposed |
| L-4 | **Item Detail = two-zone card (info + action panel)** | Keeps the main action visible without scrolling past long descriptions; sticky action panel on desktop | Proposed |
| L-5 | **Content max-width 1200px centered** | Readable line lengths; consistent with Minimal & Clean | Proposed (ARCH §10) |

## 2. Component Decisions

| # | Decision | Rationale | Status |
|---|---|---|---|
| C-1 | **Custom components only** (Button, Input/Label/FieldError, Card, Table, Badge, Alert, EmptyState, Loading, Nav/AppShell, AccountMenu, ItemCard, DetailList) | Confirmed team decision; small, purpose-built set — no heavy UI kit; abstraction stops where reuse stops (per task §5.3) | **Confirmed** (team) + naming **Proposed** |
| C-2 | **Badge for availability = text + color** | Accessibility: never color alone; maps to API `availability` field directly | Proposed |
| C-3 | **Password visibility toggle on Login** | Common usability affordance; security-neutral if password is never stored/rendered elsewhere (f-01: no password in browser storage) | **Proposed** — UX addition with no requirement backing it; team may drop it |
| C-4 | **Whole row/card is the detail link** (not a per-row button) | Fewer targets, cleaner table; accessible name = "View {item name}" | Proposed |
| C-5 | **AccountMenu shows username + role** | Role-aware navigation is Confirmed behavior (f-01 §2.3); showing the role makes the current scope visible to the user | Proposed (data comes from `/api/auth/me`) |

## 3. Navigation Decisions

| # | Decision | Rationale | Status |
|---|---|---|---|
| N-1 | **Top nav on authenticated pages; Login standalone** | 3 screens now; sidebar is overkill for 2 role menu sets (Minimal) | Proposed |
| N-2 | **Role-aware links:** Borrower = Catalog/My Requests/My Loans · Custodian = Catalog/Submitted Requests | Matches f-01 §2.3 ("navigation uses current-user's server-returned role") and SDS §5 | **Confirmed** (contract behavior) |
| N-3 | **No dead links** — links appear only when the feature exists | Later-sprint screens (My Loans history, return…) must not render before their features land | Proposed (consistency rule) |
| N-4 | **Back to catalog link on Item Detail** | Direct URL navigation must work (SPA fallback, ARCH §12.1); explicit back link keeps the flow obvious | Proposed |

## 4. Color and Typography

| # | Decision | Rationale | Status |
|---|---|---|---|
| V-1 | **Primary = Classic Navy `#313B7B`** for actions, links, headings accent, nav | **Confirmed** team decision; academic/university character | **Confirmed** |
| V-2 | **Background = Pure White `#FFFFFF`** | **Confirmed** team decision; clean reading surface | **Confirmed** |
| V-3 | Semantic colors (success/danger/warning) reserved for status only | Status readability (availability, errors) without breaking the navy/white identity | Proposed (ARCH §8.1) |
| V-4 | **Typography: Inter + system fallback**; optional serif headings (academic accent) | Minimal + legible for data tables; serif option leans "University" | **Proposed — team to choose** (OQ-UI-1) |
| V-5 | Type scale 12/14/16/20/24/32 px | 6 steps cover all three screens; no ad-hoc sizes | Proposed (ARCH §8.2) |

## 5. Responsive Strategy

- **Breakpoints (not random — reuse ARCH §10):** Mobile < 768px · Tablet ≥ 768px (`md`) · Desktop ≥ 1024px (`lg`).
- **Rationale:** Tailwind default `md`/`lg` values; 768px is the tablet-portrait boundary and 1024px the desktop boundary — standard, documented, and already in the merged Architecture Proposal. No custom breakpoints introduced.
- **Adaptation rules:** nav collapses to hamburger on mobile; table → card list on mobile; table column reduction on tablet; content max-width 1200px on desktop; touch targets ≥ 44px on mobile (ui-spec.md per page).

## 6. Reusable Components Strategy

- Reuse by **purpose match**, not by visual similarity: a component appears in ≥2 pages or ≥2 contexts before it is generalized (AccountMenu, Badge, FieldError qualify; LoginForm does not).
- Page-specific composition (LoginForm, CatalogList, RequestPanel) stays local to its page module — no premature abstraction.
- All components consume tokens only (§8 of ARCH) — theming comes from the token set, not per-component colors.

## 7. Constraints and Open Questions (need team decision)

| # | Item | Why open | Proposal |
|---|---|---|---|
| OQ-UI-1 | Typography: Inter-only vs Inter + serif headings | Not in the confirmed decisions | Inter-only (most minimal) |
| OQ-UI-2 | Item Detail quantity input bounds | SRS **OQ-02** (multi-unit loans/limits) unresolved — f-04 contract explicitly defers to it | Render min=1 now; finalize bounds with OQ-02 |
| OQ-UI-3 | Item images | **Gap** — FR-06 has no image field; inventing one would create a requirement | Keep out until SRS change approved |
| OQ-UI-4 | Catalog sorting | **Gap** — no FR supports sorting | Out of scope |
| OQ-UI-5 | "Checkout Action" wording on Item Detail | Task brief says "Checkout Action"; approved SRS/contracts define the Borrower action as "Request to borrow" (FR-11) with custodian checkout (FR-14) on a different screen | Spec follows approved contracts; team to confirm label wording |

## 8. Scope Note

This document records design decisions for the **3 screens of UI-01 only** (Login, Catalog, Item Detail). Later screens (My Requests, My Loans, Submitted Requests/Checkout queue, Return, Reports) belong to their feature issues (F-04..F-10) and will extend this spec when implemented — their navigation entries appear only then (N-3).
