"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { zonedDateOnly } from "@/lib/datetime";
import {
  marketingActivitySchema,
  marketingActivityUpdateSchema,
} from "@/lib/validation";

export type MarketingFormState = { error?: string; success?: string } | null;

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function textOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function moneyOrNull(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function dateOnlyOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return zonedDateOnly(value);
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    channel: formData.get("channel") ?? "OTHER",
    status: formData.get("status") ?? "PLANNED",
    objective: formData.get("objective") ?? "",
    targetLeads: formData.get("targetLeads") ?? "",
    budget: formData.get("budget") ?? "",
    spend: formData.get("spend") ?? "",
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    notes: formData.get("notes") ?? "",
  };
}

function revalidateMarketing(): void {
  revalidatePath("/marketing");
  revalidatePath("/dashboard");
  revalidatePath("/commercial");
}

export async function createMarketingActivityAction(
  _prev: MarketingFormState,
  formData: FormData,
): Promise<MarketingFormState> {
  await requireUser();
  const parsed = marketingActivitySchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.marketingActivity.create({
    data: {
      name: d.name,
      channel: d.channel,
      status: d.status,
      objective: textOrNull(d.objective),
      targetLeads: intOrNull(d.targetLeads),
      budget: moneyOrNull(d.budget) ?? undefined,
      spend: moneyOrNull(d.spend) ?? undefined,
      startDate: dateOnlyOrNull(d.startDate),
      endDate: dateOnlyOrNull(d.endDate),
      notes: textOrNull(d.notes),
    },
  });

  revalidateMarketing();
  return { success: `Activity "${d.name}" created.` };
}

export async function updateMarketingActivityAction(
  _prev: MarketingFormState,
  formData: FormData,
): Promise<MarketingFormState> {
  await requireUser();
  const parsed = marketingActivityUpdateSchema.safeParse({
    id: formData.get("id"),
    ...readForm(formData),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.marketingActivity.update({
    where: { id: d.id },
    data: {
      name: d.name,
      channel: d.channel,
      status: d.status,
      objective: textOrNull(d.objective),
      targetLeads: intOrNull(d.targetLeads),
      budget: moneyOrNull(d.budget) ?? undefined,
      spend: moneyOrNull(d.spend) ?? undefined,
      startDate: dateOnlyOrNull(d.startDate),
      endDate: dateOnlyOrNull(d.endDate),
      notes: textOrNull(d.notes),
    },
  });

  revalidateMarketing();
  return { success: "Activity updated." };
}

export async function deleteMarketingActivityAction(
  id: string,
): Promise<void> {
  await requireUser();
  await prisma.marketingActivity.delete({ where: { id } });
  revalidateMarketing();
}
