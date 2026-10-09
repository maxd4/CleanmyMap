"use client";

import { useCallback, useRef, useState } from "react";

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
import { getNotificationDecisionDescriptor } from "./notification-state";
import type { NotificationIdentity } from "./identity";

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

  const refreshDecisionState = useCallback(async (request: NotificationIdentity) => {
    try {
      const [shareIds, invitationIds, registrationRequestIds] = await Promise.all([
        loadPendingNotificationDecisionIds(),
        loadPendingActionInvitationIds(),
        loadPendingActionRegistrationRequestIds(),
      ]);
      const ids = [...new Set([...shareIds, ...invitationIds, ...registrationRequestIds])];
      if (!isCurrentRequest(request)) return null;
      if (!request.userId) return null;
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
  }, [getToken, isCurrentRequest, scope, setPendingIds]);

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

      const result = descriptor.kind === "action_invitation"
        ? await respondToActionInvitation(descriptor.requestId, decision)
        : descriptor.kind === "action_registration_request" && descriptor.actionId
          ? await respondToActionRegistrationRequest(descriptor.actionId, descriptor.requestId, decision)
          : await respondToNotificationDecision(descriptor.requestId, decision);
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
