import type { CreatorInboxItem, CreatorInboxSource, CreatorInboxStatus } from "@/lib/community/creator-inbox";

export const SOURCE_FILTERS: Array<{ value: "all" | CreatorInboxSource; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "feedback", label: "Feedback" },
  { value: "promotion", label: "Promotion" },
  { value: "partner", label: "Partenariat" },
  { value: "event", label: "Événement" },
];

export const STATUS_FILTERS: Array<{ value: "all" | CreatorInboxStatus; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "new", label: "Nouveau" },
  { value: "pending", label: "En attente de traitement" },
  { value: "accepted", label: "Accepté" },
  { value: "rejected", label: "Refusé" },
  { value: "responded", label: "Répondu" },
  { value: "treated", label: "Traité" },
  { value: "archived", label: "Archivé" },
];

export function refreshList(
  items: CreatorInboxItem[],
  updated: CreatorInboxItem | null,
  deletedId?: string,
): CreatorInboxItem[] {
  if (deletedId) {
    return items.filter((item) => item.sourceRecordId !== deletedId);
  }
  if (!updated) {
    return items;
  }
  return items.map((item) =>
    item.source === updated.source && item.sourceRecordId === updated.sourceRecordId
      ? updated
      : item,
  );
}
