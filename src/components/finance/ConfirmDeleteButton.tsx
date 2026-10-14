"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

export function ConfirmDeleteButton({
  id,
  action,
  label = "Delete",
  message = "Delete this record? This cannot be undone.",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label?: string;
  message?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(message)) {
          startTransition(() => action(id));
        }
      }}
    >
      {pending ? "…" : label}
    </Button>
  );
}
