"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { logFailure } from "@/lib/logging/failure-log";
import {
  loadPendingActionInvitationIds,
  loadPendingActionRegistrationRequestIds,
  loadPendingNotificationDecisionIds,
  loadPendingDecisionNotificationsForCurrentUser,
  respondToActionRegistrationRequest,
  respondToActionInvitation,
  respondToNotificationDecision,
  type AppNotification,
  type NotificationDecision,
} from "./client";
import {
  loadPendingActionResultPromptIds,
  loadPendingPostActionClaimIds,
  respondToActionResultPrompt,
  respondToPostActionClaimReview,
} from "./action-result-client";
import { getNotificationDecisionDescriptor, type NotificationDecisionDescriptor } from "./notification-state";
import type { NotificationIdentity } from "./identity";

async function loadAllPendingRequestIds(): Promise<string[]> {
  const [shareIds, invitationIds, registrationRequestIds, resultPromptIds, postActionClaimIds] = await Promise.all([
    loadPendingNotificationDecisionIds(),
    loadPendingActionInvitationIds(),
    loadPendingActionRegistrationRequestIds(),
    loadPendingActionResultPromptIds(),
    loadPendingPostActionClaimIds(),
  ]);
  return [...new Set([
    ...shareIds,
    ...invitationIds,
    ...registrationRequestIds,
    ...resultPromptIds,
    ...postActionClaimIds,
  ])];
}

async function submitNotificationDecision(
  descriptor: NotificationDecisionDescriptor,
  decision: NotificationDecision,
) {
  if (descriptor.kind === "action_result" && descriptor.actionId) {
    return respondToActionResultPrompt(
      descriptor.actionId,
      decision === "claim" ? "claim" : "not_participated",
    );
  }
  if (descriptor.kind === "action_post_action_claim" && descriptor.actionId) {
    if (decision !== "accept" && decision !== "reject") {
      return { status: "unavailable" as const, registrationId: descriptor.requestId, actionId: descriptor.actionId };
    }
    return respondToPostActionClaimReview(descriptor.actionId, descriptor.requestId, decision);
  }
  if (descriptor.kind === "action_invitation") {
    return respondToActionInvitation(descriptor.requestId, decision);
  }
  if (descriptor.kind === "action_registration_request" && descriptor.actionId) {
    return respondToActionRegistrationRequest(descriptor.actionId, descriptor.requestId, decision);
  }
  return respondToNotificationDecision(descriptor.requestId, decision);
}

function useNotificationDecisionRefresh(params: {
  getToken: () => Promise<string | null>;
  isCurrentRequest: (request: NotificationIdentity) => boolean;
  scope: string;
  setPendingIds: (ids: string[]) => void;
  setPendingDecisionNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setMissingPendingRequestIds: Dispatch<SetStateAction<string[]>>;
  setDecisionStateError: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    getToken,
    isCurrentRequest,
    scope,
    setPendingIds,
    setPendingDecisionNotifications,
    setMissingPendingRequestIds,
    setDecisionStateError,
  } = params;

  return useCallback(async (request: NotificationIdentity) => {
    try {
      const ids = await loadAllPendingRequestIds();
      if (!isCurrentRequest(request) || !request.userId) return null;
      const pendingProjection = await loadPendingDecisionNotificationsForCurrentUser(
        request.userId,
        getToken,
        ids,
      );
      if (!isCurrentRequest(request)) return null;
      setPendingIds(ids);
      setPendingDecisionNotifications(pendingProjection.notifications);
      setMissingPendingRequestIds(pendingProjection.missingRequestIds);
      setDecisionStateError(pendingProjection.missingRequestIds.length > 0);
      return new Set(ids);
    } catch (error) {
      if (isCurrentRequest(request)) {
        setDecisionStateError(true);
        logFailure(scope, "Decision state fetch failed", error);
      }
      return null;
    }
  }, [getToken, isCurrentRequest, scope, setDecisionStateError, setMissingPendingRequestIds, setPendingDecisionNotifications, setPendingIds]);
}

export function useNotificationDecisionState(params: {
  getRequest: () => NotificationIdentity;
  isCurrentRequest: (request: NotificationIdentity) => boolean;
  getToken: () => Promise<string | null>;
  scope: string;
}) {
  const { getRequest, isCurrentRequest, getToken, scope } = params;
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const pendingRequestIdsRef = useRef<Set<string>>(new Set());
  const [pendingDecisionNotifications, setPendingDecisionNotifications] = useState<AppNotification[]>([]);
  const [missingPendingRequestIds, setMissingPendingRequestIds] = useState<string[]>([]);
  const [treatedNotificationIds, setTreatedNotificationIds] = useState<Set<string>>(new Set());
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [busyDecisionIds, setBusyDecisionIds] = useState<Set<string>>(new Set());
  const [decisionStateError, setDecisionStateError] = useState(false);

  const setPendingIds = useCallback((ids: string[]) => {
    const next = new Set(ids);
    pendingRequestIdsRef.current = next;
    setPendingRequestIds(next);
  }, []);

  const refreshDecisionState = useNotificationDecisionRefresh({
    getToken,
    isCurrentRequest,
    scope,
    setPendingIds,
    setPendingDecisionNotifications,
    setMissingPendingRequestIds,
    setDecisionStateError,
  });

  const handleDecision = useCallback(async (notification: AppNotification, decision: NotificationDecision) => {
    const descriptor = getNotificationDecisionDescriptor(notification.payload);
    const request = getRequest();
    if (!descriptor || !request.userId || busyDecisionIds.has(notification.id)) return;

    setBusyDecisionIds((previous) => new Set(previous).add(notification.id));
    setDecisionErrors((previous) => {
      const next = { ...previous };
      delete next[notification.id];
      return next;
    });
    try {
      const currentPendingIds = await refreshDecisionState(request);
      if (!isCurrentRequest(request)) return;
      if (!currentPendingIds?.has(descriptor.requestId)) {
        setDecisionErrors((previous) => ({ ...previous, [notification.id]: "Cette décision n'est plus disponible." }));
        return;
      }

      const result = await submitNotificationDecision(descriptor, decision);
      if (!isCurrentRequest(request)) return;
      if (result.status === "unavailable") {
        setPendingIds([...pendingRequestIdsRef.current].filter((id) => id !== descriptor.requestId));
        setPendingDecisionNotifications((previous) => previous.filter((item) => item.id !== notification.id));
        setDecisionErrors((previous) => ({ ...previous, [notification.id]: "Cette décision n'est plus disponible." }));
        return;
      }

      setPendingIds([...pendingRequestIdsRef.current].filter((id) => id !== descriptor.requestId));
      setPendingDecisionNotifications((previous) => previous.filter((item) => item.id !== notification.id));
      setTreatedNotificationIds((previous) => new Set(previous).add(notification.id));
      await refreshDecisionState(request);
    } catch (error) {
      if (isCurrentRequest(request)) {
        setDecisionErrors((previous) => ({ ...previous, [notification.id]: "La décision n'a pas pu être enregistrée." }));
        logFailure(scope, "Decision failed", error, { id: notification.id });
      }
    } finally {
      if (isCurrentRequest(request)) {
        setBusyDecisionIds((previous) => {
          const next = new Set(previous);
          next.delete(notification.id);
          return next;
        });
      }
    }
  }, [busyDecisionIds, getRequest, isCurrentRequest, refreshDecisionState, scope, setPendingIds]);

  return {
    pendingRequestIds,
    pendingRequestIdsRef,
    pendingDecisionNotifications,
    missingPendingRequestIds,
    treatedNotificationIds,
    decisionErrors,
    busyDecisionIds,
    decisionStateError,
    setPendingIds,
    refreshDecisionState,
    handleDecision,
  };
}
