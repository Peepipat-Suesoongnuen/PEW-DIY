import { describe, expect, it } from "vitest";
import { assertRequestAvailable } from "../src/services/borrowing-request";

describe("BR-01 request availability (TEST-F04-13)", () => {
  it("rejects unavailable equipment before persisting a request", () => {
    expect(() => assertRequestAvailable(0)).toThrow("INSUFFICIENT_AVAILABILITY");
  });

  it("accepts an available item without reserving its units", () => {
    expect(() => assertRequestAvailable(1)).not.toThrow();
  });
});
