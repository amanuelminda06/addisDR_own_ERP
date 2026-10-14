import { z } from "zod";

export const REMINDER_TYPES = [
  "WORK_SESSION",
  "TASK_REVIEW",
  "SALES_FOLLOWUP",
  "MEETING",
  "WEEKLY_PLANNING",
  "WEEKLY_REPORT",
  "MISSING_REPORT",
  "MONTHLY_PERFORMANCE",
  "MONTHLY_FINANCE",
  "SPENDING_LIMIT",
  "DEADLINE",
  "OVERDUE_TASK",
  "CUSTOM",
] as const;

export const REMINDER_CHANNELS = ["IN_APP", "EMAIL", "SMS"] as const;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const MILESTONE_STAGES = [
  "FIRST_CONTACT",
  "NEEDS_ASSESSMENT",
  "PROPOSAL_SENT",
  "FOLLOW_UP",
  "NEGOTIATION",
  "DECISION",
  "CONTRACT",
] as const;

export const CONTACT_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "MESSAGE",
] as const;

export const FOLLOW_UP_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const MARKETING_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const MARKETING_CHANNELS = [
  "REFERRAL",
  "SOCIAL_MEDIA",
  "EMAIL",
  "EVENT",
  "CONTENT",
  "PAID_ADS",
  "DIRECT",
  "PARTNERSHIP",
  "OTHER",
] as const;

// --- Shared field helpers --------------------------------------------------

const optionalText = (max = 2000) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalDateString = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
    "Enter a valid date",
  )
  .optional()
  .or(z.literal(""));

const optionalMoney = z
  .union([z.literal(""), z.coerce.number().min(0, "Cannot be negative").max(1_000_000_000)])
  .optional();

const optionalInt = (max = 1_000_000) =>
  z
    .union([z.literal(""), z.coerce.number().int("Enter a whole number").min(0).max(max)])
    .optional();

export const leadCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  contactName: optionalText(160),
  company: optionalText(160),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: optionalText(40),
  category: optionalText(80),
  area: optionalText(80),
  address: optionalText(200),
  source: optionalText(80),
  status: z.enum(LEAD_STATUSES).default("NEW"),
  priority: z.enum(LEAD_PRIORITIES).default("MEDIUM"),
  estimatedValue: optionalMoney,
  probability: optionalInt(100),
  expectedCloseAt: optionalDateString,
  nextAction: optionalText(200),
  nextActionAt: optionalDateString,
  notes: optionalText(4000),
  marketingActivityId: z.string().trim().optional().or(z.literal("")),
});

export const leadUpdateSchema = leadCreateSchema.extend({
  id: z.string().min(1),
  lostReason: optionalText(400),
});

export const milestoneCreateSchema = z.object({
  leadId: z.string().min(1),
  stage: z.enum(MILESTONE_STAGES),
  notes: optionalText(1000),
  reachedAt: optionalDateString,
});

export const followUpCreateSchema = z.object({
  leadId: z.string().min(1),
  dueAt: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date"),
  channel: z.enum(CONTACT_TYPES).default("CALL"),
  purpose: optionalText(200),
  notes: optionalText(1000),
});

export const followUpRescheduleSchema = z.object({
  followUpId: z.string().min(1),
  dueAt: z
    .string()
    .min(1, "New due date is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date"),
  reason: optionalText(200),
});

export const followUpCompleteSchema = z.object({
  followUpId: z.string().min(1),
  outcome: optionalText(1000),
});

export const convertLeadSchema = z.object({
  leadId: z.string().min(1),
  clientName: z.string().trim().min(1, "Client name is required").max(160),
  createProject: z.coerce.boolean().optional(),
  projectName: optionalText(160),
  projectBudget: optionalMoney,
});

export const marketingActivitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  channel: z.enum(MARKETING_CHANNELS).default("OTHER"),
  status: z.enum(MARKETING_STATUSES).default("PLANNED"),
  objective: optionalText(300),
  targetLeads: optionalInt(100000),
  budget: optionalMoney,
  spend: optionalMoney,
  startDate: optionalDateString,
  endDate: optionalDateString,
  notes: optionalText(2000),
});

export const marketingActivityUpdateSchema = marketingActivitySchema.extend({
  id: z.string().min(1),
});

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Use only letters, numbers, dots, underscores or hyphens",
  );

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export const setupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    username: usernameSchema,
    email: z.string().trim().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(200),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  username: usernameSchema,
  timezone: z.string().trim().min(1, "Timezone is required"),
  currency: z.string().trim().length(3, "Use a 3-letter currency code"),
  monthlyAllowance: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Allowance cannot be negative")
    .max(100_000_000),
  accountabilityPartnerName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("")),
  accountabilityPartnerEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(200),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const reminderCreateSchema = z.object({
  type: z.enum(REMINDER_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  dueAt: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date"),
  channel: z.enum(REMINDER_CHANNELS).default("IN_APP"),
});

export const reminderUpdateSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE", "DISMISSED"]),
});

// ---------------------------------------------------------------------------
// Finance (Phase 3)
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "TELEBIRR",
  "CBE_BIRR",
  "MOBILE_MONEY",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;

export const PAYMENT_STATUSES = [
  "PROJECTED",
  "INVOICED",
  "PARTIAL",
  "RECEIVED",
  "CANCELLED",
] as const;

export const EXPENSE_CLASSES = ["BUSINESS", "PERSONAL"] as const;

export const ALLOCATION_CATEGORIES = [
  "TAX",
  "TITHE",
  "SAVINGS",
  "BUSINESS",
  "PERSONAL",
  "OTHER",
] as const;

export const ALLOCATION_METHODS = ["FIXED", "PERCENT"] as const;

export const ALLOCATION_BASES = [
  "GROSS",
  "AFTER_TAX",
  "AFTER_TAX_TITHE",
  "AFTER_BUSINESS_EXPENSES",
  "REMAINING",
] as const;

export const SAVINGS_FUNDS = [
  "GENERAL",
  "BUSINESS_STARTUP",
  "LONG_TERM_INVESTMENT",
  "EMERGENCY",
] as const;

export const SAVINGS_TRANSACTION_TYPES = ["CONTRIBUTION", "WITHDRAWAL"] as const;

export const INVESTMENT_DECISIONS = ["PENDING", "APPROVED", "REJECTED"] as const;

export const INVESTMENT_STATUSES = [
  "PLANNED",
  "APPROVED",
  "SPENT",
  "COMPLETED",
  "CANCELLED",
] as const;

const requiredDate = z
  .string()
  .min(1, "Date is required")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date");

const nonNegativeMoney = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .min(0, "Amount cannot be negative")
  .max(1_000_000_000);

const positiveMoney = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .positive("Amount must be greater than zero")
  .max(1_000_000_000);

const optionalPaymentMethod = z
  .union([z.enum(PAYMENT_METHODS), z.literal("")])
  .optional();

const optionalProjectId = z.string().trim().optional().or(z.literal(""));
const optionalClientId = z.string().trim().optional().or(z.literal(""));

export const incomeEntrySchema = z
  .object({
    type: z.literal("INCOME"),
    category: z.string().trim().min(1, "Category is required").max(120),
    amount: positiveMoney,
    occurredAt: requiredDate,
    paymentStatus: z.enum(PAYMENT_STATUSES),
    amountReceived: z
      .union([nonNegativeMoney, z.literal("")])
      .optional(),
    paymentMethod: optionalPaymentMethod,
    projectId: optionalProjectId,
    clientId: optionalClientId,
    reference: optionalText(120),
    dueDate: optionalDateString,
    description: optionalText(400),
    notes: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (
      data.paymentStatus === "PARTIAL" &&
      (data.amountReceived === "" ||
        data.amountReceived === undefined ||
        data.amountReceived <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountReceived"],
        message: "Enter how much has been received for a partial payment",
      });
    }
    if (
      typeof data.amountReceived === "number" &&
      data.amountReceived > data.amount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountReceived"],
        message: "Received amount cannot exceed the invoice amount",
      });
    }
  });

export const expenseEntrySchema = z.object({
  type: z.literal("EXPENSE"),
  category: z.string().trim().min(1, "Category is required").max(120),
  amount: positiveMoney,
  occurredAt: requiredDate,
  expenseClass: z.enum(["BUSINESS", "PERSONAL"]),
  paymentStatus: z
    .enum(["RECEIVED", "PROJECTED", "INVOICED", "PARTIAL", "CANCELLED"])
    .optional(),
  paymentMethod: optionalPaymentMethod,
  projectId: optionalProjectId,
  reference: optionalText(120),
  dueDate: optionalDateString,
  description: optionalText(400),
  notes: optionalText(2000),
});

export const incomeEntryUpdateSchema = incomeEntrySchema.and(
  z.object({ id: z.string().min(1) }),
);

export const expenseEntryUpdateSchema = expenseEntrySchema.extend({
  id: z.string().min(1),
});

export const allocationRuleSchema = z.object({
  category: z.enum([
    "TAX",
    "TITHE",
    "SAVINGS",
    "BUSINESS",
    "PERSONAL",
    "OTHER",
  ]),
  method: z.enum(["FIXED", "PERCENT"]),
  value: nonNegativeMoney,
  basis: z.enum([
    "GROSS",
    "AFTER_TAX",
    "AFTER_TAX_TITHE",
    "AFTER_BUSINESS_EXPENSES",
    "REMAINING",
  ]),
  sequence: z.coerce.number().int().min(0).max(1000),
  isActive: z.coerce.boolean().optional(),
});

export const savingsTransactionSchema = z.object({
  fund: z.enum([
    "GENERAL",
    "BUSINESS_STARTUP",
    "LONG_TERM_INVESTMENT",
    "EMERGENCY",
  ]),
  type: z.enum(["CONTRIBUTION", "WITHDRAWAL"]),
  amount: positiveMoney,
  occurredAt: requiredDate,
  reason: optionalText(200),
  notes: optionalText(1000),
});

export const savingsAccountSchema = z.object({
  fund: z.enum([
    "GENERAL",
    "BUSINESS_STARTUP",
    "LONG_TERM_INVESTMENT",
    "EMERGENCY",
  ]),
  name: z.string().trim().min(1, "Name is required").max(120),
  openingBalance: nonNegativeMoney.optional(),
  notes: optionalText(1000),
});

export const allowanceAdjustmentSchema = z.object({
  amount: positiveMoney,
  reason: z.string().trim().min(1, "Reason is required").max(200),
  startMonth: requiredDate,
  monthsCount: z.coerce.number().int().min(1).max(24),
  notes: optionalText(1000),
});

export const businessInvestmentSchema = z.object({
  purpose: z.string().trim().min(1, "Purpose is required").max(200),
  expectedBenefit: optionalText(500),
  plannedAmount: positiveMoney,
  projectId: optionalProjectId,
  notes: optionalText(2000),
});

export const businessInvestmentDecisionSchema = z.object({
  investmentId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export const businessInvestmentExpenseSchema = z.object({
  investmentId: z.string().min(1),
  actualAmount: positiveMoney,
  spendDate: requiredDate,
  paymentMethod: optionalPaymentMethod,
  reference: optionalText(120),
  notes: optionalText(1000),
});

// ---------------------------------------------------------------------------
// Partial payment tracking
// ---------------------------------------------------------------------------

export const PAYMENT_KINDS = ["INCOME", "EXPENSE"] as const;

export const COLLECTION_STATUSES = [
  "PENDING",
  "PARTIAL",
  "RECEIVED",
  "OVERDUE",
  "CANCELLED",
] as const;

export const projectPaymentSchema = z
  .object({
    projectId: z.string().min(1, "Project is required"),
    amount: positiveMoney,
    receivedAt: requiredDate,
    paymentMethod: optionalPaymentMethod,
    reference: optionalText(120),
    notes: optionalText(2000),
    createFinanceEntry: z.coerce.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (!(data.amount > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Payment amount must be greater than zero",
      });
    }
  });

export const collectionScheduleSchema = z
  .object({
    projectId: z.string().min(1, "Project is required"),
    label: z.string().trim().min(1, "Label is required").max(120),
    expectedAmount: nonNegativeMoney,
    expectedDate: requiredDate,
    notes: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (!(data.expectedAmount > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedAmount"],
        message: "Expected amount must be greater than zero",
      });
    }
  });

export const collectionScheduleUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(COLLECTION_STATUSES),
});

export const projectAgreedPriceSchema = z.object({
  id: z.string().min(1),
  agreedPrice: z
    .union([z.literal(""), nonNegativeMoney])
    .optional(),
});

// ---------------------------------------------------------------------------
// Daily work & performance (Phase 4)
// ---------------------------------------------------------------------------

export const WORK_SESSION_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "RESCHEDULED",
] as const;

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const WEEK_PLAN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUBMITTED",
  "ARCHIVED",
] as const;

export const WEEKLY_REPORT_STATUSES = ["DRAFT", "SUBMITTED", "LATE"] as const;

const optionalIntMinutes = z
  .union([
    z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .int("Use whole minutes")
      .min(0, "Cannot be negative")
      .max(1440),
    z.literal(""),
  ])
  .optional();

export const workSessionUpdateSchema = z.object({
  id: z.string().min(1),
  location: optionalText(200),
  focus: optionalText(300),
  plannedStart: optionalText(20),
  plannedEnd: optionalText(20),
  plannedMinutes: z
    .union([z.coerce.number().int().min(0).max(1440), z.literal("")])
    .optional(),
  actualMinutes: optionalIntMinutes,
  status: z.enum(WORK_SESSION_STATUSES),
  notes: optionalText(2000),
});

export const workSessionStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(WORK_SESSION_STATUSES),
});

export const workSessionRescheduleSchema = z.object({
  id: z.string().min(1),
  newDate: requiredDate,
});

export const workSessionExtraSchema = z.object({
  date: requiredDate,
  focus: optionalText(300),
  location: optionalText(200),
});

export const markLeaveSchema = z.object({
  date: requiredDate,
  reason: optionalText(300),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(2000),
  status: z.enum(TASK_STATUSES).default("TODO"),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  isRequired: z.coerce.boolean().optional(),
  estimateMinutes: optionalIntMinutes,
  dueDate: optionalDateString,
  projectId: optionalProjectId,
  weekPlanId: optionalText(40),
});

export const taskUpdateSchema = taskCreateSchema.extend({
  id: z.string().min(1),
});

export const taskStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TASK_STATUSES),
});

export const taskRescheduleSchema = z.object({
  id: z.string().min(1),
  dueDate: requiredDate,
});

export const taskCarryForwardSchema = z.object({
  fromWeekPlanId: optionalText(40),
  toWeekPlanId: z.string().min(1, "Choose the week to carry tasks into"),
});

export const weekPlanUpsertSchema = z.object({
  id: optionalText(40),
  weekStart: requiredDate,
  objectives: optionalText(4000),
  commercialTargets: optionalText(4000),
  financialObjectives: optionalText(4000),
  workLocations: optionalText(2000),
  notes: optionalText(4000),
  status: z.enum(WEEK_PLAN_STATUSES).optional(),
});

export const weekPlanStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(WEEK_PLAN_STATUSES),
});

export const weeklyReportSectionSchema = z.object({
  // "Done this week"
  summary: optionalText(6000),
  // "What didn't work / mistakes"
  challenges: optionalText(6000),
  // "Key takeaways"
  highlights: optionalText(6000),
  // "Next week's goals"
  nextWeekGoals: optionalText(6000),
  // "Need help with"
  needHelpWith: optionalText(6000),
  recipientName: optionalText(120),
  recipientEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
});

export const weeklyReportSaveSchema = weeklyReportSectionSchema.extend({
  weekPlanId: z.string().min(1),
});

export type WorkSessionUpdateInput = z.infer<typeof workSessionUpdateSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type WeekPlanUpsertInput = z.infer<typeof weekPlanUpsertSchema>;
export type WeeklyReportSaveInput = z.infer<typeof weeklyReportSaveSchema>;

export type IncomeEntryInput = z.infer<typeof incomeEntrySchema>;
export type ExpenseEntryInput = z.infer<typeof expenseEntrySchema>;
export type AllocationRuleInput = z.infer<typeof allocationRuleSchema>;
export type SavingsTransactionInput = z.infer<typeof savingsTransactionSchema>;
export type AllowanceAdjustmentInput = z.infer<typeof allowanceAdjustmentSchema>;
export type BusinessInvestmentInput = z.infer<typeof businessInvestmentSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type MilestoneCreateInput = z.infer<typeof milestoneCreateSchema>;
export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;
export type FollowUpRescheduleInput = z.infer<typeof followUpRescheduleSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type ProjectPaymentInput = z.infer<typeof projectPaymentSchema>;
export type CollectionScheduleInput = z.infer<typeof collectionScheduleSchema>;
export type CollectionScheduleUpdateInput = z.infer<
  typeof collectionScheduleUpdateSchema
>;
export type ProjectAgreedPriceInput = z.infer<typeof projectAgreedPriceSchema>;
export type MarketingActivityInput = z.infer<typeof marketingActivitySchema>;
