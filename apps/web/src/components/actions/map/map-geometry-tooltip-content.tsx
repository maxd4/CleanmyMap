import { formatObservedDate } from "./action-popup-content.helpers";
import { CmmBadge } from "@/components/ui/cmm-badge";
import { formatScorePercent } from "@/lib/formatters/score";
import type { ActionPollutionScoreAvailability } from "./pollution-score-scope";

type GeometryTooltipContentProps = {
  title: string;
  geometryModeLabel: string;
  geometryPointsLabel: string;
  geometryMetricLabel: string | null;
  color: string;
  actionReading?: {
    scoreScope?: "global" | "department";
    historicalScore: number;
    projectedScore: number;
    globalScore?: number | null;
    globalWasteScore?: number | null;
    globalButtsScore?: number | null;
    departmentScore?: number | null;
    departmentWasteScore?: number | null;
    departmentButtsScore?: number | null;
    departmentName?: string | null;
    departmentUnavailable?: boolean;
    departmentAvailability?: ActionPollutionScoreAvailability;
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

      <p className="mt-1 cmm-text-small font-bold leading-tight text-slate-900 dark:text-slate-50">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {geometryMetricLabel && (
          <CmmBadge tone="slate" size="sm" shape="pill">
            {geometryMetricLabel}
          </CmmBadge>
        )}
      </div>

      {actionReading ? (
        <div className="mt-2 space-y-0.5 border-t border-slate-200/80 pt-2 cmm-text-small font-semibold text-slate-600 dark:border-slate-700/80 dark:text-slate-300">
          {actionReading.scoreScope === "department" ? (
            actionReading.departmentUnavailable ? (
              <>
                <p>
                  {actionReading.departmentAvailability === "department_insufficient_data"
                    ? "Données départementales insuffisantes"
                    : "Comparaison départementale indisponible"}
                </p>
                <p>
                  {actionReading.departmentAvailability === "department_insufficient_data"
                    ? "Au moins deux actions éligibles sont nécessaires."
                    : "Aucune référence départementale disponible."}
                </p>
              </>
            ) : (
              <>
                <p>Score relatif : {formatScorePercent(Math.round(actionReading.departmentScore ?? 0))}</p>
                <p>Déchets : {formatScorePercent(Math.round(actionReading.departmentWasteScore ?? 0))}</p>
                <p>Mégots : {formatScorePercent(Math.round(actionReading.departmentButtsScore ?? 0))}</p>
                <p>Département : {actionReading.departmentName ?? "non renseigné"}</p>
                <p>Comparaison au maximum départemental</p>
              </>
            )
          ) : actionReading.scoreScope === "global" ? (
            <>
              <p>Score global : {formatScorePercent(Math.round(actionReading.globalScore ?? actionReading.historicalScore))}</p>
              <p>Déchets : {formatScorePercent(Math.round(actionReading.globalWasteScore ?? 0))}</p>
              <p>Mégots : {formatScorePercent(Math.round(actionReading.globalButtsScore ?? 0))}</p>
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
                      <p className="pt-1 cmm-text-caption font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                        Estimation · pas une mesure en temps réel
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>Pollution projetée : {formatScorePercent(Math.round(actionReading.projectedScore))}</p>
                  <p>Temps depuis la dernière action : {actionReading.elapsedDays} j</p>
                </>
              )}
            </>
          ) : actionReading.displayMode ? (
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
                      <p className="pt-1 cmm-text-caption font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
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
                <p className="pt-1 cmm-text-caption font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
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
