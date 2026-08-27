import type { ActionListItem } from "@/lib/actions/types";

export function normalizeListType(item: ActionListItem): "action" | "spot" | "clean_place" {
  if (item.contract?.type) return item.contract.type;
  if (item.record_type === "clean_place") return "clean_place";
  if (item.record_type === "other") return "spot";
  return "action";
}
