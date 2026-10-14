"use client";

import { useTransition } from "react";
import {
  deleteIncomeEntryAction,
  markIncomeReceivedAction,
} from "@/lib/actions/finance";
import { Button } from "@/components/ui/Button";

export function IncomeEntryActions({
  entryId,
  canMarkReceived,
}: {
  entryId: string;
  canMarkReceived: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canMarkReceived ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(() => markIncomeReceivedAction(entryId))
          }
        >
          Mark received
        </Button>
      ) : null}
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this income entry? This cannot be undone.")) {
            startTransition(() => deleteIncomeEntryAction(entryId));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}
