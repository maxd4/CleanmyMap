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

function renderHook() {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;
  function Harness() {
    result = useNotificationDecisionState({
      getRequest: () => ({ userId: "user-1", generation: 1 }),
      isCurrentRequest: (request) => request.userId === "user-1" && request.generation === 1,
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
});
