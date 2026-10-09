import { describe, expect, it } from "vitest";

import type { AppNotification } from "./client";
import {
  countPendingNotificationDecisions,
  getNotificationActionId,
  getNotificationDecisionDescriptor,
  getNotificationDecisionOutcome,
  isCriticalNotification,
  isOptionalInformationNotification,
  isRedundantGamificationLevelUpNotification,
  prioritizeNotificationPreview,
  resolveNotificationDisplayState,
} from "./notification-state";

const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "notification-1",
  type: "chat",
  title: "Demande",
  content: "Une demande attend votre réponse.",
  read_at: null,
  created_at: "2026-10-09T10:00:00.000Z",
  payload: { requestKind: "action_share", requestId: "request-1" },
  ...overrides,
});

describe("notification decision state", () => {
  it("keeps a read notification pending when the business request is still pending", () => {
    const item = notification({ read_at: "2026-10-09T10:01:00.000Z" });
    expect(resolveNotificationDisplayState({ notification: item, pendingRequestIds: new Set(["request-1"]) })).toBe("decision_pending");
    expect(countPendingNotificationDecisions([item], new Set(["request-1"]))).toBe(1);
  });

  it("distinguishes treated local decisions from unavailable ones", () => {
    const item = notification();
    expect(resolveNotificationDisplayState({ notification: item, pendingRequestIds: new Set(), treatedNotificationIds: new Set([item.id]) })).toBe("treated");
    expect(resolveNotificationDisplayState({ notification: item, pendingRequestIds: new Set() })).toBe("unavailable");
  });

  it("does not expose decision actions for arbitrary payloads", () => {
    expect(getNotificationDecisionDescriptor({ requestKind: "other", requestId: "request-1" })).toBeNull();
    expect(getNotificationDecisionDescriptor({ requestKind: "action_share" })).toBeNull();
  });

  it("recognizes only canonical action invitation payloads", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "invitation",
        registrationId: "registration-1",
      },
    });
    expect(getNotificationDecisionDescriptor(item.payload)).toEqual({
      kind: "action_invitation",
      requestId: "registration-1",
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["registration-1"]),
    })).toBe("decision_pending");
  });

  it("does not cross-match the same raw id between decision families", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "invitation",
        registrationId: "shared-id",
      },
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["shared-id"]),
      pendingDecisionKeys: new Set(["action_result:shared-id"]),
    })).toBe("unavailable");
  });

  it("keeps a withdrawn invitation unavailable even if a stale pending projection remains", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "invitation",
        registrationId: "registration-1",
        decisionState: "unavailable",
        decision: "withdrawn",
      },
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["registration-1"]),
    })).toBe("unavailable");
  });

  it("filters optional action information but keeps cancellation critical", () => {
    const information = notification({
      type: "action_event",
      payload: { eventType: "action_event", subtype: "action_update", actionId: "action-1", changeKinds: ["schedule"] },
    });
    const cancellation = notification({
      type: "action_event",
      payload: { eventType: "action_event", subtype: "action_update", actionId: "action-1", changeKinds: ["cancellation"] },
    });
    expect(getNotificationActionId(information.payload)).toBe("action-1");
    expect(isOptionalInformationNotification(information)).toBe(true);
    expect(isCriticalNotification(information)).toBe(false);
    expect(isOptionalInformationNotification(cancellation)).toBe(false);
    expect(isCriticalNotification(cancellation)).toBe(true);
  });

  it("classifies nearby community events as optional information", () => {
    expect(isOptionalInformationNotification(notification({
      type: "community",
      payload: {
        entityType: "event",
        id: "event-1",
        optional: true,
        href: "/sections/community?eventId=event-1",
      },
    }))).toBe(true);
  });

  it("hides only the correlated level row when a reconciliation receipt is present", () => {
    const levelUp = notification({
      type: "system",
      payload: {
        kind: "gamification_level_up",
        oldLevel: 5,
        newLevel: 6,
        reconciliationId: "reconciliation-1",
      },
    });
    const receipt = notification({
      id: "receipt-1",
      type: "gamification_reconciliation",
      payload: {
        kind: "gamification_reconciliation_receipt",
        reconciliationId: "reconciliation-1",
      },
    });

    expect(isRedundantGamificationLevelUpNotification(levelUp, [levelUp, receipt])).toBe(true);
    expect(isRedundantGamificationLevelUpNotification(
      { ...levelUp, payload: { ...levelUp.payload, reconciliationId: "other" } },
      [levelUp, receipt],
    )).toBe(false);
  });

  it("recognizes a public registration request separately from an invitation", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "registration_request",
        requestKind: "registration_request",
        actionId: "action-2",
        registrationId: "registration-2",
      },
    });
    expect(getNotificationDecisionDescriptor(item.payload)).toEqual({
      kind: "action_registration_request",
      requestId: "registration-2",
      actionId: "action-2",
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["registration-2"]),
    })).toBe("decision_pending");
  });

  it("recognizes result prompts and reviewer claim cards on the same action id", () => {
    expect(getNotificationDecisionDescriptor({
      eventType: "action_event",
      subtype: "action_result",
      actionId: "action-final-1",
    })).toEqual({
      kind: "action_result",
      requestId: "action-final-1",
      actionId: "action-final-1",
    });
    expect(getNotificationDecisionDescriptor({
      eventType: "action_event",
      subtype: "post_action_claim",
      actionId: "action-final-1",
      participationId: "claim-1",
    })).toEqual({
      kind: "action_post_action_claim",
      requestId: "claim-1",
      actionId: "action-final-1",
    });
    expect(resolveNotificationDisplayState({
      notification: notification({
        type: "action_event",
        payload: { eventType: "action_event", subtype: "action_result", actionId: "action-final-1" },
      }),
      pendingRequestIds: new Set(["action-final-1"]),
    })).toBe("decision_pending");
  });

  it("renders durable outcomes and prioritizes old decisions over recent information", () => {
    expect(getNotificationDecisionOutcome({ decision: "accepted" })).toBe("accepted");
    expect(getNotificationDecisionOutcome({ decision: "reject" })).toBe("rejected");
    expect(getNotificationDecisionOutcome({ decision: "withdrawn" })).toBe("withdrawn");
    expect(getNotificationDecisionOutcome({ decision: "claim" })).toBe("claimed");
    expect(getNotificationDecisionOutcome({ decision: "not_participated" })).toBe("not_participated");

    const oldDecision = notification({ id: "old-decision" });
    const recentInformation = notification({ id: "recent-information", payload: null });
    const duplicateDecision = notification({ id: "old-decision", title: "Duplicate" });
    expect(prioritizeNotificationPreview(
      [oldDecision],
      [recentInformation, duplicateDecision],
      4,
    ).map((item) => item.id)).toEqual(["old-decision", "recent-information"]);
  });

  it("keeps decisions at positions 21 or 100 reachable without loading history", () => {
    const history = Array.from({ length: 100 }, (_, index) => notification({
      id: `information-${index + 1}`,
      payload: null,
    }));
    const firstPending = notification({ id: "pending-21" });
    const secondPending = notification({ id: "pending-100" });

    expect(prioritizeNotificationPreview(
      [firstPending, secondPending],
      history,
      4,
    ).map((item) => item.id)).toEqual([
      "pending-21",
      "pending-100",
      "information-1",
      "information-2",
    ]);
  });
});
