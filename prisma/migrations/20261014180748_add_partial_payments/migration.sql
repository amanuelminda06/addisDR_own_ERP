-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'PARTIAL', 'RECEIVED', 'OVERDUE', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReminderType" ADD VALUE 'PROJECT_OUTSTANDING';
ALTER TYPE "ReminderType" ADD VALUE 'PROJECT_OVERDUE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "agreedPrice" DECIMAL(14,2);

-- Backfill existing project agreed prices from the legacy budget field so
-- historical records keep a consistent collection baseline.
UPDATE "Project"
SET "agreedPrice" = "budget"
WHERE "agreedPrice" IS NULL AND "budget" IS NOT NULL;

-- CreateTable
CREATE TABLE "ProjectPayment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "reference" TEXT,
    "notes" TEXT,
    "financeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expectedAmount" DECIMAL(14,2) NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "receivedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPayment_financeEntryId_key" ON "ProjectPayment"("financeEntryId");

-- CreateIndex
CREATE INDEX "ProjectPayment_projectId_idx" ON "ProjectPayment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectPayment_receivedAt_idx" ON "ProjectPayment"("receivedAt");

-- CreateIndex
CREATE INDEX "ProjectPayment_financeEntryId_idx" ON "ProjectPayment"("financeEntryId");

-- CreateIndex
CREATE INDEX "CollectionSchedule_projectId_idx" ON "CollectionSchedule"("projectId");

-- CreateIndex
CREATE INDEX "CollectionSchedule_expectedDate_idx" ON "CollectionSchedule"("expectedDate");

-- CreateIndex
CREATE INDEX "CollectionSchedule_status_idx" ON "CollectionSchedule"("status");

-- AddForeignKey
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSchedule" ADD CONSTRAINT "CollectionSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSchedule" ADD CONSTRAINT "CollectionSchedule_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ProjectPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
