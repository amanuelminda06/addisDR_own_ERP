import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Idempotent seed:
 * - Creates the single owner account from env (if missing).
 * - Creates default financial allocation rules (tax / tithe / savings) if missing.
 * Safe to run multiple times.
 */
async function main() {
  const email = process.env.OWNER_EMAIL ?? "owner@addisdr.local";
  const name = process.env.OWNER_NAME ?? "AddisDR Owner";
  const password = process.env.OWNER_PASSWORD ?? "changeme123";
  const username =
    process.env.OWNER_USERNAME ?? email.split("@")[0] ?? "owner";

  const existing = await prisma.user.findUnique({
    where: { username },
  });
  if (existing) {
    console.log(`Owner account already exists: ${username}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        username,
        name,
        passwordHash: await bcrypt.hash(password, 12),
        timezone: process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Africa/Addis_Ababa",
        currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "ETB",
        monthlyAllowance: 30000,
      },
    });
    console.log(`Created owner account: ${username}`);
  }

  const defaultRules: {
    category: "TAX" | "TITHE" | "SAVINGS" | "BUSINESS";
    method: "PERCENT" | "FIXED";
    value: number;
    basis: "GROSS" | "AFTER_TAX" | "AFTER_TAX_TITHE" | "AFTER_BUSINESS_EXPENSES" | "REMAINING";
    sequence: number;
    notes: string;
  }[] = [
    {
      category: "TAX",
      method: "PERCENT",
      value: 30,
      basis: "GROSS",
      sequence: 10,
      notes: "Reserve for taxes before personal spending",
    },
    {
      category: "TITHE",
      method: "PERCENT",
      value: 10,
      basis: "AFTER_TAX",
      sequence: 20,
      notes: "Church tithe",
    },
    {
      category: "SAVINGS",
      method: "PERCENT",
      value: 20,
      basis: "AFTER_TAX_TITHE",
      sequence: 30,
      notes: "Savings and long-term investment",
    },
    {
      category: "BUSINESS",
      method: "PERCENT",
      value: 0,
      basis: "AFTER_BUSINESS_EXPENSES",
      sequence: 40,
      notes: "Business reinvestment (set a value to enable)",
    },
  ];

  for (const rule of defaultRules) {
    await prisma.financialAllocation.upsert({
      where: { category: rule.category },
      update: {},
      create: rule,
    });
  }
  console.log("Default allocation rules ensured.");

  const savingsFunds: {
    fund: "GENERAL" | "BUSINESS_STARTUP" | "LONG_TERM_INVESTMENT" | "EMERGENCY";
    name: string;
  }[] = [
    { fund: "GENERAL", name: "General savings" },
    { fund: "BUSINESS_STARTUP", name: "Business startup fund" },
    { fund: "LONG_TERM_INVESTMENT", name: "Long-term investment" },
    { fund: "EMERGENCY", name: "Emergency fund" },
  ];

  for (const account of savingsFunds) {
    await prisma.savingsAccount.upsert({
      where: { fund: account.fund },
      update: {},
      create: { fund: account.fund, name: account.name, openingBalance: 0 },
    });
  }
  console.log("Savings accounts ensured.");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
