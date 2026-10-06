import { useCallback, useEffect, useState } from "react";
import type { ActionListItem } from "@/lib/actions/types";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";

type GroupJoinRequestsParams = {
  fr: boolean;
  selectedItem: ActionListItem | null;
  selectedCanModerateGroupJoin: boolean;
};

export type ActionsHistoryListGroupJoinRequestsModel = {
  pendingGroupJoinRequests: ActionParticipationReviewItem[];
  pendingGroupJoinLoading: boolean;
  pendingGroupJoinError: string | null;
  loadPendingGroupJoinRequests: (actionId: string, signal?: AbortSignal) => Promise<void>;
  removePendingGroupJoinRequest: (requestId: string) => void;
  setPendingGroupJoinError: (message: string | null) => void;
};

export function useActionsHistoryListGroupJoinRequests({
  fr,
  selectedItem,
  selectedCanModerateGroupJoin,
}: GroupJoinRequestsParams): ActionsHistoryListGroupJoinRequestsModel {
  const [pendingGroupJoinRequests, setPendingGroupJoinRequests] = useState<ActionParticipationReviewItem[]>([]);
  const [pendingGroupJoinLoading, setPendingGroupJoinLoading] = useState(false);
  const [pendingGroupJoinError, setPendingGroupJoinError] = useState<string | null>(null);

  const loadPendingGroupJoinRequests = useCallback(
    async (actionId: string, signal?: AbortSignal) => {
      setPendingGroupJoinLoading(true);
      setPendingGroupJoinError(null);

      try {
        const response = await fetch(
          `/api/actions/${encodeURIComponent(actionId)}/group-join`,
          { signal },
        );
        const payload = (await response.json()) as
          | {
              status: "ok";
              actionId: string;
              count: number;
              pendingRequests: ActionParticipationReviewItem[];
              canReview: boolean;
            }
          | { error?: string };

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload && payload.error
              ? payload.error
              : fr
                ? "Impossible de charger la file d'attente."
                : "Unable to load the waitlist.";
          setPendingGroupJoinRequests([]);
          setPendingGroupJoinError(message);
          return;
        }

        setPendingGroupJoinRequests((payload as { pendingRequests?: ActionParticipationReviewItem[] }).pendingRequests ?? []);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        setPendingGroupJoinRequests([]);
        setPendingGroupJoinError(
          fr
            ? "Impossible de charger la file d'attente."
            : "Unable to load the waitlist.",
        );
      } finally {
        setPendingGroupJoinLoading(false);
      }
    },
    [fr],
  );

  useEffect(() => {
    const selectedActionId = selectedItem?.id;
    if (!selectedActionId || !selectedCanModerateGroupJoin) {
      return undefined;
    }

    const controller = new AbortController();
    void (async () => {
      await loadPendingGroupJoinRequests(selectedActionId, controller.signal);
    })();
    return () => controller.abort();
  }, [loadPendingGroupJoinRequests, selectedCanModerateGroupJoin, selectedItem?.id]);

  return {
    pendingGroupJoinRequests: selectedCanModerateGroupJoin ? pendingGroupJoinRequests : [],
    pendingGroupJoinLoading: selectedCanModerateGroupJoin ? pendingGroupJoinLoading : false,
    pendingGroupJoinError: selectedCanModerateGroupJoin ? pendingGroupJoinError : null,
    loadPendingGroupJoinRequests,
    removePendingGroupJoinRequest: (requestId) =>
      setPendingGroupJoinRequests((previous) => previous.filter((item) => item.id !== requestId)),
    setPendingGroupJoinError,
  };
}
