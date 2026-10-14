import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  addDays,
  formatDate,
  formatWeekRange,
  startOfWeek,
  todayDateOnly,
  zonedNow,
} from "@/lib/datetime";
import {
  summarizeTasks,
  carryForwardCandidates,
  isTaskOverdue,
  taskPriorityRank,
} from "@/lib/daily-work";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TaskForm, type WeekPlanOption } from "@/components/tasks/TaskForm";
import { TaskList, type TaskItem } from "@/components/tasks/TaskList";
import { WeeklyPlanForm } from "@/components/tasks/WeeklyPlanForm";
import { WeekPlanActions } from "@/components/tasks/WeekPlanActions";

export const metadata = { title: "Tasks & Weekly Planning" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  await requireUser();
  const now = zonedNow();
  const today = todayDateOnly();
  const currentWeekStart = startOfWeek(today);
  const nextWeekStart = addDays(currentWeekStart, 7);

  const [tasks, projects, plans] = await Promise.all([
    prisma.task.findMany({
      include: { project: { select: { name: true } } },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.weekPlan.findMany({
      orderBy: { weekStart: "desc" },
      take: 12,
    }),
  ]);

  const summary = summarizeTasks(
    tasks.map((t) => ({
      status: t.status,
      priority: t.priority,
      isRequired: t.isRequired,
      dueDate: t.dueDate,
    })),
    now,
  );

  const items: TaskItem[] = tasks
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      isRequired: t.isRequired,
      estimateMinutes: t.estimateMinutes,
      dueDateLabel: t.dueDate ? formatDate(t.dueDate) : null,
      dueDateValue: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
      projectName: t.project?.name ?? null,
      weekPlanId: t.weekPlanId,
      overdue: isTaskOverdue(
        { status: t.status, priority: t.priority, dueDate: t.dueDate },
        now,
      ),
    }))
    .sort((a, b) => {
      const aDone = a.status === "DONE" || a.status === "CANCELLED" ? 1 : 0;
      const bDone = b.status === "DONE" || b.status === "CANCELLED" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return taskPriorityRank(a.priority) - taskPriorityRank(b.priority);
    });

  const currentPlan = plans.find(
    (p) => p.weekStart.getTime() === currentWeekStart.getTime(),
  );
  const nextPlan = plans.find((p) => p.weekStart.getTime() === nextWeekStart.getTime());

  const weekPlanOptions: WeekPlanOption[] = plans.map((p) => ({
    id: p.id,
    label: formatWeekRange(p.weekStart),
  }));

  const openCandidates = carryForwardCandidates(
    tasks.map((t) => ({
      status: t.status,
      priority: t.priority,
      isRequired: t.isRequired,
      dueDate: t.dueDate,
    })),
    now,
  );

  const currentOpenTaskCount = currentPlan
    ? tasks.filter(
        (t) =>
          t.weekPlanId === currentPlan.id &&
          (t.status === "TODO" || t.status === "IN_PROGRESS" || t.status === "BLOCKED"),
      ).length
    : 0;

  return (
    <div>
      <PageHeader
        title="Tasks & Weekly Planning"
        description="Priorities, deadlines and the Saturday planning workflow. Unfinished tasks carry forward without losing history."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open tasks" value={summary.open} tone="brand" />
        <StatCard label="Completed" value={summary.done} tone="success" />
        <StatCard label="Overdue" value={summary.overdue} tone="danger" />
        <StatCard
          label="Completion"
          value={`${Math.round(summary.completionRate * 100)}%`}
        />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Add task" />
          <CardBody>
            <TaskForm
              mode="create"
              projects={projects}
              weekPlans={weekPlanOptions}
              defaultWeekPlanId={currentPlan?.id ?? ""}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Tasks"
            subtitle={`${summary.open} open · ${summary.requiredOpen} required open · ${openCandidates.length} carry-forward candidates`}
          />
          <CardBody>
            <TaskList
              tasks={items}
              nextWeekPlanId={nextPlan?.id ?? null}
            />
          </CardBody>
        </Card>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={`Current week · ${formatWeekRange(currentWeekStart)}`}
            action={
              currentPlan ? (
                <Badge tone={currentPlan.status === "ACTIVE" ? "success" : "neutral"}>
                  {currentPlan.status}
                </Badge>
              ) : null
            }
          />
          <CardBody className="space-y-4">
            <WeeklyPlanForm
              defaults={{
                id: currentPlan?.id ?? "",
                weekStart: currentWeekStart.toISOString().slice(0, 10),
                objectives: currentPlan?.objectives ?? "",
                commercialTargets: currentPlan?.commercialTargets ?? "",
                financialObjectives: currentPlan?.financialObjectives ?? "",
                workLocations: currentPlan?.workLocations ?? "",
                notes: currentPlan?.notes ?? "",
                status: currentPlan?.status ?? "DRAFT",
              }}
            />
            {currentPlan ? (
              <WeekPlanActions
                planId={currentPlan.id}
                status={currentPlan.status}
                nextPlanId={nextPlan?.id ?? null}
                openTaskCount={currentOpenTaskCount}
              />
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Next week · ${formatWeekRange(nextWeekStart)}`}
            subtitle="Saturday planning — sessions, locations, tasks and targets."
          />
          <CardBody className="space-y-4">
            <WeeklyPlanForm
              defaults={{
                id: nextPlan?.id ?? "",
                weekStart: nextWeekStart.toISOString().slice(0, 10),
                objectives: nextPlan?.objectives ?? "",
                commercialTargets: nextPlan?.commercialTargets ?? "",
                financialObjectives: nextPlan?.financialObjectives ?? "",
                workLocations: nextPlan?.workLocations ?? "",
                notes: nextPlan?.notes ?? "",
                status: nextPlan?.status ?? "DRAFT",
              }}
            />
            {nextPlan ? (
              <WeekPlanActions
                planId={nextPlan.id}
                status={nextPlan.status}
                nextPlanId={null}
                openTaskCount={0}
              />
            ) : (
              <p className="text-xs text-slate-500">
                Save this plan to enable carry-forward and session generation.
              </p>
            )}
          </CardBody>
        </Card>
      </section>

      {plans.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Recent weekly plans
          </h2>
          <div className="space-y-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {formatWeekRange(p.weekStart)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.weekStart.toISOString().slice(0, 10)}
                  </p>
                </div>
                <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
