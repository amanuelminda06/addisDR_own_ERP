"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfMonth, zonedDateOnly } from "@/lib/datetime";
import {
  incomeEntrySchema,
  incomeEntryUpdateSchema,
  expenseEntrySchema,
  expenseEntryUpdateSchema,
  allocationRuleSchema,
  savingsTransactionSchema,
  allowanceAdjustmentSchema,
  businessInvestmentSchema,
} from "@/lib/validation";
import { financeEntrySignature } from "@/lib/finance";

export type FinanceFormState = { error?: string; success?: string } | null;

const ENTRY_ENTITY = "FinanceEntry";
const ALLOCATION_ENTITY = "FinancialAllocation";
const SAVINGS_ENTITY = "SavingsTransaction";
const ALLOWANCE_ENTITY = "AllowanceAdjustment";
const INVESTMENT_ENTITY = "BusinessInvestment";

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function textOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dateOnlyOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return zonedDateOnly(value);
}

function optionalId(value: string | undefined): string | null {
  const v = textOrNull(value);
  return v;
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function paymentMethodOrNull(value: string | undefined | null): PaymentMethod | null {
  const v = textOrNull(value);
  return (v as PaymentMethod | null) ?? null;
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    entityType: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    summary: string;
    changes?: Prisma.InputJsonValue | null;
    actorEmail?: string | null;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      changes: input.changes ?? undefined,
      actorEmail: input.actorEmail ?? null,
    },
  });
}

function revalidateFinance(projectId?: string | null): void {
  revalidatePath("/finance");
  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/allocations");
  revalidatePath("/finance/savings");
  revalidatePath("/finance/allowance");
  revalidatePath("/finance/investments");
  revalidatePath("/finance/reports");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/weekly-reports");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

function resolveReceived(status: string, amount: number, amountReceived: unknown): number | null {
  if (status === "RECEIVED") return amount;
  if (status === "PARTIAL") return money(amountReceived);
  return null;
}

export async function createIncomeEntryAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = incomeEntrySchema.safeParse({
    type: "INCOME",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    paymentStatus: formData.get("paymentStatus") ?? "RECEIVED",
    amountReceived: formData.get("amountReceived") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    projectId: formData.get("projectId") ?? "",
    clientId: formData.get("clientId") ?? "",
    reference: formData.get("reference") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const occurredAt = zonedDateOnly(d.occurredAt);
  const dedupeHash = financeEntrySignature({
    type: "INCOME",
    amount: d.amount,
    occurredAt,
    reference: d.reference,
  });

  if (dedupeHash) {
    const duplicate = await prisma.financeEntry.findUnique({ where: { dedupeHash } });
    if (duplicate) {
      return {
        error: "A matching entry already exists (same reference, date and amount).",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    const entry = await tx.financeEntry.create({
      data: {
        type: "INCOME",
        category: d.category,
        amount: d.amount,
        occurredAt,
        paymentStatus: d.paymentStatus,
        amountReceived: resolveReceived(d.paymentStatus, d.amount, d.amountReceived),
        paymentMethod: paymentMethodOrNull(d.paymentMethod),
        projectId: optionalId(d.projectId),
        clientId: optionalId(d.clientId),
        reference: textOrNull(d.reference),
        dueDate: dateOnlyOrNull(d.dueDate),
        description: textOrNull(d.description),
        notes: textOrNull(d.notes),
        dedupeHash,
      },
    });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: entry.id,
      action: "CREATE",
      summary: `Recorded income ${d.amount.toFixed(2)} ETB (${d.category})`,
      changes: {
        type: "INCOME",
        amount: d.amount,
        category: d.category,
        paymentStatus: d.paymentStatus,
      },
      actorEmail: user.email,
    });
  });

  revalidateFinance(d.projectId);
  return { success: "Income recorded." };
}

export async function updateIncomeEntryAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = incomeEntryUpdateSchema.safeParse({
    id: formData.get("id") ?? "",
    type: "INCOME",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    paymentStatus: formData.get("paymentStatus") ?? "RECEIVED",
    amountReceived: formData.get("amountReceived") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    projectId: formData.get("projectId") ?? "",
    clientId: formData.get("clientId") ?? "",
    reference: formData.get("reference") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const existing = await prisma.financeEntry.findUnique({ where: { id: d.id } });
  if (!existing || existing.type !== "INCOME") return { error: "Income entry not found." };

  const occurredAt = zonedDateOnly(d.occurredAt);
  const dedupeHash = financeEntrySignature({
    type: "INCOME",
    amount: d.amount,
    occurredAt,
    reference: d.reference,
  });
  if (dedupeHash && dedupeHash !== existing.dedupeHash) {
    const duplicate = await prisma.financeEntry.findUnique({ where: { dedupeHash } });
    if (duplicate && duplicate.id !== d.id) {
      return { error: "Another matching entry already exists." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.financeEntry.update({
      where: { id: d.id },
      data: {
        category: d.category,
        amount: d.amount,
        occurredAt,
        paymentStatus: d.paymentStatus,
        amountReceived: resolveReceived(d.paymentStatus, d.amount, d.amountReceived),
        paymentMethod: paymentMethodOrNull(d.paymentMethod),
        projectId: optionalId(d.projectId),
        clientId: optionalId(d.clientId),
        reference: textOrNull(d.reference),
        dueDate: dateOnlyOrNull(d.dueDate),
        description: textOrNull(d.description),
        notes: textOrNull(d.notes),
        dedupeHash,
      },
    });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: d.id,
      action: "UPDATE",
      summary: `Updated income (${d.category})`,
      changes: {
        amount: { from: existing.amount.toString(), to: d.amount },
        paymentStatus: { from: existing.paymentStatus, to: d.paymentStatus },
      },
      actorEmail: user.email,
    });
  });

  revalidateFinance(d.projectId);
  return { success: "Income updated." };
}

export async function deleteIncomeEntryAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.financeEntry.findUnique({ where: { id } });
  if (!existing) return;
  await prisma.$transaction(async (tx) => {
    await tx.financeEntry.delete({ where: { id } });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: id,
      action: "DELETE",
      summary: `Deleted income ${money(existing.amount).toFixed(2)} ETB (${existing.category})`,
      actorEmail: user.email,
    });
  });
  revalidateFinance(existing.projectId);
}

export async function markIncomeReceivedAction(entryId: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.financeEntry.findUnique({ where: { id: entryId } });
  if (!existing || existing.type !== "INCOME") return;
  if (existing.paymentStatus === "RECEIVED") return;

  await prisma.$transaction(async (tx) => {
    await tx.financeEntry.update({
      where: { id: entryId },
      data: { paymentStatus: "RECEIVED", amountReceived: existing.amount },
    });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: entryId,
      action: "UPDATE",
      summary: `Marked income fully received (${money(existing.amount).toFixed(2)} ETB)`,
      actorEmail: user.email,
    });
  });
  revalidateFinance(existing.projectId);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function createExpenseEntryAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = expenseEntrySchema.safeParse({
    type: "EXPENSE",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    expenseClass: formData.get("expenseClass") ?? "BUSINESS",
    paymentStatus: formData.get("paymentStatus") ?? "RECEIVED",
    paymentMethod: formData.get("paymentMethod") ?? "",
    projectId: formData.get("projectId") ?? "",
    reference: formData.get("reference") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const occurredAt = zonedDateOnly(d.occurredAt);
  const dedupeHash = financeEntrySignature({
    type: "EXPENSE",
    amount: d.amount,
    occurredAt,
    reference: d.reference,
  });
  if (dedupeHash) {
    const duplicate = await prisma.financeEntry.findUnique({ where: { dedupeHash } });
    if (duplicate) {
      return {
        error: "A matching expense already exists (same reference, date and amount).",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    const entry = await tx.financeEntry.create({
      data: {
        type: "EXPENSE",
        category: d.category,
        amount: d.amount,
        occurredAt,
        expenseClass: d.expenseClass,
        paymentStatus: d.paymentStatus ?? "RECEIVED",
        paymentMethod: paymentMethodOrNull(d.paymentMethod),
        projectId: optionalId(d.projectId),
        reference: textOrNull(d.reference),
        dueDate: dateOnlyOrNull(d.dueDate),
        description: textOrNull(d.description),
        notes: textOrNull(d.notes),
        dedupeHash,
      },
    });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: entry.id,
      action: "CREATE",
      summary: `Recorded ${d.expenseClass.toLowerCase()} expense ${d.amount.toFixed(2)} ETB (${d.category})`,
      changes: {
        type: "EXPENSE",
        amount: d.amount,
        category: d.category,
        expenseClass: d.expenseClass,
      },
      actorEmail: user.email,
    });
  });

  revalidateFinance(d.projectId);
  return { success: "Expense recorded." };
}

export async function updateExpenseEntryAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = expenseEntryUpdateSchema.safeParse({
    id: formData.get("id") ?? "",
    type: "EXPENSE",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    expenseClass: formData.get("expenseClass") ?? "BUSINESS",
    paymentStatus: formData.get("paymentStatus") ?? "RECEIVED",
    paymentMethod: formData.get("paymentMethod") ?? "",
    projectId: formData.get("projectId") ?? "",
    reference: formData.get("reference") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    description: formData.get("description") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const existing = await prisma.financeEntry.findUnique({ where: { id: d.id } });
  if (!existing || existing.type !== "EXPENSE") return { error: "Expense entry not found." };

  const occurredAt = zonedDateOnly(d.occurredAt);
  const dedupeHash = financeEntrySignature({
    type: "EXPENSE",
    amount: d.amount,
    occurredAt,
    reference: d.reference,
  });
  if (dedupeHash && dedupeHash !== existing.dedupeHash) {
    const duplicate = await prisma.financeEntry.findUnique({ where: { dedupeHash } });
    if (duplicate && duplicate.id !== d.id) {
      return { error: "Another matching expense already exists." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.financeEntry.update({
      where: { id: d.id },
      data: {
        category: d.category,
        amount: d.amount,
        occurredAt,
        expenseClass: d.expenseClass,
        paymentStatus: d.paymentStatus ?? "RECEIVED",
        paymentMethod: paymentMethodOrNull(d.paymentMethod),
        projectId: optionalId(d.projectId),
        reference: textOrNull(d.reference),
        dueDate: dateOnlyOrNull(d.dueDate),
        description: textOrNull(d.description),
        notes: textOrNull(d.notes),
        dedupeHash,
      },
    });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: d.id,
      action: "UPDATE",
      summary: `Updated expense (${d.category})`,
      changes: { amount: money(d.amount), expenseClass: d.expenseClass },
      actorEmail: user.email,
    });
  });

  revalidateFinance(d.projectId);
  return { success: "Expense updated." };
}

export async function deleteExpenseEntryAction(entryId: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.financeEntry.findUnique({ where: { id: entryId } });
  if (!existing || existing.type !== "EXPENSE") return;
  await prisma.$transaction(async (tx) => {
    await tx.financeEntry.delete({ where: { id: entryId } });
    await writeAudit(tx, {
      entityType: ENTRY_ENTITY,
      entityId: entryId,
      action: "DELETE",
      summary: `Deleted expense ${money(existing.amount).toFixed(2)} ETB (${existing.category})`,
      actorEmail: user.email,
    });
  });
  revalidateFinance(existing.projectId);
}

// ---------------------------------------------------------------------------
// Allocation rules
// ---------------------------------------------------------------------------

export async function upsertAllocationRuleAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = allocationRuleSchema.safeParse({
    category: formData.get("category"),
    method: formData.get("method") ?? "PERCENT",
    value: formData.get("value") ?? "",
    basis: formData.get("basis") ?? "GROSS",
    sequence: formData.get("sequence") ?? "0",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    const rule = await tx.financialAllocation.upsert({
      where: { category: d.category },
      create: {
        category: d.category,
        method: d.method,
        value: d.value,
        basis: d.basis,
        sequence: d.sequence,
        isActive: d.isActive,
      },
      update: {
        method: d.method,
        value: d.value,
        basis: d.basis,
        sequence: d.sequence,
        isActive: d.isActive,
      },
    });
    await writeAudit(tx, {
      entityType: ALLOCATION_ENTITY,
      entityId: rule.id,
      action: "UPDATE",
      summary: `Allocation rule ${d.category}: ${d.method} ${d.value} (${d.basis})`,
      changes: {
        category: d.category,
        method: d.method,
        value: d.value,
        basis: d.basis,
        sequence: d.sequence,
        isActive: d.isActive,
      },
      actorEmail: user.email,
    });
  });

  revalidateFinance();
  return { success: "Allocation rule saved." };
}

export async function toggleAllocationRuleAction(category: string): Promise<void> {
  const user = await requireUser();
  const rule = await prisma.financialAllocation.findUnique({
    where: { category: category as never },
  });
  if (!rule) return;
  await prisma.$transaction(async (tx) => {
    await tx.financialAllocation.update({
      where: { id: rule.id },
      data: { isActive: !rule.isActive },
    });
    await writeAudit(tx, {
      entityType: ALLOCATION_ENTITY,
      entityId: rule.id,
      action: "UPDATE",
      summary: `${rule.isActive ? "Deactivated" : "Activated"} allocation rule ${rule.category}`,
      actorEmail: user.email,
    });
  });
  revalidateFinance();
}

// ---------------------------------------------------------------------------
// Savings
// ---------------------------------------------------------------------------

export async function upsertSavingsAccountAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const fund = String(formData.get("fund") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const openingBalance = money(formData.get("openingBalance"));
  if (!fund) return { error: "Fund is required." };
  if (!name) return { error: "Name is required." };

  await prisma.$transaction(async (tx) => {
    const account = await tx.savingsAccount.upsert({
      where: { fund: fund as never },
      create: { fund: fund as never, name, openingBalance },
      update: { name, openingBalance },
    });
    await writeAudit(tx, {
      entityType: "SavingsAccount",
      entityId: account.id,
      action: "UPDATE",
      summary: `Savings account ${fund}: opening balance ${openingBalance.toFixed(2)} ETB`,
      actorEmail: user.email,
    });
  });

  revalidateFinance();
  return { success: "Savings account saved." };
}

export async function createSavingsTransactionAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = savingsTransactionSchema.safeParse({
    fund: formData.get("fund"),
    type: formData.get("type") ?? "CONTRIBUTION",
    amount: formData.get("amount") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    reason: formData.get("reason") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const account = await prisma.savingsAccount.findUnique({ where: { fund: d.fund } });
  if (!account) {
    return { error: "Create the savings account for this fund first." };
  }

  const occurredAt = zonedDateOnly(d.occurredAt);

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.savingsTransaction.create({
      data: {
        fundId: account.id,
        type: d.type,
        amount: d.amount,
        occurredAt,
        reason: textOrNull(d.reason),
        notes: textOrNull(d.notes),
      },
    });
    await writeAudit(tx, {
      entityType: SAVINGS_ENTITY,
      entityId: transaction.id,
      action: "CREATE",
      summary: `${d.type === "CONTRIBUTION" ? "Contribution to" : "Withdrawal from"} ${d.fund}: ${d.amount.toFixed(2)} ETB`,
      changes: { fund: d.fund, type: d.type, amount: d.amount },
      actorEmail: user.email,
    });
  });

  revalidateFinance();
  return { success: "Savings transaction recorded." };
}

export async function deleteSavingsTransactionAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.savingsTransaction.findUnique({ where: { id } });
  if (!existing) return;
  await prisma.$transaction(async (tx) => {
    await tx.savingsTransaction.delete({ where: { id } });
    await writeAudit(tx, {
      entityType: SAVINGS_ENTITY,
      entityId: id,
      action: "DELETE",
      summary: `Deleted savings ${existing.type.toLowerCase()} ${money(existing.amount).toFixed(2)} ETB`,
      actorEmail: user.email,
    });
  });
  revalidateFinance();
}

// ---------------------------------------------------------------------------
// Allowance adjustments
// ---------------------------------------------------------------------------

export async function createAllowanceAdjustmentAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = allowanceAdjustmentSchema.safeParse({
    amount: formData.get("amount") ?? "",
    reason: formData.get("reason") ?? "",
    startMonth: formData.get("startMonth") ?? "",
    monthsCount: formData.get("monthsCount") ?? "1",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const startMonth = startOfMonth(zonedDateOnly(d.startMonth));

  await prisma.$transaction(async (tx) => {
    const adjustment = await tx.allowanceAdjustment.create({
      data: {
        amount: d.amount,
        reason: d.reason,
        startMonth,
        monthsCount: d.monthsCount,
        notes: textOrNull(d.notes),
      },
    });
    await writeAudit(tx, {
      entityType: ALLOWANCE_ENTITY,
      entityId: adjustment.id,
      action: "CREATE",
      summary: `Allowance adjustment ${d.amount.toFixed(2)} ETB over ${d.monthsCount} month(s): ${d.reason}`,
      changes: {
        amount: d.amount,
        monthsCount: d.monthsCount,
        startMonth: startMonth.toISOString(),
      },
      actorEmail: user.email,
    });
  });

  revalidateFinance();
  return { success: "Allowance adjustment recorded." };
}

export async function deleteAllowanceAdjustmentAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.allowanceAdjustment.findUnique({ where: { id } });
  if (!existing) return;
  await prisma.$transaction(async (tx) => {
    await tx.allowanceAdjustment.delete({ where: { id } });
    await writeAudit(tx, {
      entityType: ALLOWANCE_ENTITY,
      entityId: id,
      action: "DELETE",
      summary: `Deleted allowance adjustment (${existing.reason})`,
      actorEmail: user.email,
    });
  });
  revalidateFinance();
}

// ---------------------------------------------------------------------------
// Business investments
// ---------------------------------------------------------------------------

export async function createBusinessInvestmentAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const parsed = businessInvestmentSchema.safeParse({
    purpose: formData.get("purpose") ?? "",
    expectedBenefit: formData.get("expectedBenefit") ?? "",
    plannedAmount: formData.get("plannedAmount") ?? "",
    projectId: formData.get("projectId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    const investment = await tx.businessInvestment.create({
      data: {
        purpose: d.purpose,
        expectedBenefit: textOrNull(d.expectedBenefit),
        plannedAmount: d.plannedAmount,
        projectId: optionalId(d.projectId),
        notes: textOrNull(d.notes),
      },
    });
    await writeAudit(tx, {
      entityType: INVESTMENT_ENTITY,
      entityId: investment.id,
      action: "CREATE",
      summary: `Planned investment ${d.plannedAmount.toFixed(2)} ETB: ${d.purpose}`,
      changes: { purpose: d.purpose, plannedAmount: d.plannedAmount },
      actorEmail: user.email,
    });
  });

  revalidateFinance();
  return { success: "Investment planned." };
}

export async function decideBusinessInvestmentAction(
  investmentId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.businessInvestment.findUnique({
    where: { id: investmentId },
  });
  if (!existing || existing.decision !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await tx.businessInvestment.update({
      where: { id: investmentId },
      data: {
        decision,
        status: decision === "APPROVED" ? "APPROVED" : "CANCELLED",
        decidedAt: new Date(),
      },
    });
    await writeAudit(tx, {
      entityType: INVESTMENT_ENTITY,
      entityId: investmentId,
      action: "UPDATE",
      summary: `Investment ${decision.toLowerCase()}: ${existing.purpose}`,
      actorEmail: user.email,
    });
  });

  revalidateFinance();
}

export async function recordInvestmentExpenseAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const user = await requireUser();
  const investmentId = String(formData.get("investmentId") ?? "");
  const actualAmount = money(formData.get("actualAmount"));
  const spendDate = formData.get("spendDate");
  if (!investmentId) return { error: "Investment is required." };
  if (!(actualAmount > 0)) return { error: "Actual amount must be greater than zero." };

  const investment = await prisma.businessInvestment.findUnique({
    where: { id: investmentId },
  });
  if (!investment) return { error: "Investment not found." };
  if (investment.expenseId) {
    return { error: "This investment already has a recorded expense." };
  }

  const spendDateValue = dateOnlyOrNull(String(spendDate ?? "")) ?? zonedDateOnly(new Date());

  await prisma.$transaction(async (tx) => {
    const entry = await tx.financeEntry.create({
      data: {
        type: "EXPENSE",
        category: "Business investment",
        amount: newAmount(actualAmount, investment.plannedAmount),
        occurredAt: spendDateValue,
        expenseClass: "BUSINESS",
        paymentStatus: "RECEIVED",
        paymentMethod: paymentMethodOrNull(String(formData.get("paymentMethod") ?? "")),
        projectId: investment.projectId,
        description: investment.purpose,
        notes: textOrNull(String(formData.get("notes") ?? "")),
      },
    });
    await tx.businessInvestment.update({
      where: { id: investment.id },
      data: {
        actualAmount,
        spendDate: spendDateValue,
        status: investment.decision === "REJECTED" ? "CANCELLED" : "SPENT",
        expenseId: entry.id,
      },
    });
    await writeAudit(tx, {
      entityType: INVESTMENT_ENTITY,
      entityId: investment.id,
      action: "UPDATE",
      summary: `Recorded spend ${actualAmount.toFixed(2)} ETB for: ${investment.purpose}`,
      changes: { actualAmount, expenseId: entry.id },
      actorEmail: user.email,
    });
  });

  revalidateFinance(investment.projectId);
  return { success: "Investment expense recorded." };
}

/** Expense amount uses the recorded figure, falling back to the plan. */
function newAmount(actual: number, planned: unknown): number {
  const value = actual > 0 ? actual : money(planned);
  return value;
}

export async function deleteBusinessInvestmentAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.businessInvestment.findUnique({ where: { id } });
  if (!existing) return;
  await prisma.$transaction(async (tx) => {
    await tx.businessInvestment.delete({ where: { id } });
    await writeAudit(tx, {
      entityType: INVESTMENT_ENTITY,
      entityId: id,
      action: "DELETE",
      summary: `Deleted investment plan: ${existing.purpose}`,
      actorEmail: user.email,
    });
  });
  revalidateFinance();
}
