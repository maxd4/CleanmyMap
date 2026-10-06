import { useCallback, useState } from "react";
import type { ActionListItem } from "@/lib/actions/types";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import { canManageGroupJoin } from "./actions-history-list.helpers";

type GroupJoinReviewParams = {
  fr: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  selectedItem: ActionListItem | null;
  reload: () => Promise<unknown>;
  removePendingGroupJoinRequest: (requestId: string) => void;
  setPendingGroupJoinError: (message: string | null) => void;
  setGroupJoinNotice: (message: string | null) => void;
};

export type ActionsHistoryListGroupJoinReviewModel = {
  reviewingParticipantId: string | null;
  handleReviewGroupJoin: (
    request: ActionParticipationReviewItem,
    decision: "accept" | "reject",
  ) => Promise<void>;
};

export function useActionsHistoryListGroupJoinReview({
  fr,
  currentUserId,
  isAdminLikeUser,
  selectedItem,
  reload,
  removePendingGroupJoinRequest,
  setPendingGroupJoinError,
  setGroupJoinNotice,
}: GroupJoinReviewParams): ActionsHistoryListGroupJoinReviewModel {
  const [reviewingParticipantId, setReviewingParticipantId] = useState<string | null>(null);

  const handleReviewGroupJoin = useCallback(
    async (request: ActionParticipationReviewItem, decision: "accept" | "reject") => {
      if (!selectedItem || !canManageGroupJoin(selectedItem, currentUserId, isAdminLikeUser)) {
        return;
      }

      setReviewingParticipantId(request.id);
      setGroupJoinNotice(null);
      setPendingGroupJoinError(null);

      try {
        const response = await fetch(
          `/api/actions/${encodeURIComponent(selectedItem.id)}/group-join`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: request.id, decision }),
          },
        );
        const payload = (await response.json()) as
          | { status: "ok"; actionId: string; participantId: string; decision: "accept" | "reject" }
          | { error?: string };
        if (!response.ok) {
          setPendingGroupJoinError(
            typeof payload === "object" && payload && "error" in payload && payload.error
              ? payload.error
              : fr
                ? "Impossible de traiter la demande."
                : "Unable to review the request.",
          );
          return;
        }

        removePendingGroupJoinRequest(request.id);
        setGroupJoinNotice(
          decision === "accept"
            ? fr ? "Demande acceptée." : "Request accepted."
            : fr ? "Demande refusée." : "Request rejected.",
        );
        await reload();
      } catch {
        setPendingGroupJoinError(
          fr
            ? "Impossible de traiter la demande."
            : "Unable to review the request.",
        );
      } finally {
        setReviewingParticipantId(null);
      }
    },
    [
      currentUserId,
      fr,
      isAdminLikeUser,
      reload,
      removePendingGroupJoinRequest,
      selectedItem,
      setGroupJoinNotice,
      setPendingGroupJoinError,
    ],
  );

  return { reviewingParticipantId, handleReviewGroupJoin };
}
