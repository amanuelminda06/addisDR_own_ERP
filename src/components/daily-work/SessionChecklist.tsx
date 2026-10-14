"use client";

import { useState, useTransition } from "react";
import {
  toggleSessionCompleteAction,
  setSessionStatusAction,
  rescheduleSessionAction,
} from "@/lib/actions/daily-work";
import { WORK_SESSION_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { SessionEditForm } from "@/components/daily-work/SessionEditForm";
import { cn } from "@/lib/utils";
import type { WorkSessionStatus } from "@prisma/client";

export type SessionItem = {
  id: string;
  sessionNumber: number;
  label: string;
  period: string;
  status: WorkSessionStatus;
  plannedMinutes: number;
  actualMinutes: number | null;
  location: string | null;
  focus: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  notes: string | null;
};

const STATUS_TONE: Record<
  WorkSessionStatus,
  "success" | "warning" | "danger" | "info" | "muted"
> = {
  COMPLETED: "success",
  PLANNED: "muted",
  IN_PROGRESS: "info",
  MISSED: "danger",
  RESCHEDULED: "warning",
};

function SessionRow({ session }: { session: SessionItem }) {
  const [pending, startTransition] = useTransition();
  const [rescheduleDate, setRescheduleDate] = useState("");
  const done = session.status === "COMPLETED";

  return (
    <li className="card p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? "Mark not complete" : "Mark complete"}
          disabled={pending}
          onClick={() => startTransition(() => toggleSessionCompleteAction(session.id))}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold transition disabled:opacity-60",
            done
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
              {session.label}
            </p>
            <Badge tone="neutral">{session.period}</Badge>
            <Badge tone={STATUS_TONE[session.status]}>
              {WORK_SESSION_STATUS_LABELS[session.status]}
            </Badge>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {session.plannedMinutes} planned min
            {session.actualMinutes != null ? ` · ${session.actualMinutes} actual min` : ""}
            {session.location ? ` · ${session.location}` : ""}
            {session.focus ? ` · ${session.focus}` : ""}
          </p>

          {session.notes ? (
            <p className="mt-1 whitespace-pre-line text-xs text-slate-400">{session.notes}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => setSessionStatusAction(session.id, "MISSED"))
              }
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Missed
            </button>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
            />
            <button
              type="button"
              disabled={pending || !rescheduleDate}
              onClick={() =>
                startTransition(() =>
                  rescheduleSessionAction(session.id, rescheduleDate),
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Reschedule
            </button>
            <details className="w-full">
              <summary className="cursor-pointer text-xs font-medium text-brand-700 hover:underline">
                Edit details
              </summary>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <SessionEditForm
                  defaults={{
                    id: session.id,
                    focus: session.focus ?? "",
                    location: session.location ?? "",
                    plannedStart: session.plannedStart ?? "",
                    plannedEnd: session.plannedEnd ?? "",
                    plannedMinutes: String(session.plannedMinutes),
                    actualMinutes: session.actualMinutes != null ? String(session.actualMinutes) : "",
                    status: session.status,
                    notes: session.notes ?? "",
                  }}
                />
              </div>
            </details>
          </div>
        </div>
      </div>
    </li>
  );
}

export function SessionChecklist({ sessions }: { sessions: SessionItem[] }) {
  return (
    <ul className="space-y-3">
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </ul>
  );
}
