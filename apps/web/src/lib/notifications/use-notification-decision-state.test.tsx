import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mocks = vi.hoisted(() => ({
  loadPendingNotificationDecisionIds: vi.fn(),
  loadPendingActionInvitationIds: vi.fn(),
  loadPendingActionRegistrationRequestIds: vi.fn(),
  loadPendingDecisionNotificationsForCurrentUser: vi.fn(),
  respondToNotificationDecision: vi.fn(),
  respondToActionInvitation: vi.fn(),
  respondToActionRegistrationRequest: vi.fn(),
  loadPendingActionResultPromptIds: vi.fn(),
  loadPendingPostActionClaimIds: vi.fn(),
  respondToActionResultPrompt: vi.fn(),
  respondToPostActionClaimReview: vi.fn(),
  logFailure: vi.fn(),
}));

vi.mock("@/lib/logging/failure-log", () => ({ logFailure: mocks.logFailure }));
vi.mock("./client", () => ({
  loadPendingNotificationDecisionIds: mocks.loadPendingNotificationDecisionIds,
  loadPendingActionInvitationIds: mocks.loadPendingActionInvitationIds,
  loadPendingActionRegistrationRequestIds: mocks.loadPendingActionRegistrationRequestIds,
  loadPendingDecisionNotificationsForCurrentUser: mocks.loadPendingDecisionNotificationsForCurrentUser,
  respondToNotificationDecision: mocks.respondToNotificationDecision,
  respondToActionInvitation: mocks.respondToActionInvitation,
  respondToActionRegistrationRequest: mocks.respondToActionRegistrationRequest,
  getPendingDecisionRequestKey: (kind: string, requestId: string) => `${kind}:${requestId}`,
}));
vi.mock("./action-result-client", () => ({
  loadPendingActionResultPromptIds: mocks.loadPendingActionResultPromptIds,
  loadPendingPostActionClaimIds: mocks.loadPendingPostActionClaimIds,
  respondToActionResultPrompt: mocks.respondToActionResultPrompt,
  respondToPostActionClaimReview: mocks.respondToPostActionClaimReview,
}));

import { useNotificationDecisionState } from "./use-notification-decision-state";
import type { AppNotification } from "./client";

type HookResult = ReturnType<typeof useNotificationDecisionState>;

const item: AppNotification = {
  id: "notification-share-1",
  type: "chat",
  title: "Demande de partage",
  content: "Une demande attend votre réponse.",
  read_at: null,
  created_at: "2026-10-26T10:00:00.000Z",
  payload: { requestKind: "action_share", requestId: "request-1" },
};

function renderHook(overrides: Partial<{
  getRequest: () => NotificationIdentity;
  isCurrentRequest: (request: NotificationIdentity) => boolean;
}> = {}) {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;
  function Harness() {
    result = useNotificationDecisionState({
      getRequest: overrides.getRequest ?? (() => ({ userId: "user-1", generation: 1 })),
      isCurrentRequest: overrides.isCurrentRequest ?? ((request) => request.userId === "user-1" && request.generation === 1),
      getToken: async () => "token",
      scope: "notifications-test",
    });
    return null;
  }
  act(() => { renderer = create(React.createElement(Harness)); });
  return {
    get result() { return result; },
    unmount() { act(() => renderer.unmount()); },
  };
}

describe("useNotificationDecisionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPendingNotificationDecisionIds.mockResolvedValue(["request-1"]);
    mocks.loadPendingActionInvitationIds.mockResolvedValue([]);
    mocks.loadPendingActionRegistrationRequestIds.mockResolvedValue([]);
    mocks.loadPendingActionResultPromptIds.mockResolvedValue([]);
    mocks.loadPendingPostActionClaimIds.mockResolvedValue([]);
    mocks.loadPendingDecisionNotificationsForCurrentUser.mockResolvedValue({
      notifications: [item],
      missingRequestIds: [],
      unresolvedRequestIds: [],
    });
    mocks.respondToNotificationDecision.mockResolvedValue({
      status: "accepted",
      messageId: null,
      actionId: "action-1",
      senderId: "user-2",
    });
    mocks.respondToActionInvitation.mockResolvedValue({ status: "accepted", messageId: null, actionId: "action-1", senderId: "user-2" });
    mocks.respondToActionRegistrationRequest.mockResolvedValue({ status: "rejected", registrationId: "registration-1", actionId: "action-1" });
  });

  it("bloque un double-clic synchrone avant toute seconde mutation", async () => {
    let release!: (value: unknown) => void;
    mocks.respondToNotificationDecision.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const hook = renderHook();

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = hook.result.handleDecision(item, "accept");
      second = hook.result.handleDecision(item, "reject");
      for (let index = 0; index < 12 && !mocks.respondToNotificationDecision.mock.calls.length; index += 1) {
        await Promise.resolve();
      }
      expect(mocks.respondToNotificationDecision).toHaveBeenCalledTimes(1);
      expect(mocks.respondToNotificationDecision).toHaveBeenCalledWith("request-1", "accept");
      release({ status: "accepted", messageId: null, actionId: "action-1", senderId: "user-2" });
      await Promise.all([first, second]);
    });

    expect(hook.result.treatedNotificationIds.has(item.id)).toBe(true);
    expect(hook.result.busyDecisionIds.has(item.id)).toBe(false);
    hook.unmount();
  });

  it("refuse une décision devenue étrangère ou déjà résolue sans mutation", async () => {
    mocks.loadPendingNotificationDecisionIds.mockResolvedValue([]);
    const hook = renderHook();
    await act(async () => { await hook.result.handleDecision(item, "accept"); });
    expect(mocks.respondToNotificationDecision).not.toHaveBeenCalled();
    expect(hook.result.decisionErrors[item.id]).toBe("Cette décision n'est plus disponible.");
    hook.unmount();
  });

  it("permet un rejeu après une erreur d'enregistrement et ne conserve pas busy", async () => {
    mocks.respondToNotificationDecision
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ status: "rejected", messageId: null, actionId: null, senderId: null });
    const hook = renderHook();
    await act(async () => { await hook.result.handleDecision(item, "reject"); });
    expect(hook.result.busyDecisionIds.has(item.id)).toBe(false);
    expect(hook.result.decisionErrors[item.id]).toBe("La décision n'a pas pu être enregistrée.");
    await act(async () => { await hook.result.handleDecision(item, "reject"); });
    expect(mocks.respondToNotificationDecision).toHaveBeenCalledTimes(2);
    expect(hook.result.treatedNotificationIds.has(item.id)).toBe(true);
    expect(hook.result.decisionErrors[item.id]).toBeUndefined();
    hook.unmount();
  });

  it("route les invitations et les demandes d'inscription vers leurs mutations dédiées", async () => {
    const invitation: AppNotification = {
      ...item,
      id: "notification-invitation-1",
      payload: { eventType: "action_event", subtype: "invitation", registrationId: "registration-1" },
    };
    const registration: AppNotification = {
      ...item,
      id: "notification-registration-1",
      payload: { eventType: "action_event", subtype: "registration_request", requestKind: "registration_request", registrationId: "registration-1", actionId: "action-1" },
    };
    mocks.loadPendingActionInvitationIds.mockResolvedValue(["registration-1"]);
    mocks.loadPendingActionRegistrationRequestIds.mockResolvedValue(["registration-1"]);
    const hook = renderHook();
    await act(async () => { await hook.result.handleDecision(invitation, "accept"); });
    await act(async () => { await hook.result.handleDecision(registration, "reject"); });
    expect(mocks.respondToActionInvitation).toHaveBeenCalledWith("registration-1", "accept");
    expect(mocks.respondToActionRegistrationRequest).toHaveBeenCalledWith("action-1", "registration-1", "reject");
    hook.unmount();
  });

  it("n'écrit pas après invalidation de la session en cours", async () => {
    const hook = renderHook({ isCurrentRequest: () => false });
    await act(async () => { await hook.result.handleDecision(item, "accept"); });
    expect(mocks.respondToNotificationDecision).not.toHaveBeenCalled();
    hook.unmount();
  });
});
