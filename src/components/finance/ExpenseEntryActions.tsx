"use client";

import { useTransition } from "react";
import { deleteExpenseEntryAction } from "@/lib/actions/finance";
import { Button } from "@/components/ui/Button";

export function ExpenseEntryActions({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this expense entry? This cannot be undone.")) {
          startTransition(() => deleteExpenseEntryAction(entryId));
        }
      }}
    >
      Delete
    </Button>
  );
}
