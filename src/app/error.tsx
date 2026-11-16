"use client";

import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

/**
 * Root error boundary.
 *
 * `src/app/(app)/error.tsx` only wraps routes inside the `(app)` group, so the
 * public routes — `/`, `/login` and `/setup` — had no boundary at all and fell
 * through to Next's raw "Application error" page whenever the database was
 * unreachable. This catches those.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
            <Icon name="CircleAlert" className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This page could not load. The usual cause is the database being
            unreachable — check that{" "}
            <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> is
            set and the database is running, then try again.
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs text-slate-400">
              Ref: {error.digest}
            </p>
          ) : null}
          <div className="mt-6 flex justify-center">
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
