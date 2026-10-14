import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "./constants";
import { toNumber } from "./utils";

/**
 * Format an amount as currency (defaults to Ethiopian Birr).
 * Accepts Prisma Decimal, number, or numeric string.
 */
export function formatCurrency(
  amount: unknown,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const value = toNumber(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback for runtimes without the requested locale/currency data.
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatNumber(
  amount: unknown,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(toNumber(amount));
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
