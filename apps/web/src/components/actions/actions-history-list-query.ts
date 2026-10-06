import { evaluateActionQuality } from "@/lib/actions/quality/quality";
import type {
  ActionListItem,
  ActionQualityGrade,
  ActionStatus,
} from "@/lib/actions/types";

export type ActionsHistoryListFilters = {
  statusFilter: ActionStatus | "all";
  qualityFilter: ActionQualityGrade | "all";
  toFixOnly: boolean;
  limit: number;
  search: string;
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

export function selectActionHistoryItem(
  items: ActionListItem[],
  selectedId: string | null,
): ActionListItem | null {
  return items.find((item) => item.id === selectedId) ?? items[0] ?? null;
}

export function resolveCorrectiveAction(
  quality: ActionHistoryQualityResult | null,
): string | null {
  if (!quality) {
    return null;
  }

  if (quality.breakdown.geoloc < 70) {
    return "Renforcer geo-tracabilite (coordonnees + trace/polygone).";
  }
  if (quality.breakdown.traceability < 80) {
    return "Completer les champs de traçabilite (auteur/source/dates).";
  }
  if (quality.breakdown.freshness < 70) {
    return "Prioriser moderation rapide pour reduire la staleness.";
  }
  return "Corriger les champs incomplets et valeurs incoherentes.";
}
