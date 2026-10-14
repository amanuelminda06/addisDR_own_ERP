import { Badge } from "./Badge";

export function SectionPlaceholder({
  counts,
  plannedFeatures,
  phaseNote,
}: {
  counts: { label: string; value: number | string }[];
  plannedFeatures: string[];
  phaseNote?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="card border-amber-200 bg-amber-50/60 p-4">
        <div className="flex items-center gap-2">
          <Badge tone="warning">Phase 1 · Foundation</Badge>
        </div>
        <p className="mt-2 text-sm text-amber-900">
          {phaseNote ??
            "The data model and navigation for this module are in place. The full workflow is planned for a later phase — no placeholder or invented figures are shown."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Planned capabilities</h2>
        </div>
        <div className="card-body">
          <ul className="space-y-2 text-sm text-slate-600">
            {plannedFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
