import type { ActionListItem } from "@/lib/actions/types";
import { isActionStartInFuture } from "@/lib/actions/temporal";

export type JoinActionTab = "future" | "past";

export type JoinActionTargetResolution =
  | "none"
  | "resolving"
  | "future"
  | "past"
  | "unavailable";

export function isCanonicalActionId(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function resolveJoinActionTarget({
  actionId,
  futureActionIds,
  pastActionIds,
  futureLoading,
  pastLoading,
}: {
  actionId: string | null;
  futureActionIds: readonly string[];
  pastActionIds: readonly string[];
  futureLoading: boolean;
  pastLoading: boolean;
}): JoinActionTargetResolution {
  if (!actionId) return "none";
  if (pastActionIds.includes(actionId)) return "past";
  if (futureActionIds.includes(actionId)) return "future";
  if (futureLoading || pastLoading) return "resolving";
  return "unavailable";
}

export function resolveJoinActionTab(
  rawTab: string | null,
  targetResolution: JoinActionTargetResolution = "none",
): JoinActionTab {
  if (targetResolution === "past") return "past";
  if (targetResolution === "future") return "future";
  return rawTab === "past" ? "past" : "future";
}

export function prioritizeAction<T extends { id: string }>(items: readonly T[], actionId: string | null): T[] {
  if (!actionId) return [...items];
  const target = items.find((item) => item.id === actionId);
  if (!target) return [...items];
  return [target, ...items.filter((item) => item.id !== actionId)];
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
