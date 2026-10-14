"use client";

import { useTransition } from "react";
import {
  updateReminderStatusAction,
  deleteReminderAction,
} from "@/lib/actions/reminders";
import { REMINDER_TYPE_LABELS, REMINDER_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";
import type { ReminderStatus, ReminderType } from "@prisma/client";

export type ReminderView = {
  id: string;
  title: string;
  description: string | null;
  type: ReminderType;
  status: ReminderStatus;
  effectiveStatus: ReminderStatus;
  dueAtLabel: string;
  channel: string;
};

const STATUS_TONE: Record<ReminderStatus, "danger" | "warning" | "success" | "muted"> = {
  OVERDUE: "danger",
  PENDING: "warning",
  COMPLETED: "success",
  DISMISSED: "muted",
};

const SECTION_ORDER: ReminderStatus[] = [
  "OVERDUE",
  "PENDING",
  "COMPLETED",
  "DISMISSED",
];

export function ReminderList({ reminders }: { reminders: ReminderView[] }) {
  if (reminders.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="Bell" className="h-6 w-6" />}
        title="No reminders yet"
        description="Add a reminder for work sessions, follow-ups, planning, reports or deadlines."
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-6">
      {SECTION_ORDER.map((status) => {
        const group = reminders.filter((r) => r.effectiveStatus === status);
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
              {REMINDER_STATUS_LABELS[status]}
              <Badge tone={STATUS_TONE[status]}>{group.length}</Badge>
            </h3>
            <ul className="space-y-2">
              {group.map((r) => (
                <ReminderRow key={r.id} reminder={r} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function ReminderRow({ reminder }: { reminder: ReminderView }) {
  const [pending, startTransition] = useTransition();

  const setStatus = (status: ReminderStatus) =>
    startTransition(() => updateReminderStatusAction(reminder.id, status));

  const remove = () =>
    startTransition(() => deleteReminderAction(reminder.id));

  return (
    <li className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-800">{reminder.title}</p>
          <Badge tone="neutral">{REMINDER_TYPE_LABELS[reminder.type]}</Badge>
          <Badge tone={STATUS_TONE[reminder.effectiveStatus]}>
            {REMINDER_STATUS_LABELS[reminder.effectiveStatus]}
          </Badge>
        </div>
        {reminder.description ? (
          <p className="mt-1 text-sm text-slate-500">{reminder.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-400">
          Due {reminder.dueAtLabel} · {reminder.channel}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {reminder.effectiveStatus !== "COMPLETED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("COMPLETED")}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            Complete
          </button>
        ) : null}
        {reminder.effectiveStatus !== "DISMISSED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("DISMISSED")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Dismiss
          </button>
        ) : null}
        {reminder.effectiveStatus === "COMPLETED" ||
        reminder.effectiveStatus === "DISMISSED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("PENDING")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Reopen
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label="Delete reminder"
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
