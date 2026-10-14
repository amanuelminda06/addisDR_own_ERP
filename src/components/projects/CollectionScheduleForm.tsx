"use client";

import { useActionState } from "react";
import {
  createCollectionScheduleAction,
  updateCollectionScheduleAction,
  deleteCollectionScheduleAction,
  type ProjectFormState,
} from "@/lib/actions/projects";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons";

const initial: ProjectFormState = null;

export function CollectionScheduleCreateForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createCollectionScheduleAction, initial);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
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
        <label className="field-label">
          Label <span className="text-red-500">*</span>
        </label>
        <input
          name="label"
          required
          maxLength={120}
          placeholder="Advance, second payment, final…"
          className="field-input"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">
            Expected amount (ETB) <span className="text-red-500">*</span>
          </label>
          <input name="expectedAmount" type="number" min="0" step="0.01" required className="field-input" />
        </div>
        <div>
          <label className="field-label">
            Expected date <span className="text-red-500">*</span>
          </label>
          <input
            name="expectedDate"
            type="date"
            required
            defaultValue={today}
            className="field-input"
          />
        </div>
      </div>
      <div>
        <label className="field-label">Notes</label>
        <textarea name="notes" rows={2} maxLength={2000} className="field-input" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add expected payment"}
      </Button>
    </form>
  );
}

export function CollectionScheduleEditForm({
  schedule,
}: {
  schedule: {
    id: string;
    label: string;
    expectedAmount: string;
    expectedDate: string;
    status?: string;
    notes?: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateCollectionScheduleAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={schedule.id} />
      <input
        name="label"
        defaultValue={schedule.label}
        maxLength={120}
        className="field-input min-w-[8rem] flex-1"
      />
      <input
        name="expectedAmount"
        type="number"
        min="0"
        step="0.01"
        defaultValue={schedule.expectedAmount}
        className="field-input w-28"
      />
      <input
        name="expectedDate"
        type="date"
        defaultValue={schedule.expectedDate}
        className="field-input w-40"
      />
      <select name="status" defaultValue={schedule.status ?? "PENDING"} className="field-input w-32">
        <option value="PENDING">Pending</option>
        <option value="PARTIAL">Partial</option>
        <option value="RECEIVED">Received</option>
        <option value="OVERDUE">Overdue</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Update
      </Button>
      <button
        type="button"
        onClick={async () => {
          const fd = new FormData();
          fd.set("id", schedule.id);
          await deleteCollectionScheduleAction(fd);
        }}
        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        <Icon name="Trash2" className="h-3.5 w-3.5" />
      </button>
      {state?.error ? <p className="w-full text-sm text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="w-full text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
