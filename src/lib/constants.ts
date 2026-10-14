export const APP_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Africa/Addis_Ababa";

export const DEFAULT_CURRENCY =
  process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "ETB";

export const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en-ET";

/** Default personal monthly allowance target in ETB. */
export const DEFAULT_MONTHLY_ALLOWANCE = 30000;

/** Suggested income categories (free-text categories are still allowed). */
export const INCOME_CATEGORIES = [
  "Project payment",
  "Retainer",
  "Consulting",
  "Product sale",
  "Training",
  "Other income",
] as const;

/** Common business expense categories. */
export const BUSINESS_EXPENSE_CATEGORIES = [
  "Software subscriptions",
  "Internet",
  "Transportation",
  "Marketing",
  "Printing",
  "Equipment",
  "Office",
  "Professional fees",
  "Other business",
] as const;

export const PERSONAL_EXPENSE_CATEGORIES = [
  "Personal",
  "Food",
  "Rent",
  "Utilities",
  "Health",
  "Family",
  "Transportation",
  "Other personal",
] as const;

/** Default evaluation order for allocation rules. */
export const ALLOCATION_SEQUENCE: Record<string, number> = {
  TAX: 10,
  TITHE: 20,
  SAVINGS: 30,
  BUSINESS: 40,
  OTHER: 50,
  PERSONAL: 60,
};

/** Work schedule constants (see README "operating rules"). */
export const SESSIONS_PER_WORKDAY = 3;
export const SESSION_MINUTES = 180;
export const PLANNED_HOURS_PER_DAY = 9;
export const WORKDAYS = [1, 2, 3, 4, 5] as const; // Monday..Friday (UTC getUTCDay)
export const PLANNED_HOURS_PER_WEEK = PLANNED_HOURS_PER_DAY * WORKDAYS.length;

/** Session display metadata. Session 1 & 2 daytime, session 3 nighttime. */
export const SESSION_DEFINITIONS = [
  { sessionNumber: 1, label: "Session 1 · Morning", period: "Daytime" },
  { sessionNumber: 2, label: "Session 2 · Afternoon", period: "Daytime" },
  { sessionNumber: 3, label: "Session 3 · Evening", period: "Night" },
] as const;
