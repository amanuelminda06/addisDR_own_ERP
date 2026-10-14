"use client";

import { useActionState } from "react";
import {
  createTaskAction,
  updateTaskAction,
  type TaskFormState,
} from "@/lib/actions/tasks";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/labels";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: TaskFormState = null;

export type TaskDefaults = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  isRequired: boolean;
  estimateMinutes: string;
  dueDate: string;
  projectId: string;
  weekPlanId: string;
};

export type WeekPlanOption = { id: string; label: string };

export function TaskForm({
  mode,
  defaults,
  projects,
  weekPlans,
  defaultWeekPlanId = "",
}: {
  mode: "create" | "edit";
  defaults?: Partial<TaskDefaults>;
  projects: { id: string; name: string }[];
  weekPlans: WeekPlanOption[];
  defaultWeekPlanId?: string;
}) {
  const action = mode === "create" ? createTaskAction : updateTaskAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const d = defaults ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {d.id ? <input type="hidden" name="id" value={d.id} /> : null}

      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <div>
        <label className="field-label">Title</label>
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={d.title ?? ""}
          className="field-input"
          placeholder="What needs to be done"
        />
      </div>

      <div>
        <label className="field-label">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={d.description ?? ""}
          className="field-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Priority</label>
          <select
            name="priority"
            defaultValue={d.priority ?? "MEDIUM"}
            className="field-input"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={d.status ?? "TODO"} className="field-input">
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Due date</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={d.dueDate ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Estimate (minutes)</label>
          <input
            name="estimateMinutes"
            type="number"
            min={0}
            max={1440}
            defaultValue={d.estimateMinutes ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Project</label>
          <select name="projectId" defaultValue={d.projectId ?? ""} className="field-input">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Weekly plan</label>
          <select
            name="weekPlanId"
            defaultValue={d.weekPlanId ?? defaultWeekPlanId}
            className="field-input"
          >
            <option value="">Unassigned</option>
            {weekPlans.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="isRequired"
          defaultChecked={d.isRequired ?? false}
          className="h-4 w-4 rounded border-slate-300"
        />
        Required (must carry forward if unfinished)
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Add task" : "Save task"}
      </Button>
    </form>
  );
}
