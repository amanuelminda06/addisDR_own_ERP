import type {
  LeadStatus,
  LeadPriority,
  MilestoneStage,
  FollowUpStatus,
  ContactType,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkSessionStatus,
  WeekPlanStatus,
  WeeklyReportStatus,
  ReminderType,
  ReminderStatus,
  AllocationCategory,
  AllocationBasis,
  PaymentMethod,
  PaymentStatus,
  ExpenseClass,
  SavingsFundType,
  SavingsTransactionType,
  InvestmentDecision,
  InvestmentStatus,
  AuditAction,
  MarketingStatus,
  MarketingChannel,
} from "@prisma/client";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const MILESTONE_STAGE_LABELS: Record<MilestoneStage, string> = {
  FIRST_CONTACT: "First contact",
  NEEDS_ASSESSMENT: "Needs assessment",
  PROPOSAL_SENT: "Proposal sent",
  FOLLOW_UP: "Follow-up",
  NEGOTIATION: "Negotiation",
  DECISION: "Decision",
  CONTRACT: "Contract",
};

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  MESSAGE: "Message",
};

export const MARKETING_CHANNEL_LABELS: Record<MarketingChannel, string> = {
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social media",
  EMAIL: "Email",
  EVENT: "Event",
  CONTENT: "Content",
  PAID_ADS: "Paid ads",
  DIRECT: "Direct outreach",
  PARTNERSHIP: "Partnership",
  OTHER: "Other",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const MARKETING_STATUS_LABELS: Record<MarketingStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const WORK_SESSION_STATUS_LABELS: Record<WorkSessionStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  MISSED: "Missed",
  RESCHEDULED: "Rescheduled",
};

export const WEEK_PLAN_STATUS_LABELS: Record<WeekPlanStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  SUBMITTED: "Submitted",
  ARCHIVED: "Archived",
};

export const WEEKLY_REPORT_STATUS_LABELS: Record<WeeklyReportStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  LATE: "Late",
};

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  WORK_SESSION: "Work session",
  TASK_REVIEW: "Task review",
  SALES_FOLLOWUP: "Sales follow-up",
  MEETING: "Meeting",
  WEEKLY_PLANNING: "Weekly planning",
  WEEKLY_REPORT: "Weekly report",
  MISSING_REPORT: "Missing report",
  MONTHLY_PERFORMANCE: "Monthly performance",
  MONTHLY_FINANCE: "Monthly finance",
  SPENDING_LIMIT: "Spending limit",
  DEADLINE: "Deadline",
  OVERDUE_TASK: "Overdue task",
  PROJECT_OUTSTANDING: "Project outstanding",
  PROJECT_OVERDUE: "Project payment overdue",
  CUSTOM: "Custom",
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  DISMISSED: "Dismissed",
};

export const ALLOCATION_CATEGORY_LABELS: Record<AllocationCategory, string> = {
  TAX: "Tax",
  TITHE: "Church tithe",
  SAVINGS: "Savings",
  BUSINESS: "Business",
  PERSONAL: "Personal",
  OTHER: "Other",
};

export const ALLOCATION_BASIS_LABELS: Record<AllocationBasis, string> = {
  GROSS: "Gross received",
  AFTER_TAX: "After tax",
  AFTER_TAX_TITHE: "After tax & tithe",
  AFTER_BUSINESS_EXPENSES: "After business expenses",
  REMAINING: "Remaining balance",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  TELEBIRR: "Telebirr",
  CBE_BIRR: "CBE Birr",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PROJECTED: "Projected",
  INVOICED: "Invoiced",
  PARTIAL: "Partially paid",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const EXPENSE_CLASS_LABELS: Record<ExpenseClass, string> = {
  BUSINESS: "Business",
  PERSONAL: "Personal",
};

export const SAVINGS_FUND_LABELS: Record<SavingsFundType, string> = {
  GENERAL: "General savings",
  BUSINESS_STARTUP: "Business startup fund",
  LONG_TERM_INVESTMENT: "Long-term investment",
  EMERGENCY: "Emergency fund",
};

export const SAVINGS_TRANSACTION_LABELS: Record<SavingsTransactionType, string> = {
  CONTRIBUTION: "Contribution",
  WITHDRAWAL: "Withdrawal",
};

export const INVESTMENT_DECISION_LABELS: Record<InvestmentDecision, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  PLANNED: "Planned",
  APPROVED: "Approved",
  SPENT: "Spent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

export function allowanceStatusLabel(
  level: "safe" | "warning" | "critical" | "over",
): string {
  switch (level) {
    case "safe":
      return "Within limit";
    case "warning":
      return "Approaching limit";
    case "critical":
      return "Near limit";
    case "over":
      return "Over limit";
  }
}
