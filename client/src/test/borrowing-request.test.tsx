import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../lib/session";
import { ItemDetailPage } from "../pages/ItemDetailPage";
import { RequestsPage } from "../pages/RequestsPage";
import { requestIdFromPathname, requestPath } from "../lib/paths";

const equipment = { id: "item/opaque%2F#", name: "Borrowable fixture", description: "Fixture", category: "Synthetic", quantity_total: 3, quantity_available: 3, availability: "AVAILABLE" };
const record = { id: "r/opaque%2F#", borrower_id: "B-A", equipment_id: equipment.id, quantity_requested: 2, created_at: "2026-11-06T12:00:00Z", status: "SUBMITTED" };
const response = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function mount(path = `/items/${encodeURIComponent(equipment.id)}`) {
  return render(<MemoryRouter initialEntries={[path]}><SessionProvider><Routes>
    <Route path="/items/:id" element={<ItemDetailPage />} />
    <Route path="/requests" element={<RequestsPage />} />
    <Route path="/requests/:id" element={<RequestsPage />} />
    <Route path="/login" element={<div>LOGIN_PAGE</div>} />
  </Routes></SessionProvider></MemoryRouter>);
}

function mockApi(options: { role?: string; available?: number; post?: () => Promise<Response>; records?: unknown[]; detailStatus?: number } = {}) {
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/auth/me") return response(200, { data: { user: { id: "B-A", username: "B-A", role: options.role ?? "BORROWER" } } });
    if (path.startsWith("/api/equipment")) return response(200, { data: path === "/api/equipment" ? [equipment] : { ...equipment, quantity_available: options.available ?? 3 } });
    if (path === "/api/requests" && init?.method === "POST") return options.post ? options.post() : response(201, { data: record });
    if (path === "/api/requests") return response(200, { data: options.records ?? [record] });
    return options.detailStatus ? response(options.detailStatus, { error: { code: "FORBIDDEN", message: "private content", requestId: "req-safe" } }) : response(200, { data: record });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
afterEach(() => vi.unstubAllGlobals());

describe("F-04 request UI (TEST-F04-09)", () => {
  it("submits an opaque item ID and redirects to persisted own request display", async () => {
    const fetcher = mockApi(); mount();
    fireEvent.change(await screen.findByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByRole("heading", { name: "My requests" })).toBeInTheDocument();
    expect(await screen.findByText("Request submitted.")).toBeInTheDocument();
    await screen.findByRole("link", { name: "View request" });
    const sent = fetcher.mock.calls.find(([url, init]) => url === "/api/requests" && init?.method === "POST");
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({ equipment_id: equipment.id, quantity_requested: 2 });
    fireEvent.click(screen.getByRole("link", { name: "View request" }));
    expect(await screen.findByRole("heading", { name: "Request details" })).toBeInTheDocument();
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(`/api/requests/${encodeURIComponent(record.id)}`, expect.any(Object)));
  });

  it.each(["", "0", "-1", "1.5", "4"])("rejects invalid quantity %s without an API mutation", async (value) => {
    const fetcher = mockApi(); mount();
    fireEvent.change(await screen.findByLabelText("Quantity"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText(/Enter a whole number/)).toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("disables duplicate submission and shows no success before the server commits", async () => {
    let finish!: (value: Response) => void;
    const fetcher = mockApi({ post: () => new Promise((resolve) => { finish = resolve; }) }); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Submit request" }));
    expect(screen.getByRole("button", { name: "Submitting…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Submitting…" }));
    expect(screen.queryByText("Request submitted.")).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    finish(response(201, { data: record }));
    await screen.findByRole("heading", { name: "My requests" });
  });

  it("preserves input and refreshes authoritative stock after a conflict", async () => {
    let available = 3;
    const fetcher = mockApi({ post: async () => { available = 1; return response(409, { error: { code: "INSUFFICIENT_AVAILABILITY", requestId: "safe" } }); } });
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation((input, init) => String(input).startsWith("/api/equipment/") ? Promise.resolve(response(200, { data: { ...equipment, quantity_available: available } })) : base(input, init));
    mount(); fireEvent.change(await screen.findByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText(/no longer available in the requested quantity/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Quantity")).toHaveAttribute("max", "1"));
    expect(screen.getByLabelText("Quantity")).toHaveValue(2);
    expect(screen.queryByText("Request submitted.")).not.toBeInTheDocument();
  });

  it("redirects to login after protected submission returns 401", async () => {
    mockApi({ post: async () => response(401, { error: { code: "UNAUTHENTICATED", requestId: "safe" } }) }); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Submit request" }));
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("keeps safe input and never shows success or raw diagnostics after a service failure", async () => {
    mockApi({ post: async () => response(503, { error: { code: "SERVICE_UNAVAILABLE", message: "private SQL diagnostic", requestId: "safe-service" } }) }); mount();
    fireEvent.change(await screen.findByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    await screen.findByText(/Could not submit the request/);
    expect(screen.getByLabelText("Quantity")).toHaveValue(2);
    expect(screen.queryByText("Request submitted.")).not.toBeInTheDocument();
    expect(screen.queryByText("private SQL diagnostic")).not.toBeInTheDocument();
  });

  it("disables retry when stock cannot be refreshed after conflict", async () => {
    const fetcher = mockApi({ post: async () => response(409, { error: { code: "INSUFFICIENT_AVAILABILITY", requestId: "safe" } }) });
    const initial = fetcher.getMockImplementation()!;
    let itemReads = 0;
    fetcher.mockImplementation((url, init) => {
      if (String(url).startsWith("/api/equipment/") && ++itemReads > 1) return Promise.resolve(response(503, { error: { code: "SERVICE_UNAVAILABLE" } }));
      return initial(url, init);
    });
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Submit request" }));
    await screen.findByText(/Could not refresh availability/);
    expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
  });

  it("hides borrowing controls from Custodians and unavailable items", async () => {
    mockApi({ role: "CUSTODIAN" }); const page = mount();
    await screen.findByRole("heading", { name: equipment.name });
    expect(screen.queryByRole("button", { name: "Submit request" })).not.toBeInTheDocument();
    page.unmount(); mockApi({ available: 0 }); mount();
    await screen.findByText("This item is currently unavailable.");
    expect(screen.queryByRole("button", { name: "Submit request" })).not.toBeInTheDocument();
  });

  it("shows empty own/queue states and safe detail denial", async () => {
    mockApi({ records: [] }); let page = mount("/requests");
    await screen.findByText("No requests yet."); page.unmount();
    mockApi({ records: [], role: "CUSTODIAN" }); page = mount("/requests");
    await screen.findByText("No submitted requests."); page.unmount();
    mockApi({ detailStatus: 403 }); mount(requestPath(record.id));
    await screen.findByText("You do not have access to this request.");
    expect(screen.queryByText("private content")).not.toBeInTheDocument();
  });

  it("decodes each request ID exactly once at the route boundary", () => {
    for (const id of ["r/one", "r%2Fone", "r#one", "r%25"]) expect(requestIdFromPathname(requestPath(id))).toBe(id);
  });
});
