import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";

/**
 * A metric with a period-over-period comparison. Purely presentational —
 * direction and delta come from recorded data only.
 */
export function TrendStat({
  label,
  value,
  delta,
  deltaPct,
  direction,
  goodWhen = "up",
  invert,
}: {
  label: string;
  value: React.ReactNode;
  delta: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  goodWhen?: "up" | "down";
  invert?: boolean;
}) {
  const good =
    direction === "flat" ? null : direction === goodWhen;
  const tone =
    good === null
      ? "text-slate-400"
      : invert
        ? "text-slate-400"
        : good
          ? "text-emerald-600"
          : "text-red-600";

  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", tone)}>
        <Icon
          name={direction === "down" ? "TrendingDown" : "TrendingUp"}
          className="h-3.5 w-3.5"
        />
        {direction === "flat"
          ? "No change"
          : `${delta > 0 ? "+" : ""}${delta.toFixed(
              Number.isInteger(delta) ? 0 : 1,
            )} (${deltaPct >= 0 ? "+" : ""}${Math.round(deltaPct * 100)}%)`}
        <span className="font-normal text-slate-400">vs previous</span>
      </p>
    </div>
  );
}
