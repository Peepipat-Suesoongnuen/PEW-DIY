/**
 * UI regression tests for catalog.html — PR #27 review findings (P1/P2).
 *
 * P1: item fields were concatenated into innerHTML (script execution risk).
 * P2: logout redirected to login even when the server failed to revoke.
 *
 * These tests load the REAL client/catalog.html into jsdom, stub `fetch`,
 * execute the actual inline page script, and assert observable behavior.
 * Browser-level journeys remain on the TEST-F01-13/TEST-F02-07 track; this is
 * UI/component-level regression evidence (contract TEST-F02-08 level).
 *
 * Authentic RED→GREEN: the tests were run against the pre-fix catalog.html
 * (from HEAD) first and failed with the reviewer's exact symptoms, then
 * passed after the fix (see docs/sprints/sprint-1/tdd-evidence-f02.md).
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";

const catalogHtml = readFileSync(path.resolve(process.cwd(), "client/catalog.html"), "utf8");

type FetchImpl = (input: string, init?: { method?: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

interface Harness {
  dom: JSDOM;
  navigations: string[];
  flush: () => Promise<void>;
}

function loadCatalog(fetchImpl: FetchImpl): Harness {
  const virtualConsole = new VirtualConsole();
  const navigations: string[] = [];
  virtualConsole.on("jsdomError", (err: Error) => {
    // jsdom raises a "not implemented: navigation" error when page JS assigns
    // window.location — we capture it to prove a redirect was/wasn't attempted.
    if (/navigation/i.test(err.message)) navigations.push(err.message);
  });
  const dom = new JSDOM(catalogHtml, {
    runScripts: "outside-only",
    url: "http://localhost:3123/catalog.html",
    virtualConsole,
    pretendToBeVisual: true,
  });
  (dom.window as unknown as { fetch: FetchImpl }).fetch = fetchImpl;
  const script = dom.window.document.querySelector("script");
  dom.window.eval(script?.textContent ?? "");
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 30));
  return { dom, navigations, flush };
}

const XSS_PAYLOAD = '<img src=x onerror="window.__xss=1">';

function itemWithPayload() {
  return {
    id: "e-xss",
    name: XSS_PAYLOAD,
    description: XSS_PAYLOAD,
    category: XSS_PAYLOAD,
    quantity_total: 1,
    quantity_available: 1,
    availability: "AVAILABLE",
  };
}

describe("catalog.html rendering safety (P1 XSS regression)", () => {
  it("renders HTML-bearing item fields as text — no element creation, no script execution", async () => {
    const harness = loadCatalog(async (url: string) => {
      if (String(url).includes("/api/equipment")) {
        return { ok: true, status: 200, json: async () => ({ data: [itemWithPayload()] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    await harness.flush();

    const rows = harness.dom.window.document.querySelectorAll("#rows tr");
    expect(rows.length).toBe(1);
    // No HTML element may be created from item text.
    expect(harness.dom.window.document.querySelector("#rows img")).toBeNull();
    expect(rows[0].querySelectorAll("td").length).toBe(7);
    // The payload must appear as literal text in the name cell (index 1).
    expect(rows[0].querySelectorAll("td")[1].textContent).toBe(XSS_PAYLOAD);
    // Even if jsdom executed the handler, the marker must be absent.
    expect((harness.dom.window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});

describe("catalog.html logout failure handling (P2 regression)", () => {
  it("failed logout (503) shows a safe failure with retry — no redirect, session page stays", async () => {
    const harness = loadCatalog(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/api/auth/logout")) {
        return { ok: false, status: 503, json: async () => ({ error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable." } }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: [itemWithPayload()] }) };
    });
    await harness.flush();

    const button = harness.dom.window.document.getElementById("logout");
    expect(button).not.toBeNull();
    button?.dispatchEvent(new harness.dom.window.Event("click", { bubbles: true }));
    await harness.flush();

    // Failure must be reported...
    const errBox = harness.dom.window.document.getElementById("error");
    expect(errBox?.classList.contains("hidden")).toBe(false);
    expect(errBox?.textContent).toContain("Logout could not be confirmed");
    // ...with no redirect attempted and the retry affordance still present.
    expect(harness.navigations.length).toBe(0);
    expect(harness.dom.window.document.getElementById("logout")).not.toBeNull();
  });

  it("network-error logout also reports failure without redirect (uncertain outcome)", async () => {
    const harness = loadCatalog(async (url: string) => {
      if (String(url).includes("/api/auth/logout")) {
        throw new Error("network down");
      }
      return { ok: true, status: 200, json: async () => ({ data: [itemWithPayload()] }) };
    });
    await harness.flush();

    harness.dom.window.document.getElementById("logout")?.dispatchEvent(new harness.dom.window.Event("click", { bubbles: true }));
    await harness.flush();

    const errBox = harness.dom.window.document.getElementById("error");
    expect(errBox?.classList.contains("hidden")).toBe(false);
    expect(errBox?.textContent).toContain("Logout could not be confirmed");
    expect(harness.navigations.length).toBe(0);
  });

  it("confirmed logout (204) redirects to login", async () => {
    const harness = loadCatalog(async (url: string) => {
      if (String(url).includes("/api/auth/logout")) {
        return { ok: true, status: 204, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ data: [itemWithPayload()] }) };
    });
    await harness.flush();

    harness.dom.window.document.getElementById("logout")?.dispatchEvent(new harness.dom.window.Event("click", { bubbles: true }));
    await harness.flush();

    expect(harness.navigations.length).toBeGreaterThan(0);
  });
});
