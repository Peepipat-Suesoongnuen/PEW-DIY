import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CatalogPage } from "../pages/CatalogPage";
import { ItemDetailPage } from "../pages/ItemDetailPage";
import { useItemRouteId } from "../lib/paths";
import { SessionProvider } from "../lib/session";
import type { Equipment } from "../lib/api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const items: Equipment[] = [
  {
    id: "E-ONE",
    name: "Arduino Uno",
    description: "Microcontroller board",
    category: "Electronics",
    quantity_total: 1,
    quantity_available: 1,
    availability: "AVAILABLE",
  },
  {
    id: "E-ZERO",
    name: "Oscilloscope",
    description: "Test instrument",
    category: "Instruments",
    quantity_total: 1,
    quantity_available: 0,
    availability: "UNAVAILABLE",
  },
];

function renderCatalog() {
  return render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/catalog" element={<CatalogPage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function DetailStub() {
  // Same route-boundary reader as the real ItemDetailPage (lib/paths.ts).
  const id = useItemRouteId();
  return <div>DETAIL_ID:{id}</div>;
}

describe("CatalogPage (ui-spec §2 / f-02 §3 states)", () => {
  it("loads and renders item fields with availability badges", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(200, { data: items });
      }),
    );
    renderCatalog();

    // Items render twice by design: mobile ItemCard list + tablet/desktop table
    // (ui-spec §2.4 responsive surfaces) — assert both surfaces.
    expect((await screen.findAllByText("Arduino Uno")).length).toBe(2);
    expect(screen.getAllByText("Oscilloscope")).toHaveLength(2);
    // Badges also render per responsive surface (2 per item).
    expect(screen.getAllByText("AVAILABLE")).toHaveLength(2);
    expect(screen.getAllByText("UNAVAILABLE")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "View Arduino Uno" })).toHaveLength(2);
  });

  it("renders a dedicated empty state for an empty catalog (not an error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(200, { data: [] });
      }),
    );
    renderCatalog();

    expect(await screen.findByText("The catalog has no items yet.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a generic retry message with requestId on server failure — never a false-empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", requestId: "req-42" } });
      }),
    );
    renderCatalog();

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("Request ID: req-42")).toBeInTheDocument();
    expect(screen.queryByText("The catalog has no items yet.")).not.toBeInTheDocument();
  });

  it("encodes opaque ids with URL-significant characters and round-trips them to the detail route (PR #34 P2-2)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/me")) {
        return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
      }
      return jsonResponse(200, {
        data: [
          {
            id: "fixture#opaque",
            name: "Hash fixture",
            description: "Test fixture",
            category: "Synthetic",
            quantity_total: 1,
            quantity_available: 1,
            availability: "AVAILABLE",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/catalog"]}>
        <SessionProvider>
          <Routes>
            <Route path="/login" element={<div>LOGIN_PAGE</div>} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/items/:id" element={<DetailStub />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );

    // Both responsive surfaces link to the ENCODED path.
    const links = await screen.findAllByRole("link", { name: "View Hash fixture" });
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/items/fixture%23opaque");
    }

    // Clicking round-trips: the router decodes the param back to the opaque id.
    await user.click(links[0]);
    expect(await screen.findByText("DETAIL_ID:fixture#opaque")).toBeInTheDocument();
  });

  it("keeps the distinct opaque ids `fixture/opaque` and `fixture%2Fopaque` separate across the full round-trip (PR #34 review round 2)", async () => {
    const slashItem = {
      id: "fixture/opaque",
      name: "Slash fixture",
      description: "First fixture",
      category: "Synthetic",
      quantity_total: 1,
      quantity_available: 1,
      availability: "AVAILABLE" as const,
    };
    const percentItem = {
      id: "fixture%2Fopaque",
      name: "Percent fixture",
      description: "Second fixture",
      category: "Synthetic",
      quantity_total: 2,
      quantity_available: 2,
      availability: "AVAILABLE" as const,
    };
    // Both ids exist at the same time and are only distinguishable by their
    // encoding: the API contract encodes each id once per request.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/me")) {
        return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
      }
      if (url === "/api/equipment") {
        return jsonResponse(200, { data: [slashItem, percentItem] });
      }
      if (url === "/api/equipment/fixture%252Fopaque") {
        return jsonResponse(200, { data: percentItem });
      }
      if (url === "/api/equipment/fixture%2Fopaque") {
        return jsonResponse(200, { data: slashItem });
      }
      return jsonResponse(404, { error: { code: "NOT_FOUND", message: "Resource not found.", requestId: "n/a" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/catalog"]}>
        <SessionProvider>
          <Routes>
            <Route path="/login" element={<div>LOGIN_PAGE</div>} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );

    // Links encode each id exactly once (distinct hrefs for distinct ids).
    const percentLinks = await screen.findAllByRole("link", { name: "View Percent fixture" });
    for (const link of percentLinks) {
      expect(link).toHaveAttribute("href", "/items/fixture%252Fopaque");
    }
    const slashLinks = await screen.findAllByRole("link", { name: "View Slash fixture" });
    for (const link of slashLinks) {
      expect(link).toHaveAttribute("href", "/items/fixture%2Fopaque");
    }

    // Open the second item (id contains the literal characters `%2F`) — the
    // detail must show ITS data, not the first item's (the reported bug).
    await user.click(percentLinks[0]);
    expect(await screen.findByRole("heading", { name: "Percent fixture" })).toBeInTheDocument();
    expect(screen.getByText("Second fixture")).toBeInTheDocument();
    expect(screen.queryByText("Slash fixture")).not.toBeInTheDocument();

    // Back and open the first item (id contains a literal slash).
    await user.click(screen.getByRole("link", { name: "Back to catalog" }));
    const slashLinksAgain = await screen.findAllByRole("link", { name: "View Slash fixture" });
    await user.click(slashLinksAgain[0]);
    expect(await screen.findByRole("heading", { name: "Slash fixture" })).toBeInTheDocument();
    expect(screen.getByText("First fixture")).toBeInTheDocument();
    expect(screen.queryByText("Percent fixture")).not.toBeInTheDocument();

    // Each detail request carried its own id, encoded exactly once.
    const equipmentCalls = fetchMock.mock.calls
      .map(([u]) => String(u))
      .filter((u) => u.startsWith("/api/equipment/"));
    expect(equipmentCalls.filter((u) => u === "/api/equipment/fixture%252Fopaque")).toHaveLength(1);
    expect(equipmentCalls.filter((u) => u === "/api/equipment/fixture%2Fopaque")).toHaveLength(1);
  });

  it("never renders unreceived quantities as zero while loading or after failure (TEST-F03-08)", async () => {
    // Delayed read first: the loading state must not fabricate a 0 stock level
    // (f-03 §3 "Loading/failed fetch is not zero stock").
    let release: (value: Response) => void = () => undefined;
    const gate = new Promise<Response>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return gate;
      }),
    );
    renderCatalog();

    expect(await screen.findByText("Loading catalog…")).toBeInTheDocument();
    expect(screen.queryByText(/available of/)).not.toBeInTheDocument();
    expect(screen.queryByText("UNAVAILABLE")).not.toBeInTheDocument();

    // Then a failed refresh: the error state shows no stock figure at all —
    // an old/absent quantity is never labelled as confirmed current (f-03 §3).
    release(jsonResponse(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", requestId: "req-8" } }));
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/available of/)).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("UNAVAILABLE")).not.toBeInTheDocument();
  });

  it("clears stale state and returns to Login on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } });
      }),
    );
    renderCatalog();

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("renders HTML-bearing item fields as literal text — no element creation or script execution (ARCH-01 P4 / C-3)", async () => {
    const xssItem: Equipment = {
      id: "E-XSS",
      name: "<img src=x onerror=alert(1)>",
      description: "<script>window.__pwned = true</script>",
      category: "<b>Sensors</b>",
      quantity_total: 2,
      quantity_available: 2,
      availability: "AVAILABLE",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(200, { data: [xssItem] });
      }),
    );
    const { container } = renderCatalog();

    expect((await screen.findAllByText("<img src=x onerror=alert(1)>")).length).toBe(2);
    expect(screen.getAllByText("<b>Sensors</b>").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("applies search, category, status & sort filters, preserves category options, and allows Custodian to add equipment (FR-09/FR-10)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/me")) {
        return jsonResponse(200, { data: { user: { id: "c1", username: "C-A", role: "CUSTODIAN" } } });
      }
      if (url === "/api/equipment" && init?.method === "POST") {
        return jsonResponse(201, {
          data: {
            id: "new-eq",
            name: "Servo Arm",
            description: "",
            category: "Robotics",
            quantity_total: 4,
            quantity_available: 4,
            availability: "AVAILABLE",
            image_url: "/images/analyzer.png",
            catalog_status: "ACTIVE",
          },
        });
      }
      if (url.includes("status=RETIRED")) {
        return jsonResponse(200, { data: [] });
      }
      if (url.includes("category=Electronics")) {
        return jsonResponse(200, { data: [items[0]] });
      }
      return jsonResponse(200, { data: items });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderCatalog();

    await screen.findAllByText("Arduino Uno");
    expect(fetchMock.mock.calls.some(([u]) => String(u) === "/api/equipment?status=ACTIVE")).toBe(true);
    await user.selectOptions(screen.getByLabelText("Sort by"), "available_desc");
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("sort=available_desc"))).toBe(true);

    // Selecting category=Electronics still keeps Instruments in the Category dropdown
    await user.selectOptions(screen.getByLabelText("Category"), "Electronics");
    expect(screen.getByRole("option", { name: "Instruments" })).toBeInTheDocument();

    // Filtering status=RETIRED with 0 matches shows filter empty state + Clear filters button
    await user.selectOptions(screen.getByLabelText(/Catalog status/), "RETIRED");
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("status=RETIRED"))).toBe(true);
    expect(await screen.findByText("No equipment matched your filters.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Catalog status/), "ALL");
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("status=ALL"))).toBe(true);
    await user.selectOptions(screen.getByLabelText(/Catalog status/), "RETIRED");
    expect(await screen.findByText("No equipment matched your filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findAllByText("Arduino Uno");

    // Custodian creates equipment with relative image path and empty description
    await user.click(screen.getByRole("button", { name: "Add equipment" }));
    await user.type(screen.getByLabelText("Equipment name"), "Draft Item");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Add equipment" }));
    expect(screen.getByLabelText("Equipment name")).toHaveValue("");

    await user.selectOptions(screen.getByLabelText("Category"), "Electronics");
    await user.type(screen.getByLabelText("Equipment name"), "Servo Arm");
    await user.type(screen.getByLabelText("Equipment category"), "Robotics");
    await user.type(screen.getByLabelText(/Preview image URL/), "/images/analyzer.png");
    await user.click(screen.getByRole("button", { name: "Save equipment" }));

    expect(fetchMock.mock.calls.some(([u, i]) => String(u) === "/api/equipment" && i?.method === "POST")).toBe(true);
    expect(screen.getByRole("option", { name: "Robotics" })).toBeInTheDocument();
  });

  it("paginates CatalogPage items (default 10) and resets to page 1 when filters change", async () => {
    const manyItems: Equipment[] = Array.from({ length: 12 }, (_, idx) => ({
      id: `eq-pg-${idx + 1}`,
      name: `Catalog Gear ${idx + 1}`,
      description: "Test gear",
      category: "Tools",
      quantity_total: 2,
      quantity_available: 2,
      availability: "AVAILABLE",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(200, { data: manyItems });
      }),
    );
    const user = userEvent.setup();
    renderCatalog();

    expect(await screen.findByText("Showing 1–10 of 12")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Gear 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 11–12 of 12")).toBeInTheDocument();
    expect(screen.getAllByText("Catalog Gear 11").length).toBeGreaterThanOrEqual(1);

    await user.selectOptions(screen.getByLabelText("Sort by"), "name_desc");
    expect(await screen.findByText("Showing 1–10 of 12")).toBeInTheDocument();
  });

  it("enforces maxLength (120/60/1000) and live character counters on Custodian Add equipment form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "c1", username: "C-A", role: "CUSTODIAN" } } });
        }
        return jsonResponse(200, { data: items });
      }),
    );
    const user = userEvent.setup();
    renderCatalog();

    await user.click(await screen.findByRole("button", { name: "Add equipment" }));
    const nameInput = screen.getByLabelText("Equipment name");
    const categoryInput = screen.getByLabelText("Equipment category");
    const descInput = screen.getByLabelText("Description");

    expect(nameInput).toHaveAttribute("maxLength", "120");
    expect(categoryInput).toHaveAttribute("maxLength", "60");
    expect(descInput).toHaveAttribute("maxLength", "1000");

    expect(screen.getByText("0 / 120")).toBeInTheDocument();
    expect(screen.getByText("0 / 60")).toBeInTheDocument();
    expect(screen.getByText("0 / 1,000")).toBeInTheDocument();

    await user.type(nameInput, "Fluke");
    expect(screen.getByText("5 / 120")).toBeInTheDocument();
  });
});
