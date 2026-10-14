import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { effectiveReminderStatus } from "@/lib/rules";
import { formatDateTime, zonedNow } from "@/lib/datetime";
import { generateReminders } from "@/lib/reminder-engine";
import { REMINDER_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { GenerateRemindersButton } from "@/components/dashboard/GenerateRemindersButton";
import {
  ReminderList,
  type ReminderView,
} from "@/components/reminders/ReminderList";
import type { ReminderStatus } from "@prisma/client";

export const metadata = { title: "Reminders" };
export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "In-app",
  EMAIL: "Email",
  SMS: "SMS",
};

export default async function RemindersPage() {
  await requireUser();
  const now = zonedNow();

  try {
    await generateReminders(now);
  } catch {
    // Best-effort: the list still renders from whatever exists.
  }

  const reminders = await prisma.reminder.findMany({
    orderBy: { dueAt: "asc" },
  });

  const rank: Record<ReminderStatus, number> = {
    OVERDUE: 0,
    PENDING: 1,
    COMPLETED: 2,
    DISMISSED: 3,
  };

  const views: ReminderView[] = reminders
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      status: r.status,
      effectiveStatus: effectiveReminderStatus(
        { status: r.status, dueAt: r.dueAt },
        now,
      ),
      dueAtLabel: formatDateTime(r.dueAt),
      channel: CHANNEL_LABELS[r.channel] ?? r.channel,
    }))
    .sort((a, b) => rank[a.effectiveStatus] - rank[b.effectiveStatus]);

  const counts = views.reduce<Record<string, number>>((acc, r) => {
    acc[r.effectiveStatus] = (acc[r.effectiveStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Centralized obligations: work sessions, follow-ups, planning, reports and deadlines."
        action={<GenerateRemindersButton />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["OVERDUE", "PENDING", "COMPLETED", "DISMISSED"] as const).map((s) => (
          <div key={s} className="card p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {counts[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Add reminder" />
          <CardBody>
            <ReminderForm />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="All reminders"
            subtitle="Dismissing a reminder does not complete its underlying task or report."
          />
          <CardBody>
            <ReminderList reminders={views} />
          </CardBody>
        </Card>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Reminder types available: {Object.values(REMINDER_TYPE_LABELS).join(" · ")}.
      </p>
    </div>
  );
}
