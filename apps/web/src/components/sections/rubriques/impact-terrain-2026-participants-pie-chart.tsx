import type { ActionDistributionEntry } from "@/lib/accueil/action-participant-aggregation";
import { ImpactTerrain2026PieChart, type ImpactTerrainPieChartEntry } from "./impact-terrain-2026-pie-chart";

const CATEGORY_COLORS = [
  "#fca5a5",
  "#fcd34d",
  "#86efac",
  "#67e8f9",
  "#a5b4fc",
  "#f9a8d4",
  "#c4b5fd",
] as const;

export function ImpactTerrain2026ParticipantsPieChart({
  distribution,
  participantsTotal,
  isFrench,
}: {
  distribution: readonly ActionDistributionEntry[];
  participantsTotal: number;
  isFrench: boolean;
}) {
  const entries: ImpactTerrainPieChartEntry[] = distribution
    .filter((entry) => entry.count > 0)
    .map((entry, index) => ({
      key: entry.key,
      label: entry.category,
      count: entry.count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  return (
    <ImpactTerrain2026PieChart
      entries={entries}
      displayTotal={participantsTotal}
      totalLabel="participants"
      ariaLabel={isFrench ? "Répartition des actions par catégorie" : "Action distribution by category"}
      emptyMessage={isFrench ? "Aucune action classée n’est disponible dans l’agrégat public chargé." : "No classified action is available in the loaded public aggregate."}
      footerMessage={isFrench ? "Chaque action éligible apparaît une seule fois. Les actions spontanées sont classées selon le nombre de participants ; les structures sont classées selon leur type canonique." : "Each eligible action appears once. Spontaneous actions are classified by participant count; structured actions use their canonical organizer type."}
    />
  );
}
