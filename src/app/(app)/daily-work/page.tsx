import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  addDays,
  formatDate,
  todayDateOnly,
  zonedDateOnly,
} from "@/lib/datetime";
import {
  SESSION_DEFINITIONS,
  SESSION_MINUTES,
  PLANNED_HOURS_PER_DAY,
} from "@/lib/constants";
import {
  dayProgress,
  isWorkdayDate,
  sessionPlannedMinutes,
} from "@/lib/daily-work";
import { ensureSessionsForDate } from "@/lib/actions/daily-work";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { buttonClasses } from "@/components/ui/Button";
import {
  SessionChecklist,
  type SessionItem,
} from "@/components/daily-work/SessionChecklist";
import { ExtraSessionForm } from "@/components/daily-work/ExtraSessionForm";
import { LeaveForm } from "@/components/daily-work/LeaveForm";

export const metadata = { title: "Daily Work" };
export const dynamic = "force-dynamic";

function labelFor(sessionNumber: number) {
  const def = SESSION_DEFINITIONS.find((d) => d.sessionNumber === sessionNumber);
  if (def) return { label: def.label, period: def.period };
  return { label: `Extra session ${sessionNumber}`, period: "Extra" };
}

export default async function DailyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const today = todayDateOnly();
  const selected = params.date ? zonedDateOnly(params.date) : today;
  const workday = isWorkdayDate(selected);

  if (workday) {
    await ensureSessionsForDate(selected);
  }

  const sessions = await prisma.workSession.findMany({
    where: { date: selected },
    orderBy: { sessionNumber: "asc" },
  });

  const items: SessionItem[] = sessions.map((s) => {
    const { label, period } = labelFor(s.sessionNumber);
    return {
      id: s.id,
      sessionNumber: s.sessionNumber,
      label,
      period,
      status: s.status,
      plannedMinutes: sessionPlannedMinutes(s),
      actualMinutes: s.actualMinutes,
      location: s.location,
      focus: s.focus,
      plannedStart: s.plannedStart,
      plannedEnd: s.plannedEnd,
      notes: s.notes,
    };
  });

  const progress = dayProgress(sessions);
  const isToday = selected.getTime() === today.getTime();

  return (
    <div>
      <PageHeader
        title="Daily Work"
        description="Three work sessions per workday — two daytime and one nighttime — totalling nine planned hours."
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/daily-work?date=${addDays(selected, -1).toISOString().slice(0, 10)}`}
              className={buttonClasses("outline", "sm")}
            >
              ← Prev
            </Link>
            <Link href="/daily-work" className={buttonClasses("outline", "sm")}>
              Today
            </Link>
            <Link
              href={`/daily-work?date=${addDays(selected, 1).toISOString().slice(0, 10)}`}
              className={buttonClasses("outline", "sm")}
            >
              Next →
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Selected day"
          value={formatDate(selected, "EEE, MMM d")}
          hint={isToday ? "Today" : undefined}
        />
        <StatCard
          label="Sessions complete"
          value={`${progress.completed}/${progress.total || (workday ? 0 : 0)}`}
          tone={progress.isComplete ? "success" : "default"}
        />
        <StatCard
          label="Hours worked"
          value={progress.actualHours.toFixed(1)}
          hint={`of ${(workday ? PLANNED_HOURS_PER_DAY : 0)} planned`}
        />
        <StatCard
          label="Completion"
          value={`${Math.round(progress.rate * 100)}%`}
          tone={progress.isComplete ? "success" : progress.rate > 0 ? "warning" : "default"}
        />
      </section>

      <div className="mt-4">
        <Card>
          <CardBody>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Daily progress</span>
              <span className="text-slate-500">
                {progress.completed} of {progress.total} sessions ·{" "}
                {progress.actualHours.toFixed(1)} / {progress.plannedHours.toFixed(1)} h
              </span>
            </div>
            <ProgressBar
              value={progress.rate}
              tone={progress.isComplete ? "success" : progress.rate > 0 ? "warning" : "brand"}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {isWorkdayDate(selected) ? "Sessions" : "Rest day"}
          </h2>
          {workday ? (
            items.length > 0 ? (
              <SessionChecklist sessions={items} />
            ) : (
              <p className="text-sm text-slate-500">No sessions scheduled.</p>
            )
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-600">
                  {selected.getUTCDay() === 6
                    ? "Saturday — catch-up and weekly reporting day."
                    : "Sunday — rest day. No sessions are scheduled."}
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Extra session" />
            <CardBody>
              <ExtraSessionForm date={selected.toISOString().slice(0, 10)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Planned leave" />
            <CardBody>
              <LeaveForm date={selected.toISOString().slice(0, 10)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Schedule" />
            <CardBody>
              <ul className="space-y-1 text-xs text-slate-500">
                <li>Monday–Friday · 3 sessions · {SESSION_MINUTES} min each</li>
                <li>2 daytime sessions + 1 nighttime session</li>
                <li>Saturday · weekly planning &amp; report</li>
                <li>Sunday · rest</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
