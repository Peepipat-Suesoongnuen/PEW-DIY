import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ItemDetailPage } from "../pages/ItemDetailPage";
import { SessionProvider } from "../lib/session";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/items/E-ONE"]}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ItemDetailPage (ui-spec §3, minus F-04 request panel)", () => {
  it("renders item information with badge and Quantity Tracking display", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "C-A", role: "CUSTODIAN" } } });
        }
        return jsonResponse(200, {
          data: {
            id: "E-ONE",
            name: "Arduino Uno",
            description: "Microcontroller board",
            category: "Electronics",
            quantity_total: 3,
            quantity_available: 2,
            availability: "AVAILABLE",
          },
        });
      }),
    );
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Arduino Uno" })).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("Microcontroller board")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/3 total/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to catalog" })).toBeInTheDocument();
    // Request panel belongs to #11 (F-04) — must not be rendered in UI-02.
    expect(screen.queryByText("Request to borrow")).not.toBeInTheDocument();
  });

  it("shows a missing-item state with a back link on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(404, { error: { code: "NOT_FOUND", message: "Resource not found.", requestId: "n/a" } });
      }),
    );
    renderDetail();

    expect(await screen.findByText("Item not found.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Back to catalog/i }).length).toBeGreaterThan(0);
  });

  it("renders an empty description as muted 'No description'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
        }
        return jsonResponse(200, {
          data: {
            id: "E-MANY",
            name: "Breadboard",
            description: "",
            category: "Electronics",
            quantity_total: 5,
            quantity_available: 5,
            availability: "AVAILABLE",
          },
        });
      }),
    );
    renderDetail();

    expect(await screen.findByText("No description")).toBeInTheDocument();
  });

  it("returns to Login on 401", async () => {
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
    renderDetail();

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });
});
