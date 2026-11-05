import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { CatalogPage } from "../pages/CatalogPage";
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
  const { id } = useParams<{ id: string }>();
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
});
