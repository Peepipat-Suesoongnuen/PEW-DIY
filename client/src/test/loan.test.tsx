import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../lib/session";
import { RequestsPage } from "../pages/RequestsPage";
import { LoansPage } from "../pages/LoansPage";
import { loanIdFromPathname, loanPath } from "../lib/paths";

const record = {
  id: "request/opaque%2F#",
  bundle_id: null,
  borrower_id: "B-A",
  equipment_id: "item-one",
  quantity_requested: 2,
  purpose_category: "OTHER",
  purpose_detail: "",
  requested_days: 7,
  approval_status: "APPROVED",
  decision_note: "",
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-11-06T12:00:00Z",
  status: "APPROVED",
};
const loan = { id: "loan/opaque%2F#", request_id: record.id, bundle_id: null, borrower_id: "B-A", borrower_username: "Student Alice",
  equipment_id: record.equipment_id, equipment_name: "Fixture", quantity_borrowed: 2, requested_days: 7,
  checked_out_by: "C-A", checked_out_by_username: "Staff Casey", checkout_at: "2026-12-27T17:00:00Z", due_on: "2027-01-04",
  return_requested_at: null, return_requested_by: null, return_note: "", returned_at: null, returned_by: null,
  status: "ACTIVE" as const };
const response = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
function mount(path = "/requests") {
  return render(<MemoryRouter initialEntries={[path]}><SessionProvider><Routes>
    <Route path="/requests" element={<RequestsPage />} /><Route path="/requests/:id" element={<RequestsPage />} />
    <Route path="/loans" element={<LoansPage />} /><Route path="/loans/:id" element={<LoansPage />} />
    <Route path="/login" element={<div>LOGIN_PAGE</div>} />
  </Routes></SessionProvider></MemoryRouter>);
}
function mockApi(options: { role?: string; post?: () => Promise<Response>; loans?: unknown[]; error?: number; equipmentError?: number; username?: string } = {}) {
  let fulfilled = false;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/auth/me") return response(200, { data: { user: { id: "B-A", username: options.username ?? "B-A", role: options.role ?? "CUSTODIAN" } } });
    if (path === "/api/equipment") return options.equipmentError ? response(options.equipmentError, { error: { code: "UNAVAILABLE" } }) : response(200, { data: [{ id: record.equipment_id, name: "Fixture" }] });
    if (path.endsWith("/checkout") && init?.method === "POST") {
      if (options.post) return options.post();
      fulfilled = true; return response(201, { data: loan });
    }
    if (path.startsWith("/api/requests")) return response(200, { data: path === "/api/requests" ? fulfilled ? [] : [record] : record });
    if (path.endsWith("/request-return") && init?.method === "POST") {
      return response(200, { data: { ...loan, status: "RETURN_PENDING", return_requested_at: "2026-12-28T10:00:00Z", return_note: "Locker B" } });
    }
    if (path.endsWith("/return") && init?.method === "POST") {
      return response(200, { data: { ...loan, status: "RETURNED", returned_at: "2026-12-28T11:00:00Z", returned_by: "C-A" } });
    }
    if (path.startsWith("/api/loans")) return options.error ? response(options.error, { error: { code: "FORBIDDEN", requestId: "safe-id" } })
      : response(200, { data: path.startsWith("/api/loans?") ? options.loans ?? [loan] : loan });
    throw new Error("Unexpected API call");
  });
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
afterEach(() => vi.unstubAllGlobals());

describe("F-05 checkout and active-loan UI", () => {
  it("commits checkout on approved request detail and sends POST /checkout", async () => {
    const fetcher = mockApi({ username: "Staff Casey" }); mount(`/requests/${encodeURIComponent(record.id)}`);
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        `/api/requests/${encodeURIComponent(record.id)}/checkout`,
        expect.objectContaining({ body: "{}", method: "POST" }),
      ),
    );
  });
  it("prevents duplicate clicks and success before the response", async () => {
    let release!: (r: Response) => void;
    const fetcher = mockApi({ post: () => new Promise((r) => { release = r; }) }); mount(`/requests/${encodeURIComponent(record.id)}`);
    const button = await screen.findByRole("button", { name: "Check out" });
    fireEvent.click(button); fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Checking out…" })).toBeDisabled();
    expect(screen.queryByText("Checkout completed.")).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    release(response(201, { data: loan }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(`/api/loans/${encodeURIComponent(loan.id)}`, expect.anything()));
  });
  it.each([409, 500, 0])("reconciles failure %s without blind retry or false success", async (status) => {
    mockApi({ post: async () => { if (!status) throw new Error("network"); return response(status, { error: { code: "FAILED", requestId: "safe-id" } }); } }); mount(`/requests/${encodeURIComponent(record.id)}`);
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    const refresh = await screen.findByRole("button", { name: "Refresh requests" });
    expect(screen.getByRole("button", { name: "Check out" })).toBeDisabled();
    expect(screen.queryByText("Checkout completed.")).not.toBeInTheDocument();
    fireEvent.click(refresh);
    await waitFor(() => expect(screen.getByRole("button", { name: "Check out" })).toBeEnabled());
  });
  it.each([
    ["INSUFFICIENT_AVAILABILITY", /Insufficient equipment stock available for checkout/],
    ["ALREADY_CHECKED_OUT", /already been checked out/],
    ["NOT_APPROVED", /Approve this request before checking it out/],
  ])("distinguishes 409 %s conflict error copy (Finding 05)", async (code, expectedCopy) => {
    mockApi({ post: async () => response(409, { error: { code, requestId: "safe-id" } }) });
    mount(`/requests/${encodeURIComponent(record.id)}`);
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    expect(await screen.findByText(expectedCopy)).toBeInTheDocument();
  });
  it("expires the session on checkout401", async () => {
    mockApi({ post: async () => response(401, { error: { code: "UNAUTHENTICATED" } }) }); mount(`/requests/${encodeURIComponent(record.id)}`);
    fireEvent.click(await screen.findByRole("button", { name: "Check out" }));
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });
  it("does not render checkout for Borrower", async () => {
    mockApi({ role: "BORROWER" }); mount(`/requests/${encodeURIComponent(record.id)}`);
    expect(await screen.findByText(record.equipment_id)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check out" })).not.toBeInTheDocument();
  });
  it("reads own active loans and an opaque-ID detail", async () => {
    const fetcher = mockApi({ role: "BORROWER" }); mount(loanPath(loan.id));
    expect(await screen.findByText("2027-01-04")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(`/api/loans/${encodeURIComponent(loan.id)}`, expect.anything());
    expect(loanIdFromPathname(loanPath(loan.id))).toBe(loan.id);
  });
  it("shows catalog names, borrower username, and checkout custodian rather than internal IDs, plus Printable Loan Slip (TEST-F11-05)", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    mockApi({ role: "BORROWER", username: "Student Alice" }); mount(loanPath(loan.id));
    await screen.findByText("2027-01-04");
    expect(screen.getByText("Fixture")).toBeInTheDocument();
    expect(screen.getByText("Student Alice")).toBeInTheDocument();
    expect(screen.getByText("Staff Casey")).toBeInTheDocument();
    expect(screen.queryByText(record.equipment_id)).not.toBeInTheDocument();
    expect(screen.queryByText(loan.borrower_id)).not.toBeInTheDocument();
    expect(screen.queryByText(loan.checked_out_by)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Print loan slip/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
  it("loads scope=all for Borrower on bundle loan detail and renders all bundle items on the slip (TEST-F11-05)", async () => {
    const bundleLoan1 = { ...loan, id: "loan-b1", bundle_id: "bundle-1", equipment_id: "eq-1", equipment_name: "Multimeter", quantity_borrowed: 1 };
    const bundleLoan2 = { ...loan, id: "loan-b2", bundle_id: "bundle-1", equipment_id: "eq-2", equipment_name: "Oscilloscope", quantity_borrowed: 3 };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/auth/me") return response(200, { data: { user: { id: "B-A", username: "Student Alice", role: "BORROWER" } } });
      if (path === "/api/loans/loan-b1") return response(200, { data: bundleLoan1 });
      if (path === "/api/loans?scope=all") return response(200, { data: [bundleLoan1, bundleLoan2] });
      throw new Error(`Unexpected API call: ${path}`);
    });
    vi.stubGlobal("fetch", fetcher);
    mount(loanPath("loan-b1"));
    await screen.findByText("Bundle items");
    expect(fetcher).toHaveBeenCalledWith("/api/loans?scope=all", expect.anything());
    expect(screen.getByText("Multimeter")).toBeInTheDocument();
    expect(screen.getByText("Oscilloscope")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Staff Casey")).toBeInTheDocument();
  });
  it("supports Borrower Notify return and Custodian Confirm return (F-06)", async () => {
    const bFetcher = mockApi({ role: "BORROWER" }); mount(loanPath(loan.id));
    await screen.findByText("2027-01-04");
    fireEvent.change(screen.getByLabelText(/Return note/i), { target: { value: "Locker B" } });
    fireEvent.click(screen.getByRole("button", { name: "Notify return" }));
    await waitFor(() =>
      expect(bFetcher).toHaveBeenCalledWith(
        `/api/loans/${encodeURIComponent(loan.id)}/request-return`,
        expect.objectContaining({ method: "POST", body: JSON.stringify({ return_note: "Locker B" }) }),
      ),
    );
    const cFetcher = mockApi({ role: "CUSTODIAN" }); mount(loanPath(loan.id));
    await screen.findByRole("button", { name: "Confirm return" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm return" }));
    await waitFor(() =>
      expect(cFetcher).toHaveBeenCalledWith(
        `/api/loans/${encodeURIComponent(loan.id)}/return`,
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
  it("handles empty active loans and standardized LoansPage without Refresh loans clutter (Finding 05 / FR-18)", async () => {
    mockApi({ role: "CUSTODIAN", loans: [] }); mount("/loans");
    expect(await screen.findByText("No active loans.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All loans" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh loans" })).not.toBeInTheDocument();
  });
  it.each([403, 404, 503])("handles loan-read error %s safely", async (error) => {
    mockApi({ role: "BORROWER", error }); mount(loanPath(loan.id));
    expect(await screen.findByText(error === 403 ? /You do not have access/ : error === 404 ? /Loan not found/ : /We could not load loans/)).toBeInTheDocument();
    expect(screen.queryByText("2027-01-04")).not.toBeInTheDocument();
  });
});
