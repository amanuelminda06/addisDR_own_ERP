"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  endSession,
  getCurrentUser,
  hashPassword,
  ownerCount,
  requireUser,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import {
  loginSchema,
  passwordChangeSchema,
  settingsSchema,
  setupSchema,
} from "@/lib/validation";
import { DEFAULT_CURRENCY, APP_TIMEZONE } from "@/lib/constants";

export type FormState = { error?: string; success?: string } | null;

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid username or password" };
  }

  await startSession(user);
  redirect("/dashboard");
}

export async function setupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if ((await ownerCount()) > 0) {
    return { error: "An owner account already exists. Please sign in." };
  }

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        timezone: APP_TIMEZONE,
        currency: DEFAULT_CURRENCY,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { error: "That username or email is already in use." };
    }
    throw error;
  }

  await startSession(user);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    monthlyAllowance: formData.get("monthlyAllowance"),
    accountabilityPartnerName: formData.get("accountabilityPartnerName") ?? "",
    accountabilityPartnerEmail: formData.get("accountabilityPartnerEmail") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  if (parsed.data.username !== user.username) {
    const taken = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });
    if (taken && taken.id !== user.id) {
      return { error: "That username is already in use." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency.toUpperCase(),
      monthlyAllowance: parsed.data.monthlyAllowance,
      accountabilityPartnerName: parsed.data.accountabilityPartnerName || null,
      accountabilityPartnerEmail: parsed.data.accountabilityPartnerEmail || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Profile and rules updated." };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { success: "Password updated." };
}

/** Convenience accessor used by server components that need the owner. */
export async function currentUser() {
  return getCurrentUser();
}
