"use client";

import { useState, useTransition } from "react";
import {
  setTaskStatusAction,
  rescheduleTaskAction,
  deleteTaskAction,
  carryForwardTaskAction,
} from "@/lib/actions/tasks";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@prisma/client";

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  isRequired: boolean;
  estimateMinutes: number | null;
  dueDateLabel: string | null;
  dueDateValue: string;
  projectName: string | null;
  weekPlanId: string | null;
  overdue: boolean;
};

const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "info" | "muted"> = {
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "muted",
};

const STATUS_TONE: Record<TaskStatus, "success" | "info" | "danger" | "muted" | "warning"> = {
  TODO: "muted",
  IN_PROGRESS: "info",
  BLOCKED: "danger",
  DONE: "success",
  CANCELLED: "muted",
};

export function TaskList({
  tasks,
  nextWeekPlanId,
}: {
  tasks: TaskItem[];
  nextWeekPlanId: string | null;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="ListChecks" className="h-6 w-6" />}
        title="No tasks yet"
        description="Capture priorities, deadlines and required work. Unfinished tasks can be carried forward without losing history."
        className="py-10"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} nextWeekPlanId={nextWeekPlanId} />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  nextWeekPlanId,
}: {
  task: TaskItem;
  nextWeekPlanId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [reschedule, setReschedule] = useState(task.dueDateValue);
  const done = task.status === "DONE" || task.status === "CANCELLED";

  return (
    <li className="card p-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? "Reopen task" : "Complete task"}
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              setTaskStatusAction(task.id, done ? "TODO" : "DONE"),
            )
          }
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition disabled:opacity-60",
            task.status === "DONE"
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-brand-400",
          )}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-medium",
                done ? "text-slate-400 line-through" : "text-slate-800",
              )}
            >
              {task.title}
            </p>
            <Badge tone={PRIORITY_TONE[task.priority]}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge tone={STATUS_TONE[task.status]}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            {task.isRequired ? <Badge tone="brand">Required</Badge> : null}
            {task.overdue ? <Badge tone="danger">Overdue</Badge> : null}
          </div>

          {task.description ? (
            <p className="mt-1 text-xs text-slate-500">{task.description}</p>
          ) : null}

          <p className="mt-1 text-xs text-slate-400">
            {task.dueDateLabel ? `Due ${task.dueDateLabel}` : "No due date"}
            {task.estimateMinutes ? ` · ~${task.estimateMinutes} min` : ""}
            {task.projectName ? ` · ${task.projectName}` : ""}
          </p>

          {!done ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {task.status !== "IN_PROGRESS" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => setTaskStatusAction(task.id, "IN_PROGRESS"))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Start
                </button>
              ) : null}
              <input
                type="date"
                value={reschedule}
                onChange={(e) => setReschedule(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
              />
              <button
                type="button"
                disabled={pending || !reschedule}
                onClick={() =>
                  startTransition(() => rescheduleTaskAction(task.id, reschedule))
                }
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Reschedule
              </button>
              {nextWeekPlanId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() =>
                      carryForwardTaskAction(task.id, nextWeekPlanId),
                    )
                  }
                  className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
                >
                  Carry forward
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this task?")) {
                    startTransition(() => deleteTaskAction(task.id));
                  }
                }}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this task?")) {
                    startTransition(() => deleteTaskAction(task.id));
                  }
                }}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
