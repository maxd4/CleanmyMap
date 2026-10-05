import type { ImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import { ImpactTerrain2026PieChart, type ImpactTerrainPieChartEntry } from "./impact-terrain-2026-pie-chart";

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
  const chartEntries: ImpactTerrainPieChartEntry[] = qualifiedEntries.map((entry) => ({
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
  return (
    <ImpactTerrain2026PieChart
      entries={chartEntries}
      displayTotal={total > 0 ? total : "—"}
      totalLabel="total"
      ariaLabel={isFrench ? "Répartition des mégots par état qualifié" : "Cigarette butts distribution by qualified condition"}
      emptyMessage={isFrench ? "Aucune qualification d’état n’est disponible dans l’agrégat public chargé. Aucun état n’est attribué par défaut." : "No condition qualification is available in the loaded public aggregate. No condition is assigned by default."}
      footerMessage={isFrench ? "La somme du graphique couvre uniquement les mégots qualifiés. Les mégots non qualifiés restent signalés séparément et ne sont pas attribués arbitrairement à un état." : "The chart total only covers qualified butts. Unqualified butts remain identified separately and are not arbitrarily assigned to a condition."}
    />
  );
}
