"use client";

import { useCallback, useRef, useState } from "react";

import { logFailure } from "@/lib/logging/failure-log";
import {
  loadPendingActionInvitationIds,
  loadPendingNotificationDecisionIds,
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
  scope: string;
}) {
  const { getRequest, isCurrentRequest, scope } = params;
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const pendingRequestIdsRef = useRef<Set<string>>(new Set());
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
      const [shareIds, invitationIds] = await Promise.all([
        loadPendingNotificationDecisionIds(),
        loadPendingActionInvitationIds(),
      ]);
      const ids = [...new Set([...shareIds, ...invitationIds])];
      if (!isCurrentRequest(request)) return null;
      setPendingIds(ids);
      setDecisionStateError(false);
      return new Set(ids);
    } catch (error) {
      if (isCurrentRequest(request)) {
        setDecisionStateError(true);
        logFailure(scope, "Decision state fetch failed", error);
      }
      return null;
    }
  }, [isCurrentRequest, scope, setPendingIds]);

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
        : await respondToNotificationDecision(descriptor.requestId, decision);
      if (!isCurrentRequest(request)) return;
      if (result.status === "unavailable") {
        setPendingIds([...pendingRequestIdsRef.current].filter((id) => id !== descriptor.requestId));
        setDecisionErrors((previous) => ({ ...previous, [notification.id]: "Cette décision n'est plus disponible." }));
        return;
      }

      setPendingIds([...pendingRequestIdsRef.current].filter((id) => id !== descriptor.requestId));
      setTreatedNotificationIds((previous) => new Set(previous).add(notification.id));
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
    treatedNotificationIds,
    decisionErrors,
    busyDecisionIds,
    decisionStateError,
    setPendingIds,
    refreshDecisionState,
    handleDecision,
  };
}
