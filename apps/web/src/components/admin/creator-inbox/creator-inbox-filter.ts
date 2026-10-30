import type { CreatorInboxItem, CreatorInboxSource, CreatorInboxStatus } from "@/lib/community/creator-inbox";

export function filterAndSortCreatorInboxItems(items: CreatorInboxItem[], options: {
  query: string;
  sourceFilter: "all" | CreatorInboxSource;
  statusFilter: "all" | CreatorInboxStatus;
  priorityFilter: "all" | "high" | "normal" | "critical";
  sortMode: "priority" | "date";
}) {
  const normalizedQuery = options.query.trim().toLowerCase();
  return items.filter((item) => {
    if (options.sourceFilter !== "all" && item.source !== options.sourceFilter) return false;
    if (options.statusFilter !== "all" && item.status !== options.statusFilter) return false;
    if (options.priorityFilter !== "all" && item.priority !== options.priorityFilter) return false;
    if (!normalizedQuery) return true;
    const haystack = [item.title, item.subtitle ?? "", item.authorName, item.authorEmail ?? "", item.authorRole ?? "", item.context, item.pagePath ?? "", item.source, item.sourceStatus, item.status, ...item.details.map((detail) => `${detail.label} ${detail.value}`)].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  }).sort((left, right) => options.sortMode === "priority"
    ? ({ critical: 0, high: 1, normal: 2 }[left.priority] - { critical: 0, high: 1, normal: 2 }[right.priority]) || Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.source.localeCompare(right.source) || right.sourceRecordId.localeCompare(left.sourceRecordId)
    : Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.source.localeCompare(right.source) || right.sourceRecordId.localeCompare(left.sourceRecordId));
}
