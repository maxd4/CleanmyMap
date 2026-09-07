import type { CSSProperties } from "react";
import type { ImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";

const CONDITION_COLORS = {
  propre: "#86efac",
  humide: "#facc15",
  mouille: "#60a5fa",
  unqualified: "#64748b",
} as const;

export function ImpactTerrain2026ButtsPieChart({
  results,
  isFrench,
}: {
  results: ImpactTerrain2026PublicResults | null;
  isFrench: boolean;
}) {
  const qualifiedEntries = results?.buttsByCondition ?? [];
  const chartEntries: Array<{
    key: string;
    label: string;
    count: number;
    color: string;
  }> = qualifiedEntries.map((entry) => ({
    key: entry.condition,
    label: isFrench ? entry.label.fr : entry.label.en,
    count: entry.count,
    color: CONDITION_COLORS[entry.condition],
  }));
  const unqualifiedCount = results?.unqualifiedButtsTotal ?? 0;
  if (unqualifiedCount > 0) {
    chartEntries.push({
      key: "unqualified",
      label: isFrench ? "Non qualifiés" : "Unqualified",
      count: unqualifiedCount,
      color: CONDITION_COLORS.unqualified,
    });
  }

  const total = chartEntries.reduce((sum, entry) => sum + entry.count, 0);
  let cursor = 0;
  const gradientStops = chartEntries.map((entry) => {
    const start = cursor;
    cursor += (entry.count / (total || 1)) * 100;
    return `${entry.color} ${start}% ${cursor}%`;
  });
  const chartStyle = {
    background: total > 0
      ? `conic-gradient(${gradientStops.join(", ")})`
      : "conic-gradient(#334155 0 100%)",
  } satisfies CSSProperties;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-5">
        <div
          aria-label={
            isFrench
              ? "Répartition des mégots par état qualifié"
              : "Cigarette butts distribution by qualified condition"
          }
          className="relative h-32 w-32 shrink-0 rounded-full p-3"
          role="img"
          style={chartStyle}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-center">
            <span className="text-xs font-black text-white">
              {total > 0 ? total.toLocaleString("fr-FR") : "—"}
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {isFrench ? "total" : "total"}
              </span>
            </span>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-2">
          {chartEntries.length > 0 ? (
            chartEntries.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.label}
                </span>
                <span className="font-black text-white">
                  {entry.count.toLocaleString("fr-FR")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs leading-relaxed text-slate-400">
              {isFrench
                ? "Aucune qualification d’état n’est disponible dans l’agrégat public chargé. Aucun état n’est attribué par défaut."
                : "No condition qualification is available in the loaded public aggregate. No condition is assigned by default."}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        {isFrench
          ? "La somme du graphique couvre uniquement les mégots qualifiés. Les mégots non qualifiés restent signalés séparément et ne sont pas attribués arbitrairement à un état."
          : "The chart total only covers qualified butts. Unqualified butts remain identified separately and are not arbitrarily assigned to a condition."}
      </p>
    </div>
  );
}
