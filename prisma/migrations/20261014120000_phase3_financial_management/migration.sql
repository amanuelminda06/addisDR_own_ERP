-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'TELEBIRR', 'CBE_BIRR', 'MOBILE_MONEY', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PROJECTED', 'INVOICED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseClass" AS ENUM ('BUSINESS', 'PERSONAL');

-- CreateEnum
CREATE TYPE "AllocationBasis" AS ENUM ('GROSS', 'AFTER_TAX', 'AFTER_TAX_TITHE', 'AFTER_BUSINESS_EXPENSES', 'REMAINING');

-- CreateEnum
CREATE TYPE "SavingsFundType" AS ENUM ('GENERAL', 'BUSINESS_STARTUP', 'LONG_TERM_INVESTMENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "SavingsTransactionType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "InvestmentDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PLANNED', 'APPROVED', 'SPENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable
ALTER TABLE "FinanceEntry" ADD COLUMN     "amountReceived" DECIMAL(14,2),
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "dedupeHash" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "expenseClass" "ExpenseClass",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'RECEIVED',
ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "FinancialAllocation" ADD COLUMN     "basis" "AllocationBasis" NOT NULL DEFAULT 'GROSS',
ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SavingsAccount" (
    "id" TEXT NOT NULL,
    "fund" "SavingsFundType" NOT NULL,
    "name" TEXT NOT NULL,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsTransaction" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" "SavingsTransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowanceAdjustment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "monthsCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvestment" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expectedBenefit" TEXT,
    "plannedAmount" DECIMAL(14,2) NOT NULL,
    "actualAmount" DECIMAL(14,2),
    "spendDate" TIMESTAMP(3),
    "decision" "InvestmentDecision" NOT NULL DEFAULT 'PENDING',
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PLANNED',
    "decidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,
    "expenseId" TEXT,

    CONSTRAINT "BusinessInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavingsAccount_fund_key" ON "SavingsAccount"("fund");

-- CreateIndex
CREATE INDEX "SavingsTransaction_fundId_idx" ON "SavingsTransaction"("fundId");

-- CreateIndex
CREATE INDEX "SavingsTransaction_occurredAt_idx" ON "SavingsTransaction"("occurredAt");

-- CreateIndex
CREATE INDEX "SavingsTransaction_type_idx" ON "SavingsTransaction"("type");

-- CreateIndex
CREATE INDEX "AllowanceAdjustment_startMonth_idx" ON "AllowanceAdjustment"("startMonth");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvestment_expenseId_key" ON "BusinessInvestment"("expenseId");

-- CreateIndex
CREATE INDEX "BusinessInvestment_status_idx" ON "BusinessInvestment"("status");

-- CreateIndex
CREATE INDEX "BusinessInvestment_decision_idx" ON "BusinessInvestment"("decision");

-- CreateIndex
CREATE INDEX "BusinessInvestment_projectId_idx" ON "BusinessInvestment"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceEntry_dedupeHash_key" ON "FinanceEntry"("dedupeHash");

-- CreateIndex
CREATE INDEX "FinanceEntry_clientId_idx" ON "FinanceEntry"("clientId");

-- CreateIndex
CREATE INDEX "FinanceEntry_paymentStatus_idx" ON "FinanceEntry"("paymentStatus");

-- CreateIndex
CREATE INDEX "FinanceEntry_expenseClass_idx" ON "FinanceEntry"("expenseClass");

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransaction" ADD CONSTRAINT "SavingsTransaction_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "SavingsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvestment" ADD CONSTRAINT "BusinessInvestment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvestment" ADD CONSTRAINT "BusinessInvestment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

