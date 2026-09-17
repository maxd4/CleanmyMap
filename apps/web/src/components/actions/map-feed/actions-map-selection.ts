import type { ActionMapItem } from "@/lib/actions/types";

export function buildActionsMapSelectionHref(
  pathname: string,
  currentSearch: string,
  actionId: string | null,
): string {
  const params = new URLSearchParams(currentSearch);
  if (actionId) {
    params.set("actionId", actionId);
  } else {
    params.delete("actionId");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function mergeSelectedActionIntoMapItems(
  items: ActionMapItem[],
  selectedAction: ActionMapItem | null,
): ActionMapItem[] {
  if (!selectedAction || items.some((item) => item.id === selectedAction.id)) {
    return items;
  }
  return [...items, selectedAction];
}
