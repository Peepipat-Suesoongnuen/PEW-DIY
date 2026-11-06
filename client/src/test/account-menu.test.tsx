import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AccountMenu } from "../components/AccountMenu";
import { SessionProvider } from "../lib/session";
import type { User } from "../lib/api";

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const user: User = { id: "u1", username: "B-A", role: "BORROWER" };

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/catalog" element={<AccountMenu user={user} />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AccountMenu (ui-spec §2.2 + shared logout behavior §4)", () => {
  it("shows current username and role", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { data: { user } })),
    );
    renderMenu();
    const trigger = screen.getByRole("button", { name: /B-A/ });
    expect(trigger).toHaveTextContent("Borrower");
  });

  it("signs out and returns to Login on confirmed success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user } });
        }
        expect(url).toContain("/auth/logout");
        expect(init?.method).toBe("POST");
        return new Response(null, { status: 204 });
      }),
    );
    const userInteractions = userEvent.setup();
    renderMenu();

    await userInteractions.click(screen.getByRole("button", { name: /B-A/ }));
    await userInteractions.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("keeps the session page with a safe retry message on logout failure — no redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user } });
        }
        return jsonResponse(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", requestId: "req-5" } });
      }),
    );
    const userInteractions = userEvent.setup();
    renderMenu();

    await userInteractions.click(screen.getByRole("button", { name: /B-A/ }));
    await userInteractions.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out. Please try again.");
    expect(screen.queryByText("LOGIN_PAGE")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeEnabled());
  });

  it("clears stale identity and returns to Login on a 401 logout (session already invalid)", async () => {
    // PR #34 review P2-1 (f-01 §2.3): 401 CONFIRMS the server credential is
    // gone — apply the shared 401 behavior instead of offering a retry.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(200, { data: { user } });
        }
        return jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } });
      }),
    );
    const userInteractions = userEvent.setup();
    renderMenu();

    await userInteractions.click(screen.getByRole("button", { name: /B-A/ }));
    await userInteractions.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    // No retry offered for a confirmed-dead session.
    expect(screen.queryByText("Could not sign out. Please try again.")).not.toBeInTheDocument();
  });
});
