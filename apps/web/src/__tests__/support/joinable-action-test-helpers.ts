import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";

export function makeJoinableActionItem(
  partial: Partial<JoinableActionItem> & Pick<JoinableActionItem, "id" | "action_date" | "location_label">,
): JoinableActionItem {
  return {
    ...partial,
    created_at: `${partial.action_date}T10:00:00Z`,
    volunteers_count: partial.volunteers_count ?? 12,
    duration_minutes: partial.duration_minutes ?? 30,
    status: partial.status ?? "approved",
    actionPhase: partial.actionPhase ?? "post_action_complete",
    participantsCount: partial.participantsCount ?? 0,
    joined: partial.joined ?? false,
    awaitingApproval: partial.awaitingApproval ?? false,
    joinedAt: partial.joinedAt ?? null,
    participationStatus: partial.participationStatus ?? null,
    participationSource: partial.participationSource ?? null,
    participationUpdatedAt: partial.participationUpdatedAt ?? null,
    groupJoinEnabled: partial.groupJoinEnabled ?? false,
    pendingRequestsCount: partial.pendingRequestsCount ?? 0,
    practicalInfo: partial.practicalInfo ?? {
      accessibility: null,
      safetyInstructions: null,
      derivedSafetyRecommendations: [],
      materialsToBring: null,
      derivedMaterials: [],
      materialsProvided: null,
      participantMessage: null,
    },
  };
}
