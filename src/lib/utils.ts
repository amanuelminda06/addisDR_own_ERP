import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Convert a Prisma Decimal (or number/string) into a plain number.
 * Returns 0 for null/undefined so financial arithmetic never yields NaN.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "object" && value !== null) {
    const maybe = value as { toNumber?: () => number; toString?: () => string };
    if (typeof maybe.toNumber === "function") {
      const n = maybe.toNumber();
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(maybe.toString?.());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
