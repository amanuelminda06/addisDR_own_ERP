import { addDays, endOfMonth, startOfMonth } from "./datetime";
import { toNumber } from "./utils";

/**
 * Pure financial rules for AddisDR ERP (Phase 3).
 * No I/O: every function takes plain data so it can be unit tested.
 *
 * Money conventions
 * ---------------------------------------------------------------------------
 * - Only *received* income drives cash-flow allocations. An income entry is
 *   cash only when its payment status is RECEIVED, or PARTIAL with an
 *   `amountReceived` recorded. PROJECTED money is never allocated or taxed.
 * - An invoiced but unpaid entry (INVOICED or the unpaid part of PARTIAL) is
 *   tracked as outstanding payment, not as income.
 * - Allocations are transfers of received cash (tax, tithe, savings, reinvest),
 *   never expenses, so they are never double-counted against profit.
 * - Net profit = received income − business expenses. The personal allowance is
 *   a distribution of profit, not a business expense.
 */

export type FinanceEntryTypeValue = "INCOME" | "EXPENSE";
export type PaymentStatusValue =
  | "PROJECTED"
  | "INVOICED"
  | "PARTIAL"
  | "RECEIVED"
  | "CANCELLED";
export type ExpenseClassValue = "BUSINESS" | "PERSONAL";
export type AllocationCategoryValue =
  | "TAX"
  | "TITHE"
  | "SAVINGS"
  | "BUSINESS"
  | "PERSONAL"
  | "OTHER";
export type AllocationMethodValue = "FIXED" | "PERCENT";
export type AllocationBasisValue =
  | "GROSS"
  | "AFTER_TAX"
  | "AFTER_TAX_TITHE"
  | "AFTER_BUSINESS_EXPENSES"
  | "REMAINING";
export type SavingsFundValue =
  | "GENERAL"
  | "BUSINESS_STARTUP"
  | "LONG_TERM_INVESTMENT"
  | "EMERGENCY";

export type FinanceEntryLike = {
  type: "INCOME" | "EXPENSE";
  amount: unknown;
  amountReceived?: unknown;
  paymentStatus?: PaymentStatusValue | null;
  expenseClass?: ExpenseClassValue | null;
  category?: string | null;
  occurredAt?: Date | string | null;
  projectId?: string | null;
  clientId?: string | null;
  reference?: string | null;
};

/** Money is rounded to two decimal places (ETB cents) at every boundary. */
export function round2(value: unknown): number {
  const n = toNumber(value);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isInRange(
  value: Date | string | null | undefined,
  start: Date,
  end: Date,
): boolean {
  if (value === null || value === undefined) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t < end.getTime();
}

/**
 * Cash actually received from an income entry.
 * RECEIVED → full amount; PARTIAL → amountReceived; everything else → 0.
 * Legacy entries without a status are treated as RECEIVED.
 */
export function entryReceived(entry: FinanceEntryLike): number {
  if (entry.type !== "INCOME") return 0;
  const status = entry.paymentStatus ?? "RECEIVED";
  if (status === "RECEIVED") return round2(entry.amount);
  if (status === "PARTIAL") {
    return round2(Math.min(toNumber(entry.amountReceived), toNumber(entry.amount)));
  }
  return 0;
}

/** Amount billed (full value) for an entry that has been invoiced. */
export function entryInvoiced(entry: FinanceEntryLike): number {
  if (entry.type !== "INCOME") return 0;
  const status = entry.paymentStatus ?? "RECEIVED";
  if (status === "INVOICED" || status === "PARTIAL") return round2(entry.amount);
  return 0;
}

/** Amount still owed on an income entry. */
export function entryOutstanding(entry: FinanceEntryLike): number {
  if (entry.type !== "INCOME") return 0;
  const status = entry.paymentStatus ?? "RECEIVED";
  if (status === "INVOICED") return round2(entry.amount);
  if (status === "PARTIAL") {
    return round2(Math.max(toNumber(entry.amount) - toNumber(entry.amountReceived), 0));
  }
  return 0;
}

/** Projected (not yet invoiced) revenue for an income entry. */
export function entryProjected(entry: FinanceEntryLike): number {
  if (entry.type !== "INCOME") return 0;
  return (entry.paymentStatus ?? "RECEIVED") === "PROJECTED"
    ? round2(entry.amount)
    : 0;
}

/** Whether an expense entry counts toward spending (CANCELLED excluded). */
export function isActiveExpense(entry: FinanceEntryLike): boolean {
  return entry.type === "EXPENSE" && (entry.paymentStatus ?? "RECEIVED") !== "CANCELLED";
}

function sum(entries: FinanceEntryLike[], fn: (e: FinanceEntryLike) => number): number {
  return round2(entries.reduce((acc, e) => acc + fn(e), 0));
}

export function receivedIncome(entries: FinanceEntryLike[]): number {
  return sum(entries, entryReceived);
}

export function invoicedAmount(entries: FinanceEntryLike[]): number {
  return sum(entries, entryInvoiced);
}

export function projectedRevenue(entries: FinanceEntryLike[]): number {
  return sum(entries, entryProjected);
}

export function outstandingPayments(entries: FinanceEntryLike[]): number {
  return sum(entries, entryOutstanding);
}

/** Business expenses (default for legacy entries, which have no class). */
export function businessExpenses(entries: FinanceEntryLike[]): number {
  return sum(
    entries,
    (e) => (isActiveExpense(e) && expenseClassOf(e) === "BUSINESS" ? round2(e.amount) : 0),
  );
}

export function personalExpenses(entries: FinanceEntryLike[]): number {
  return sum(
    entries,
    (e) => (isActiveExpense(e) && expenseClassOf(e) === "PERSONAL" ? round2(e.amount) : 0),
  );
}

export function expensesTotal(entries: FinanceEntryLike[]): number {
  return round2(businessExpenses(entries) + personalExpenses(entries));
}

/**
 * Expense classification. Phase 3 entries carry `expenseClass`; Phase 1/2
 * entries fall back to the legacy "Personal" category.
 */
export function expenseClassOf(entry: FinanceEntryLike): ExpenseClassValue {
  if (entry.expenseClass === "PERSONAL" || entry.expenseClass === "BUSINESS") {
    return entry.expenseClass;
  }
  return entry.category === "Personal" ? "PERSONAL" : "BUSINESS";
}

/** Net profit = received income − business expenses. */
export function netProfit(entries: FinanceEntryLike[]): number {
  return round2(receivedIncome(entries) - businessExpenses(entries));
}

export type FinanceSummary = {
  receivedIncome: number;
  invoicedAmount: number;
  projectedRevenue: number;
  outstandingPayments: number;
  businessExpenses: number;
  personalExpenses: number;
  expensesTotal: number;
  netProfit: number;
};

/** Headline figures for a set of finance entries over any period. */
export function summarizeFinance(entries: FinanceEntryLike[]): FinanceSummary {
  const business = businessExpenses(entries);
  return {
    receivedIncome: receivedIncome(entries),
    invoicedAmount: invoicedAmount(entries),
    projectedRevenue: projectedRevenue(entries),
    outstandingPayments: outstandingPayments(entries),
    businessExpenses: business,
    personalExpenses: personalExpenses(entries),
    expensesTotal: round2(business + personalExpenses(entries)),
    netProfit: round2(receivedIncome(entries) - business),
  };
}

export type ProjectLike = {
  budget?: unknown;
  agreedPrice?: unknown;
};

export type ProjectFinancialSummary = {
  /** `Project.agreedPrice` (falling back to `Project.budget`) is the agreed project value. */
  agreedValue: number;
  received: number;
  invoiced: number;
  projected: number;
  outstanding: number;
  expenses: number;
  netProfit: number;
  remainingToInvoice: number;
  overAgreed: boolean;
};

/** Revenue and profitability for a single project. */
export function projectFinancialSummary(
  project: ProjectLike,
  entries: FinanceEntryLike[],
): ProjectFinancialSummary {
  const agreedValue = round2(project.agreedPrice ?? project.budget);
  const received = receivedIncome(entries);
  const invoiced = invoicedAmount(entries);
  const projected = projectedRevenue(entries);
  const expenses = businessExpenses(entries);

  return {
    agreedValue,
    received,
    invoiced,
    projected,
    outstanding: outstandingPayments(entries),
    expenses,
    netProfit: round2(received - expenses),
    remainingToInvoice: round2(Math.max(agreedValue - invoiced, 0)),
    overAgreed: invoiced > agreedValue,
  };
}

// ---------------------------------------------------------------------------
// Partial payment / collection tracking
// ---------------------------------------------------------------------------

export type ProjectPaymentLike = {
  amount: unknown;
  receivedAt?: Date | string | null;
};

export type CollectionScheduleLike = {
  expectedAmount: unknown;
  expectedDate: Date | string;
  receivedAmount?: unknown;
  status?: string | null;
};

export type ProjectCollectionSummary = {
  agreedValue: number;
  totalCollected: number;
  outstandingBalance: number;
  collectedPct: number;
  isFullyPaid: boolean;
  isOverpaid: boolean;
  payments: number;
  remainingMilestones: number;
  overdueMilestones: number;
};

/**
 * Summarize a project's collection position from its agreed price and the
 * confirmed payments received. Only *received* cash counts — invoices and
 * promised installments are never treated as collected income.
 */
export function summarizeProjectCollection(
  project: ProjectLike,
  payments: ProjectPaymentLike[],
  milestones: CollectionScheduleLike[] = [],
  now: Date = new Date(),
): ProjectCollectionSummary {
  const agreedValue = round2(project.agreedPrice ?? project.budget);
  const totalCollected = round2(
    payments.reduce((acc, p) => acc + round2(p.amount), 0),
  );

  const outstandingBalance = round2(Math.max(agreedValue - totalCollected, 0));
  const collectedPct = agreedValue > 0 ? round2(totalCollected / agreedValue) : 0;

  const remainingMilestones = milestones.filter(
    (m) => (m.status ?? "PENDING") !== "RECEIVED" && (m.status ?? "PENDING") !== "CANCELLED",
  ).length;

  const overdueMilestones = milestones.filter(
    (m) =>
      (m.status ?? "PENDING") !== "RECEIVED" &&
      (m.status ?? "PENDING") !== "CANCELLED" &&
      new Date(m.expectedDate).getTime() < now.getTime(),
  ).length;

  return {
    agreedValue,
    totalCollected,
    outstandingBalance,
    collectedPct,
    isFullyPaid: agreedValue > 0 && outstandingBalance <= 0,
    isOverpaid: totalCollected > agreedValue,
    payments: payments.length,
    remainingMilestones,
    overdueMilestones,
  };
}

// ---------------------------------------------------------------------------
// Allocation engine
// ---------------------------------------------------------------------------

export type AllocationRuleLike = {
  category: AllocationCategoryValue;
  method: "FIXED" | "PERCENT";
  value: unknown;
  basis: AllocationBasisValue;
  sequence: number;
  isActive: boolean;
};

export type FinancialPlanStep = {
  category: AllocationCategoryValue;
  basis: AllocationBasisValue;
  method: "FIXED" | "PERCENT";
  value: number;
  basisAmount: number;
  amount: number;
};

export type FinancialPlan = {
  grossReceived: number;
  businessExpenses: number;
  allowanceTarget: number;
  tax: number;
  tithe: number;
  savings: number;
  businessReserve: number;
  otherReserve: number;
  totalReserved: number;
  distributable: number;
  personalAvailable: number;
  personalShortfall: number;
  excessToSavings: number;
  steps: FinancialPlanStep[];
  warnings: string[];
};

export type FinancialPlanInput = {
  grossReceived: unknown;
  businessExpenses?: unknown;
  allowanceTarget: unknown;
  rules: AllocationRuleLike[];
};

/** Rule evaluation order, used as a tie-breaker when sequences are equal. */
export const ALLOCATION_CATEGORY_ORDER: AllocationCategoryValue[] = [
  "TAX",
  "TITHE",
  "SAVINGS",
  "BUSINESS",
  "OTHER",
  "PERSONAL",
];

/**
 * Allocate *received* income across the active rules in sequence order.
 * Business expenses are deducted before the distributable amount is computed.
 * The personal allowance is the remainder, capped at the allowance target;
 * anything above the target is redirected to savings, and any shortfall is
 * reported rather than silently borrowing from future months.
 */
export function computeFinancialPlan(input: FinancialPlanInput): FinancialPlan {
  const gross = round2(input.grossReceived);
  const business = round2(input.businessExpenses);
  const target = round2(Math.max(toNumber(input.allowanceTarget), 0));

  const rules = input.rules
    .filter((r) => r.isActive && r.category !== "PERSONAL")
    .sort(
      (a, b) =>
        a.sequence - b.sequence ||
        ALLOCATION_CATEGORY_ORDER.indexOf(a.category) -
          ALLOCATION_CATEGORY_ORDER.indexOf(b.category),
    );

  let tax = 0;
  let tithe = 0;
  let savings = 0;
  let businessReserve = 0;
  let otherReserve = 0;

  const basisAmount = (basis: AllocationBasisValue): number => {
    switch (basis) {
      case "GROSS":
        return gross;
      case "AFTER_TAX":
        return round2(Math.max(gross - tax, 0));
      case "AFTER_TAX_TITHE":
        return round2(Math.max(gross - tax - tithe, 0));
      case "AFTER_BUSINESS_EXPENSES":
        return round2(Math.max(gross - business, 0));
      case "REMAINING":
        return round2(
          Math.max(
            gross - business - tax - tithe - savings - businessReserve - otherReserve,
            0,
          ),
        );
    }
  };

  const steps: FinancialPlanStep[] = [];
  for (const rule of rules) {
    const base = basisAmount(rule.basis);
    const value = toNumber(rule.value);
    const amount = round2(rule.method === "FIXED" ? value : (base * value) / 100);
    steps.push({
      category: rule.category,
      basis: rule.basis,
      method: rule.method,
      value,
      basisAmount: base,
      amount,
    });

    switch (rule.category) {
      case "TAX":
        tax = round2(tax + amount);
        break;
      case "TITHE":
        tithe = round2(tithe + amount);
        break;
      case "SAVINGS":
        savings = round2(savings + amount);
        break;
      case "BUSINESS":
        businessReserve = round2(businessReserve + amount);
        break;
      case "OTHER":
        otherReserve = round2(otherReserve + amount);
        break;
      case "PERSONAL":
        break;
    }
  }

  const totalReserved = round2(tax + tithe + savings + businessReserve + otherReserve);
  const distributable = round2(Math.max(gross - business - totalReserved, 0));
  const personalAvailable = round2(Math.min(distributable, target));
  const personalShortfall = round2(Math.max(target - distributable, 0));
  const excessToSavings = round2(Math.max(distributable - target, 0));

  const warnings: string[] = [];
  if (personalShortfall > 0) {
    warnings.push(
      `Received income cannot cover the full ${target.toFixed(2)} ETB allowance (short by ${personalShortfall.toFixed(2)}).`,
    );
  }
  if (gross > 0 && tax > gross) {
    warnings.push("Tax allocation exceeds received income.");
  }
  if (totalReserved > gross) {
    warnings.push("Reserved allocations exceed received income.");
  }

  return {
    grossReceived: gross,
    businessExpenses: business,
    allowanceTarget: target,
    tax,
    tithe,
    savings,
    businessReserve,
    otherReserve,
    totalReserved,
    distributable,
    personalAvailable,
    personalShortfall,
    excessToSavings,
    steps,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Allowance adjustments (borrowing against future personal allowance)
// ---------------------------------------------------------------------------

export type AllowanceAdjustmentLike = {
  amount: unknown;
  startMonth: Date | string;
  monthsCount: number;
};

export function adjustmentPerMonth(amount: unknown, monthsCount: unknown): number {
  const months = Math.max(Math.trunc(toNumber(monthsCount)), 1);
  return round2(toNumber(amount) / months);
}

function sameMonth(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  );
}

/** Total per-month reduction applied to the allowance in `monthStart`. */
export function allowanceAdjustmentForMonth(
  adjustments: AllowanceAdjustmentLike[],
  monthStart: Date,
): number {
  const target = startOfMonth(monthStart);
  let total = 0;
  for (const adj of adjustments) {
    const months = Math.max(Math.trunc(toNumber(adj.monthsCount)), 1);
    const start = startOfMonth(new Date(adj.startMonth));
    for (let i = 0; i < months; i++) {
      const month = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1),
      );
      if (sameMonth(month, target)) {
        total += adjustmentPerMonth(adj.amount, months);
      }
    }
  }
  return round2(total);
}

/** Allowance target after subtracting any active monthly adjustments. */
export function effectiveAllowanceTarget(
  base: unknown,
  adjustments: AllowanceAdjustmentLike[],
  monthStart: Date,
): number {
  return round2(
    Math.max(toNumber(base) - allowanceAdjustmentForMonth(adjustments, monthStart), 0),
  );
}

// ---------------------------------------------------------------------------
// Savings accounts
// ---------------------------------------------------------------------------

export type SavingsAccountLike = {
  fund: SavingsFundValue;
  openingBalance?: unknown;
};

export type SavingsTransactionLike = {
  fund: SavingsFundValue;
  type: "CONTRIBUTION" | "WITHDRAWAL";
  amount: unknown;
};

/** Balance per savings fund: opening balance + contributions − withdrawals. */
export function savingsBalances(
  accounts: SavingsAccountLike[],
  transactions: SavingsTransactionLike[],
): Record<SavingsFundValue, number> {
  const balances: Record<SavingsFundValue, number> = {
    GENERAL: 0,
    BUSINESS_STARTUP: 0,
    LONG_TERM_INVESTMENT: 0,
    EMERGENCY: 0,
  };

  for (const account of accounts) {
    balances[account.fund] = round2(
      balances[account.fund] + toNumber(account.openingBalance),
    );
  }
  for (const tx of transactions) {
    const amount = round2(tx.amount);
    balances[tx.fund] =
      tx.type === "CONTRIBUTION"
        ? round2(balances[tx.fund] + amount)
        : round2(balances[tx.fund] - amount);
  }
  return balances;
}

export function totalSavings(balances: Record<SavingsFundValue, number>): number {
  return round2(
    (Object.values(balances) as number[]).reduce((acc, v) => acc + v, 0),
  );
}

export type EmergencyWithdrawalAssessment = {
  newBalance: number;
  overdraw: boolean;
  warning: string | null;
};

/**
 * Assess a planned withdrawal from the emergency fund. Withdrawals are allowed
 * but flagged when they would empty the fund or take it negative.
 */
export function emergencyWithdrawalWarning(
  balance: unknown,
  amount: unknown,
): EmergencyWithdrawalAssessment {
  const current = round2(balance);
  const withdraw = round2(amount);
  const newBalance = round2(current - withdraw);

  if (newBalance < 0) {
    return {
      newBalance,
      overdraw: true,
      warning: "This withdrawal exceeds the emergency fund balance.",
    };
  }
  if (newBalance === 0 && current > 0) {
    return {
      newBalance,
      overdraw: false,
      warning: "This withdrawal would empty the emergency fund.",
    };
  }
  if (current > 0 && withdraw >= current * 0.5) {
    return {
      newBalance,
      overdraw: false,
      warning: "This withdrawal uses at least half of the emergency fund.",
    };
  }
  return { newBalance, overdraw: false, warning: null };
}

// ---------------------------------------------------------------------------
// Duplicate prevention
// ---------------------------------------------------------------------------

/**
 * Stable signature used to reject duplicate entries. Returns null when there is
 * no reference, because entries without a reference are never deduplicated.
 */
export function financeEntrySignature(entry: {
  type: "INCOME" | "EXPENSE";
  amount: unknown;
  occurredAt: Date | string;
  reference?: string | null;
}): string | null {
  const reference = (entry.reference ?? "").trim().toLowerCase();
  if (!reference) return null;
  const date = new Date(entry.occurredAt);
  const day = Number.isNaN(date.getTime())
    ? "unknown"
    : date.toISOString().slice(0, 10);
  return [
    entry.type.toLowerCase(),
    reference,
    day,
    round2(entry.amount).toFixed(2),
  ].join("|");
}

// ---------------------------------------------------------------------------
// Reporting periods and trends
// ---------------------------------------------------------------------------

export type PeriodRange = { start: Date; end: Date };

/** `[startOfMonth, startOfNextMonth)` for the month containing `date`. */
export function monthRange(date: Date): PeriodRange {
  const start = startOfMonth(date);
  return { start, end: addDays(endOfMonth(date), 1) };
}

export type PeriodStatus = "past" | "current" | "future";

/** Where `date` sits relative to `[start, end)` and `now`. */
export function periodStatus(start: Date, end: Date, now: Date): PeriodStatus {
  if (now.getTime() >= end.getTime()) return "past";
  if (now.getTime() < start.getTime()) return "future";
  return "current";
}

export type MonthTrendBucket = {
  monthStart: Date;
  summary: FinanceSummary;
};

/**
 * Per-month income / expense / profit trend for the given month starts.
 * Entries are bucketed by `occurredAt`.
 */
export function incomeExpenditureTrend(
  entries: FinanceEntryLike[],
  months: Date[],
): MonthTrendBucket[] {
  return months.map((monthStart) => {
    const { start, end } = monthRange(monthStart);
    const inMonth = entries.filter((e) => isInRange(e.occurredAt, start, end));
    return { monthStart: start, summary: summarizeFinance(inMonth) };
  });
}
