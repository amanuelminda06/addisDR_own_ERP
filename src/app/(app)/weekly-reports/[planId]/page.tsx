import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatWeekRange, formatDate } from "@/lib/datetime";
import { WEEKLY_REPORT_STATUS_LABELS } from "@/lib/labels";
import { renderNumbersSection } from "@/lib/daily-work";
import { buildReportMetrics } from "@/lib/report-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { WeeklyReportForm } from "@/components/weekly-reports/WeeklyReportForm";

export const dynamic = "force-dynamic";

export default async function WeeklyReportEditorPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const user = await requireUser();
  const { planId } = await params;

  const plan = await prisma.weekPlan.findUnique({
    where: { id: planId },
    include: { report: true },
  });
  if (!plan) notFound();

  const metrics = await buildReportMetrics(plan);
  const numbersText = renderNumbersSection(metrics);
  const report = plan.report;
  const submitted = report?.status === "SUBMITTED" || report?.status === "LATE";

  return (
    <div>
      <PageHeader
        title={`Weekly report · ${formatWeekRange(plan.weekStart)}`}
        description={`Week starting ${formatDate(plan.weekStart, "EEEE, MMM d, yyyy")}. Exact reporting format with auto-pulled numbers.`}
        action={
          <Link href="/weekly-reports" className={buttonClasses("outline", "sm")}>
            ← All reports
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Plan: {plan.status}</Badge>
        <Badge
          tone={
            report?.status === "SUBMITTED"
              ? "success"
              : report?.status === "LATE"
                ? "danger"
                : "warning"
          }
        >
          Report: {report ? WEEKLY_REPORT_STATUS_LABELS[report.status] : "Not started"}
        </Badge>
        {report?.submittedAt ? (
          <span className="text-xs text-slate-400">
            Submitted {formatDate(report.submittedAt, "MMM d, yyyy HH:mm")}
          </span>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Report"
          subtitle="Fill the six sections. Numbers are pulled automatically from your records."
        />
        <CardBody>
          <WeeklyReportForm
            submitted={submitted}
            numbersText={numbersText}
            defaults={{
              weekPlanId: plan.id,
              summary: report?.summary ?? "",
              challenges: report?.challenges ?? "",
              highlights: report?.highlights ?? "",
              nextWeekGoals: report?.planVariance ?? "",
              needHelpWith: report?.content ?? "",
              recipientName:
                report?.recipientName ?? user.accountabilityPartnerName ?? "",
              recipientEmail:
                report?.recipientEmail ?? user.accountabilityPartnerEmail ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
