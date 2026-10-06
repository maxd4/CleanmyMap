import { useState } from "react";
import type { ActionListItem } from "@/lib/actions/types";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import { canManageGroupJoin } from "./actions-history-list.helpers";
import { useActionsHistoryListGroupJoinRequests } from "./use-actions-history-list-group-join-requests";
import { useActionsHistoryListGroupJoinReview } from "./use-actions-history-list-group-join-review";

type ActionsHistoryListParticipationParams = {
  fr: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  selectedItem: ActionListItem | null;
  reload: () => Promise<unknown>;
};

export type ActionsHistoryListParticipationModel = {
  selectedCanModerateGroupJoin: boolean;
  pendingGroupJoinRequests: ActionParticipationReviewItem[];
  pendingGroupJoinLoading: boolean;
  pendingGroupJoinError: string | null;
  reviewingParticipantId: string | null;
  groupJoinActionId: string | null;
  groupJoinNotice: string | null;
  loadPendingGroupJoinRequests: (actionId: string, signal?: AbortSignal) => Promise<void>;
  handleToggleGroupJoin: (item: ActionListItem, nextEnabled: boolean) => Promise<void>;
  handleReviewGroupJoin: (
    request: ActionParticipationReviewItem,
    decision: "accept" | "reject",
  ) => Promise<void>;
  clearGroupJoinNotice: () => void;
};

export function useActionsHistoryListParticipation({
  fr,
  currentUserId,
  isAdminLikeUser,
  selectedItem,
  reload,
}: ActionsHistoryListParticipationParams): ActionsHistoryListParticipationModel {
  const [groupJoinActionId, setGroupJoinActionId] = useState<string | null>(null);
  const [groupJoinNotice, setGroupJoinNotice] = useState<string | null>(null);
  const selectedCanModerateGroupJoin = Boolean(
    selectedItem && canManageGroupJoin(selectedItem, currentUserId, isAdminLikeUser),
  );
  const requests = useActionsHistoryListGroupJoinRequests({
    fr,
    selectedItem,
    selectedCanModerateGroupJoin,
  });
  const review = useActionsHistoryListGroupJoinReview({
    fr,
    currentUserId,
    isAdminLikeUser,
    selectedItem,
    reload,
    removePendingGroupJoinRequest: requests.removePendingGroupJoinRequest,
    setPendingGroupJoinError: requests.setPendingGroupJoinError,
    setGroupJoinNotice,
  });

  async function handleToggleGroupJoin(item: ActionListItem, nextEnabled: boolean) {
    if (!canManageGroupJoin(item, currentUserId, isAdminLikeUser)) {
      setGroupJoinNotice(
        fr
          ? "Vous devez être organisateur principal ou admin pour modifier ce formulaire."
          : "You must be the primary organizer or an admin to change this form.",
      );
      return;
    }

    setGroupJoinActionId(item.id);
    setGroupJoinNotice(null);

    try {
      const response = await fetch(
        `/api/actions/${encodeURIComponent(item.id)}/group-join`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupJoinEnabled: nextEnabled }),
        },
      );
      const payload = (await response.json()) as
        | { status: "ok"; groupJoinEnabled: boolean }
        | { error?: string };
      if (!response.ok) {
        setGroupJoinNotice(
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "Impossible de modifier l'ouverture du formulaire."
              : "Unable to change the form opening state.",
        );
        return;
      }

      setGroupJoinNotice(
        nextEnabled
          ? fr ? "Créer un formulaire rouvert." : "Create form reopened."
          : fr ? "Créer un formulaire fermé." : "Create form closed.",
      );
      await reload();
    } catch {
      setGroupJoinNotice(
        fr
          ? "Impossible de modifier l'ouverture du formulaire."
          : "Unable to change the form opening state.",
      );
    } finally {
      setGroupJoinActionId(null);
    }
  }

  return {
    selectedCanModerateGroupJoin,
    pendingGroupJoinRequests: requests.pendingGroupJoinRequests,
    pendingGroupJoinLoading: requests.pendingGroupJoinLoading,
    pendingGroupJoinError: requests.pendingGroupJoinError,
    reviewingParticipantId: review.reviewingParticipantId,
    groupJoinActionId,
    groupJoinNotice,
    loadPendingGroupJoinRequests: requests.loadPendingGroupJoinRequests,
    handleToggleGroupJoin,
    handleReviewGroupJoin: review.handleReviewGroupJoin,
    clearGroupJoinNotice: () => setGroupJoinNotice(null),
  };
}
