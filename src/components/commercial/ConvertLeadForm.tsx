"use client";

import { useActionState, useState } from "react";
import {
  convertLeadToClientAction,
  type CommercialFormState,
} from "@/lib/actions/commercial";
import { Button } from "@/components/ui/Button";

const initialState: CommercialFormState = null;

export function ConvertLeadForm({
  leadId,
  defaultClientName,
}: {
  leadId: string;
  defaultClientName: string;
}) {
  const [state, formAction, pending] = useActionState(
    convertLeadToClientAction,
    initialState,
  );
  const [createProject, setCreateProject] = useState(false);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
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
        <label htmlFor="clientName" className="field-label">
          Client name
        </label>
        <input
          id="clientName"
          name="clientName"
          required
          maxLength={160}
          defaultValue={defaultClientName}
          className="field-input"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="createProject"
          checked={createProject}
          onChange={(e) => setCreateProject(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Create a project for this client
      </label>

      {createProject ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="projectName" className="field-label">
              Project name
            </label>
            <input
              id="projectName"
              name="projectName"
              maxLength={160}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="projectBudget" className="field-label">
              Project budget (ETB)
            </label>
            <input
              id="projectBudget"
              name="projectBudget"
              type="number"
              min={0}
              step="0.01"
              className="field-input"
            />
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Converting…" : "Convert to client"}
      </Button>
    </form>
  );
}
