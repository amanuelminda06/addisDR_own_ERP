"use client";

import { useTransition } from "react";
import {
  setWeekPlanStatusAction,
  planWeekSessionsAction,
  deleteWeekPlanAction,
} from "@/lib/actions/daily-work";
import { carryForwardTasksAction } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/Button";

export function WeekPlanActions({
  planId,
  status,
  nextPlanId,
  openTaskCount,
}: {
  planId: string;
  status: string;
  nextPlanId: string | null;
  openTaskCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "ACTIVE" && status !== "ARCHIVED" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => setWeekPlanStatusAction(planId, "ACTIVE"))}
        >
          Activate week
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => planWeekSessionsAction(planId))}
      >
        Generate sessions
      </Button>
      {nextPlanId && openTaskCount > 0 ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(() => carryForwardTasksAction(planId, nextPlanId))
          }
        >
          Carry forward {openTaskCount} task{openTaskCount === 1 ? "" : "s"}
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(() => setWeekPlanStatusAction(planId, "ARCHIVED"))
          }
        >
          Archive
        </Button>
      ) : null}
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this weekly plan? Linked tasks/sessions are kept.")) {
            startTransition(() => deleteWeekPlanAction(planId));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}
