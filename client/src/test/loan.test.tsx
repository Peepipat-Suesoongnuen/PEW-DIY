import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../lib/session";
import { RequestsPage } from "../pages/RequestsPage";
import { LoansPage } from "../pages/LoansPage";
import { loanIdFromPathname, loanPath } from "../lib/paths";

const record = { id: "request/opaque%2F#", borrower_id: "B-A", equipment_id: "item-one", quantity_requested: 2, created_at: "2026-11-06T12:00:00Z", status: "SUBMITTED" };
const loan = { id: "loan/opaque%2F#", request_id: record.id, borrower_id: "B-A", equipment_id: record.equipment_id,
  quantity_borrowed: 2, checked_out_by: "C-A", checkout_at: "2026-12-27T17:00:00Z", due_on: "2027-01-04", status: "ACTIVE" };
const response = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
function mount(path = "/requests") {
  return render(<MemoryRouter initialEntries={[path]}><SessionProvider><Routes>
    <Route path="/requests" element={<RequestsPage />} /><Route path="/requests/:id" element={<RequestsPage />} />
    <Route path="/loans" element={<LoansPage />} /><Route path="/loans/:id" element={<LoansPage />} />
    <Route path="/login" element={<div>LOGIN_PAGE</div>} />
  </Routes></SessionProvider></MemoryRouter>);
}
function mockApi(options: { role?: string; post?: () => Promise<Response>; loans?: unknown[]; error?: number } = {}) {
  let fulfilled = false;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/auth/me") return response(200, { data: { user: { id: "B-A", username: "B-A", role: options.role ?? "CUSTODIAN" } } });
    if (path === "/api/equipment") return response(200, { data: [{ id: record.equipment_id, name: "Fixture" }] });
    if (path.endsWith("/checkout") && init?.method === "POST") {
      if (options.post) return options.post();
      fulfilled = true; return response(201, { data: loan });
    }
    if (path.startsWith("/api/requests")) return response(200, { data: path === "/api/requests" ? fulfilled ? [] : [record] : record });
    if (path.startsWith("/api/loans")) return options.error ? response(options.error, { error: { code: "FORBIDDEN", requestId: "safe-id" } })
      : response(200, { data: path === "/api/loans" ? options.loans ?? [loan] : loan });
    throw new Error("Unexpected API call");
  });
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
afterEach(() => vi.unstubAllGlobals());

describe("F-05 checkout and active-loan UI", () => {
  it("shows committed loan and refreshes the submitted queue", async () => {
    const fetcher = mockApi(); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    expect(await screen.findByText("Checkout completed.")).toBeInTheDocument();
    expect(screen.getByText("2027-01-04")).toBeInTheDocument();
    expect(await screen.findByText("No submitted requests.")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(`/api/requests/${encodeURIComponent(record.id)}/checkout`, expect.objectContaining({ body: "{}", method: "POST" }));
  });
  it("prevents duplicate clicks and success before the response", async () => {
    let release!: (r: Response) => void;
    const fetcher = mockApi({ post: () => new Promise((r) => { release = r; }) }); mount();
    const button = await screen.findByRole("button", { name: "Check out" });
    fireEvent.click(button); fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Checking out…" })).toBeDisabled();
    expect(screen.queryByText("Checkout completed.")).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    release(response(201, { data: loan }));
    expect(await screen.findByText("Checkout completed.")).toBeInTheDocument();
  });
  it.each([409, 500, 0])("reconciles failure %s without blind retry or false success", async (status) => {
    mockApi({ post: async () => { if (!status) throw new Error("network"); return response(status, { error: { code: "FAILED", requestId: "safe-id" } }); } }); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    const refresh = await screen.findByRole("button", { name: "Refresh requests" });
    expect(screen.getByRole("button", { name: "Check out" })).toBeDisabled();
    expect(screen.queryByText("Checkout completed.")).not.toBeInTheDocument();
    fireEvent.click(refresh);
    await waitFor(() => expect(screen.getByRole("button", { name: "Check out" })).toBeEnabled());
  });
  it("expires the session on checkout401", async () => {
    mockApi({ post: async () => response(401, { error: { code: "UNAUTHENTICATED" } }) }); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });
  it("does not render checkout for Borrower", async () => {
    mockApi({ role: "BORROWER" }); mount();
    await screen.findByRole("link", { name: "View request" }); expect(screen.queryByRole("button", { name: "Check out" })).not.toBeInTheDocument();
  });
  it("reads own active loans and an opaque-ID detail", async () => {
    const fetcher = mockApi({ role: "BORROWER" }); mount(loanPath(loan.id));
    expect(await screen.findByText("2027-01-04")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(`/api/loans/${encodeURIComponent(loan.id)}`, expect.anything());
    expect(loanIdFromPathname(loanPath(loan.id))).toBe(loan.id);
  });
  it("handles empty active loans and reload", async () => {
    const fetcher = mockApi({ role: "BORROWER", loans: [] }); mount("/loans");
    expect(await screen.findByText("No active loans.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh loans" }));
    await waitFor(() => expect(fetcher.mock.calls.filter(([url]) => url === "/api/loans")).toHaveLength(2));
  });
  it.each([403, 404, 503])("handles loan-read error %s safely", async (error) => {
    mockApi({ role: "BORROWER", error }); mount(loanPath(loan.id));
    expect(await screen.findByRole("alert")).toHaveTextContent(error === 403 ? "You do not have access" : error === 404 ? "Loan not found" : "Could not load loans");
    expect(screen.queryByText("2027-01-04")).not.toBeInTheDocument();
  });
  it("denies the staff general-loan page before requesting private records", async () => {
    const fetcher = mockApi(); mount("/loans");
    expect(await screen.findByText("You do not have access to this page.")).toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => String(url).startsWith("/api/loans"))).toBe(false);
  });
});
