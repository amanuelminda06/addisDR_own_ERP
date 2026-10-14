import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CRON_REMINDERS_PATH, isCronAuthorized } from "@/lib/cron";

const SECRET = "test-cron-secret";

describe("isCronAuthorized", () => {
  it("accepts the matching bearer token", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(isCronAuthorized("Bearer nope", SECRET)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isCronAuthorized(null, SECRET)).toBe(false);
    expect(isCronAuthorized(undefined, SECRET)).toBe(false);
  });

  it("rejects a bare token without the Bearer scheme", () => {
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false);
  });

  it("rejects every request when no secret is configured", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(isCronAuthorized(`Bearer ${SECRET}`, "")).toBe(false);
  });

  it("is case-sensitive and whitespace-sensitive", () => {
    expect(isCronAuthorized(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isCronAuthorized(`Bearer  ${SECRET}`, SECRET)).toBe(false);
  });
});

describe("cron route path", () => {
  it("matches the path declared in vercel.json", () => {
    expect(CRON_REMINDERS_PATH).toBe("/api/cron/reminders");
  });

  it("is actually scheduled in vercel.json", () => {
    const raw = readFileSync(
      fileURLToPath(new URL("../vercel.json", import.meta.url)),
      "utf8",
    );
    const config = JSON.parse(raw) as {
      crons?: { path: string; schedule: string }[];
    };
    const cron = config.crons?.find((c) => c.path === CRON_REMINDERS_PATH);
    expect(cron).toBeDefined();
    expect(cron?.schedule).toBeTruthy();
  });
});
