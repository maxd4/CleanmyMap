import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import { getActionOperationalContext } from "@/lib/actions/operational-context";
import { formatScorePercent } from "@/lib/formatters/score";
import { formatRecordType } from "./actions-history-list.helpers";
import type { ActionHistoryQualityResult } from "./actions-history-list-query";

export function buildActionsHistoryPdfData({
  approvedFilteredItems,
  qualityById,
  statusFilter,
  qualityFilter,
  toFixOnly,
  search,
}: {
  approvedFilteredItems: ActionListItem[];
  qualityById: Map<string, ActionHistoryQualityResult>;
  statusFilter: string;
  qualityFilter: string;
  toFixOnly: boolean;
  search: string;
}) {
  const pdfRows = approvedFilteredItems.map((item) => {
    const quality = qualityById.get(item.id);
    const operational = item.contract ? getActionOperationalContext(item.contract) : null;
    return {
      Date: item.action_date,
      Bénévole: item.actor_name || "Anonyme",
      Lieu: item.location_label,
      Type: formatRecordType(item),
      Kg: mapItemWasteKg(item as ActionMapItem) ?? 0,
      Mégots: mapItemCigaretteButts(item as ActionMapItem) ?? 0,
      Statut: item.status,
      Qualité: quality ? `${quality.grade} (${formatScorePercent(quality.score)})` : "n/a",
      Contexte: operational?.placeTypeLabel ?? "n/a",
    };
  });

  return {
    title: "Rapport historique terrain",
    summary: [
      `Statut filtré: ${statusFilter}.`,
      `Grade qualité: ${qualityFilter}.`,
      toFixOnly ? "Vue limitée aux enregistrements à corriger." : "Vue complète selon filtres actifs.",
      search.trim() ? `Recherche active: ${search.trim()}.` : "Aucune recherche texte active.",
    ],
    stats: [
      { label: "Actions validées exportées", value: approvedFilteredItems.length },
      { label: "Qualité A", value: approvedFilteredItems.filter((item) => qualityById.get(item.id)?.grade === "A").length },
      { label: "Qualité B", value: approvedFilteredItems.filter((item) => qualityById.get(item.id)?.grade === "B").length },
      { label: "Qualité C", value: approvedFilteredItems.filter((item) => qualityById.get(item.id)?.grade === "C").length },
    ],
    rows: pdfRows,
    columns: [
      { key: "Date", label: "Date" },
      { key: "Bénévole", label: "Bénévole" },
      { key: "Lieu", label: "Lieu" },
      { key: "Type", label: "Type" },
      { key: "Kg", label: "Kg" },
      { key: "Mégots", label: "Mégots" },
      { key: "Statut", label: "Statut" },
      { key: "Qualité", label: "Qualité" },
      { key: "Contexte", label: "Contexte" },
    ],
  };
}
