# PEW-DIY Wireframes — Login · Catalog · Item Detail

> **Issue:** [#30 — UI-01](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/30) · **Companion of:** [ui-spec.md](ui-spec.md)
> **Reading guide:** wireframes show **layout, component placement, content hierarchy, navigation, and main actions** — not final colors. Visual design lives in [mockups.html](mockups.html). Annotations map to ui-spec.md sections.
> **Breakpoints (Confirmed via ARCH §10):** Mobile < 768px · Tablet ≥ 768px · Desktop ≥ 1024px

---

## 1. Login

### 1.1 Desktop (≥1024px) — ui-spec.md §1.1

```text
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                                                                      │
│                        ┌────────────────────────┐                    │
│                        │  [cpu] PEW-DIY         │  ← Logo + wordmark │
│                        │  D.I.Y. Room Equipment │  ← subtitle        │
│                        │  Borrowing System      │                    │
│                        │                        │                    │
│                        │  Sign in               │  ← card title      │
│                        │  ┌──────────────────┐  │                    │
│                        │  │ Username         │  │                    │
│                        │  └──────────────────┘  │                    │
│                        │  ┌──────────────────┐  │                    │
│                        │  │ Password    [eye]│  │  ← visibility btn  │
│                        │  └──────────────────┘  │                    │
│                        │  ┌──────────────────┐  │                    │
│                        │  │     Sign in      │  │  ← primary btn     │
│                        │  └──────────────────┘  │                    │
│                        └────────────────────────┘                    │
│                      Card centered (max-width 400px)                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Caption:** Centered single-column card on white; vertical+horizontal centering; no side imagery (Minimal). Validation errors render inline under fields; auth errors render an Alert above the fields.

### 1.2 Tablet (≥768px)

```text
┌────────────────────────────────────────────────┐
│                                                │
│       ┌────────────────────────┐               │
│       │  [cpu] PEW-DIY         │               │
│       │  D.I.Y. Room Equipment │               │
│       │  Borrowing System      │               │
│       │  Sign in               │               │
│       │  ┌──────────────────┐  │               │
│       │  │ Username         │  │               │
│       │  └──────────────────┘  │               │
│       │  ┌──────────────────┐  │               │
│       │  │ Password    [eye]│  │               │
│       │  └──────────────────┘  │               │
│       │  ┌──────────────────┐  │               │
│       │  │     Sign in      │  │               │
│       │  └──────────────────┘  │               │
│       └────────────────────────┘               │
│       Card centered (max-width 400px)          │
└────────────────────────────────────────────────┘
```

**Caption:** Same card as desktop, horizontally centered; content area is narrower — no layout change (consistency).

### 1.3 Mobile (<768px)

```text
┌────────────────────────────┐
│                            │
│      ┌──────────────────┐  │
│      │ [cpu] PEW-DIY    │  │
│      │ D.I.Y. Room ...  │  │
│      │ Sign in          │  │
│      │ ┌──────────────┐ │  │
│      │ │ Username     │ │  │
│      │ └──────────────┘ │  │
│      │ ┌──────────────┐ │  │
│      │ │ Password[eye]│ │  │
│      │ └──────────────┘ │  │
│      │ ┌──────────────┐ │  │
│      │ │   Sign in    │ │  │
│      │ └──────────────┘ │  │
│      └──────────────────┘  │
│   Card full-width 16px     │
│   margins; inputs ≥44px    │
└────────────────────────────┘
```

**Caption:** Card spans width minus 16px margins; inputs/buttons ≥44px touch height; same content order.

---

## 2. Catalog

### 2.1 Desktop (≥1024px) — ui-spec.md §2.1

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [cpu] PEW-DIY   Catalog   My Requests   My Loans        [B-A ▾]     │ ← Nav (Borrower)
├──────────────────────────────────────────────────────────────────────┤
│ Equipment Catalog                                    3 items · 2 avail│ ← header + summary
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ Name            │ Description        │ Category │ Total │ Avail │   │
│ ├─────────────────┼────────────────────┼──────────┼───────┼───────┤   │
│ │ Arduino Uno...  │ Microcontroller... │ Boards   │   5   │ 3 [A] │   │ ← AVAILABLE badge
│ │ ESP32 DevKit    │ WiFi/BLE board     │ Boards   │   3   │ 3 [A] │   │
│ │ Soldering Iron  │ Adjustable temp    │ Tools    │   2   │ 0 [U] │   │ ← UNAVAILABLE badge
│ └────────────────────────────────────────────────────────────────┘   │
│  Click row → Item Detail (whole row is the target)                   │
│                          max-width 1200px centered                   │
└──────────────────────────────────────────────────────────────────────┘
```

**Caption:** Top nav with role-aware links + AccountMenu (username/role → Sign out). Table shows all catalog fields; availability = Badge (text + color). Rows are links.

### 2.2 Tablet (≥768px)

```text
┌──────────────────────────────────────────────────────────────┐
│ [cpu] PEW-DIY  Catalog  My Requests  My Loans    [B-A ▾]     │
├──────────────────────────────────────────────────────────────┤
│ Equipment Catalog                           3 items · 2 avail│
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Name           │ Category │ Avail │ Total │              │   │
│ ├────────────────┼──────────┼───────┼───────┤              │   │
│ │ Arduino Uno... │ Boards   │ 3 [A] │   5   │              │   │
│ │ ESP32 DevKit   │ Boards   │ 3 [A] │   3   │              │   │
│ │ Soldering Iron │ Tools    │ 0 [U] │   2   │              │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Caption:** Table with reduced columns (Description hidden — available in detail); nav links still visible.

### 2.3 Mobile (<768px)

```text
┌────────────────────────────┐
│ [cpu] PEW-DIY  [☰]  [B-A▾]│ ← nav collapses; account icon
├────────────────────────────┤
│ Equipment Catalog          │
│ 3 items · 2 available      │
│ ┌────────────────────────┐ │
│ │ Arduino Uno            │ │ ← ItemCard
│ │ Boards                 │ │
│ │ 3 of 5 available  [A]  │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ ESP32 DevKit           │ │
│ │ Boards                 │ │
│ │ 3 of 3 available  [A]  │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Soldering Iron         │ │
│ │ Tools                  │ │
│ │ 0 available       [U]  │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

**Caption:** Stacked ItemCards (name, category, availability summary, badge); no horizontal overflow; each card tappable → detail. Hamburger opens role links + Sign out.

---

## 3. Item Detail

### 3.1 Desktop (≥1024px) — ui-spec.md §3.1

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [cpu] PEW-DIY   Catalog   My Requests   My Loans        [B-A ▾]     │
├──────────────────────────────────────────────────────────────────────┤
│ ← Back to catalog                                                    │
│ ┌───────────────────────────────────────────┐ ┌────────────────────┐ │
│ │ Arduino Uno Microcontroller Board    [A]  │ │ Request to borrow  │ │ ← Borrower panel
│ │                                           │ │ Quantity [ 1 ]     │ │
│ │ Description                               │ │ ┌────────────────┐ │ │
│ │ Microcontroller board based on ATmega...  │ │ │    Submit      │ │ │
│ │                                           │ │ └────────────────┘ │ │
│ │ Category       Boards                     │ │ Limits pending     │ │ ← OQ-02 note
│ │ Total          5                          │ │ (team policy)      │ │
│ │ Available      3 of 5 total               │ │                    │ │
│ └───────────────────────────────────────────┘ └────────────────────┘ │
│                      max-width 1200px centered                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Caption:** Two-zone card — info left (DetailList), request panel right (sticky). Badge top-right of heading. After 201 the UI **navigates to My Requests** and shows the confirmation there (f-04 §2: "UI opens My Requests"; AC-F04-08: submit → own-request display → reload) — not a stay-on-page link.

### 3.2 Tablet (≥768px)

```text
┌──────────────────────────────────────────────────────────────┐
│ [cpu] PEW-DIY  Catalog  My Requests  My Loans    [B-A ▾]     │
├──────────────────────────────────────────────────────────────┤
│ ← Back to catalog                                            │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Arduino Uno Microcontroller Board                 [A]   │   │
│ │ Description...                                         │   │
│ │ Category: Boards · Total: 5 · Available: 3 of 5        │   │
│ │                                                        │   │
│ │ Quantity [ 1 ]  ┌──────────┐                            │   │
│ │                 │  Submit  │  (inline row)              │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Caption:** Single card; request form inline below info (max-width 720px).

### 3.3 Mobile (<768px)

```text
┌────────────────────────────┐
│ [cpu] PEW-DIY  [☰]  [B-A▾]│
├────────────────────────────┤
│ ← Back to catalog          │
│ Arduino Uno Microcontrol.. │
│ [AVAILABLE]                │
│ Description...             │
│ Category   Boards          │
│ Total      5               │
│ Available  3 of 5 total    │
│ ┌────────────────────────┐ │
│ │ Request to borrow      │ │
│ │ Quantity [ 1 ]         │ │
│ │ ┌────────────────────┐ │ │
│ │ │       Submit       │ │ │
│ │ └────────────────────┘ │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

**Caption:** Stacked single column; badge below title; request form full-width at bottom; back link at top (sticky).

### 3.4 Key State Wireframes (all viewports — ui-spec.md §3.3)

```text
UNAVAILABLE ITEM                 ITEM NOT FOUND (404)
┌───────────────────────┐        ┌───────────────────────┐
│ Soldering Iron   [U]  │        │ Item not found        │
│ ...                   │        │ The item you requested │
│ 0 of 2 available      │        │ could not be found.   │
│ (no request form —    │        │ [ Back to catalog ]   │
│  explanation shown)   │        └───────────────────────┘
└───────────────────────┘
SUCCESS (after request → My Requests)     ERROR (409 insufficient)
┌───────────────────────────────┐        ┌───────────────────────┐
│ [cpu] PEW-DIY  ...  [B-A ▾]  │        │ ⚠ This item is no      │
│ My Requests                  │        │ longer available.     │
│ ✓ Request submitted.         │        │ (re-fetch stock)      │
│ ┌─────────────────────────┐  │        └───────────────────────┘
│ │ Your requests (1)       │  │
│ │ Arduino Uno × 1 [SUBMIT]│  │
│ └─────────────────────────┘  │
└───────────────────────────────┘
```

**Caption:** On 201 the UI redirects to **My Requests** and the confirmation `Alert` (role="status") displays at the top of that screen (f-04 §2/AC-F04-08: submit → own-request display → reload). The My Requests screen belongs to F-04 UI (outside UI-01's 3 pages) — the state wireframe shows where the confirmation lands, not a full My Requests spec. Unavailable hides the form with explanation (server remains authoritative); errors use `role="alert"` with safe wording from shared-conventions — never raw server text.
