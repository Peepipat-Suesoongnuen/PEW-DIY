import { describe, expect, it } from "vitest";
import * as loanService from "../src/services/loan";

describe("Sprint 2 TDD domain rules (BR-07 flexible 1-14 day duration)", () => {
  it("computes due_on using requested_days (14 days) in Asia/Bangkok instead of hardcoded 7 days", () => {
    const fn = loanService.checkoutDueOn as (instant: Date, timeZone: string, days?: number) => string;
    const result = fn(new Date("2026-11-23T12:00:00Z"), "Asia/Bangkok", 14);
    expect(result).toBe("2026-12-07");
  });

  it("computes due_on using requested_days (1 day) across UTC/Bangkok midnight boundary", () => {
    const fn = loanService.checkoutDueOn as (instant: Date, timeZone: string, days?: number) => string;
    // 2026-11-23T18:00:00Z is 2026-11-24T01:00:00+07:00 in Asia/Bangkok -> +1 day = 2026-11-25
    const result = fn(new Date("2026-11-23T18:00:00Z"), "Asia/Bangkok", 1);
    expect(result).toBe("2026-11-25");
  });
});

describe("Sprint 2 TDD domain rules (BR-08 derived overdue boundary)", () => {
  it("marks active loan NOT overdue when business_today === due_on, overdue when business_today > due_on, and never overdue when returned", () => {
    const isOverdue = (loanService as unknown as {
      isLoanOverdue: (dueOn: string, returnedAt: string | null, businessToday: string) => boolean;
    }).isLoanOverdue;
    expect(isOverdue("2026-11-30", null, "2026-11-30")).toBe(false);
    expect(isOverdue("2026-11-30", null, "2026-12-01")).toBe(true);
    expect(isOverdue("2026-11-30", "2026-12-01T00:01:00Z", "2026-12-05")).toBe(false);
  });
});

