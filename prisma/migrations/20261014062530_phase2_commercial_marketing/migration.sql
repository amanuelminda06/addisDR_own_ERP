/*
  Warnings:

  - The `channel` column on the `MarketingActivity` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MilestoneStage" AS ENUM ('FIRST_CONTACT', 'NEEDS_ASSESSMENT', 'PROPOSAL_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'DECISION', 'CONTRACT');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketingChannel" AS ENUM ('REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'EVENT', 'CONTENT', 'PAID_ADS', 'DIRECT', 'PARTNERSHIP', 'OTHER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "address" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "expectedCloseAt" TIMESTAMP(3),
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "marketingActivityId" TEXT,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "MarketingActivity" ADD COLUMN     "objective" TEXT,
ADD COLUMN     "targetLeads" INTEGER,
DROP COLUMN "channel",
ADD COLUMN     "channel" "MarketingChannel" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "CommunicationMilestone" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "stage" "MilestoneStage" NOT NULL,
    "notes" TEXT,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "channel" "ContactType" NOT NULL DEFAULT 'CALL',
    "purpose" TEXT,
    "notes" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpReschedule" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "fromDueAt" TIMESTAMP(3) NOT NULL,
    "toDueAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "rescheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpReschedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationMilestone_leadId_idx" ON "CommunicationMilestone"("leadId");

-- CreateIndex
CREATE INDEX "CommunicationMilestone_reachedAt_idx" ON "CommunicationMilestone"("reachedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationMilestone_leadId_stage_key" ON "CommunicationMilestone"("leadId", "stage");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_idx" ON "FollowUp"("leadId");

-- CreateIndex
CREATE INDEX "FollowUp_dueAt_idx" ON "FollowUp"("dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUpReschedule_followUpId_idx" ON "FollowUpReschedule"("followUpId");

-- CreateIndex
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX "Lead_status_priority_idx" ON "Lead"("status", "priority");

-- CreateIndex
CREATE INDEX "Lead_expectedCloseAt_idx" ON "Lead"("expectedCloseAt");

-- CreateIndex
CREATE INDEX "Lead_marketingActivityId_idx" ON "Lead"("marketingActivityId");

-- CreateIndex
CREATE INDEX "MarketingActivity_channel_idx" ON "MarketingActivity"("channel");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_marketingActivityId_fkey" FOREIGN KEY ("marketingActivityId") REFERENCES "MarketingActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationMilestone" ADD CONSTRAINT "CommunicationMilestone_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpReschedule" ADD CONSTRAINT "FollowUpReschedule_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
