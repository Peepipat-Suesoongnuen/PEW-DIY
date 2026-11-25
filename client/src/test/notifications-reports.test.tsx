import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../lib/session";
import { NotificationMenu } from "../components/NotificationMenu";
import { LoansPage } from "../pages/LoansPage";

const response = (status: number, data?: unknown) =>
  new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const notificationsFixture = [
  {
    id: "n-1",
    kind: "REQUEST_APPROVED",
    reference_id: "req-1",
    title: "Request approved",
    message: "Your request for Fluke 87V was approved.",
    created_at: "2026-11-23T10:00:00Z",
  },
  {
    id: "n-2",
    kind: "LOAN_OVERDUE",
    reference_id: "loan-1",
    title: "Loan overdue",
    message: "Oscilloscope was due on 2026-11-20 and is overdue.",
    created_at: "2026-11-23T11:00:00Z",
  },
];

afterEach(() => vi.unstubAllGlobals());

describe("F-07 NotificationMenu & LoansPage Overdue UI (TEST-F07-05)", () => {
  it("renders unread count badge, marks a single notification read, and clears all notifications", async () => {
    let active = [...notificationsFixture];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/auth/me") {
        return response(200, { data: { user: { id: "b1", username: "Alice", role: "BORROWER" } } });
      }
      if (path === "/api/notifications" && (!init?.method || init.method === "GET")) {
        return response(200, { data: active });
      }
      if (path === "/api/notifications/n-1/read" && init?.method === "POST") {
        active = active.filter((n) => n.id !== "n-1");
        return response(200, { data: { id: "n-1", read_at: "2026-11-23T12:00:00Z" } });
      }
      if (path === "/api/notifications" && init?.method === "DELETE") {
        active = [];
        return response(204);
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetcher);

    render(
      <MemoryRouter>
        <SessionProvider>
          <NotificationMenu />
        </SessionProvider>
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: "Notifications (2 unread)" });
    fireEvent.click(bell);
    expect(await screen.findByText("Request approved")).toBeInTheDocument();
    expect(screen.getByText("Loan overdue")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark notification Request approved read" }));
    await waitFor(() => expect(screen.queryByText("Request approved")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Notifications (1 unread)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear all/i }));
    await waitFor(() => expect(screen.getByText("No unread notifications.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("allows Custodian to filter Overdue loans and renders Overdue badge", async () => {
    const overdueLoan = {
      id: "loan-ov-1",
      request_id: "req-ov-1",
      bundle_id: null,
      borrower_id: "b1",
      borrower_username: "Alice",
      equipment_id: "eq-1",
      equipment_name: "Oscilloscope",
      quantity_borrowed: 1,
      requested_days: 7,
      checked_out_by: "c1",
      checked_out_by_username: "Staff",
      checkout_at: "2026-11-10T10:00:00Z",
      due_on: "2026-11-17",
      return_requested_at: null,
      return_requested_by: null,
      return_note: "",
      returned_at: null,
      returned_by: null,
      status: "ACTIVE" as const,
      overdue: true,
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/auth/me") {
        return response(200, { data: { user: { id: "c1", username: "Staff", role: "CUSTODIAN" } } });
      }
      if (path === "/api/loans?scope=active") return response(200, { data: [] });
      if (path === "/api/loans?scope=overdue") return response(200, { data: [overdueLoan] });
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetcher);

    render(
      <MemoryRouter initialEntries={["/loans"]}>
        <SessionProvider>
          <Routes>
            <Route path="/loans" element={<LoansPage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );

    const overdueTab = await screen.findByRole("tab", { name: "Overdue" });
    fireEvent.click(overdueTab);
    expect((await screen.findAllByText("Oscilloscope")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Overdue").length).toBeGreaterThanOrEqual(2);
  });
});
