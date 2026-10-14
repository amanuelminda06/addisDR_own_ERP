import { describe, it, expect } from "vitest";
import {
  addDays,
  endOfWeek,
  formatWeekRange,
  getDayOfWeek,
  planningSaturday,
  reportingSaturday,
  startOfWeek,
  weekKey,
  zonedDateOnly,
} from "@/lib/datetime";

describe("timezone-aware date handling", () => {
  it("normalizes a UTC instant to the Addis Ababa calendar day", () => {
    // 22:00 UTC on Oct 14 is already 01:00 on Oct 15 in Addis (UTC+3).
    expect(zonedDateOnly("2026-10-14T22:00:00Z").toISOString()).toBe(
      "2026-10-15T00:00:00.000Z",
    );
  });

  it("keeps the same day when the UTC time is already the Addis day", () => {
    expect(zonedDateOnly("2026-10-15T08:00:00Z").toISOString()).toBe(
      "2026-10-15T00:00:00.000Z",
    );
  });

  it("resolves Monday as the start of the week", () => {
    const thursday = new Date("2026-10-15T00:00:00.000Z");
    expect(startOfWeek(thursday).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(getDayOfWeek(startOfWeek(thursday))).toBe(1);
  });

  it("resolves the end of the week as Sunday", () => {
    const monday = new Date("2026-10-12T00:00:00.000Z");
    expect(endOfWeek(monday).toISOString()).toBe("2026-10-18T00:00:00.000Z");
  });

  it("places weekly planning on the Saturday before the work week", () => {
    const monday = new Date("2026-10-12T00:00:00.000Z");
    const planning = planningSaturday(monday);
    expect(planning.toISOString()).toBe("2026-10-10T00:00:00.000Z");
    expect(getDayOfWeek(planning)).toBe(6);
  });

  it("places the weekly report on the Saturday after the work week", () => {
    const monday = new Date("2026-10-12T00:00:00.000Z");
    const reporting = reportingSaturday(monday);
    expect(reporting.toISOString()).toBe("2026-10-17T00:00:00.000Z");
    expect(getDayOfWeek(reporting)).toBe(6);
  });

  it("produces a stable week key", () => {
    const monday = new Date("2026-10-12T00:00:00.000Z");
    expect(weekKey(addDays(monday, 4))).toBe("2026-10-12");
  });

  it("formats a readable week range", () => {
    const monday = new Date("2026-10-12T00:00:00.000Z");
    expect(formatWeekRange(monday)).toBe("Oct 12 – Oct 16, 2026");
  });
});
