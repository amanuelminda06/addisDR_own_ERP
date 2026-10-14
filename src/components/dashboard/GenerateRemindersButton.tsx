"use client";

import { useTransition } from "react";
import { generateRemindersAction } from "@/lib/actions/reminders";
import { Button } from "@/components/ui/Button";

export function GenerateRemindersButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => generateRemindersAction())}
    >
      {pending ? "Scanning…" : "Scan for reminders"}
    </Button>
  );
}
