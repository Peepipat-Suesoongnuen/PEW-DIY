import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../lib/session";
import { CreateRequestPage } from "../pages/CreateRequestPage";
import { ItemDetailPage } from "../pages/ItemDetailPage";
import { RequestsPage } from "../pages/RequestsPage";
import { requestIdFromPathname, requestPath } from "../lib/paths";
import type { BorrowingRequest, Equipment } from "../lib/api";

const equipment: Equipment = {
  id: "item/opaque%2F#",
  name: "Borrowable fixture",
  description: "Fixture",
  category: "Synthetic",
  quantity_total: 3,
  quantity_available: 3,
  availability: "AVAILABLE",
  image_url: "",
  catalog_status: "ACTIVE",
};

const secondEquipment: Equipment = {
  id: "item-two",
  name: "Multimeter",
  description: "Digital",
  category: "Instruments",
  quantity_total: 2,
  quantity_available: 2,
  availability: "AVAILABLE",
  image_url: "",
  catalog_status: "ACTIVE",
};

const record: BorrowingRequest = {
  id: "r/opaque%2F#",
  bundle_id: null,
  borrower_id: "B-A",
  borrower_username: "B-A",
  equipment_id: equipment.id,
  equipment_name: equipment.name,
  quantity_requested: 2,
  purpose_category: "COURSE_PROJECT",
  purpose_detail: "CPE332 Lab",
  requested_days: 7,
  approval_status: "PENDING",
  decision_note: "",
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-11-06T12:00:00Z",
  status: "PENDING",
};

const response = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function mount(path = `/requests/new?equipmentId=${encodeURIComponent(equipment.id)}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Routes>
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/requests/new" element={<CreateRequestPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/:id" element={<RequestsPage />} />
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

function mockApi(
  options: {
    role?: "BORROWER" | "CUSTODIAN";
    available?: number;
    post?: () => Promise<Response>;
    records?: BorrowingRequest[];
    detailStatus?: number;
  } = {},
) {
  const eqList = [
    { ...equipment, quantity_available: options.available ?? 3 },
    secondEquipment,
  ];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/auth/me") {
      return response(200, { data: { user: { id: "B-A", username: "B-A", role: options.role ?? "BORROWER" } } });
    }
    if (path.startsWith("/api/equipment/")) {
      return response(200, { data: { ...equipment, quantity_available: options.available ?? 3 } });
    }
    if (path.startsWith("/api/equipment")) {
      return response(200, { data: eqList.filter((e) => e.quantity_available > 0) });
    }
    if (path === "/api/requests" && init?.method === "POST") {
      return options.post ? options.post() : response(201, { data: record });
    }
    if (path === "/api/request-bundles" && init?.method === "POST") {
      return response(201, { data: { bundle_id: "b-1", requests: [record] } });
    }
    if (path.endsWith("/approve") && init?.method === "POST") {
      return response(200, { data: { ...record, status: "APPROVED", approval_status: "APPROVED" } });
    }
    if (path.endsWith("/cancel") && init?.method === "POST") {
      return response(200, { data: { ...record, status: "CANCELLED", approval_status: "CANCELLED" } });
    }
    if (path === "/api/requests" || path.startsWith("/api/requests?")) {
      return response(200, { data: options.records ?? [record] });
    }
    if (path.startsWith("/api/requests/")) {
      return options.detailStatus
        ? response(options.detailStatus, { error: { code: "FORBIDDEN", message: "private content", requestId: "req-safe" } })
        : response(200, { data: options.records?.[0] ?? record });
    }
    return response(404, { error: { code: "NOT_FOUND" } });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

afterEach(() => vi.unstubAllGlobals());

describe("F-04 / F-11 request creation & management UI", () => {
  it("submits single item with purpose & duration and opens detail WITHOUT linking to catalog item", async () => {
    const fetcher = mockApi();
    mount();

    const qtyInput = await screen.findByLabelText(`Quantity for ${equipment.name}`);
    fireEvent.change(qtyInput, { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Borrowing duration (days)"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/Purpose details/), { target: { value: "CPE332 Lab" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("heading", { name: "My requests" })).toBeInTheDocument();
    expect(await screen.findByText(/waiting for custodian approval/)).toBeInTheDocument();

    const sent = fetcher.mock.calls.find(([url, init]) => url === "/api/requests" && init?.method === "POST");
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({
      equipment_id: equipment.id,
      quantity_requested: 2,
      purpose_category: "COURSE_PROJECT",
      purpose_detail: "CPE332 Lab",
      requested_days: 10,
    });

    const reqLink = await screen.findByRole("link", { name: equipment.name });
    expect(reqLink).toHaveAttribute("href", requestPath(record.id));
    expect(reqLink).not.toHaveAttribute("href", expect.stringContaining("/items/"));

    fireEvent.click(reqLink);
    expect(await screen.findByRole("heading", { name: "Request details" })).toBeInTheDocument();
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(`/api/requests/${encodeURIComponent(record.id)}`, expect.any(Object)),
    );
  });

  it("supports multi-item bundle creation via POST /api/request-bundles", async () => {
    const fetcher = mockApi();
    mount();
    await screen.findByLabelText(`Quantity for ${equipment.name}`);
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit bundle request (2 items)" }));

    expect(await screen.findByRole("heading", { name: "My requests" })).toBeInTheDocument();
    const sent = fetcher.mock.calls.find(
      ([url, init]) => url === "/api/request-bundles" && init?.method === "POST",
    );
    expect(sent).toBeDefined();
  });

  it.each(["", "0", "-1", "1.5", "4"])("rejects invalid quantity %s cleanly (UAT-07 hint)", async (value) => {
    const fetcher = mockApi();
    mount();
    const qtyInput = await screen.findByLabelText(`Quantity for ${equipment.name}`);
    fireEvent.change(qtyInput, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText(/Enter a whole number from 1 to 3/)).toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it.each(["0", "15"])("rejects out-of-range duration %s (allowed 1-14)", async (days) => {
    const fetcher = mockApi();
    mount();
    await screen.findByLabelText(`Quantity for ${equipment.name}`);
    fireEvent.change(screen.getByLabelText("Borrowing duration (days)"), { target: { value: days } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText("Enter a whole number between 1 and 14 calendar days.")).toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("refreshes availability after 409 conflict and redirects on 401", async () => {
    const fetcher = mockApi({
      post: async () => response(409, { error: { code: "INSUFFICIENT_AVAILABILITY", requestId: "safe" } }),
    });
    mount();
    await screen.findByLabelText(`Quantity for ${equipment.name}`);
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText(/Requested quantity is no longer available/)).toBeInTheDocument();

    fetcher.mockImplementation(async (input) => {
      if (String(input) === "/api/auth/me") {
        return response(200, { data: { user: { id: "B-A", username: "B-A", role: "BORROWER" } } });
      }
      return response(401, { error: { code: "UNAUTHENTICATED", requestId: "safe" } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("replaces inline ItemDetail borrow form with 'Request this item' link and hides it from Custodian", async () => {
    mockApi({ role: "BORROWER" });
    const view = mount(`/items/${encodeURIComponent(equipment.id)}`);
    const cta = await screen.findByRole("link", { name: "Request this item" });
    expect(cta).toHaveAttribute("href", `/requests/new?equipmentId=${encodeURIComponent(equipment.id)}`);
    expect(screen.queryByRole("button", { name: "Submit request" })).not.toBeInTheDocument();

    view.unmount();
    mockApi({ role: "CUSTODIAN" });
    mount(`/items/${encodeURIComponent(equipment.id)}`);
    await screen.findByRole("heading", { name: equipment.name });
    expect(screen.queryByRole("link", { name: "Request this item" })).not.toBeInTheDocument();
  });

  it("renders Custodian approve button on PENDING detail and safe denial on 403", async () => {
    const fetcher = mockApi({ role: "CUSTODIAN" });
    const view = mount(requestPath(record.id));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(fetcher.mock.calls.some(([u, i]) => String(u).endsWith("/approve") && i?.method === "POST")).toBe(true),
    );
    view.unmount();

    mockApi({ detailStatus: 403 });
    mount(requestPath(record.id));
    await screen.findByText("You do not have access to this request.");
    expect(screen.queryByText("private content")).not.toBeInTheDocument();
  });

  it("decodes each request ID exactly once at the route boundary", () => {
    for (const id of ["r/one", "r%2Fone", "r#one", "r%25"]) {
      expect(requestIdFromPathname(requestPath(id))).toBe(id);
    }
    expect(requestIdFromPathname("/requests/new")).toBeNull();
  });

  it("displays 1,000-character Purpose details counter on CreateRequestPage", async () => {
    mockApi();
    mount(`/requests/new?equipmentId=${encodeURIComponent(equipment.id)}`);
    expect(await screen.findByText("0 / 1,000 characters")).toBeInTheDocument();
    const textarea = screen.getByLabelText(/Purpose details/);
    expect(textarea).toHaveAttribute("maxLength", "1000");
    fireEvent.change(textarea, { target: { value: "Robotics" } });
    expect(screen.getByText("8 / 1,000 characters")).toBeInTheDocument();
  });

  it("supports short reference search, sortable columns, collapsible bundles, and Custodian quick bundle approve", async () => {
    const bundleItem1: BorrowingRequest = {
      ...record,
      id: "aaaa1111-0000-4000-8000-000000000001",
      bundle_id: "bbbb2222-0000-4000-8000-000000000002",
      equipment_name: "Oscilloscope",
      quantity_requested: 2,
      requested_days: 5,
    };
    const bundleItem2: BorrowingRequest = {
      ...record,
      id: "aaaa1111-0000-4000-8000-000000000003",
      bundle_id: "bbbb2222-0000-4000-8000-000000000002",
      equipment_id: "eq-2",
      equipment_name: "Logic Probe",
      quantity_requested: 3,
      requested_days: 5,
    };
    const singleItem: BorrowingRequest = {
      ...record,
      id: "cccc3333-0000-4000-8000-000000000004",
      bundle_id: null,
      equipment_name: "Arduino Uno",
      quantity_requested: 1,
      requested_days: 10,
      purpose_category: "CAPSTONE",
      created_at: "2026-11-05T12:00:00Z",
    };

    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/auth/me") return response(200, { data: { user: { id: "C-A", username: "C-A", role: "CUSTODIAN" } } });
      if (path === "/api/requests") return response(200, { data: [bundleItem1, bundleItem2, singleItem] });
      if (path === "/api/request-bundles/bbbb2222-0000-4000-8000-000000000002/approve" && init?.method === "POST") {
        return response(200, { data: [bundleItem1, bundleItem2] });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetcher);

    mount("/requests");
    expect(await screen.findByText("Bundle (2)")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveClass("table-fixed");

    // Sort by Qty toggling ascending/descending
    const qtyBtn = screen.getByRole("button", { name: "Qty" });
    fireEvent.click(qtyBtn);
    expect(qtyBtn.closest("th")).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(qtyBtn);
    expect(qtyBtn.closest("th")).toHaveAttribute("aria-sort", "descending");

    // Expand bundle sub-rows into clean full-width nested drawer and use Custodian Quick Bundle Approve
    fireEvent.click(screen.getByRole("button", { name: "Toggle bundle #BBBB2222" }));
    expect(screen.getByText(/Bundle items \(2\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve bundle (2)" }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/request-bundles/bbbb2222-0000-4000-8000-000000000002/approve",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    // Search by short reference code (#CCCC3333)
    fireEvent.change(screen.getByLabelText("Search requests"), { target: { value: "#CCCC3333" } });
    expect(screen.queryByText("Bundle (2)")).not.toBeInTheDocument();
    expect(screen.getAllByText("Arduino Uno").length).toBeGreaterThanOrEqual(1);
  });

  it("paginates RequestsPage by groups (default 10) without splitting a bundle across pages", async () => {
    const bundleItems: BorrowingRequest[] = [
      { ...record, id: "bnd-1", bundle_id: "bnd-grp", equipment_name: "Bundle Item A", created_at: "2026-11-20T12:00:00Z" },
      { ...record, id: "bnd-2", bundle_id: "bnd-grp", equipment_id: "eq-2", equipment_name: "Bundle Item B", created_at: "2026-11-20T12:00:00Z" },
    ];
    const singles: BorrowingRequest[] = Array.from({ length: 11 }, (_, idx) => ({
      ...record,
      id: `req-pg-${idx + 1}`,
      bundle_id: null,
      equipment_name: `Single Gear ${idx + 1}`,
      created_at: new Date(Date.UTC(2026, 10, 19 - idx)).toISOString(),
    }));

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/auth/me") return response(200, { data: { user: { id: "B-A", username: "B-A", role: "BORROWER" } } });
      if (path === "/api/requests") return response(200, { data: [...bundleItems, ...singles] });
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal("fetch", fetcher);

    mount("/requests");
    expect(await screen.findByText("Showing 1–10 of 12")).toBeInTheDocument();
    expect(screen.getAllByText(/Bundle Item A/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Single Gear 10")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 11–12 of 12")).toBeInTheDocument();
    expect(screen.getAllByText("Single Gear 10").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Single Gear 11").length).toBeGreaterThanOrEqual(1);

    // Search resets pagination back to page 1 cleanly
    fireEvent.change(screen.getByLabelText("Search requests"), { target: { value: "Single Gear 1" } });
    expect(screen.getByText(/Showing 1–/)).toBeInTheDocument();
  });
});
