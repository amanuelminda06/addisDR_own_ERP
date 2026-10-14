import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/currency";
import { toNumber } from "@/lib/utils";

describe("toNumber", () => {
  it("handles numbers, strings, null and Prisma-Decimal-like values", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber("42.5")).toBe(42.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber({ toNumber: () => 5.25 })).toBe(5.25);
  });

  it("never returns NaN", () => {
    expect(toNumber("not-a-number")).toBe(0);
    expect(toNumber({})).toBe(0);
  });
});

describe("currency formatting", () => {
  it("formats ETB amounts with two decimals", () => {
    const formatted = formatCurrency(1234.5);
    expect(formatted).toContain("1,234.50");
  });

  it("formats zero and null as 0.00", () => {
    expect(formatCurrency(null)).toContain("0.00");
    expect(formatCurrency(0)).toContain("0.00");
  });

  it("does not throw for an unknown locale", () => {
    expect(() => formatCurrency(100, "ETB", "xx-XX")).not.toThrow();
  });
});

describe("number and percent formatting", () => {
  it("formats numbers", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("formats fractions as percent strings", () => {
    expect(formatPercent(0.15)).toBe("15.0%");
  });
});
