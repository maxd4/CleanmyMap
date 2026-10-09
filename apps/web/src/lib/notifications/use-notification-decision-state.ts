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
  type PendingDecisionRequest,
  getPendingDecisionRequestKey,
} from "./client";
import {
  loadPendingActionResultPromptIds,
  loadPendingPostActionClaimIds,
  respondToActionResultPrompt,
  respondToPostActionClaimReview,
} from "./action-result-client";
import { getNotificationDecisionDescriptor, type NotificationDecisionDescriptor } from "./notification-state";
import type { NotificationIdentity } from "./identity";

async function loadAllPendingDecisionRequests(): Promise<PendingDecisionRequest[]> {
  const [shareIds, invitationIds, registrationRequestIds, resultPromptIds, postActionClaimIds] = await Promise.all([
    loadPendingNotificationDecisionIds(),
    loadPendingActionInvitationIds(),
    loadPendingActionRegistrationRequestIds(),
    loadPendingActionResultPromptIds(),
    loadPendingPostActionClaimIds(),
  ]);
  const requests: PendingDecisionRequest[] = [
    ...shareIds.map((requestId) => ({ kind: "action_share" as const, requestId })),
    ...invitationIds.map((requestId) => ({ kind: "action_invitation" as const, requestId })),
    ...registrationRequestIds.map((requestId) => ({ kind: "action_registration_request" as const, requestId })),
    ...resultPromptIds.map((requestId) => ({ kind: "action_result" as const, requestId })),
    ...postActionClaimIds.map((requestId) => ({ kind: "action_post_action_claim" as const, requestId })),
  ];
  const seen = new Set<string>();
  return requests.filter((request) => {
    const key = getPendingDecisionRequestKey(request.kind, request.requestId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  setPendingRequests: (requests: PendingDecisionRequest[]) => void;
  setPendingDecisionNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setMissingPendingRequestIds: Dispatch<SetStateAction<string[]>>;
  setDecisionStateError: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    getToken,
    isCurrentRequest,
    scope,
    setPendingRequests,
    setPendingDecisionNotifications,
    setMissingPendingRequestIds,
    setDecisionStateError,
  } = params;

  return useCallback(async (request: NotificationIdentity) => {
    try {
      const requests = await loadAllPendingDecisionRequests();
      if (!isCurrentRequest(request) || !request.userId) return null;
      const pendingProjection = await loadPendingDecisionNotificationsForCurrentUser(
        request.userId,
        getToken,
        requests,
      );
      if (!isCurrentRequest(request)) return null;
      setPendingRequests(requests);
      setPendingDecisionNotifications(pendingProjection.notifications);
      const resolutionIssues = [...pendingProjection.missingRequestIds, ...pendingProjection.unresolvedRequestIds];
      setMissingPendingRequestIds([...new Set(resolutionIssues)]);
      setDecisionStateError(resolutionIssues.length > 0);
      return new Set(requests.map((item) => getPendingDecisionRequestKey(item.kind, item.requestId)));
    } catch (error) {
      if (isCurrentRequest(request)) {
        setDecisionStateError(true);
        logFailure(scope, "Decision state fetch failed", error);
      }
      return null;
    }
  }, [getToken, isCurrentRequest, scope, setDecisionStateError, setMissingPendingRequestIds, setPendingDecisionNotifications, setPendingRequests]);
}

export function useNotificationDecisionState(params: {
  getRequest: () => NotificationIdentity;
  isCurrentRequest: (request: NotificationIdentity) => boolean;
  getToken: () => Promise<string | null>;
  scope: string;
}) {
  const { getRequest, isCurrentRequest, getToken, scope } = params;
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const [pendingDecisionKeys, setPendingDecisionKeys] = useState<Set<string>>(new Set());
  const pendingDecisionRequestsRef = useRef<PendingDecisionRequest[]>([]);
  const [pendingDecisionNotifications, setPendingDecisionNotifications] = useState<AppNotification[]>([]);
  const [missingPendingRequestIds, setMissingPendingRequestIds] = useState<string[]>([]);
  const [treatedNotificationIds, setTreatedNotificationIds] = useState<Set<string>>(new Set());
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [busyDecisionIds, setBusyDecisionIds] = useState<Set<string>>(new Set());
  const [decisionStateError, setDecisionStateError] = useState(false);

  const setPendingRequests = useCallback((requests: PendingDecisionRequest[]) => {
    pendingDecisionRequestsRef.current = requests;
    setPendingRequestIds(new Set(requests.map((request) => request.requestId)));
    setPendingDecisionKeys(new Set(requests.map((request) => getPendingDecisionRequestKey(request.kind, request.requestId))));
  }, []);

  const refreshDecisionState = useNotificationDecisionRefresh({
    getToken,
    isCurrentRequest,
    scope,
    setPendingRequests,
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
      const decisionKey = getPendingDecisionRequestKey(descriptor.kind, descriptor.requestId);
      if (!currentPendingIds?.has(decisionKey)) {
        setDecisionErrors((previous) => ({ ...previous, [notification.id]: "Cette décision n'est plus disponible." }));
        return;
      }

      const result = await submitNotificationDecision(descriptor, decision);
      if (!isCurrentRequest(request)) return;
      if (result.status === "unavailable") {
        setPendingRequests(pendingDecisionRequestsRef.current.filter((item) =>
          getPendingDecisionRequestKey(item.kind, item.requestId) !== decisionKey,
        ));
        setPendingDecisionNotifications((previous) => previous.filter((item) => item.id !== notification.id));
        setDecisionErrors((previous) => ({ ...previous, [notification.id]: "Cette décision n'est plus disponible." }));
        return;
      }

      setPendingRequests(pendingDecisionRequestsRef.current.filter((item) =>
        getPendingDecisionRequestKey(item.kind, item.requestId) !== decisionKey,
      ));
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
  }, [busyDecisionIds, getRequest, isCurrentRequest, refreshDecisionState, scope, setPendingRequests]);

  return {
    pendingRequestIds,
    pendingDecisionKeys,
    pendingDecisionNotifications,
    missingPendingRequestIds,
    treatedNotificationIds,
    decisionErrors,
    busyDecisionIds,
    decisionStateError,
    refreshDecisionState,
    handleDecision,
  };
}
