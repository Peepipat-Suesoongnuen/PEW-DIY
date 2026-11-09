import { describe, expect, it } from "vitest";
import { assertCheckoutAvailable, checkoutDueOn } from "../src/services/loan";

describe("F-05 checkout invariant (TEST-F05-15)", () => {
  it("rejects an unavailable exclusive unit", () => {
    expect(() => assertCheckoutAvailable(1, 1, 1)).toThrow("INSUFFICIENT_AVAILABILITY");
  });
  it("allows the available exclusive unit", () => {
    expect(() => assertCheckoutAvailable(1, 0, 1)).not.toThrow();
  });
  it.each([[1, 2, 1], [-1, 0, 1], [3, -1, 1], [3, 0, 0], [3, 0, 1.5]])("rejects corrupt quantities %s/%s/%s", (total, held, qty) => {
    expect(() => assertCheckoutAvailable(total, held, qty)).toThrow("AVAILABILITY_INTEGRITY_ERROR");
  });
  it.each([
    ["2026-11-06T16:59:59Z", "2026-11-13"],
    ["2026-11-06T17:00:00Z", "2026-11-14"],
    ["2026-12-27T17:00:00Z", "2027-01-04"],
    ["2028-02-22T17:00:00Z", "2028-03-01"],
  ])("adds seven business calendar days for %s (TEST-F05-07)", (instant, expected) => {
    expect(checkoutDueOn(new Date(instant), "Asia/Bangkok")).toBe(expected);
  });
  it("uses an explicit zone across DST rather than 168 hours", () => {
    expect(checkoutDueOn(new Date("2026-03-02T04:30:00Z"), "America/New_York")).toBe("2026-03-08");
  });
});
