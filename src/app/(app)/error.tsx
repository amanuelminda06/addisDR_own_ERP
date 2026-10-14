"use client";

import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
        <Icon name="CircleAlert" className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        The page could not load. This is often a database connection problem —
        check that <code className="rounded bg-slate-100 px-1">DATABASE_URL</code>{" "}
        is set and the database is reachable.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-slate-400">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
