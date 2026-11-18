import { mapItemWasteKg } from "@/lib/actions/data-contract";
import { evaluateActionQuality } from "@/lib/actions/quality/quality";
import type {
  ActionListItem,
  ActionMapItem,
  ActionQualityGrade,
  ActionStatus,
} from "@/lib/actions/types";

export type HistorySortKey =
  | "date_desc"
  | "date_asc"
  | "quality_desc"
  | "quality_asc"
  | "waste_desc";

export type ActionsHistoryListFilters = {
  statusFilter: ActionStatus | "all";
  qualityFilter: ActionQualityGrade | "all";
  toFixOnly: boolean;
  limit: number;
  search: string;
  sortBy: HistorySortKey;
};

export type ActionHistoryQualityResult = ReturnType<typeof evaluateActionQuality>;

export function filterActionHistoryItems(
  items: ActionListItem[],
  search: string,
): ActionListItem[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const actor = (item.actor_name ?? "").toLowerCase();
    const location = (item.location_label ?? "").toLowerCase();
    return actor.includes(query) || location.includes(query);
  });
}

export function buildActionHistoryQualityMap(
  items: ActionListItem[],
): Map<string, ActionHistoryQualityResult> {
  const output = new Map<string, ActionHistoryQualityResult>();
  for (const item of items) {
    if (typeof item.quality_score === "number" && item.quality_grade) {
      output.set(item.id, {
        score: item.quality_score,
        grade: item.quality_grade,
        breakdown: item.quality_breakdown ?? evaluateActionQuality(item).breakdown,
        flags: item.quality_flags ?? [],
      });
    } else {
      output.set(item.id, evaluateActionQuality(item));
    }
  }
  return output;
}

export function sortActionHistoryItems(
  items: ActionListItem[],
  qualityById: Map<string, ActionHistoryQualityResult>,
  sortBy: HistorySortKey,
): ActionListItem[] {
  if (sortBy === "date_desc") {
    return items;
  }

  const copy = [...items];
  copy.sort((a, b) => {
    if (sortBy === "date_asc") {
      return (a.action_date ?? "").localeCompare(b.action_date ?? "");
    }
    if (sortBy === "quality_desc" || sortBy === "quality_asc") {
      const scoreA = qualityById.get(a.id)?.score ?? -1;
      const scoreB = qualityById.get(b.id)?.score ?? -1;
      return sortBy === "quality_desc" ? scoreB - scoreA : scoreA - scoreB;
    }
    const wasteA = Number(mapItemWasteKg(a as ActionMapItem) ?? -1);
    const wasteB = Number(mapItemWasteKg(b as ActionMapItem) ?? -1);
    return wasteB - wasteA;
  });
  return copy;
}

export function selectActionHistoryItem(
  items: ActionListItem[],
  selectedId: string | null,
): ActionListItem | null {
  if (!selectedId) {
    return null;
  }
  return items.find((item) => item.id === selectedId) ?? null;
}

export function resolveCorrectiveAction(
  quality: ActionHistoryQualityResult | null,
): string | null {
  if (!quality) {
    return null;
  }

  if (quality.breakdown.geoloc < 70) {
    return "Renforcer géo-traçabilité (coordonnées + tracé/polygone).";
  }
  if (quality.breakdown.traceability < 80) {
    return "Compléter les champs de traçabilité (auteur/source/dates).";
  }
  if (quality.breakdown.freshness < 70) {
    return "Prioriser la modération pour réduire l’ancienneté.";
  }
  return "Corriger les champs incomplets et valeurs incohérentes.";
}
