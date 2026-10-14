import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/validation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/icons";
import {
  LeadForm,
  type LeadFormDefaults,
} from "@/components/commercial/LeadForm";

export const metadata = { title: "New lead · Commercial" };
export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireUser();
  const activities = await prisma.marketingActivity.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const defaults: LeadFormDefaults = {
    id: "",
    name: "",
    contactName: "",
    company: "",
    email: "",
    phone: "",
    category: "",
    area: "",
    address: "",
    source: "",
    status: "NEW",
    priority: "MEDIUM",
    estimatedValue: "",
    probability: "10",
    expectedCloseAt: "",
    nextAction: "",
    nextActionAt: "",
    notes: "",
    lostReason: "",
    marketingActivityId: "",
  };

  return (
    <div>
      <PageHeader
        title="New lead"
        description="Capture a new opportunity and its commercial context."
        action={
          <Link
            href="/commercial"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <Icon name="ArrowRight" className="h-4 w-4 rotate-180" />
            Back to commercial
          </Link>
        }
      />
      <div className="max-w-3xl">
        <Card>
          <CardBody>
            <LeadForm
              mode="create"
              defaults={defaults}
              activities={activities}
              allowedStatuses={[...LEAD_STATUSES]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
