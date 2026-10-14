import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { allowanceAdjustmentForMonth, totalSavings, type SavingsFundValue } from "./finance";
import { toNumber } from "./utils";

export const financeEntrySelect = {
  id: true,
  type: true,
  category: true,
  amount: true,
  amountReceived: true,
  paymentStatus: true,
  expenseClass: true,
  occurredAt: true,
  projectId: true,
  clientId: true,
  reference: true,
  description: true,
  dueDate: true,
  paymentMethod: true,
  createdAt: true,
} satisfies Prisma.FinanceEntrySelect;

export type FinanceEntryRow = Prisma.FinanceEntryGetPayload<{
  select: typeof financeEntrySelect;
}>;

/** Projects and clients for the finance entry selects. */
export async function getFinanceLookups() {
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { projects, clients };
}

/**
 * The personal allowance target for a month after subtracting any active
 * allowance adjustments (borrowing against future allowance).
 */
export async function monthlyAllowanceTarget(
  monthStart: Date,
  baseAllowance: unknown,
): Promise<{ target: number; adjustment: number }> {
  const adjustments = await prisma.allowanceAdjustment.findMany();
  const adjustment = allowanceAdjustmentForMonth(adjustments, monthStart);
  return {
    adjustment,
    target: Math.max(toNumber(baseAllowance) - adjustment, 0),
  };
}

export type SavingsBalances = Record<SavingsFundValue, number>;

/** Opening balances plus contributions minus withdrawals, per fund. */
export async function getSavingsWithTotal(): Promise<{
  accounts: { id: string; fund: string; name: string; openingBalance: unknown }[];
  transactions: {
    id: string;
    fundId: string;
    type: string;
    amount: unknown;
    occurredAt: Date;
    reason: string | null;
  }[];
  balances: Record<SavingsFundValue, number>;
  total: number;
}> {
  const [accounts, transactions] = await Promise.all([
    prisma.savingsAccount.findMany({ orderBy: { fund: "asc" } }),
    prisma.savingsTransaction.findMany({ orderBy: { occurredAt: "desc" } }),
  ]);

  const balances: Record<SavingsFundValue, number> = {
    GENERAL: 0,
    BUSINESS_STARTUP: 0,
    LONG_TERM_INVESTMENT: 0,
    EMERGENCY: 0,
  };
  const fundById = new Map<string, SavingsFundValue>();
  for (const acc of accounts) {
    balances[acc.fund as SavingsFundValue] =
      (balances[acc.fund as SavingsFundValue] ?? 0) + toNumber(acc.openingBalance);
    fundById.set(acc.id, acc.fund as SavingsFundValue);
  }
  for (const t of transactions) {
    const fund = fundById.get(t.fundId);
    if (!fund) continue;
    const delta = t.type === "CONTRIBUTION" ? toNumber(t.amount) : -toNumber(t.amount);
    balances[fund] = (balances[fund] ?? 0) + delta;
  }
  return { accounts, transactions, balances, total: totalSavings(balances) };
}
