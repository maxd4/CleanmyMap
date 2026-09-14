import type { ActionListItem } from "@/lib/actions/types";
import { isActionStartInFuture } from "@/lib/actions/temporal";

export type JoinActionTab = "future" | "past";

export function resolveJoinActionTab(rawTab: string | null): JoinActionTab {
  return rawTab === "past" ? "past" : "future";
}

export function isPastPublicAction(
  item: ActionListItem,
  now = new Date(),
): boolean {
  return (
    item.record_type === "action" &&
    item.status === "approved" &&
    item.contract?.metadata.actionPhase === "post_action_complete" &&
    !isActionStartInFuture(
      {
        action_date: item.action_date,
        event_start_time: item.contract.dates.eventStartTime ?? null,
      },
      now,
    )
  );
}

export function sortPastActions(items: ActionListItem[]): ActionListItem[] {
  return [...items].sort((left, right) => {
    const dateDifference = right.action_date.localeCompare(left.action_date);
    if (dateDifference !== 0) return dateDifference;
    return right.created_at.localeCompare(left.created_at);
  });
}
