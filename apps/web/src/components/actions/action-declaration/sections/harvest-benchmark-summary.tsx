import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKg, formatSignedPercent } from "../utils/harvest-utils";

type HarvestBenchmarkSummaryProps = {
  currentPerVolunteer: number;
  benchmarkPerVolunteer: number;
  deltaPercent: number;
  trendColor: string;
  sourceLabel: string;
  confidenceLabel: string | null;
};

export function HarvestBenchmarkSummary({
  currentPerVolunteer,
  benchmarkPerVolunteer,
  deltaPercent,
  trendColor,
  sourceLabel,
  confidenceLabel,
}: HarvestBenchmarkSummaryProps) {
  const TrendIcon = deltaPercent > 5 ? TrendingUp : deltaPercent < -5 ? TrendingDown : Minus;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Par bénévole</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatKg(currentPerVolunteer)} kg
            <span className="ml-1 text-xs text-slate-400">vs {formatKg(benchmarkPerVolunteer)} kg moyen</span>
          </p>
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-bold", trendColor)}>
          <TrendIcon size={15} />
          {formatSignedPercent(deltaPercent)}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-right">
        {sourceLabel}{confidenceLabel ? ` · ${confidenceLabel}` : ""}
      </p>
    </>
  );
}
