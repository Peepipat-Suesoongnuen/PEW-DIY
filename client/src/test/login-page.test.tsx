import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { SessionProvider } from "../lib/session";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/catalog" element={<div>CATALOG_PAGE</div>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage (ui-spec §1)", () => {
  it("validates empty fields inline without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Username is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    // Only the initial session probe hit the API — no login attempt.
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/login"))).toHaveLength(0);
  });

  it("shows one generic message for invalid credentials, preserving username and clearing password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } });
        }
        return jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials.", requestId: "req-9" } });
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText("Username"), "B-A");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid credentials.")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveValue("B-A");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("navigates to the catalog after a successful sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } });
        }
        expect(url).toContain("/auth/login");
        expect(init?.method).toBe("POST");
        return jsonResponse(200, { data: { user: { id: "u1", username: "B-A", role: "BORROWER" } } });
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText("Username"), "B-A");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("CATALOG_PAGE")).toBeInTheDocument();
  });

  it("shows a generic safe message with requestId on server failure (503) and clears the password while keeping the username", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } });
        }
        return jsonResponse(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", requestId: "req-77" } });
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText("Username"), "B-A");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Safe wording from the spec — never the raw server message.
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("Request ID: req-77")).toBeInTheDocument();
    // PR #34 review P2-3 (f-01 §2.3): preserve ONLY safe input on any error —
    // username stays, the password is cleared for service failures too.
    expect(screen.getByLabelText("Username")).toHaveValue("B-A");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
  });

  it("clears the password on a network failure while keeping the username", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } });
        }
        throw new TypeError("Failed to fetch");
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText("Username"), "B-A");
    await user.type(screen.getByLabelText("Password"), "typed-secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveValue("B-A");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("clears the password when client-side validation fails (preserve only safe input)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText("Password"), "typed-secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Username is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/login"))).toHaveLength(0);
  });

  it("password toggle is keyboard reachable in tab order and announces its state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();

    const username = await screen.findByLabelText("Username");
    const password = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    const submit = screen.getByRole("button", { name: "Sign in" });

    // ui-spec §1.5 tab order: username → password → toggle → submit.
    username.focus();
    await user.tab();
    expect(password).toHaveFocus();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();

    // Enter activates the toggle and the accessible name flips (§1.5).
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    const hideToggle = screen.getByRole("button", { name: "Hide password" });
    expect(hideToggle).toBeInTheDocument();

    // Space toggles back.
    hideToggle.focus();
    await user.keyboard(" ");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });
});
