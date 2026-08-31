import { formatObservedDate } from "./action-popup-content.helpers";
import { CmmBadge } from "@/components/ui/cmm-badge";
import { formatScorePercent } from "@/lib/formatters/score";

type GeometryTooltipContentProps = {
  title: string;
  geometryModeLabel: string;
  geometryPointsLabel: string;
  geometryMetricLabel: string | null;
  geometryConfidenceLabel: string | null;
  color: string;
  actionReading?: {
    historicalScore: number;
    projectedScore: number;
    elapsedDays: number;
    isEstimate: boolean;
    projectionConfidenceLabel: string;
    displayMode?: "observed" | "projected_today";
    displaySource?: "observed" | "projected" | "historical";
    displayedScore?: number | null;
    displayedScoreKind?: "measured" | "projected" | "unavailable";
    displayedStateLabel?: string;
    displayedDate?: string;
  };
};

export function GeometryTooltipContent({
  title,
  geometryModeLabel,
  geometryPointsLabel,
  geometryMetricLabel,
  geometryConfidenceLabel,
  color,
  actionReading,
}: GeometryTooltipContentProps) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.5)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-2">
        <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {geometryModeLabel}
        </span>
        <CmmBadge tone="slate" size="sm" shape="pill">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {geometryPointsLabel}
        </CmmBadge>
      </div>

      <p className="mt-1 text-[11px] font-bold leading-tight text-slate-900 dark:text-slate-50">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {geometryMetricLabel && (
          <CmmBadge tone="slate" size="sm" shape="pill">
            {geometryMetricLabel}
          </CmmBadge>
        )}
        {geometryConfidenceLabel && (
          <CmmBadge tone="slate" size="sm" shape="pill">
            {geometryConfidenceLabel}
          </CmmBadge>
        )}
      </div>

      {actionReading ? (
        <div className="mt-2 space-y-0.5 border-t border-slate-200/80 pt-2 text-[9px] font-semibold text-slate-600 dark:border-slate-700/80 dark:text-slate-300">
          {actionReading.displayMode ? (
            <>
              <p>
                {actionReading.displaySource === "projected"
                  ? `Projeté aujourd’hui · dernière observation le ${
                      actionReading.displayedDate
                        ? formatObservedDate(actionReading.displayedDate)
                        : "date inconnue"
                    }`
                  : `Observé le ${
                      actionReading.displayedDate
                        ? formatObservedDate(actionReading.displayedDate)
                        : "date inconnue"
                    }`}
              </p>
              <p>
                {actionReading.displayedScoreKind === "unavailable"
                  ? actionReading.displayedStateLabel ?? "Niveau non quantifié"
                  : `${actionReading.displayedStateLabel ?? "Pollution observée"} : ${formatScorePercent(
                      Math.round(actionReading.displayedScore ?? 0),
                    )}`}
              </p>
              {actionReading.displaySource === "projected" && (
                <>
                  <p>Temps depuis la dernière action : {actionReading.elapsedDays} j</p>
                  <p>{actionReading.projectionConfidenceLabel}</p>
                  <p className="pt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                    Estimation · pas une mesure en temps réel
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p>
                Pollution constatée avant l&apos;action : {formatScorePercent(Math.round(actionReading.historicalScore))}
              </p>
              <p>Pollution projetée : {formatScorePercent(Math.round(actionReading.projectedScore))}</p>
              <p>Temps depuis la dernière action : {actionReading.elapsedDays} j</p>
              <p>{actionReading.projectionConfidenceLabel}</p>
              {actionReading.isEstimate && (
                <p className="pt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                  Estimation · pas une mesure en temps réel
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
